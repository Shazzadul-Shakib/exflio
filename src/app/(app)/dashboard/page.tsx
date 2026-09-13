import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, PiggyBank, Target, TrendingDown, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions, getUserBudgets } from "@/lib/queries";
import {
  monthlyTotals,
  monthlySavingsContribution,
  monthlySavingsReversal,
  monthlySavingsWithdrawal,
  spendingBreakdown,
  incomeExpenseTrend,
  netWorth,
  totalSavings,
  totalDebt,
  walletsByType,
  budgetProgress,
  type TrendRange,
} from "@/lib/finance";
import { currentYearMonth, shiftYearMonth, monthLabel } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { ToggleStatCard } from "@/components/dashboard/ToggleStatCard";
import { CategoryBarChart } from "@/components/dashboard/CategoryBarChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TrendRangeSelect } from "@/components/dashboard/TrendRangeSelect";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { WalletCard } from "@/components/wallets/WalletCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { BudgetTable } from "@/components/budgets/BudgetTable";
import { BudgetProgressChart } from "@/components/budgets/BudgetProgressChart";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard — Exflio" };

const TREND_RANGES: TrendRange[] = ["week", "month", "last-month", "6-months"];

function pct(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? undefined : 100;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const defaults = currentYearMonth();
  const year = Number(params.year) || defaults.year;
  const month = Number(params.month) || defaults.month;
  const rawTrendRange = Array.isArray(params.trend) ? params.trend[0] : params.trend;
  const trendRange: TrendRange = TREND_RANGES.includes(rawTrendRange as TrendRange)
    ? (rawTrendRange as TrendRange)
    : "6-months";

  const [walletsWithDeleted, transactions, budgets] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    getUserTransactions(user.id),
    getUserBudgets(user.id),
  ]);
  // Soft-deleted wallets are kept only to resolve names for historical
  // transactions in the "Recent" list — never for totals, pickers, or previews.
  const wallets = walletsWithDeleted.filter((w) => !w.deletedAt);

  const current = monthlyTotals(transactions, year, month);
  const prevYM = shiftYearMonth(year, month, -1);
  const previous = monthlyTotals(transactions, prevYM.year, prevYM.month);
  // Money moved into savings this month — used to back the internal transfer out of
  // "Expenses excl. savings" below. `monthlyTotals().expense` only ever adds this exact
  // gross figure for a savings transfer (never anything for a later reversal, which isn't
  // spending and isn't added there either), so backing it out has to subtract the same
  // gross figure — netting it against the reversal here would leave the reversed amount
  // stranded in "Expenses excl. savings" as phantom spending even though no money actually
  // left the wallets.
  const savingsContribution = monthlySavingsContribution(transactions, year, month);
  const prevSavingsContribution = monthlySavingsContribution(transactions, prevYM.year, prevYM.month);
  // How much of this month's contribution didn't stay put — moved back out by transfer, or
  // spent straight out of a savings wallet. Both bring money that once counted as "moved to
  // savings" back into play, so both come off the gross contribution above for anything that
  // should track the *current* savings position rather than the moment-of-transfer snapshot.
  const savingsReversal = monthlySavingsReversal(transactions, walletsWithDeleted, year, month);
  const savingsWithdrawal = monthlySavingsWithdrawal(transactions, walletsWithDeleted, year, month);
  const prevSavingsReversal = monthlySavingsReversal(transactions, walletsWithDeleted, prevYM.year, prevYM.month);
  const prevSavingsWithdrawal = monthlySavingsWithdrawal(transactions, walletsWithDeleted, prevYM.year, prevYM.month);
  // Net change in savings this month — what "Saved this month" should read, so it drops back
  // down the moment savings gets spent or un-contributed instead of holding onto the original
  // contribution.
  const netSavingsThisMonth = savingsContribution - savingsReversal - savingsWithdrawal;
  const prevNetSavingsThisMonth = prevSavingsContribution - prevSavingsReversal - prevSavingsWithdrawal;
  // "Expenses this month" is meant to read as the mirror of "Saved this month": real spending
  // plus whatever's still parked in savings, so toggling between the two expense views always
  // moves by exactly the Savings card's own number. A contribution that's since been reversed
  // or spent out of savings no longer belongs in that "still parked" amount — it already shows
  // up as its own line under "Excl. savings" — so it comes off here the same way.
  const expensesThisMonth = current.expense - savingsReversal - savingsWithdrawal;
  const prevExpensesThisMonth = previous.expense - prevSavingsReversal - prevSavingsWithdrawal;
  const categories = spendingBreakdown(transactions, walletsWithDeleted, year, month);
  const trend = incomeExpenseTrend(transactions, year, month, trendRange);
  const budgetRows = budgetProgress(transactions, budgets, walletsWithDeleted, year, month);
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const activeWallets = wallets.filter((w) => !w.archived);
  const savingsWallets = walletsByType(wallets, "savings");
  const debtWallets = walletsByType(wallets, "debt");
  const walletPreview = activeWallets.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">
            Welcome back, {user.name.split(" ")[0]}
          </h2>
          <p className="text-[13px] text-text-muted">
            Here&apos;s how {monthLabel(month)} {year} looks so far.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <MonthYearPicker year={year} month={month} className="w-full sm:w-auto" />
          <AddTransactionButton wallets={activeWallets} label="Add" className="w-full sm:w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ToggleStatCard
          icon={<WalletIcon className="h-4 w-4" strokeWidth={2} />}
          accent="brand"
          views={[
            {
              key: "all",
              toggle: "All",
              label: "Net worth",
              value: netWorth(wallets),
              hint: "Assets minus debt",
            },
            {
              key: "excl-savings",
              toggle: "Excl. savings",
              label: "Net worth excl. savings",
              value: netWorth(wallets) - totalSavings(wallets),
              hint: "Cash & bank, minus debt",
            },
          ]}
        />
        <ToggleStatCard
          icon={<TrendingDown className="h-4 w-4" strokeWidth={2} />}
          accent="critical"
          views={[
            {
              key: "all",
              toggle: "All",
              label: "Expenses this month",
              value: expensesThisMonth,
              delta: pct(expensesThisMonth, prevExpensesThisMonth),
              deltaGoodDirection: "down",
            },
            {
              key: "excl-savings",
              toggle: "Excl. savings",
              label: "Expenses excl. savings",
              value: current.expense - savingsContribution,
              delta: pct(current.expense - savingsContribution, previous.expense - prevSavingsContribution),
              deltaGoodDirection: "down",
            },
          ]}
        />
        <ToggleStatCard
          icon={<PiggyBank className="h-4 w-4" strokeWidth={2} />}
          accent="good"
          views={[
            {
              key: "total",
              toggle: "Total",
              label: "Total savings",
              value: totalSavings(wallets),
              hint: `${savingsWallets.length} wallet${savingsWallets.length === 1 ? "" : "s"}`,
            },
            {
              key: "this-month",
              toggle: "This month",
              label: "Saved this month",
              value: netSavingsThisMonth,
              delta: pct(netSavingsThisMonth, prevNetSavingsThisMonth),
              deltaGoodDirection: "up",
            },
          ]}
        />
        <StatCard label="Total debt" value={totalDebt(wallets)} icon={CreditCard} accent="critical" hint={`${debtWallets.length} wallet${debtWallets.length === 1 ? "" : "s"}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Income vs. expense</h3>
            <TrendRangeSelect value={trendRange} />
          </div>
          <TrendChart data={trend} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Spending by category</h3>
            <span className="text-[12.5px] text-text-muted">
              {monthLabel(month)} {year}
            </span>
          </div>
          <CategoryBarChart data={categories} />
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary">Budget vs. expense</h3>
            <Link href="/budgets" className="text-[13px] font-medium text-brand hover:underline">
              View all →
            </Link>
          </div>
          <CreateBudgetButton label="Add budget" budgets={budgets} defaultYear={year} defaultMonth={month} />
        </div>
        {budgetRows.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No budgets set for this month"
            description="Create a budget per category to compare planned spending against what actually goes out."
            action={<CreateBudgetButton label="Create a budget" budgets={budgets} defaultYear={year} defaultMonth={month} />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <BudgetTable rows={budgetRows} budgets={budgets} showActions={false} />
            </Card>
            <Card className="p-5 lg:col-span-2">
              <BudgetProgressChart data={budgetRows} />
            </Card>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Your wallets</h3>
          <Link href="/wallets" className="text-[13px] font-medium text-brand hover:underline">
            View all →
          </Link>
        </div>
        {walletPreview.length === 0 ? (
          <EmptyState icon={WalletIcon} title="No wallets yet" description="Create a wallet to start tracking your money." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {walletPreview.map((w) => (
              <WalletCard key={w.id} wallet={w} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Recent transactions</h3>
          <Link href="/transactions" className="text-[13px] font-medium text-brand hover:underline">
            View all →
          </Link>
        </div>
        <TransactionTable transactions={recent} wallets={walletsWithDeleted} />
      </div>
    </div>
  );
}
