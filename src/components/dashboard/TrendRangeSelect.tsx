"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/Dropdown";
import type { TrendRange } from "@/lib/finance";

const OPTIONS: { value: TrendRange; label: string }[] = [
  { value: "week", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "6-months", label: "Last 6 months" },
];

/** Drives the "Income vs. expense" card's range via the `trend` query param. */
export function TrendRangeSelect({ value }: { value: TrendRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("trend", range);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Dropdown variant="ghost" value={value} onChange={(e) => set(e.target.value)} aria-label="Trend range">
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Dropdown>
  );
}
