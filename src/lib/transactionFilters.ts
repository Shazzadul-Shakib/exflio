import type { TransactionKind } from "./types";

export type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export interface TransactionFilters {
  q?: string;
  kind?: TransactionKind | "all";
  category?: string;
  walletId?: string;
  from?: string;
  to?: string;
  sort?: SortKey;
}

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): TransactionFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    q: get("q") || undefined,
    kind: (get("kind") as TransactionKind | "all") || "all",
    category: get("category") || undefined,
    walletId: get("walletId") || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    sort: (get("sort") as SortKey) || "date_desc",
  };
}
