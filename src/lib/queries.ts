import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { Budget, Transaction, Wallet } from "./types";
import type { SortKey, TransactionFilters } from "./transactionFilters";

type WalletRow = Awaited<ReturnType<typeof prisma.wallet.findFirstOrThrow>>;
type TransactionRow = Awaited<ReturnType<typeof prisma.transaction.findFirstOrThrow>>;
type BudgetRow = Awaited<ReturnType<typeof prisma.budget.findFirstOrThrow>>;

function mapWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    currency: row.currency,
    note: row.note,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    walletId: row.walletId,
    toWalletId: row.toWalletId,
    kind: row.kind,
    category: row.category,
    amount: Number(row.amount),
    date: row.date.toISOString().slice(0, 10),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    amount: Number(row.amount),
    year: row.year,
    month: row.month,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getUserBudgets(userId: string): Promise<Budget[]> {
  const rows = await prisma.budget.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(mapBudget);
}

export async function getUserWallets(userId: string): Promise<Wallet[]> {
  const rows = await prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return rows.map(mapWallet);
}

export async function getWallet(userId: string, walletId: string): Promise<Wallet | null> {
  const row = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  return row ? mapWallet(row) : null;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapTransaction);
}

/** Restricts a transaction query to rows that touch one of a set of wallets, as source or destination. */
export interface TransactionScope {
  walletIds: string[];
}

export const TRANSACTIONS_PAGE_SIZE = 20;

export interface TransactionsPage {
  items: Transaction[];
  hasMore: boolean;
}

function transactionWhere(
  userId: string,
  filters: TransactionFilters,
  scope?: TransactionScope
): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [];
  if (scope) {
    and.push({ OR: [{ walletId: { in: scope.walletIds } }, { toWalletId: { in: scope.walletIds } }] });
  }
  if (filters.walletId) {
    and.push({ OR: [{ walletId: filters.walletId }, { toWalletId: filters.walletId }] });
  }
  if (filters.q) {
    and.push({
      OR: [
        { note: { contains: filters.q, mode: "insensitive" } },
        { category: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  return {
    userId,
    ...(filters.kind && filters.kind !== "all" ? { kind: filters.kind } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

function transactionOrderBy(sort: SortKey | undefined): Prisma.TransactionOrderByWithRelationInput[] {
  switch (sort) {
    case "date_asc":
      return [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }];
    case "amount_desc":
      return [{ amount: "desc" }, { id: "asc" }];
    case "amount_asc":
      return [{ amount: "asc" }, { id: "asc" }];
    case "date_desc":
    default:
      return [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  }
}

/** Fetches one page of a user's transactions, filtered and sorted server-side. `page` is 0-indexed. */
export async function getTransactionsPage(
  userId: string,
  filters: TransactionFilters,
  page: number,
  scope?: TransactionScope,
  pageSize: number = TRANSACTIONS_PAGE_SIZE
): Promise<TransactionsPage> {
  const rows = await prisma.transaction.findMany({
    where: transactionWhere(userId, filters, scope),
    orderBy: transactionOrderBy(filters.sort),
    skip: page * pageSize,
    take: pageSize + 1,
  });
  return { items: rows.slice(0, pageSize).map(mapTransaction), hasMore: rows.length > pageSize };
}

export interface TransactionsSummary {
  count: number;
  incomeTotal: number;
  expenseTotal: number;
}

/** Result count and income/expense totals across *all* transactions matching the filters, not just the loaded page. */
export async function getTransactionsSummary(
  userId: string,
  filters: TransactionFilters,
  scope?: TransactionScope
): Promise<TransactionsSummary> {
  const where = transactionWhere(userId, filters, scope);
  const [count, grouped] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["kind"], where, _sum: { amount: true } }),
  ]);
  const sumFor = (kind: string) => Number(grouped.find((g) => g.kind === kind)?._sum.amount ?? 0);
  return { count, incomeTotal: sumFor("income"), expenseTotal: sumFor("expense") };
}

/**
 * Total money in/out of a single wallet across its full history (unaffected by the page's active
 * filters — mirrors the "Total in" / "Total out" summary shown on the wallet detail page).
 */
export async function getWalletFlowTotals(userId: string, walletId: string): Promise<{ inflow: number; outflow: number }> {
  const [outgoing, incomingTransfer] = await Promise.all([
    prisma.transaction.groupBy({ by: ["kind"], where: { userId, walletId }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, toWalletId: walletId, kind: "transfer" }, _sum: { amount: true } }),
  ]);
  const sumFor = (kind: string) => Number(outgoing.find((g) => g.kind === kind)?._sum.amount ?? 0);
  return {
    inflow: sumFor("income") + Number(incomingTransfer._sum.amount ?? 0),
    outflow: sumFor("expense") + sumFor("transfer"),
  };
}
