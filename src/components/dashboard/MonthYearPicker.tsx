"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dropdown } from "@/components/Dropdown";
import { MONTH_NAMES, shiftYearMonth } from "@/lib/format";

export function MonthYearPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(y: number, m: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    params.set("month", String(m));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);
  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => nowYear - 5 + i);

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface p-1">
      <button
        type="button"
        onClick={() => go(prev.year, prev.month)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </button>
      <Dropdown
        variant="ghost"
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
        aria-label="Month"
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Dropdown>
      <Dropdown
        variant="ghost"
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        aria-label="Year"
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
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
