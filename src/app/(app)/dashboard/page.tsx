import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, PiggyBank, Target, TrendingDown, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions, getUserBudgets } from "@/lib/queries";
import {
  monthlyTotals,
  monthlySavingsContribution,
  spendingBreakdown,
  monthlyTrend,
  netWorth,
  totalSavings,
  totalDebt,
  walletsByType,
  budgetProgress,
} from "@/lib/finance";
import { currentYearMonth, shiftYearMonth, monthLabel } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { ToggleStatCard } from "@/components/dashboard/ToggleStatCard";
import { CategoryBarChart } from "@/components/dashboard/CategoryBarChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { WalletCard } from "@/components/wallets/WalletCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { BudgetTable } from "@/components/budgets/BudgetTable";
import { BudgetProgressChart } from "@/components/budgets/BudgetProgressChart";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard — Exflio" };

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
  const savingsThisMonth = monthlySavingsContribution(transactions, year, month);
  const prevSavingsThisMonth = monthlySavingsContribution(transactions, prevYM.year, prevYM.month);
  const categories = spendingBreakdown(transactions, year, month);
  const trend = monthlyTrend(transactions, year, month, 6);
  const budgetRows = budgetProgress(transactions, budgets, year, month);
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
        <StatCard label="Net worth" value={netWorth(wallets)} icon={WalletIcon} accent="brand" hint="Assets minus debt" />
        <ToggleStatCard
          icon={<TrendingDown className="h-4 w-4" strokeWidth={2} />}
          accent="critical"
          views={[
            {
              key: "all",
              toggle: "All",
              label: "Expenses this month",
              value: current.expense,
              delta: pct(current.expense, previous.expense),
              deltaGoodDirection: "down",
            },
            {
              key: "excl-savings",
              toggle: "Excl. savings",
              label: "Expenses excl. savings",
              value: current.expense - savingsThisMonth,
              delta: pct(current.expense - savingsThisMonth, previous.expense - prevSavingsThisMonth),
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
              value: savingsThisMonth,
              delta: pct(savingsThisMonth, prevSavingsThisMonth),
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
            <span className="text-[12.5px] text-text-muted">Last 6 months</span>
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
