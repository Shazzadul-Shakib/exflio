"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, SlidersHorizontal } from "lucide-react";
import { cx } from "@/components/cx";
import { categoryIcon } from "@/lib/categories";

/**
 * A checkbox popover that drops categories out of the budgets page's totals, table,
 * and chart. The excluded set lives in the `hide` query param (comma-separated) so
 * the choice survives a refresh and rides along with the month pickers.
 */
export function CategoryFilter({
  categories,
  hidden,
}: {
  /** Every category budgeted in the month(s) currently on screen. */
  categories: string[];
  /** Categories currently excluded (may include entries not in `categories` — those are kept but not shown). */
  hidden: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hiddenSet = new Set(hidden);
  const activeHidden = categories.filter((c) => hiddenSet.has(c));

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) params.delete("hide");
    else params.set("hide", next.join(","));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggle(category: string) {
    commit(hiddenSet.has(category) ? hidden.filter((c) => c !== category) : [...hidden, category]);
  }

  const label =
    activeHidden.length === 0
      ? "All categories"
      : `${activeHidden.length} categor${activeHidden.length === 1 ? "y" : "ies"} hidden`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cx(
          "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
          activeHidden.length > 0
            ? "border-brand bg-brand-soft text-brand"
            : "border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-lg border border-border bg-surface py-1 shadow-lg animate-fade-in">
          {categories.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-text-muted">No budgeted categories in view.</p>
          ) : (
            <>
              <p className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-muted">
                Include in totals
              </p>
              <div className="max-h-72 overflow-y-auto py-0.5">
                {categories.map((c) => {
                  const shown = !hiddenSet.has(c);
                  const CategoryIcon = categoryIcon(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={shown}
                      onClick={() => toggle(c)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2"
                    >
                      <span
                        className={cx(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          shown ? "border-brand bg-brand text-brand-contrast" : "border-border-strong",
                        )}
                      >
                        {shown && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
                      <span className="min-w-0 truncate">{c}</span>
                    </button>
                  );
                })}
              </div>
              {activeHidden.length > 0 && (
                <div className="mt-0.5 border-t border-border px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => commit(hidden.filter((c) => !categories.includes(c)))}
                    className="w-full rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-brand hover:bg-surface-2"
                  >
                    Show all categories
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
