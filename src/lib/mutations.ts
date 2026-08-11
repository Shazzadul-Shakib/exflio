import { prisma } from "./db";
import { newId } from "./id";
import { walletDelta } from "./finance";
import { TRANSFER_CATEGORY, SAVINGS_CATEGORY, DEBT_CATEGORY } from "./categories";
import type { Transaction, TransactionKind, Wallet, WalletType } from "./types";
import type { Prisma } from "@prisma/client";

export class MutationError extends Error {}

// Derived from `prisma` itself (rather than the generated `Prisma.TransactionClient`)
// because `prisma` is a `$extends`-wrapped client (see db.ts) with a different shape.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function mapWallet(row: {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: Prisma.Decimal;
  currency: string;
  note: string;
  archived: boolean;
  createdAt: Date;
}): Wallet {
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

function mapTransaction(row: {
  id: string;
  userId: string;
  walletId: string;
  toWalletId: string | null;
  kind: TransactionKind;
  category: string;
  amount: Prisma.Decimal;
  date: Date;
  note: string;
  createdAt: Date;
}): Transaction {
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

export async function createWallet(
  userId: string,
  input: {
    name: string;
    type: WalletType;
    balance: number;
    currency: string;
    note: string;
    /** Existing wallet to draw the starting balance from, recorded as a transfer. */
    fundingWalletId?: string | null;
  }
): Promise<Wallet> {
  if (input.fundingWalletId && input.balance > 0) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.wallet.create({
        data: {
          id: newId("wal"),
          userId,
          name: input.name,
          type: input.type,
          balance: 0,
          currency: input.currency || "USD",
          note: input.note,
        },
      });
      await recordTransaction(tx, userId, {
        walletId: input.fundingWalletId!,
        toWalletId: created.id,
        kind: "transfer",
        category: TRANSFER_CATEGORY,
        amount: input.balance,
        date: new Date().toISOString().slice(0, 10),
        note: `Initial funding for ${input.name}`,
      });
      const funded = await tx.wallet.findFirstOrThrow({ where: { id: created.id } });
      return mapWallet(funded);
    });
  }

  // A plain starting balance on an asset wallet (no funding source picked) is new
  // money entering the tracked system, so it's recorded as income — otherwise it
  // would never show up in the income/expense totals or trend chart. A debt
  // wallet's starting balance is different: it's a pre-existing amount owed, not
  // a dated event, so it's just set directly with no transaction.
  if (input.balance > 0 && input.type !== "debt") {
    return prisma.$transaction(async (tx) => {
      const created = await tx.wallet.create({
        data: {
          id: newId("wal"),
          userId,
          name: input.name,
          type: input.type,
          balance: 0,
          currency: input.currency || "USD",
          note: input.note,
        },
      });
      await recordTransaction(tx, userId, {
        walletId: created.id,
        toWalletId: null,
        kind: "income",
        category: "Other",
        amount: input.balance,
        date: new Date().toISOString().slice(0, 10),
        note: "Starting balance",
      });
      const funded = await tx.wallet.findFirstOrThrow({ where: { id: created.id } });
      return mapWallet(funded);
    });
  }

  const row = await prisma.wallet.create({
    data: {
      id: newId("wal"),
      userId,
      name: input.name,
      type: input.type,
      balance: input.balance,
      currency: input.currency || "USD",
      note: input.note,
    },
  });
  return mapWallet(row);
}

export async function updateWallet(
  userId: string,
  walletId: string,
  input: { name: string; note: string }
): Promise<Wallet> {
  const existing = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!existing) throw new MutationError("Wallet not found");
  const row = await prisma.wallet.update({
    where: { id: walletId },
    data: { name: input.name, note: input.note },
  });
  return mapWallet(row);
}

export async function deleteWallet(userId: string, walletId: string): Promise<void> {
  const existing = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!existing) throw new MutationError("Wallet not found");
  // Transactions referencing this wallet (as source or destination) cascade-delete
  // at the database level via the FK constraints in prisma/schema.prisma.
  await prisma.wallet.delete({ where: { id: walletId } });
}

export interface TransactionInput {
  walletId: string;
  toWalletId: string | null;
  kind: TransactionKind;
  category: string;
  amount: number;
  date: string;
  note: string;
}

/**
 * Draws down an asset wallet (never a debt wallet — "balance" there means amount
 * owed, which has no upper bound) and throws if that would take it negative.
 * Only checked on forward application (sign=1); reversing a past effect always
 * gives money back, so it can never overdraw.
 */
function assertSufficientFunds(wallet: { name: string; type: WalletType; balance: Prisma.Decimal }, delta: number, sign: 1 | -1) {
  if (sign !== 1 || wallet.type === "debt") return;
  if (Number(wallet.balance) + delta < 0) {
    throw new MutationError(`Not enough balance in ${wallet.name} for this amount.`);
  }
}

