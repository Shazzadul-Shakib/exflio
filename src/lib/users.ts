import { prisma } from "./db";
import { newId } from "./id";
import { hashPassword, verifyPassword } from "./crypto";
import type { User } from "./types";

function mapUser(row: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    passwordSalt: row.passwordSalt,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  return row ? mapUser(row) : null;
}

export async function createUser(input: { name: string; email: string; password: string }): Promise<User> {
  const { hash, salt } = hashPassword(input.password);
  try {
    const row = await prisma.user.create({
      data: {
        id: newId("usr"),
        name: input.name,
        email: input.email.trim().toLowerCase(),
        passwordHash: hash,
        passwordSalt: salt,
      },
    });
    return mapUser(row);
  } catch (error) {
    // Prisma P2002 = unique constraint violation (the email column) — race-safe, unlike a pre-check.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("An account with this email already exists.");
    }
    console.error("[createUser] failed:", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
      code: (error as { code?: string })?.code,
    });
    throw error;
  }
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  return valid ? user : null;
}
