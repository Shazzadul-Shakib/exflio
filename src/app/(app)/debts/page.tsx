import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions } from "@/lib/queries";
import { parseFilters, applyFilters } from "@/lib/transactionFilters";
import { totalDebt } from "@/lib/finance";
import { StatCard } from "@/components/dashboard/StatCard";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Debts — Exflio" };

export default async function DebtsPage({
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

  const debtWallets = wallets.filter((w) => w.type === "debt" && !w.archived);
  const debtIds = new Set(debtWallets.map((w) => w.id));
  const related = transactions.filter((t) => debtIds.has(t.walletId) || (t.toWalletId && debtIds.has(t.toWalletId)));

  const filters = parseFilters(rawParams);
  const filtered = applyFilters(related, filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Debts</h2>
          <p className="text-[13px] text-text-muted">Credit cards and loans — what you owe, at a glance.</p>
        </div>
        <CreateWalletButton label="Add debt wallet" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total owed" value={totalDebt(wallets)} icon={CreditCard} accent="critical" hint={`${debtWallets.length} wallet${debtWallets.length === 1 ? "" : "s"}`} />
        {debtWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {debtWallets.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debt wallets yet"
          description="Add a debt wallet for a credit card or loan to track what you owe and pay it down over time."
          action={<CreateWalletButton label="Create a debt wallet" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">History</h3>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} defaultWalletId={debtWallets[0]?.id} />
          </div>
          <FilterBar wallets={debtWallets} showWalletFilter />
          <TransactionTable transactions={filtered} wallets={wallets} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        Tip: an <span className="font-medium text-text-primary">expense</span> on a debt wallet increases what you owe (e.g.
        a credit card purchase); a <span className="font-medium text-text-primary">transfer</span> into it from cash or bank
        pays it down.
      </p>
    </div>
  );
}
