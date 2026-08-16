import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getTransactionsPage } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { totalSavings } from "@/lib/finance";
import { StatCard } from "@/components/dashboard/StatCard";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Savings — Exflio" };

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [wallets, rawParams] = await Promise.all([getUserWallets(user.id), searchParams]);

  // History includes archived savings wallets too, so their transactions stay
  // visible here even if they later drop off the active list below.
  const allSavingsWallets = wallets.filter((w) => w.type === "savings");
  const savingsWallets = allSavingsWallets.filter((w) => !w.archived);
  const savingsIds = allSavingsWallets.map((w) => w.id);

  const filters = parseFilters(rawParams);
  const page =
    savingsIds.length > 0
      ? await getTransactionsPage(user.id, filters, 0, { walletIds: savingsIds })
      : { items: [], hasMore: false };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Savings</h2>
          <p className="text-[13px] text-text-muted">Money set aside, growing quietly in the background.</p>
        </div>
        <CreateWalletButton label="Add savings wallet" wallets={wallets} defaultType="savings" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total savings" value={totalSavings(wallets)} icon={PiggyBank} accent="good" hint={`${savingsWallets.length} wallet${savingsWallets.length === 1 ? "" : "s"}`} />
        {savingsWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {allSavingsWallets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No savings wallets yet"
          description="Create a savings wallet, then transfer money into it to start building a cushion."
          action={<CreateWalletButton label="Create a savings wallet" wallets={wallets} defaultType="savings" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">History</h3>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} defaultWalletId={savingsWallets[0]?.id} />
          </div>
          <FilterBar wallets={allSavingsWallets} showWalletFilter />
          <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={wallets} scopeWalletIds={savingsIds} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        Tip: record a <span className="font-medium text-text-primary">transfer</span> from a cash or bank wallet into a savings
        wallet to move money into savings — its balance updates automatically.
      </p>
    </div>
  );
}
