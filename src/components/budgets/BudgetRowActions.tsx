"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { BudgetForm } from "./BudgetForm";
import { deleteBudgetAction } from "@/app/actions/budgets";
import type { Budget } from "@/lib/types";

export function BudgetRowActions({ budget, budgets }: { budget: Budget; budgets: Budget[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
        aria-label="Edit budget"
        title="Edit"
      >
        <Pencil className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-status-critical-soft hover:text-status-critical"
        aria-label="Delete budget"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit budget">
        <BudgetForm budget={budget} budgets={budgets} onSuccess={() => setEditOpen(false)} />
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete budget">
        <p className="text-sm text-text-secondary">
          This removes the <span className="font-medium text-text-primary">{budget.category}</span> budget for{" "}
          {budget.month}/{budget.year}. This can&apos;t be undone.
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
                await deleteBudgetAction(budget.id);
                setConfirmOpen(false);
                // deleteBudgetAction is called directly (not via a <form action>), so unlike the
                // create/edit forms above, Next won't auto-refresh this route's Server Components —
                // revalidatePath alone only invalidates the cache for the *next* navigation.
                router.refresh();
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
