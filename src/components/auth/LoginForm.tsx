"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

const initialState: AuthFormState = {};

const DEMO_EMAIL = "astro@gmail.com";
const DEMO_PASSWORD = "12345678";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleDemoLogin() {
    if (emailRef.current) emailRef.current.value = DEMO_EMAIL;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <Field label="Email" htmlFor="email">
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!state.error}
          required
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={!!state.error}
          required
        />
      </Field>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <Button type="button" variant="secondary" onClick={handleDemoLogin} disabled={pending} className="w-full">
        Try demo account
      </Button>
      <p className="text-center text-[13px] text-text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
