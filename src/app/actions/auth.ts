"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
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
  const t = await getTranslations("Auth.errors");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = t("nameRequired");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = t("emailInvalid");
  if (password.length < 8) fieldErrors.password = t("passwordTooShort");
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  let userId: string;
  try {
    const user = await createUser({ name, email, password });
    userId = user.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : t("createAccountFailed") };
  }

  await Promise.all([
    createWallet(userId, { name: "Cash", type: "cash", balance: 0, currency: "BDT", note: "" }),
    createWallet(userId, { name: "Main Bank", type: "bank", balance: 0, currency: "BDT", note: "" }),
    createWallet(userId, { name: "Savings", type: "savings", balance: 0, currency: "BDT", note: "" }),
    createWallet(userId, { name: "Credit Card", type: "debt", balance: 0, currency: "BDT", note: "" }),
  ]);

  await createSessionCookie(userId);
  redirect({ href: "/dashboard", locale: await getLocale() });
  throw new Error("unreachable");
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const t = await getTranslations("Auth.errors");

  if (!email || !password) return { error: t("emailPasswordRequired") };

  const user = await authenticate(email, password);
  if (!user) return { error: t("invalidCredentials") };

  await createSessionCookie(user.id);
  redirect({ href: "/dashboard", locale: await getLocale() });
  throw new Error("unreachable");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect({ href: "/login", locale: await getLocale() });
}
