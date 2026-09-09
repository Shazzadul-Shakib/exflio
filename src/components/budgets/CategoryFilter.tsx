"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

/**
 * Drops one category out of the budgets page's totals, table, chart and
 * comparison. Mirrors the single-select category filter on the Transactions
 * page; the excluded category lives in the `hide` query param.
 */
export function CategoryFilter({
  categories,
  className,
}: {
  /** Categories offered for exclusion — those budgeted in the month(s) on screen. */
  categories: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setExcluded(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) params.set("hide", category);
    else params.delete("hide");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Select
      value={searchParams.get("hide") ?? ""}
      onChange={(e) => setExcluded(e.target.value)}
      className={className ?? "w-full sm:w-52"}
      aria-label="Exclude a category from totals"
    >
      <option value="">All categories</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {`Without ${c}`}
        </option>
      ))}
    </Select>
  );
}
