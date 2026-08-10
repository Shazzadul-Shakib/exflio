"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import {
  createWalletAction,
  type WalletFormState,
} from "@/app/actions/wallets";
import { Button, Field, Input, Select } from "@/components/ui";
import { WALLET_TYPE_META } from "@/lib/categories";
import type { WalletType } from "@/lib/types";

const initialState: WalletFormState = {};
const TYPES = Object.keys(WALLET_TYPE_META) as WalletType[];

export function WalletForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(
    createWalletAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field label="Wallet name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" placeholder="e.g. Travel fund" required />
      </Field>
      <Field label="Type" htmlFor="type" error={state.fieldErrors?.type}>
        <Select id="type" name="type" defaultValue="cash" required>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {WALLET_TYPE_META[t].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Starting balance"
        htmlFor="balance"
        error={state.fieldErrors?.balance}
      >
        <Input
          id="balance"
          name="balance"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          defaultValue="0"
        />
      </Field>
      <Field label="Note (optional)" htmlFor="note">
        <Input
          id="note"
          name="note"
          placeholder="What's this wallet for?"
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
        {pending ? "Creating…" : "Create wallet"}
      </Button>
    </form>
  );
}