/**
 * Applies (sign=1) or reverses (sign=-1) a transaction's effect on its wallet
 * balance(s). Returns the transfer's destination wallet type (if any) so the
 * caller can auto-tag the category — reuses the row already fetched here
 * rather than querying it again.
 */
async function applyEffect(tx: TxClient, userId: string, input: TransactionInput, sign: 1 | -1): Promise<WalletType | null> {
  const fromWallet = await tx.wallet.findFirst({ where: { id: input.walletId, userId } });
  if (!fromWallet) throw new MutationError("Source wallet not found");

  if (input.kind === "transfer") {
    if (!input.toWalletId) throw new MutationError("Destination wallet not found");
    const toWallet = await tx.wallet.findFirst({ where: { id: input.toWalletId, userId } });
    if (!toWallet) throw new MutationError("Destination wallet not found");
    if (toWallet.id === fromWallet.id) throw new MutationError("Pick two different wallets");

    const fromDelta = sign * walletDelta(fromWallet.type, "expense", input.amount);
    assertSufficientFunds(fromWallet, fromDelta, sign);

    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { increment: fromDelta } },
    });
    await tx.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: sign * walletDelta(toWallet.type, "income", input.amount) } },
    });
    return toWallet.type;
  }

  const delta = sign * walletDelta(fromWallet.type, input.kind, input.amount);
  if (input.kind === "expense") assertSufficientFunds(fromWallet, delta, sign);

  await tx.wallet.update({
    where: { id: fromWallet.id },
    data: { balance: { increment: delta } },
  });
  return null;
}

/**
 * A transfer's category is driven by its destination, not whatever UI created
 * it: landing in a savings wallet always reads as "Savings", landing in a debt
 * wallet always reads as "Debt" (paying it down) — covering the dedicated
 * Clear debt / fund-a-savings-wallet flows AND a plain manual transfer alike.
 * Anything else keeps its given category, falling back to "Transfer".
 */
function resolveCategory(input: TransactionInput, toWalletType: WalletType | null): string {
  if (input.kind !== "transfer") return input.category;
  if (toWalletType === "savings") return SAVINGS_CATEGORY;
  if (toWalletType === "debt") return DEBT_CATEGORY;
  return input.category || TRANSFER_CATEGORY;
}

/** A debt that's been paid off in full drops out of Debts/totals/pickers, but keeps its wallet row (and history) intact. */
async function archiveIfDebtCleared(tx: TxClient, walletId: string | null) {
  if (!walletId) return;
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (wallet && wallet.type === "debt" && !wallet.archived && Number(wallet.balance) === 0) {
    await tx.wallet.update({ where: { id: walletId }, data: { archived: true } });
  }
}

/** Applies a transaction's balance effect and records it, within an existing transaction client. */
async function recordTransaction(tx: TxClient, userId: string, input: TransactionInput): Promise<Transaction> {
  const toWalletType = await applyEffect(tx, userId, input, 1);
  await archiveIfDebtCleared(tx, input.walletId);
  if (input.kind === "transfer") await archiveIfDebtCleared(tx, input.toWalletId);

  const created = await tx.transaction.create({
    data: {
      id: newId("txn"),
      userId,
      walletId: input.walletId,
      toWalletId: input.kind === "transfer" ? input.toWalletId : null,
      kind: input.kind,
      category: resolveCategory(input, toWalletType),
      amount: input.amount,
      date: new Date(input.date),
      note: input.note,
    },
  });
  return mapTransaction(created);
}

export async function createTransaction(userId: string, input: TransactionInput): Promise<Transaction> {
  return prisma.$transaction((tx) => recordTransaction(tx, userId, input));
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionInput
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, userId } });
    if (!existing) throw new MutationError("Transaction not found");

    // Reverse the old effect, then apply the new one.
    await applyEffect(
      tx,
      userId,
      {
        walletId: existing.walletId,
        toWalletId: existing.toWalletId,
        kind: existing.kind,
        category: existing.category,
        amount: Number(existing.amount),
        date: existing.date.toISOString().slice(0, 10),
        note: existing.note,
      },
      -1
    );
    const toWalletType = await applyEffect(tx, userId, input, 1);
    await archiveIfDebtCleared(tx, input.walletId);
    if (input.kind === "transfer") await archiveIfDebtCleared(tx, input.toWalletId);

    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        walletId: input.walletId,
        toWalletId: input.kind === "transfer" ? input.toWalletId : null,
        kind: input.kind,
        category: resolveCategory(input, toWalletType),
        amount: input.amount,
        date: new Date(input.date),
        note: input.note,
      },
    });
    return mapTransaction(updated);
  });
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, userId } });
    if (!existing) throw new MutationError("Transaction not found");

    await applyEffect(
      tx,
      userId,
      {
        walletId: existing.walletId,
        toWalletId: existing.toWalletId,
        kind: existing.kind,
        category: existing.category,
        amount: Number(existing.amount),
        date: existing.date.toISOString().slice(0, 10),
        note: existing.note,
      },
      -1
    );

    await tx.transaction.delete({ where: { id: transactionId } });
  });
}
