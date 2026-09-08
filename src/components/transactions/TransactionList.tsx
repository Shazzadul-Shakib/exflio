"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { TransactionTable } from "./TransactionTable";
import { loadMoreTransactionsAction } from "@/app/actions/transactions";
import { parseFilters } from "@/lib/transactionFilters";
import { formatCurrency } from "@/lib/format";
import type { Transaction, Wallet } from "@/lib/types";

export function TransactionList({
  initialItems,
  initialHasMore,
  wallets,
  scopeWalletIds,
}: {
  initialItems: Transaction[];
  initialHasMore: boolean;
  wallets: Wallet[];
  scopeWalletIds?: string[];
}) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The server component re-fetches page 0 whenever filters, sort, or the underlying data change
  // (URL search-param navigation, or a mutation's revalidatePath) — drop back to that fresh page.
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
    setHasMore(initialHasMore);
    setPage(0);
    setSelectedIds(new Set());
  }

  useEffect(() => {
    if (!hasMore || pending) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const nextPage = page + 1;
        startTransition(async () => {
          const filters = parseFilters(Object.fromEntries(searchParams.entries()));
          const result = await loadMoreTransactionsAction(filters, nextPage, scopeWalletIds);
          setItems((prev) => [...prev, ...result.items]);
          setHasMore(result.hasMore);
          setPage(nextPage);
        });
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, pending, searchParams, scopeWalletIds]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(items.map((t) => t.id));
    });
  }

  const selection = useMemo(
    () => ({ selectedIds, onToggleRow: toggleRow, onToggleAll: toggleAll }),
    // toggleAll closes over `items`; recompute when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, items]
  );

  const selected = items.filter((t) => selectedIds.has(t.id));
  const selectedTotal = selected.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft/50 px-4 py-2.5 text-[13px]">
          <span className="text-text-secondary">
            <span className="font-semibold text-text-primary">{selected.length}</span> selected
            <span className="mx-2 text-text-muted">·</span>
            total <span className="font-semibold text-text-primary tabular-nums">{formatCurrency(selectedTotal)}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Clear selection
          </button>
        </div>
      )}
      <TransactionTable transactions={items} wallets={wallets} selection={selection} />
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {pending && <Loader2 className="h-4 w-4 animate-spin text-text-muted" strokeWidth={2} aria-label="Loading more transactions" />}
        </div>
      )}
    </div>
  );
}
