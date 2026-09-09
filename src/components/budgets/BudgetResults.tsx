"use client";

import { useMemo, useState } from "react";
import { PiggyBank, Target, TrendingDown, Undo2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui";
import { budgetTotals, compareBudgetProgress, type BudgetProgress } from "@/lib/finance";
import { formatCompactCurrency } from "@/lib/format";
import type { Budget } from "@/lib/types";
import { BudgetTable } from "./BudgetTable";
import { BudgetComparisonTable } from "./BudgetComparisonTable";
import { BudgetProgressChart } from "./BudgetProgressChart";

/** Percent change from `previous` to `current`, or undefined when there's no meaningful baseline. */
function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? undefined : 100;
  return ((current - previous) / previous) * 100;
}

/**
 * Owns the "count this category or not" selection for the budgets page. Every category
 * starts counted; unchecking rows in the table (or the header's select-all) drops them
 * from the stat cards, the progress chart and the comparison totals in real time.
 */
export function BudgetResults({
  baseRows,
  compareRows,
  compare,
  budgets,
  baseLabel,
  compareLabel,
  compareShort,
}: {
  /** Every budgeted category for the primary month, already sorted. */
  baseRows: BudgetProgress[];
  /** Every budgeted category for the comparison month (empty when not comparing). */
  compareRows: BudgetProgress[];
  compare: boolean;
  budgets: Budget[];
  baseLabel: string;
  compareLabel: string;
  compareShort: string;
}) {
  const allCategories = useMemo(
    () => [...new Set([...baseRows, ...compareRows].map((r) => r.category))],
    [baseRows, compareRows],
  );

  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

  const selection = useMemo(
    () => ({
      selected: new Set(allCategories.filter((c) => !excluded.has(c))),
      onToggleRow: (category: string) =>
        setExcluded((prev) => {
          const next = new Set(prev);
          if (next.has(category)) next.delete(category);
          else next.add(category);
          return next;
        }),
      onToggleAll: (checked: boolean) => setExcluded(checked ? new Set() : new Set(allCategories)),
    }),
    [allCategories, excluded],
  );

  const counts = (r: BudgetProgress) => !excluded.has(r.category);
  const selectedBase = baseRows.filter(counts);
  const selectedCompare = compareRows.filter(counts);

  const totals = budgetTotals(selectedBase);
  const remaining = totals.budgeted - totals.spent;
  const overCount = selectedBase.filter((r) => r.remaining < 0).length;

  const compareTotals = budgetTotals(selectedCompare);
  const compareRemaining = compareTotals.budgeted - compareTotals.spent;

  const comparisonRows = useMemo(
    () => (compare ? compareBudgetProgress(baseRows, compareRows) : []),
    [compare, baseRows, compareRows],
  );

  const excludedCount = allCategories.filter((c) => excluded.has(c)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total budgeted"
          value={totals.budgeted}
          icon={Target}
          accent="brand"
          hint={
            compare
              ? `${compareShort}: ${formatCompactCurrency(compareTotals.budgeted)}`
              : `${selectedBase.length} of ${baseRows.length} categor${baseRows.length === 1 ? "y" : "ies"} counted`
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

      {excludedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft/50 px-4 py-2.5 text-[13px]">
          <span className="text-text-secondary">
            <span className="font-semibold text-text-primary">{excludedCount}</span> categor
            {excludedCount === 1 ? "y" : "ies"} left out of these totals
          </span>
          <button
            type="button"
            onClick={() => setExcluded(new Set())}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
            Count all
          </button>
        </div>
      )}

      {compare ? (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Month comparison</h3>
            <span className="text-[12.5px] text-text-muted">
              {baseLabel} vs {compareLabel}
            </span>
          </div>
          <BudgetComparisonTable
            rows={comparisonRows}
            baseLabel={baseLabel}
            compareLabel={compareLabel}
            selection={selection}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Budget vs. spent</h3>
              <span className="text-[12.5px] text-text-muted">{baseLabel}</span>
            </div>
            <BudgetTable rows={baseRows} budgets={budgets} selection={selection} />
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Progress</h3>
            </div>
            <BudgetProgressChart data={selectedBase} />
          </Card>
        </div>
      )}
    </div>
  );
}
