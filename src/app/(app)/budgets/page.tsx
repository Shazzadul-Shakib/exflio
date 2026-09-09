import type { Metadata } from "next";
import { Target, TrendingDown, PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserBudgets, getUserTransactions } from "@/lib/queries";
import { budgetProgress, budgetTotals, compareBudgetProgress, type BudgetProgress } from "@/lib/finance";
import { currentYearMonth, formatCompactCurrency, monthLabel, shiftYearMonth } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { BudgetTable } from "@/components/budgets/BudgetTable";
import { BudgetComparisonTable } from "@/components/budgets/BudgetComparisonTable";
import { BudgetProgressChart } from "@/components/budgets/BudgetProgressChart";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { CompareToggle } from "@/components/budgets/CompareToggle";
import { SwapMonthsButton } from "@/components/budgets/SwapMonthsButton";
import { CategoryFilter } from "@/components/budgets/CategoryFilter";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Budgets — Exflio" };

/** Percent change from `previous` to `current`, or undefined when there's no meaningful baseline. */
function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? undefined : 100;
  return ((current - previous) / previous) * 100;
}

const CATEGORY_ORDER = EXPENSE_CATEGORIES.map((c) => c.name);

function byCategoryOrder(a: string, b: string): number {
  const ia = CATEGORY_ORDER.indexOf(a);
  const ib = CATEGORY_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

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

  const compare = params.compare === "1";
  const prevYM = shiftYearMonth(year, month, -1);
  const compareYear = Number(params.cy) || prevYM.year;
  const compareMonth = Number(params.cm) || prevYM.month;

  const hidden = typeof params.hide === "string" && params.hide.length > 0 ? params.hide.split(",") : [];
  const hiddenSet = new Set(hidden);
  const visible = (rows: BudgetProgress[]) => rows.filter((r) => !hiddenSet.has(r.category));

  const [budgets, transactions] = await Promise.all([getUserBudgets(user.id), getUserTransactions(user.id)]);

  const allBaseRows = budgetProgress(transactions, budgets, year, month);
  const rows = visible(allBaseRows);
  const totals = budgetTotals(rows);
  const remaining = totals.budgeted - totals.spent;
  const overCount = rows.filter((r) => r.remaining < 0).length;

  const allCompareRows = compare ? budgetProgress(transactions, budgets, compareYear, compareMonth) : [];
  const compareRows = visible(allCompareRows);
  const compareTotals = budgetTotals(compareRows);
  const compareRemaining = compareTotals.budgeted - compareTotals.spent;
  const comparisonRows = compare ? compareBudgetProgress(rows, compareRows) : [];

  const filterCategories = Array.from(
    new Set([...allBaseRows, ...allCompareRows].map((r) => r.category)),
  ).sort(byCategoryOrder);

  const baseLabel = `${monthLabel(month)} ${year}`;
  const compareLabel = `${monthLabel(compareMonth)} ${compareYear}`;
  const compareShort = `${monthLabel(compareMonth).slice(0, 3)} ${compareYear}`;
  const hiddenNote =
    allBaseRows.length > 0 && rows.length === 0
      ? "Every budgeted category is hidden — turn some back on in the category filter."
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">Budgets</h2>
            <p className="text-[13px] text-text-muted">
              {compare
                ? `Comparing ${baseLabel} against ${compareLabel}.`
                : `Set what you plan to spend per category, and see how ${baseLabel} is tracking.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MonthYearPicker year={year} month={month} />
            <CreateBudgetButton budgets={budgets} defaultYear={year} defaultMonth={month} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CompareToggle active={compare} baseYear={year} baseMonth={month} />
          {compare && (
            <div className="flex items-center gap-2">
              <SwapMonthsButton
                year={year}
                month={month}
                compareYear={compareYear}
                compareMonth={compareMonth}
              />
              <span className="text-[13px] text-text-muted">vs</span>
              <MonthYearPicker
                year={compareYear}
                month={compareMonth}
                yearKey="cy"
                monthKey="cm"
                ariaPrefix="Comparison"
              />
            </div>
          )}
          <div className="ml-auto">
            <CategoryFilter categories={filterCategories} hidden={hidden} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total budgeted"
          value={totals.budgeted}
          icon={Target}
          accent="brand"
          hint={
            compare
              ? `${compareShort}: ${formatCompactCurrency(compareTotals.budgeted)}`
              : `${rows.length} categor${rows.length === 1 ? "y" : "ies"} this month`
          }
        />
        <StatCard
          label="Total spent"
          value={totals.spent}
          icon={TrendingDown}
          accent="critical"
          delta={compare ? pctChange(totals.spent, compareTotals.spent) : undefined}
          deltaGoodDirection="down"
          deltaLabel={`vs ${compareShort}`}
          hint={overCount > 0 ? `${overCount} categor${overCount === 1 ? "y" : "ies"} over budget` : "All within budget"}
        />
        <StatCard
          label="Remaining"
          value={remaining}
          icon={PiggyBank}
          accent={remaining < 0 ? "critical" : "good"}
          hint={compare ? `${compareShort}: ${formatCompactCurrency(compareRemaining)}` : undefined}
        />
      </div>

      {hiddenNote && (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px] text-text-muted">{hiddenNote}</p>
      )}

      {compare ? (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Month comparison</h3>
            <span className="text-[12.5px] text-text-muted">
              {baseLabel} vs {compareLabel}
            </span>
          </div>
          <BudgetComparisonTable rows={comparisonRows} baseLabel={baseLabel} compareLabel={compareLabel} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Budget vs. spent</h3>
              <span className="text-[12.5px] text-text-muted">{baseLabel}</span>
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
      )}
    </div>
  );
}
