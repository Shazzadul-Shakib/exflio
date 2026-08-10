import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { signToken, verifyToken } from "./crypto";
import { findUserById } from "./users";
import type { PublicUser } from "./types";

const COOKIE_NAME = "exflio_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface SessionPayload {
  userId: string;
  exp: number;
}

export async function createSessionCookie(userId: string) {
  const exp = Date.now() + SESSION_TTL_MS;
  const token = signToken({ userId, exp });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = verifyToken<SessionPayload>(token);
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

/** Cached per-request: returns the logged-in user, or null. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const payload = await readSessionPayload();
  if (!payload) return null;
  const user = await findUserById(payload.userId);
  if (!user) return null;
  const { passwordHash: _passwordHash, passwordSalt: _passwordSalt, ...publicUser } = user;
  return publicUser;
});

/** Redirects to /login when there is no valid session. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
