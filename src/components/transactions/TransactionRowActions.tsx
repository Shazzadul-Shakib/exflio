"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { TransactionForm } from "./TransactionForm";
import { deleteTransactionAction } from "@/app/actions/transactions";
import type { Transaction, Wallet } from "@/lib/types";

export function TransactionRowActions({
  transaction,
  wallets,
}: {
  transaction: Transaction;
  wallets: Wallet[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
        aria-label="Edit transaction"
        title="Edit"
      >
        <Pencil className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-status-critical-soft hover:text-status-critical"
        aria-label="Delete transaction"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit transaction"
      >
        <TransactionForm
          wallets={wallets}
          transaction={transaction}
          onSuccess={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete transaction"
      >
        <p className="text-sm text-text-secondary">
          This removes the transaction and reverses its effect on the wallet
          balance. This can&apos;t be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isPending}
            onClick={() => {
              startTransition(async () => {
                await deleteTransactionAction(transaction.id);
                setConfirmOpen(false);
              });
            }}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
