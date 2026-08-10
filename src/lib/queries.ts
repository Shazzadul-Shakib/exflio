import { prisma } from "./db";
import type { Transaction, Wallet } from "./types";

type WalletRow = Awaited<ReturnType<typeof prisma.wallet.findFirstOrThrow>>;
type TransactionRow = Awaited<ReturnType<typeof prisma.transaction.findFirstOrThrow>>;

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

export async function getWalletTransactions(userId: string, walletId: string): Promise<Transaction[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId, OR: [{ walletId }, { toWalletId: walletId }] },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapTransaction);
}
