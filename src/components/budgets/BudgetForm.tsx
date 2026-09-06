"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  createBudgetAction,
  updateBudgetAction,
  type BudgetFormState,
} from "@/app/actions/budgets";
import { Button, Field, Input, Select } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { MONTH_NAMES, currentYearMonth } from "@/lib/format";
import type { Budget } from "@/lib/types";

const initialState: BudgetFormState = {};

export function BudgetForm({
  budgets = [],
  budget,
  defaultYear,
  defaultMonth,
  onSuccess,
}: {
  /** Every one of the user's budgets, used only to steer category selection away from a month's existing ones. */
  budgets?: Budget[];
  budget?: Budget;
  defaultYear?: number;
  defaultMonth?: number;
  onSuccess?: () => void;
}) {
  const isEdit = !!budget;
  const action = isEdit ? updateBudgetAction.bind(null, budget.id) : createBudgetAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const defaults = currentYearMonth();
  const [year, setYear] = useState(budget?.year ?? defaultYear ?? defaults.year);
  const [month, setMonth] = useState(budget?.month ?? defaultMonth ?? defaults.month);
  const [category, setCategory] = useState(budget?.category ?? "");

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const usedCategories = useMemo(
    () => new Set(budgets.filter((b) => b.year === year && b.month === month && b.id !== budget?.id).map((b) => b.category)),
    [budgets, year, month, budget]
  );

  const nowYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => nowYear - 5 + i);
  const noCategoriesLeft = !isEdit && usedCategories.size >= EXPENSE_CATEGORIES.length;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Month" htmlFor="month" error={state.fieldErrors?.month}>
          <Select id="month" name="month" value={month} onChange={(e) => setMonth(Number(e.target.value))} required>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year" htmlFor="year" error={state.fieldErrors?.year}>
          <Select id="year" name="year" value={year} onChange={(e) => setYear(Number(e.target.value))} required>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Category" htmlFor="category" error={state.fieldErrors?.category}>
        <Select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="" disabled>
            Choose a category
          </option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name} disabled={usedCategories.has(c.name)}>
              {usedCategories.has(c.name) ? `${c.name} (already budgeted)` : c.name}
            </option>
          ))}
        </Select>
      </Field>
      {noCategoriesLeft && (
        <p className="-mt-2 text-[12.5px] text-text-muted">
          Every category already has a budget for that month — pick a different month, or edit the existing one.
        </p>
      )}

      <Field label="Budget amount" htmlFor="amount" error={state.fieldErrors?.amount}>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={budget ? String(budget.amount) : ""}
          required
        />
      </Field>

      <Field label="Note (optional)" htmlFor="note">
        <Input id="note" name="note" placeholder="e.g. Groceries + eating out" defaultValue={budget?.note} maxLength={140} />
      </Field>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} disabled={!category} className="mt-1 w-full">
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create budget"}
      </Button>
    </form>
  );
}
