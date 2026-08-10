"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { WalletForm } from "./WalletForm";

export function CreateWalletButton({ label = "Add wallet" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New wallet">
        <WalletForm onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
