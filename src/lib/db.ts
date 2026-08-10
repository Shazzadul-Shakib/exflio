import { PrismaClient } from "@prisma/client";

declare global {
  var __exflioPrisma: ReturnType<typeof buildClient> | undefined;
}

const RETRY_ATTEMPTS = 4;
const RETRY_DELAY_MS = 750;

// Connection-level failures worth retrying — nothing has committed yet when
// these fire, so a retry is always safe.
function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED" || code === "P1001" || code === "P1002";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildClient() {
  // Prisma 6's classic engine reads the connection string straight out of
  // `prisma/schema.prisma` (via `env("DATABASE_URL")`) and connects with its
  // own Rust query engine — no Node `pg` driver / adapter in the loop.
  const base = new PrismaClient();

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              const transient = isTransientError(error);
              if (!transient || attempt === RETRY_ATTEMPTS) throw error;
              console.warn(
                `[prisma] ${model}.${operation} attempt ${attempt}/${RETRY_ATTEMPTS} failed (${(error as { code?: string }).code}), retrying…`
              );
              await sleep(RETRY_DELAY_MS * attempt);
            }
          }
          throw new Error("unreachable");
        },
      },
    },
  });
}

// IMPORTANT: cache on `globalThis`, not just a module-level const.
//
// Next.js dev (Turbopack) re-evaluates server modules on hot reload, which
// fires on nearly every file save. Without this cache, each reload builds a
// brand new PrismaClient (and a brand new engine connection) that's never
// closed. `globalThis` survives module re-evaluation (it only resets on a
// full process restart), so this keeps one client alive for the life of the
// dev server.
export const prisma = global.__exflioPrisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  global.__exflioPrisma = prisma;
}
