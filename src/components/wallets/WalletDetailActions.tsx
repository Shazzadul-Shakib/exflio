"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import {
  updateWalletAction,
  deleteWalletAction,
  type WalletFormState,
} from "@/app/actions/wallets";
import { Button, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import type { Wallet } from "@/lib/types";

const initialState: WalletFormState = {};

function EditWalletForm({
  wallet,
  onSuccess,
}: {
  wallet: Wallet;
  onSuccess: () => void;
}) {
  const action = updateWalletAction.bind(null, wallet.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field
        label="Wallet name"
        htmlFor="edit-name"
        error={state.fieldErrors?.name}
      >
        <Input id="edit-name" name="name" defaultValue={wallet.name} required />
      </Field>
      <Field label="Note" htmlFor="edit-note">
        <Input
          id="edit-note"
          name="note"
          defaultValue={wallet.note}
          maxLength={140}
        />
      </Field>
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function WalletDetailActions({ wallet }: { wallet: Wallet }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="hover:bg-status-critical-soft! hover:text-status-critical!"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        Delete
      </Button>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit wallet"
      >
        <EditWalletForm wallet={wallet} onSuccess={() => setEditOpen(false)} />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete wallet"
      >
        <p className="text-sm text-text-secondary">
          Deleting{" "}
          <span className="font-medium text-text-primary">{wallet.name}</span>{" "}
          also removes every transaction linked to it. This can&apos;t be
          undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-text-secondary hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await deleteWalletAction(wallet.id);
                router.push("/wallets");
              });
            }}
            className="h-9 rounded-lg bg-status-critical px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Deleting…" : "Delete wallet"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
