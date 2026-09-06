import { Target } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { BudgetRowActions } from "./BudgetRowActions";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { BudgetProgress } from "@/lib/finance";
import type { Budget } from "@/lib/types";

export function BudgetTable({
  rows,
  budgets,
  showActions = true,
}: {
  rows: BudgetProgress[];
  budgets: Budget[];
  showActions?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No budgets yet"
        description="Set a monthly budget per category to compare it against what you actually spend."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-140 border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 text-right font-medium">Budgeted</th>
            <th className="px-4 py-3 text-right font-medium">Spent</th>
            <th className="px-4 py-3 text-right font-medium">Remaining</th>
            {showActions && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const CategoryIcon = categoryIcon(row.category);
            const budget = budgets.find((b) => b.id === row.budgetId);
            const over = row.remaining < 0;
            return (
              <tr key={row.budgetId} className="border-b border-border last:border-0 hover:bg-surface-2/60">
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
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-text-primary">
                  {formatCurrency(row.budgeted)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-text-primary">
                  {formatCurrency(row.spent)}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium ${
                    over ? "text-status-critical" : "text-status-good"
                  }`}
                >
                  {over ? `-${formatCurrency(Math.abs(row.remaining))}` : formatCurrency(row.remaining)}
                </td>
                {showActions && (
                  <td className="whitespace-nowrap px-2 py-3">
                    {budget && <BudgetRowActions budget={budget} budgets={budgets} />}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
