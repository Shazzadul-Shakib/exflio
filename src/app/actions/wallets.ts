"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createWallet, updateWallet, deleteWallet, MutationError } from "@/lib/mutations";
import type { WalletType } from "@/lib/types";

export interface WalletFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createWalletAction(
  _prevState: WalletFormState,
  formData: FormData
): Promise<WalletFormState> {
  const user = await requireUser();
  const name = str(formData, "name");
  const type = str(formData, "type") as WalletType;
  const balanceRaw = str(formData, "balance");
  const note = str(formData, "note");
  const balance = balanceRaw ? Number(balanceRaw) : 0;

  const fieldErrors: Record<string, string> = {};
  if (name.length < 1) fieldErrors.name = "Give this wallet a name.";
  if (!["cash", "bank", "savings", "debt"].includes(type)) fieldErrors.type = "Pick a wallet type.";
  if (!Number.isFinite(balance) || balance < 0) fieldErrors.balance = "Enter a starting balance of 0 or more.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await createWallet(user.id, { name, type, balance, currency: "USD", note });
  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/debts");
  return { success: true };
}

export async function updateWalletAction(
  walletId: string,
  _prevState: WalletFormState,
  formData: FormData
): Promise<WalletFormState> {
  const user = await requireUser();
  const name = str(formData, "name");
  const note = str(formData, "note");
  if (name.length < 1) return { fieldErrors: { name: "Give this wallet a name." } };

  try {
    await updateWallet(user.id, walletId, { name, note });
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not update this wallet." };
  }

  revalidatePath("/wallets");
  revalidatePath(`/wallets/${walletId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteWalletAction(walletId: string): Promise<void> {
  const user = await requireUser();
  try {
    await deleteWallet(user.id, walletId);
  } catch {
    // Already gone — nothing to do.
  }
  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/savings");
  revalidatePath("/debts");
}
