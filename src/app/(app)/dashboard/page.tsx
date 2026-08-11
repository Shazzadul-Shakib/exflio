import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, PiggyBank, TrendingDown, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions } from "@/lib/queries";
import {
  monthlyTotals,
  spendingBreakdown,
  monthlyTrend,
  netWorth,
  totalSavings,
  totalDebt,
  walletsByType,
} from "@/lib/finance";
import { currentYearMonth, shiftYearMonth, monthLabel } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryBarChart } from "@/components/dashboard/CategoryBarChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { WalletCard } from "@/components/wallets/WalletCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
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

  const [wallets, transactions] = await Promise.all([getUserWallets(user.id), getUserTransactions(user.id)]);

  const current = monthlyTotals(transactions, year, month);
  const prevYM = shiftYearMonth(year, month, -1);
  const previous = monthlyTotals(transactions, prevYM.year, prevYM.month);
  const categories = spendingBreakdown(transactions, year, month);
  const trend = monthlyTrend(transactions, year, month, 6);
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
        <div className="flex items-center gap-2">
          <MonthYearPicker year={year} month={month} />
          <AddTransactionButton wallets={activeWallets} label="Add" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Net worth" value={netWorth(wallets)} icon={WalletIcon} accent="brand" hint="Assets minus debt" />
        <StatCard
          label="Expenses this month"
          value={current.expense}
          icon={TrendingDown}
          accent="critical"
          delta={pct(current.expense, previous.expense)}
          deltaGoodDirection="down"
        />
        <StatCard label="Total savings" value={totalSavings(wallets)} icon={PiggyBank} accent="good" hint={`${savingsWallets.length} wallet${savingsWallets.length === 1 ? "" : "s"}`} />
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
        <TransactionTable transactions={recent} wallets={wallets} />
      </div>
    </div>
  );
}
