import type { Metadata } from "next";
import { Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions } from "@/lib/queries";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { EmptyState } from "@/components/ui";
import { WALLET_TYPE_META } from "@/lib/categories";
import type { Wallet, WalletType } from "@/lib/types";

export const metadata: Metadata = { title: "Wallets — Exflio" };

const SECTION_ORDER: WalletType[] = ["cash", "bank", "savings", "debt"];

export default async function WalletsPage() {
  const user = await requireUser();
  const [wallets, transactions] = await Promise.all([getUserWallets(user.id), getUserTransactions(user.id)]);

  const countFor = (w: Wallet) => transactions.filter((t) => t.walletId === w.id || t.toWalletId === w.id).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Wallets</h2>
          <p className="text-[13px] text-text-muted">Cash, bank, savings and debt accounts in one place.</p>
        </div>
        <CreateWalletButton />
      </div>

      {wallets.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No wallets yet" description="Create your first wallet to start tracking money." action={<CreateWalletButton label="Create a wallet" />} />
      ) : (
        SECTION_ORDER.map((type) => {
          const group = wallets.filter((w) => w.type === type);
          if (group.length === 0) return null;
          const Icon = WALLET_TYPE_META[type].icon;
          return (
            <div key={type}>
              <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {WALLET_TYPE_META[type].label}
              </h3>
              <div className="flex flex-wrap gap-4">
                {group.map((w) => (
                  <WalletCard key={w.id} wallet={w} transactionCount={countFor(w)} className="sm:w-80" />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
