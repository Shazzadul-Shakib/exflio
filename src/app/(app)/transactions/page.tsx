import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions } from "@/lib/queries";
import { parseFilters, applyFilters } from "@/lib/transactionFilters";
import { sumBy } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";

export const metadata: Metadata = { title: "Transactions — Exflio" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [wallets, transactions, rawParams] = await Promise.all([
    getUserWallets(user.id),
    getUserTransactions(user.id),
    searchParams,
  ]);

  const filters = parseFilters(rawParams);
  const filtered = applyFilters(transactions, filters);
  const activeWallets = wallets.filter((w) => !w.archived);

  const expenseTotal = sumBy(filtered.filter((t) => t.kind === "expense"), (t) => t.amount);
  const incomeTotal = sumBy(filtered.filter((t) => t.kind === "income"), (t) => t.amount);

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
          <span className="font-medium text-text-primary">{filtered.length}</span> result{filtered.length === 1 ? "" : "s"}
        </span>
        <span>
          Income <span className="font-medium text-status-good">+{formatCurrency(incomeTotal)}</span>
        </span>
        <span>
          Expense <span className="font-medium text-status-critical">-{formatCurrency(expenseTotal)}</span>
        </span>
      </div>

      <TransactionTable transactions={filtered} wallets={wallets} />
    </div>
  );
}
