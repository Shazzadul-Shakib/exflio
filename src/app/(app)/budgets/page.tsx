import type { Metadata } from "next";
import { Target, TrendingDown, PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserBudgets, getUserTransactions } from "@/lib/queries";
import { budgetProgress, budgetTotals } from "@/lib/finance";
import { currentYearMonth, monthLabel } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { BudgetTable } from "@/components/budgets/BudgetTable";
import { BudgetProgressChart } from "@/components/budgets/BudgetProgressChart";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Budgets — Exflio" };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const defaults = currentYearMonth();
  const year = Number(params.year) || defaults.year;
  const month = Number(params.month) || defaults.month;

  const [budgets, transactions] = await Promise.all([getUserBudgets(user.id), getUserTransactions(user.id)]);
  const rows = budgetProgress(transactions, budgets, year, month);
  const totals = budgetTotals(rows);
  const remaining = totals.budgeted - totals.spent;
  const overCount = rows.filter((r) => r.remaining < 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Budgets</h2>
          <p className="text-[13px] text-text-muted">
            Set what you plan to spend per category, and see how {monthLabel(month)} {year} is tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthYearPicker year={year} month={month} />
          <CreateBudgetButton budgets={budgets} defaultYear={year} defaultMonth={month} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total budgeted"
          value={totals.budgeted}
          icon={Target}
          accent="brand"
          hint={`${rows.length} categor${rows.length === 1 ? "y" : "ies"} this month`}
        />
        <StatCard
          label="Total spent"
          value={totals.spent}
          icon={TrendingDown}
          accent="critical"
          hint={overCount > 0 ? `${overCount} categor${overCount === 1 ? "y" : "ies"} over budget` : "All within budget"}
        />
        <StatCard
          label="Remaining"
          value={remaining}
          icon={PiggyBank}
          accent={remaining < 0 ? "critical" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Budget vs. spent</h3>
            <span className="text-[12.5px] text-text-muted">
              {monthLabel(month)} {year}
            </span>
          </div>
          <BudgetTable rows={rows} budgets={budgets} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Progress</h3>
          </div>
          <BudgetProgressChart data={rows} />
        </Card>
      </div>
    </div>
  );
}
