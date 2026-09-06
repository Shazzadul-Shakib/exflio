"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { BudgetForm } from "./BudgetForm";
import type { Budget } from "@/lib/types";

export function CreateBudgetButton({
  label = "Add budget",
  budgets = [],
  defaultYear,
  defaultMonth,
}: {
  label?: string;
  budgets?: Budget[];
  defaultYear?: number;
  defaultMonth?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New budget">
        <BudgetForm budgets={budgets} defaultYear={defaultYear} defaultMonth={defaultMonth} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}
