"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dropdown } from "@/components/Dropdown";
import { cx } from "@/components/cx";
import { getMonthNames, shiftYearMonth } from "@/lib/format";

export function MonthYearPicker({
  year,
  month,
  yearKey = "year",
  monthKey = "month",
  ariaPrefix = "",
  className,
}: {
  year: number;
  month: number;
  /** Query-string key the selected year is written to — override to run a second, independent picker on the same page. */
  yearKey?: string;
  /** Query-string key the selected month is written to. */
  monthKey?: string;
  /** Prefixed onto the prev/next button labels so screen readers can tell two pickers apart. */
  ariaPrefix?: string;
  className?: string;
}) {
  const t = useTranslations("MonthYearPicker");
  const locale = useLocale();
  const monthNames = getMonthNames(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(y: number, m: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(yearKey, String(y));
    params.set(monthKey, String(m));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => nowYear - 5 + i);
  const label = (suffix: string) => `${ariaPrefix}${ariaPrefix ? " " : ""}${suffix}`;

  return (
    <div className={cx("flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-1", className)}>
      <button
        type="button"
        onClick={() => go(prev.year, prev.month)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
        aria-label={label(t("previousMonth"))}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </button>
      <Dropdown
        variant="ghost"
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
        aria-label={label(t("month"))}
      >
        {monthNames.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Dropdown>
      <Dropdown
        variant="ghost"
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        aria-label={label(t("year"))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Dropdown>
      <button
        type="button"
        onClick={() => go(next.year, next.month)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
        aria-label={label(t("nextMonth"))}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
