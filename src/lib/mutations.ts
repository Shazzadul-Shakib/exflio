import { prisma } from "./db";
import { newId } from "./id";
import { walletDelta } from "./finance";
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
  input: { name: string; type: WalletType; balance: number; currency: string; note: string }
): Promise<Wallet> {
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

/** Applies (sign=1) or reverses (sign=-1) a transaction's effect on its wallet balance(s). */
async function applyEffect(tx: TxClient, userId: string, input: TransactionInput, sign: 1 | -1) {
  const fromWallet = await tx.wallet.findFirst({ where: { id: input.walletId, userId } });
  if (!fromWallet) throw new MutationError("Source wallet not found");

  if (input.kind === "transfer") {
    if (!input.toWalletId) throw new MutationError("Destination wallet not found");
    const toWallet = await tx.wallet.findFirst({ where: { id: input.toWalletId, userId } });
    if (!toWallet) throw new MutationError("Destination wallet not found");
    if (toWallet.id === fromWallet.id) throw new MutationError("Pick two different wallets");

    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { increment: sign * walletDelta(fromWallet.type, "expense", input.amount) } },
    });
    await tx.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: sign * walletDelta(toWallet.type, "income", input.amount) } },
    });
  } else {
    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { increment: sign * walletDelta(fromWallet.type, input.kind, input.amount) } },
    });
  }
}

export async function createTransaction(userId: string, input: TransactionInput): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    await applyEffect(tx, userId, input, 1);

    const created = await tx.transaction.create({
      data: {
        id: newId("txn"),
        userId,
        walletId: input.walletId,
        toWalletId: input.kind === "transfer" ? input.toWalletId : null,
        kind: input.kind,
        category: input.kind === "transfer" ? "Transfer" : input.category,
        amount: input.amount,
        date: new Date(input.date),
        note: input.note,
      },
    });
    return mapTransaction(created);
  });
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
    await applyEffect(tx, userId, input, 1);

    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        walletId: input.walletId,
        toWalletId: input.kind === "transfer" ? input.toWalletId : null,
        kind: input.kind,
        category: input.kind === "transfer" ? "Transfer" : input.category,
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
