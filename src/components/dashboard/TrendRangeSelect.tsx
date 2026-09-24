"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Dropdown } from "@/components/Dropdown";
import type { TrendRange } from "@/lib/finance";

const OPTIONS: { value: TrendRange; key: "week" | "month" | "lastMonth" | "sixMonths" }[] = [
  { value: "week", key: "week" },
  { value: "month", key: "month" },
  { value: "last-month", key: "lastMonth" },
  { value: "6-months", key: "sixMonths" },
];

/** Drives the "Income vs. expense" card's range via the `trend` query param. */
export function TrendRangeSelect({ value }: { value: TrendRange }) {
  const t = useTranslations("TrendRange");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("trend", range);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Dropdown variant="ghost" value={value} onChange={(e) => set(e.target.value)} aria-label={t("ariaLabel")}>
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {t(o.key)}
        </option>
      ))}
    </Dropdown>
  );
}
