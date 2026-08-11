import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx } from "@/components/cx";
import { WALLET_TYPE_META } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { Wallet } from "@/lib/types";

export function walletColor(wallet: Wallet): string {
  if (wallet.type === "debt") return "var(--status-critical)";
  return `var(--series-${WALLET_TYPE_META[wallet.type].slot})`;
}

export function WalletCard({
  wallet,
  transactionCount,
  className,
}: {
  wallet: Wallet;
  transactionCount?: number;
  className?: string;
}) {
  const meta = WALLET_TYPE_META[wallet.type];
  const Icon = meta.icon;
  const color = walletColor(wallet);

  return (
    <Link
      href={`/wallets/${wallet.id}`}
      className={cx(
        "group flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md",
        className
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${color} 16%, transparent)`,
            color,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="flex items-center gap-1.5">
          {wallet.archived && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-text-muted">
              Archived
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[11.5px] font-medium"
            style={{
              background: `color-mix(in oklab, ${color} 14%, transparent)`,
              color,
            }}
          >
            {meta.label}
          </span>
        </div>
      </div>
      <div>
        <p className="truncate text-sm font-medium text-text-secondary">
          {wallet.name}
        </p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-text-primary">
          {formatCurrency(wallet.balance, wallet.currency)}
        </p>
      </div>
      {typeof transactionCount === "number" && (
        <p className="text-[12.5px] text-text-muted">
          {transactionCount} transaction{transactionCount === 1 ? "" : "s"}
        </p>
      )}
      <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
        View details <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </Link>
  );
}
