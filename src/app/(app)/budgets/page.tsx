import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getUserBudgets, getUserTransactions, getUserWallets } from "@/lib/queries";
import { budgetProgress } from "@/lib/finance";
import { currentYearMonth, monthLabel, shiftYearMonth } from "@/lib/format";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { BudgetResults } from "@/components/budgets/BudgetResults";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { CompareToggle } from "@/components/budgets/CompareToggle";
import { SwapMonthsButton } from "@/components/budgets/SwapMonthsButton";

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

  const compare = params.compare === "1";
  const prevYM = shiftYearMonth(year, month, -1);
  const compareYear = Number(params.cy) || prevYM.year;
  const compareMonth = Number(params.cm) || prevYM.month;

  const [budgets, transactions, wallets] = await Promise.all([
    getUserBudgets(user.id),
    getUserTransactions(user.id),
    getUserWallets(user.id, { includeDeleted: true }),
  ]);

  const baseRows = budgetProgress(transactions, budgets, wallets, year, month);
  const compareRows = compare ? budgetProgress(transactions, budgets, wallets, compareYear, compareMonth) : [];

  const baseLabel = `${monthLabel(month)} ${year}`;
  const compareLabel = `${monthLabel(compareMonth)} ${compareYear}`;
  const compareShort = `${monthLabel(compareMonth).slice(0, 3)} ${compareYear}`;

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <MonthYearPicker year={year} month={month} className="w-full sm:w-auto" />
            <CreateBudgetButton
              budgets={budgets}
              defaultYear={year}
              defaultMonth={month}
              className="w-full sm:w-auto"
            />
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
        </div>
      </div>

      <BudgetResults
        key={`${year}-${month}-${compare ? `${compareYear}-${compareMonth}` : "solo"}`}
        baseRows={baseRows}
        compareRows={compareRows}
        compare={compare}
        budgets={budgets}
        baseLabel={baseLabel}
        compareLabel={compareLabel}
        compareShort={compareShort}
      />
    </div>
  );
}
