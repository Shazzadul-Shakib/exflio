import type { Transaction, TransactionKind, Wallet, WalletType } from "./types";
import { shiftYearMonth } from "./format";

/**
 * How a transaction of `kind` moves a wallet's balance.
 *
 * For asset wallets (cash/bank/savings) balance is money on hand: expenses
 * subtract, income adds. For a debt wallet, balance means "amount owed", so
 * the sign flips: spending on a debt wallet (e.g. a credit card) increases
 * what's owed, and income into it (a repayment) reduces it. A transfer is
 * just an expense-effect on the source wallet plus an income-effect on the
 * destination wallet, which is what makes "pay off a debt" or "move money
 * into savings" fall out of the same two rules.
 */
export function walletDelta(walletType: WalletType, kind: "expense" | "income", amount: number): number {
  const isDebtWallet = walletType === "debt";
  if (kind === "expense") return isDebtWallet ? amount : -amount;
  return isDebtWallet ? -amount : amount;
}

export function isInMonth(dateIso: string, year: number, month: number): boolean {
  const [y, m] = dateIso.split("-").map(Number);
  return y === year && m === month;
}

export function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((total, item) => total + fn(item), 0);
}

export function monthlyTotals(transactions: Transaction[], year: number, month: number) {
  const inMonth = transactions.filter((t) => isInMonth(t.date, year, month));
  const expense = sumBy(
    inMonth.filter((t) => t.kind === "expense"),
    (t) => t.amount
  );
  const income = sumBy(
    inMonth.filter((t) => t.kind === "income"),
    (t) => t.amount
  );
  return { expense, income, net: income - expense, count: inMonth.length };
}

export function categoryBreakdown(
  transactions: Transaction[],
  year: number,
  month: number,
  kind: TransactionKind = "expense"
): { category: string; amount: number }[] {
  const inMonth = transactions.filter((t) => isInMonth(t.date, year, month) && t.kind === kind);
  const byCategory = new Map<string, number>();
  for (const t of inMonth) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function monthlyTrend(transactions: Transaction[], year: number, month: number, monthsBack = 6) {
  const points: { year: number; month: number; income: number; expense: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const { year: y, month: m } = shiftYearMonth(year, month, -i);
    const totals = monthlyTotals(transactions, y, m);
    points.push({ year: y, month: m, income: totals.income, expense: totals.expense });
  }
  return points;
}

export function walletsByType(wallets: Wallet[], type: WalletType): Wallet[] {
  return wallets.filter((w) => w.type === type && !w.archived);
}

export function totalAssets(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type !== "debt" && !w.archived),
    (w) => w.balance
  );
}

export function totalDebt(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type === "debt" && !w.archived),
    (w) => w.balance
  );
}

export function totalSavings(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type === "savings" && !w.archived),
    (w) => w.balance
  );
}

export function netWorth(wallets: Wallet[]): number {
  return totalAssets(wallets) - totalDebt(wallets);
}
