"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CircleDollarSign, Pencil, Trash2 } from "lucide-react";
import {
  updateWalletAction,
  deleteWalletAction,
  type WalletFormState,
} from "@/app/actions/wallets";
import {
  createTransactionAction,
  type TransactionFormState,
} from "@/app/actions/transactions";
import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { formatCurrency, todayIso, walletBalanceLabel } from "@/lib/format";
import type { Wallet } from "@/lib/types";

const initialState: WalletFormState = {};
const initialClearState: TransactionFormState = {};

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
      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function ClearDebtForm({
  wallet,
  wallets,
  onSuccess,
}: {
  wallet: Wallet;
  wallets: Wallet[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(createTransactionAction, initialClearState);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState(wallet.balance);
  const amount = mode === "full" ? wallet.balance : partialAmount;
  const sourceWallets = wallets.filter((w) => !w.archived && w.id !== wallet.id && w.type !== "debt");
  const [payFromId, setPayFromId] = useState(sourceWallets[0]?.id ?? "");
  const payFromWallet = sourceWallets.find((w) => w.id === payFromId);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const overDebt = amount > wallet.balance;
  const insufficientFunds = !!payFromWallet && amount > payFromWallet.balance;
  const amountError = overDebt
    ? `You only owe ${formatCurrency(wallet.balance, wallet.currency)}.`
    : insufficientFunds
      ? `Only ${formatCurrency(payFromWallet!.balance, payFromWallet!.currency)} available in ${payFromWallet!.name}.`
      : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="kind" value="transfer" />
      <input type="hidden" name="toWalletId" value={wallet.id} />
      {/* No category field: the server tags this "Debt" automatically since it lands in a debt wallet. */}
      <input type="hidden" name="date" value={todayIso()} />

      <p className="text-[13px] text-text-secondary">
        You owe{" "}
        <span className="font-medium text-text-primary">{formatCurrency(wallet.balance, wallet.currency)}</span> on{" "}
        <span className="font-medium text-text-primary">{wallet.name}</span>.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {([
          { value: "full", label: "Full clear" },
          { value: "partial", label: "Partial clear" },
        ] as const).map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors ${
              mode === opt.value
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-text-secondary hover:bg-surface-2"
            }`}
          >
            <input
              type="radio"
              name="clearMode"
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => setMode(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <Field label="Amount" htmlFor="clear-amount" error={state.fieldErrors?.amount ?? amountError}>
        <Input
          id="clear-amount"
          name="amount"
          type="number"
          min="0.01"
          max={wallet.balance}
          step="0.01"
          value={amount}
          onChange={(e) => setPartialAmount(Number(e.target.value))}
          readOnly={mode === "full"}
          className={mode === "full" ? "bg-surface-2" : undefined}
          required
        />
      </Field>

      <Field label="Pay from wallet" htmlFor="clear-walletId" error={state.fieldErrors?.walletId}>
        <Select id="clear-walletId" name="walletId" value={payFromId} onChange={(e) => setPayFromId(e.target.value)} required>
          <option value="" disabled>
            Choose a wallet
          </option>
          {sourceWallets.map((w) => (
            <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w)})`}</option>
          ))}
        </Select>
      </Field>

      <Field label="Note (optional)" htmlFor="clear-note">
        <Input id="clear-note" name="note" placeholder="e.g. Credit card payment" defaultValue="Debt clearance" maxLength={140} />
      </Field>

      {sourceWallets.length === 0 && (
        <p className="text-[12.5px] text-text-muted">Add a cash, bank, or savings wallet to pay this debt from.</p>
      )}

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={sourceWallets.length === 0 || amount <= 0 || overDebt || insufficientFunds}
        className="mt-1 w-full"
      >
        {pending ? "Clearing…" : "Clear debt"}
      </Button>
    </form>
  );
}

export function WalletDetailActions({ wallet, wallets }: { wallet: Wallet; wallets: Wallet[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {wallet.type === "debt" && wallet.balance > 0 && (
        <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
          <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={2} />
          Clear debt
        </Button>
      )}
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

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Clear debt">
        <ClearDebtForm wallet={wallet} wallets={wallets} onSuccess={() => setClearOpen(false)} />
      </Modal>

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
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isPending}
            onClick={() => {
              startTransition(async () => {
                await deleteWalletAction(wallet.id);
                router.push("/wallets");
              });
            }}
          >
            {isPending ? "Deleting…" : "Delete wallet"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
