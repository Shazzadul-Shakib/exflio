import { getLocale, getTranslations } from "next-intl/server";
import { TrendingDown } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { CategoryComparisonRow } from "@/lib/finance";

/** Signed amount difference (base − compare). Spending less than the compared month reads as good. */
function AmountDelta({ value, locale }: { value: number; locale: string }) {
  if (Math.abs(value) < 0.005) return <span className="text-text-muted">—</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-status-critical" : "text-status-good"}>
      {up ? "+" : "-"}
      {formatCurrency(Math.abs(value), "BDT", locale)}
    </span>
  );
}

/** Category-by-category expense comparison between two months — the transactions-page counterpart to BudgetComparisonTable. */
export async function CategoryComparisonTable({
  rows,
  baseLabel,
  compareLabel,
}: {
  rows: CategoryComparisonRow[];
  baseLabel: string;
  compareLabel: string;
}) {
  const [t, tCategories, tCommon, locale] = await Promise.all([
    getTranslations("Transactions"),
    getTranslations("Categories"),
    getTranslations("Common"),
    getLocale(),
  ]);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={TrendingDown}
        title={t("nothingToCompare")}
        description={t("nothingToCompareDesc", { base: baseLabel, compare: compareLabel })}
      />
    );
  }

  const totals = rows.reduce(
    (acc, r) => ({ base: acc.base + r.baseAmount, compare: acc.compare + r.compareAmount }),
    { base: 0, compare: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-140 border-collapse text-sm">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-wide text-text-muted">
            <th className="border-b border-border px-4 py-3 font-medium">{t("category")}</th>
            <th className="border-b border-l border-border px-4 py-3 text-right font-medium">{baseLabel}</th>
            <th className="border-b border-l border-border px-4 py-3 text-right font-medium">{compareLabel}</th>
            <th className="border-b border-l border-border px-4 py-3 text-right font-medium">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const CategoryIcon = categoryIcon(row.category);
            return (
              <tr key={row.category} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-text-secondary">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: `var(--series-${categorySlot(row.category)})` }}
                    />
                    <CategoryIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {tCategories(row.category)}
                  </span>
                </td>
                <td className="whitespace-nowrap border-l border-border px-4 py-3 text-right tabular-nums text-text-primary">
                  {formatCurrency(row.baseAmount, "BDT", locale)}
                </td>
                <td className="whitespace-nowrap border-l border-border px-4 py-3 text-right tabular-nums text-text-primary">
                  {formatCurrency(row.compareAmount, "BDT", locale)}
                </td>
                <td className="whitespace-nowrap border-l border-border px-4 py-3 text-right font-medium tabular-nums">
                  <AmountDelta value={row.delta} locale={locale} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-medium text-text-primary">
            <td className="px-4 py-3">{tCommon("total")}</td>
            <td className="border-l border-border px-4 py-3 text-right tabular-nums">{formatCurrency(totals.base, "BDT", locale)}</td>
            <td className="border-l border-border px-4 py-3 text-right tabular-nums">{formatCurrency(totals.compare, "BDT", locale)}</td>
            <td className="border-l border-border px-4 py-3 text-right tabular-nums">
              <AmountDelta value={totals.base - totals.compare} locale={locale} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
