import type { Budget, Transaction, TransactionKind, Wallet, WalletType } from "./types";
import { shiftYearMonth } from "./format";
import { DEBT_CATEGORY, SAVINGS_CATEGORY } from "./categories";

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

const SPENDING_TRANSFER_CATEGORIES = new Set([DEBT_CATEGORY, SAVINGS_CATEGORY]);

/**
 * A plain expense, or a transfer earmarked as a debt payoff or savings
 * contribution — both move money out of what's spendable this month, so they
 * read as "spending" everywhere the dashboard totals up cost, even though
 * they're modeled as transfers (they also move a wallet balance).
 */
function isSpending(t: Transaction): boolean {
  return t.kind === "expense" || (t.kind === "transfer" && SPENDING_TRANSFER_CATEGORIES.has(t.category));
}

export function monthlyTotals(transactions: Transaction[], year: number, month: number) {
  const inMonth = transactions.filter((t) => isInMonth(t.date, year, month));
  const expense = sumBy(inMonth.filter(isSpending), (t) => t.amount);
  const income = sumBy(
    inMonth.filter((t) => t.kind === "income"),
    (t) => t.amount
  );
  return { expense, income, net: income - expense, count: inMonth.length };
}

/**
 * Money moved into savings wallets during a calendar month — the savings-tagged
 * transfers that `monthlyTotals().expense` also counts as spending. Subtract it
 * from that total to get "expenses without savings"; on its own it's the
 * month's savings contribution.
 */
export function monthlySavingsContribution(transactions: Transaction[], year: number, month: number): number {
  return sumBy(
    transactions.filter(
      (t) => isInMonth(t.date, year, month) && t.kind === "transfer" && t.category === SAVINGS_CATEGORY
    ),
    (t) => t.amount
  );
}

function groupByCategory(transactions: Transaction[]): { category: string; amount: number }[] {
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function categoryBreakdown(
  transactions: Transaction[],
  year: number,
  month: number,
  kind: TransactionKind = "expense"
): { category: string; amount: number }[] {
  return groupByCategory(transactions.filter((t) => isInMonth(t.date, year, month) && t.kind === kind));
}

export function spendingBreakdown(transactions: Transaction[], year: number, month: number): { category: string; amount: number }[] {
  return groupByCategory(transactions.filter((t) => isInMonth(t.date, year, month) && isSpending(t)));
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

export function budgetsForMonth(budgets: Budget[], year: number, month: number): Budget[] {
  return budgets.filter((b) => b.year === year && b.month === month);
}

export interface BudgetProgress {
  budgetId: string;
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  /** Spent as a percentage of budgeted, uncapped — a value over 100 means the category is over budget. */
  pct: number;
}

/**
 * Compares each of a month's budgets against actual spend in that category — reuses
 * `spendingBreakdown` so a budget on "Debt" or "Savings" lines up with the same
 * transfer-as-spending rule used everywhere else spending is totaled.
 */
export function budgetProgress(transactions: Transaction[], budgets: Budget[], year: number, month: number): BudgetProgress[] {
  const monthBudgets = budgetsForMonth(budgets, year, month);
  const spendByCategory = new Map(spendingBreakdown(transactions, year, month).map((c) => [c.category, c.amount]));

  return monthBudgets
    .map((b) => {
      const spent = spendByCategory.get(b.category) ?? 0;
      return {
        budgetId: b.id,
        category: b.category,
        budgeted: b.amount,
        spent,
        remaining: b.amount - spent,
        pct: b.amount > 0 ? (spent / b.amount) * 100 : spent > 0 ? 100 : 0,
      };
    })
    .sort((a, b) => b.budgeted - a.budgeted);
}

export function budgetTotals(rows: BudgetProgress[]): { budgeted: number; spent: number } {
  return { budgeted: sumBy(rows, (r) => r.budgeted), spent: sumBy(rows, (r) => r.spent) };
}
