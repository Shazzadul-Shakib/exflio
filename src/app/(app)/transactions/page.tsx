import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getUserWallets, getTransactionsPage, getTransactionsSummary } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { formatCurrency } from "@/lib/format";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";

export const metadata: Metadata = { title: "Transactions — Exflio" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [wallets, rawParams] = await Promise.all([getUserWallets(user.id), searchParams]);
  const filters = parseFilters(rawParams);

  const [page, summary] = await Promise.all([
    getTransactionsPage(user.id, filters, 0),
    getTransactionsSummary(user.id, filters),
  ]);
  const activeWallets = wallets.filter((w) => !w.archived);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Transactions</h2>
          <p className="text-[13px] text-text-muted">Every expense, income and transfer across your wallets.</p>
        </div>
        <AddTransactionButton wallets={activeWallets} />
      </div>

      <FilterBar wallets={activeWallets} showWalletFilter />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-text-secondary">
        <span>
          <span className="font-medium text-text-primary">{summary.count}</span> result{summary.count === 1 ? "" : "s"}
        </span>
        <span>
          Income <span className="font-medium text-status-good">+{formatCurrency(summary.incomeTotal)}</span>
        </span>
        <span>
          Expense <span className="font-medium text-status-critical">-{formatCurrency(summary.expenseTotal)}</span>
        </span>
      </div>

      <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={wallets} />
    </div>
  );
}
