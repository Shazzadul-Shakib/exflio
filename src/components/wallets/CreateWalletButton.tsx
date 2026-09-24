"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { WalletForm } from "./WalletForm";
import type { Wallet, WalletType } from "@/lib/types";

export function CreateWalletButton({
  label,
  wallets = [],
  defaultType = "cash",
}: {
  label?: string;
  wallets?: Wallet[];
  defaultType?: WalletType;
}) {
  const t = useTranslations("Wallets");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label ?? t("addWallet")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("newWallet")}>
        <WalletForm wallets={wallets} defaultType={defaultType} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
