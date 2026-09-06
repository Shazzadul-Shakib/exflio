import { Target } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { BudgetProgress } from "@/lib/finance";

export function BudgetProgressChart({ data }: { data: BudgetProgress[] }) {
  if (data.length === 0) {
    return (
      <EmptyState icon={Target} title="No budgets yet" description="Create a budget to see your spending progress here." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((row) => {
        const slot = categorySlot(row.category);
        const Icon = categoryIcon(row.category);
        const over = row.pct > 100;
        const fillPct = Math.min(Math.max(row.pct, row.spent > 0 ? 2 : 0), 100);
        return (
          <div key={row.budgetId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-text-primary">
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="truncate">{row.category}</span>
              </span>
              <span className={`shrink-0 tabular-nums ${over ? "font-medium text-status-critical" : "text-text-secondary"}`}>
                {formatCurrency(row.spent)} / {formatCurrency(row.budgeted)}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-surface-2">
              <div
                className="h-2.5 rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${fillPct}%`,
                  background: over ? "var(--status-critical)" : `var(--series-${slot})`,
                }}
              />
            </div>
            <span className={`text-[12px] ${over ? "text-status-critical" : "text-text-muted"}`}>
              {over ? `${Math.round(row.pct - 100)}% over budget` : `${Math.round(row.pct)}% used`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
