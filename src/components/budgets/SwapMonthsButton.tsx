"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

/** Swaps the base month (`year`/`month`) with the comparison month (`cy`/`cm`). */
export function SwapMonthsButton({
  year,
  month,
  compareYear,
  compareMonth,
}: {
  year: number;
  month: number;
  compareYear: number;
  compareMonth: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function swap() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(compareYear));
    params.set("month", String(compareMonth));
    params.set("cy", String(year));
    params.set("cm", String(month));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={swap}
      aria-label="Swap the two months"
      title="Swap months"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
    >
      <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
