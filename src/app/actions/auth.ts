"use server";

import { redirect } from "next/navigation";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { authenticate, createUser } from "@/lib/users";
import { createWallet } from "@/lib/mutations";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signupAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = str(formData, "name");
  const email = str(formData, "email");
  const password = str(formData, "password");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  let userId: string;
  try {
    const user = await createUser({ name, email, password });
    userId = user.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create your account." };
  }

  await Promise.all([
    createWallet(userId, { name: "Cash", type: "cash", balance: 0, currency: "USD", note: "" }),
    createWallet(userId, { name: "Main Bank", type: "bank", balance: 0, currency: "USD", note: "" }),
    createWallet(userId, { name: "Savings", type: "savings", balance: 0, currency: "USD", note: "" }),
    createWallet(userId, { name: "Credit Card", type: "debt", balance: 0, currency: "USD", note: "" }),
  ]);

  await createSessionCookie(userId);
  redirect("/dashboard");
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = str(formData, "email");
  const password = str(formData, "password");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await authenticate(email, password);
  if (!user) return { error: "That email and password don't match." };

  await createSessionCookie(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
