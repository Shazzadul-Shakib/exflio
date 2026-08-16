import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getTransactionsPage } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { totalDebt } from "@/lib/finance";
import { StatCard } from "@/components/dashboard/StatCard";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Debts — Exflio" };

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [wallets, rawParams] = await Promise.all([getUserWallets(user.id), searchParams]);

  // History includes archived (paid-off) debt wallets too, so a cleared debt's
  // transactions stay visible here even after it drops off the active list below.
  const allDebtWallets = wallets.filter((w) => w.type === "debt");
  const debtWallets = allDebtWallets.filter((w) => !w.archived);
  const debtIds = allDebtWallets.map((w) => w.id);

  const filters = parseFilters(rawParams);
  const page =
    debtIds.length > 0
      ? await getTransactionsPage(user.id, filters, 0, { walletIds: debtIds })
      : { items: [], hasMore: false };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Debts</h2>
          <p className="text-[13px] text-text-muted">Credit cards and loans — what you owe, at a glance.</p>
        </div>
        <CreateWalletButton label="Add debt wallet" wallets={wallets} defaultType="debt" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total owed" value={totalDebt(wallets)} icon={CreditCard} accent="critical" hint={`${debtWallets.length} wallet${debtWallets.length === 1 ? "" : "s"}`} />
        {debtWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {allDebtWallets.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debt wallets yet"
          description="Add a debt wallet for a credit card or loan to track what you owe and pay it down over time."
          action={<CreateWalletButton label="Create a debt wallet" wallets={wallets} defaultType="debt" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">History</h3>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} defaultWalletId={debtWallets[0]?.id} />
          </div>
          <FilterBar wallets={allDebtWallets} showWalletFilter />
          <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={wallets} scopeWalletIds={debtIds} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        Tip: an <span className="font-medium text-text-primary">expense</span> on a debt wallet increases what you owe (e.g.
        a credit card purchase); use <span className="font-medium text-text-primary">Clear debt</span> on a wallet&apos;s
        page to pay it down. Once it&apos;s fully paid off, the wallet drops off the Wallets page — its history stays
        visible here.
      </p>
    </div>
  );
}
