import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { TransactionRowActions } from "./TransactionRowActions";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Transaction, Wallet } from "@/lib/types";

function walletName(wallets: Wallet[], id: string | null): string {
  if (!id) return "—";
  return wallets.find((w) => w.id === id)?.name ?? "Deleted wallet";
}

function AmountCell({ transaction }: { transaction: Transaction }) {
  if (transaction.kind === "expense") {
    return (
      <span className="font-medium text-status-critical">
        -{formatCurrency(transaction.amount)}
      </span>
    );
  }
  if (transaction.kind === "income") {
    return (
      <span className="font-medium text-status-good">
        +{formatCurrency(transaction.amount)}
      </span>
    );
  }
  return (
    <span className="font-medium text-text-primary">
      {formatCurrency(transaction.amount)}
    </span>
  );
}

function KindBadge({ kind }: { kind: Transaction["kind"] }) {
  const styles: Record<Transaction["kind"], string> = {
    expense: "bg-status-critical-soft text-status-critical",
    income: "bg-status-good-soft text-status-good",
    transfer: "bg-brand-soft text-brand",
  };
  const labels: Record<Transaction["kind"], string> = {
    expense: "Expense",
    income: "Income",
    transfer: "Transfer",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium ${styles[kind]}`}
    >
      {labels[kind]}
    </span>
  );
}

export function TransactionTable({
  transactions,
  wallets,
}: {
  transactions: Transaction[];
  wallets: Wallet[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No transactions match"
        description="Try widening your filters, or add a new transaction to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-180 border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Wallet</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const CategoryIcon = categoryIcon(t.category);
            return (
              <tr
                key={t.id}
                className="border-b border-border last:border-0 hover:bg-surface-2/60"
              >
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {formatDate(t.date)}
                </td>
                <td
                  className="max-w-55 truncate px-4 py-3 text-text-primary"
                  title={t.note || undefined}
                >
                  {t.note || <span className="text-text-muted">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-text-secondary">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: `var(--series-${categorySlot(t.category)})`,
                      }}
                    />
                    <CategoryIcon
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {t.category}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {t.kind === "transfer" ? (
                    <span>
                      {walletName(wallets, t.walletId)}{" "}
                      <span className="text-text-muted">→</span>{" "}
                      {walletName(wallets, t.toWalletId)}
                    </span>
                  ) : (
                    walletName(wallets, t.walletId)
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <KindBadge kind={t.kind} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <AmountCell transaction={t} />
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <TransactionRowActions transaction={t} wallets={wallets} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
