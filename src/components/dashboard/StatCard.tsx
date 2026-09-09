import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui";
import { formatCompactCurrency } from "@/lib/format";

const accentStyles = {
  brand: "bg-brand-soft text-brand",
  good: "bg-status-good-soft text-status-good",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-surface-2 text-text-secondary",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  delta,
  deltaGoodDirection = "up",
  /** Trailing text after the delta percentage. Defaults to the dashboard's month-over-month wording. */
  deltaLabel = "vs last month",
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: keyof typeof accentStyles;
  delta?: number;
  deltaGoodDirection?: "up" | "down";
  deltaLabel?: string;
  hint?: string;
}) {
  const hasDelta =
    typeof delta === "number" && Number.isFinite(delta) && delta !== 0;
  const deltaUp = (delta ?? 0) > 0;
  const isGood = hasDelta && (deltaGoodDirection === "up" ? deltaUp : !deltaUp);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-secondary">
          {label}
        </span>
        <span
          className={cx(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accentStyles[accent],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-text-primary">
          {formatCompactCurrency(value)}
        </span>
      </div>
      {hasDelta ? (
        <span
          className={cx(
            "inline-flex w-fit items-center gap-1 text-[12.5px] font-medium",
            isGood ? "text-status-good" : "text-status-critical",
          )}
        >
          {deltaUp ? (
            <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
          )}
          {Math.abs(delta!).toFixed(0)}% {deltaLabel}
        </span>
      ) : hint ? (
        <span className="text-[12.5px] text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
