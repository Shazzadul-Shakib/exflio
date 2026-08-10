"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionFormState,
} from "@/app/actions/transactions";
import { Button, Field, Input, Select } from "@/components/ui";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { todayIso } from "@/lib/format";
import type { Transaction, TransactionKind, Wallet } from "@/lib/types";

const initialState: TransactionFormState = {};

const KIND_OPTIONS: {
  value: TransactionKind;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "expense", label: "Expense", icon: TrendingDown },
  { value: "income", label: "Income", icon: TrendingUp },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

export function TransactionForm({
  wallets,
  defaultWalletId,
  transaction,
  onSuccess,
}: {
  wallets: Wallet[];
  defaultWalletId?: string;
  transaction?: Transaction;
  onSuccess?: () => void;
}) {
  const isEdit = !!transaction;
  const action = isEdit
    ? updateTransactionAction.bind(null, transaction.id)
    : createTransactionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [kind, setKind] = useState<TransactionKind>(
    transaction?.kind ?? "expense",
  );

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const categoryOptions =
    kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {KIND_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors ${
                kind === opt.value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border text-text-secondary hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={opt.value}
                checked={kind === opt.value}
                onChange={() => setKind(opt.value)}
                className="sr-only"
              />
              <Icon className="h-4 w-4" strokeWidth={2} />
              {opt.label}
            </label>
          );
        })}
      </div>

      <Field label="Amount" htmlFor="amount" error={state.fieldErrors?.amount}>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={transaction?.amount}
          required
        />
      </Field>

      <Field
        label={kind === "transfer" ? "From wallet" : "Wallet"}
        htmlFor="walletId"
        error={state.fieldErrors?.walletId}
      >
        <Select
          id="walletId"
          name="walletId"
          defaultValue={transaction?.walletId ?? defaultWalletId ?? ""}
          required
        >
          <option value="" disabled>
            Choose a wallet
          </option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </Field>

      {kind === "transfer" && (
        <Field
          label="To wallet"
          htmlFor="toWalletId"
          error={state.fieldErrors?.toWalletId}
        >
          <Select
            id="toWalletId"
            name="toWalletId"
            defaultValue={transaction?.toWalletId ?? ""}
            required
          >
            <option value="" disabled>
              Choose a wallet
            </option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {kind !== "transfer" && (
        <Field
          label="Category"
          htmlFor="category"
          error={state.fieldErrors?.category}
        >
          <Select
            id="category"
            name="category"
            defaultValue={transaction?.category ?? ""}
            required
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categoryOptions.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Date" htmlFor="date" error={state.fieldErrors?.date}>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={transaction?.date ?? todayIso()}
          max={todayIso()}
          required
        />
      </Field>

      <Field label="Description" htmlFor="note">
        <Input
          id="note"
          name="note"
          placeholder="What was this for?"
          defaultValue={transaction?.note}
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
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add transaction"}
      </Button>
    </form>
  );
}
