"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TransactionTable } from "./TransactionTable";
import { loadMoreTransactionsAction } from "@/app/actions/transactions";
import { parseFilters } from "@/lib/transactionFilters";
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
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The server component re-fetches page 0 whenever filters, sort, or the underlying data change
  // (URL search-param navigation, or a mutation's revalidatePath) — drop back to that fresh page.
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
    setHasMore(initialHasMore);
    setPage(0);
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

  return (
    <div className="flex flex-col gap-3">
      <TransactionTable transactions={items} wallets={wallets} />
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {pending && <Loader2 className="h-4 w-4 animate-spin text-text-muted" strokeWidth={2} aria-label="Loading more transactions" />}
        </div>
      )}
    </div>
  );
}
