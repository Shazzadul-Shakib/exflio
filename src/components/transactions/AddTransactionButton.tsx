"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TransactionForm } from "./TransactionForm";
import type { Wallet } from "@/lib/types";

export function AddTransactionButton({
  wallets,
  defaultWalletId,
  label = "Add transaction",
  variant = "primary",
}: {
  wallets: Wallet[];
  defaultWalletId?: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
}) {
  const [open, setOpen] = useState(false);

  if (wallets.length === 0) return null;

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add transaction">
        <TransactionForm wallets={wallets} defaultWalletId={defaultWalletId} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
