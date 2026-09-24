import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Debts" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [wallets, rawParams, t, tCommon, tWallets, locale] = await Promise.all([
    getUserWallets(user.id),
    searchParams,
    getTranslations("Debts"),
    getTranslations("Common"),
    getTranslations("Wallets"),
    getLocale(),
  ]);

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
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <CreateWalletButton label={t("addDebtWallet")} wallets={wallets} defaultType="debt" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalOwed")} value={totalDebt(wallets)} icon={CreditCard} accent="critical" locale={locale} hint={tCommon("walletCount", { count: debtWallets.length })} />
        {debtWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {allDebtWallets.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t("noDebtWalletsTitle")}
          description={t("noDebtWalletsDesc")}
          action={<CreateWalletButton label={t("createDebtWallet")} wallets={wallets} defaultType="debt" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("history")}</h3>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} defaultWalletId={debtWallets[0]?.id} />
          </div>
          <FilterBar wallets={allDebtWallets} showWalletFilter />
          <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={wallets} scopeWalletIds={debtIds} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        {t.rich("tip", {
          expense: tCommon("kindExpense"),
          clearDebt: tWallets("clearDebt"),
          b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
        })}
      </p>
    </div>
  );
}
