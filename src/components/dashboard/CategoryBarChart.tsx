import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";

export function CategoryBarChart({ data }: { data: { category: string; amount: number }[] }) {
  if (data.length === 0) {
    return <EmptyState icon={BarChart3} title="No spending yet" description="Add an expense to see your category breakdown." />;
  }

  const max = Math.max(...data.map((d) => d.amount));

  return (
    <div className="flex flex-col gap-3">
      {data.slice(0, 8).map((d) => {
        const pct = max > 0 ? Math.max((d.amount / max) * 100, 3) : 0;
        const slot = categorySlot(d.category);
        const Icon = categoryIcon(d.category);
        return (
          <div key={d.category} className="flex items-center gap-3">
            <div className="flex w-32 shrink-0 items-center gap-1.5 text-[13px] text-text-secondary">
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">{d.category}</span>
            </div>
            <div className="relative h-6 flex-1 rounded-full bg-surface-2">
              <div
                className="h-6 rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%`, background: `var(--series-${slot})` }}
              />
            </div>
            <div className="w-21 shrink-0 text-right text-[13px] font-medium tabular-nums text-text-primary">
              {formatCurrency(d.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
