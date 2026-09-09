import { Target } from "lucide-react";
import { EmptyState, cx } from "@/components/ui";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { BudgetComparisonRow } from "@/lib/finance";
import type { BudgetSelection } from "./BudgetTable";

/** A right-aligned money cell. Renders a muted dash when the month had no budget for the category. */
function Money({ value, over, divider }: { value?: number; over?: boolean; divider?: boolean }) {
  return (
    <td
      className={cx(
        "whitespace-nowrap px-4 py-3 text-right tabular-nums",
        over ? "text-status-critical" : "text-text-primary",
        divider && "border-l border-border",
      )}
    >
      {value === undefined ? <span className="text-text-muted">—</span> : formatCurrency(value)}
    </td>
  );
}

/** Signed spend difference (base − compare). Spending less than the compared month reads as good. */
function SpentDelta({ value }: { value: number }) {
  if (Math.abs(value) < 0.005) return <span className="text-text-muted">—</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-status-critical" : "text-status-good"}>
      {up ? "+" : "-"}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

export function BudgetComparisonTable({
  rows,
  baseLabel,
  compareLabel,
  selection,
}: {
  rows: BudgetComparisonRow[];
  baseLabel: string;
  compareLabel: string;
  selection?: BudgetSelection;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Nothing to compare"
        description={`Neither ${baseLabel} nor ${compareLabel} has a budget yet.`}
      />
    );
  }

  const included = (category: string) => (selection ? selection.selected.has(category) : true);
  const selectedCount = selection ? rows.filter((r) => included(r.category)).length : 0;
  const allSelected = selectedCount === rows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const totals = rows.reduce(
    (acc, r) => {
      if (!included(r.category)) return acc;
      return {
        baseBudgeted: acc.baseBudgeted + (r.base?.budgeted ?? 0),
        baseSpent: acc.baseSpent + (r.base?.spent ?? 0),
        compareBudgeted: acc.compareBudgeted + (r.compare?.budgeted ?? 0),
        compareSpent: acc.compareSpent + (r.compare?.spent ?? 0),
      };
    },
    { baseBudgeted: 0, baseSpent: 0, compareBudgeted: 0, compareSpent: 0 },
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-180 border-collapse text-sm">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-wide text-text-muted">
            {selection && (
              <th rowSpan={2} className="border-b border-border px-4 py-3 align-bottom">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer accent-brand align-middle"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => selection.onToggleAll(e.target.checked)}
                  aria-label="Count every category toward the totals"
                />
              </th>
            )}
            <th rowSpan={2} className="border-b border-border px-4 py-3 align-bottom font-medium">
              Category
            </th>
            <th colSpan={2} className="border-b border-l border-border px-4 py-2 text-center font-medium">
              {baseLabel}
            </th>
            <th colSpan={2} className="border-b border-l border-border px-4 py-2 text-center font-medium">
              {compareLabel}
            </th>
            <th rowSpan={2} className="border-b border-l border-border px-4 py-3 text-right align-bottom font-medium">
              Δ Spent
            </th>
          </tr>
          <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
            <th className="border-b border-l border-border px-4 py-2 text-right font-medium">Budget</th>
            <th className="border-b border-border px-4 py-2 text-right font-medium">Spent</th>
            <th className="border-b border-l border-border px-4 py-2 text-right font-medium">Budget</th>
            <th className="border-b border-border px-4 py-2 text-right font-medium">Spent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const CategoryIcon = categoryIcon(row.category);
            const isIn = included(row.category);
            return (
              <tr
                key={row.category}
                className={cx(
                  "border-b border-border last:border-0 hover:bg-surface-2/60",
                  !isIn && "opacity-45",
                )}
              >
                {selection && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer accent-brand align-middle"
                      checked={isIn}
                      onChange={() => selection.onToggleRow(row.category)}
                      aria-label={`Count ${row.category} toward the totals`}
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-text-secondary">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: `var(--series-${categorySlot(row.category)})` }}
                    />
                    <CategoryIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {row.category}
                  </span>
                </td>
                <Money value={row.base?.budgeted} divider />
                <Money value={row.base?.spent} over={row.base ? row.base.remaining < 0 : false} />
                <Money value={row.compare?.budgeted} divider />
                <Money value={row.compare?.spent} over={row.compare ? row.compare.remaining < 0 : false} />
                <td className="whitespace-nowrap border-l border-border px-4 py-3 text-right font-medium tabular-nums">
                  <SpentDelta value={row.spentDelta} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-medium text-text-primary">
            {selection && <td className="px-4 py-3" />}
            <td className="px-4 py-3">Total</td>
            <td className="border-l border-border px-4 py-3 text-right tabular-nums">
              {formatCurrency(totals.baseBudgeted)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.baseSpent)}</td>
            <td className="border-l border-border px-4 py-3 text-right tabular-nums">
              {formatCurrency(totals.compareBudgeted)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.compareSpent)}</td>
            <td className="border-l border-border px-4 py-3 text-right tabular-nums">
              <SpentDelta value={totals.baseSpent - totals.compareSpent} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
