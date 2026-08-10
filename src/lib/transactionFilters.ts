import type { Transaction, TransactionKind } from "./types";

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

export function applyFilters(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  let result = transactions;

  if (filters.kind && filters.kind !== "all") {
    result = result.filter((t) => t.kind === filters.kind);
  }
  if (filters.category) {
    result = result.filter((t) => t.category === filters.category);
  }
  if (filters.walletId) {
    result = result.filter((t) => t.walletId === filters.walletId || t.toWalletId === filters.walletId);
  }
  if (filters.from) {
    result = result.filter((t) => t.date >= filters.from!);
  }
  if (filters.to) {
    result = result.filter((t) => t.date <= filters.to!);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (t) => t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }

  const sorted = [...result];
  switch (filters.sort) {
    case "date_asc":
      sorted.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
      break;
    case "amount_desc":
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case "amount_asc":
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case "date_desc":
    default:
      sorted.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      break;
  }
  return sorted;
}
