# Exflio

A personal finance tracker — cash, bank, savings and debt accounts in one clear dashboard. Log expenses, income and transfers, see where your money goes by category, and track net worth over time.

Built with Next.js (App Router), React Server Components, Prisma, and PostgreSQL.

## Features

### Accounts

- **Four wallet types** — Cash, Bank, Savings, Debt (credit cards / loans) — each with its own balance and currency.
- Create, rename, and delete wallets. Deleting a wallet removes every transaction linked to it.
- A debt wallet's balance means *amount owed*, not cash on hand — an expense on it increases what you owe (e.g. a card purchase), a transfer into it pays it down. The same two rules (`expense` subtracts, `income` adds, sign flipped for debt) drive every wallet, so "pay off a card" and "move money into savings" both just fall out of a transfer.

### Transactions

- Three kinds: **expense**, **income**, **transfer** (wallet‑to‑wallet).
- Fixed category lists per kind (Food & Dining, Transport, Salary, Investment, etc.) so a category always maps to the same color in charts.
- Full CRUD with a live-updating wallet balance on every create/edit/delete, run inside a DB transaction so the balance and the transaction row never drift apart.
- Filtering by free-text search, type, category, wallet, and date range, plus sorting (newest/oldest, amount high→low/low→high) — all reflected in the URL (shareable, back-button-friendly), with a "Clear filters" reset.
- On mobile, filters collapse behind a toggle (with an active-filter count badge) so the page isn't dominated by empty dropdowns.

### Dashboard

- Net worth, this month's expenses (with a vs.-last-month delta), total savings, total debt.
- 6-month income vs. expense trend and a spending-by-category breakdown for the selected month, both hand-built as inline SVG (no charting library).
- A month/year picker for browsing any period.
- A wallet preview (max 4, "View all" for the rest) and the 6 most recent transactions.

### Savings & Debts

- Dedicated pages that filter the wallet/transaction data down to just that type, with the same stat-card + wallet-grid + history layout as the dashboard.

### Design

- Custom design system: navy accent, light/dark mode (via `prefers-color-scheme`, overridable per-user), a fixed categorical color palette for charts validated for colorblind-safe contrast.
- A hand-built, fully accessible `Dropdown` component (keyboard navigation, typeahead, `role="combobox"`/`listbox`) used everywhere instead of the native `<select>`, so it can be styled and positioned consistently — including correctly inside modals.
- Responsive throughout: a fixed sidebar with independently scrolling content, card grids that step from 4 → 2 → 1 columns as the screen narrows.

## Tech stack

| | |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Actions, Turbopack) |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Icons | [lucide-react](https://lucide.dev) |
| Database | PostgreSQL via [Prisma](https://www.prisma.io) ORM |
| Auth | Custom cookie session — HMAC-signed (`node:crypto`), password hashing via `scrypt` — no third-party auth library |

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database. This project is built and tested against [Neon](https://neon.tech)'s serverless Postgres, but any Postgres instance works.

### 1. Clone and install

```bash
git clone <this-repo>
cd exflio
npm install
```

`npm install` also runs `prisma generate` automatically (via `postinstall`), so the Prisma Client is ready right after.

### 2. Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. If you're on Neon, use the **pooled** connection string (the one with `-pooler` in the hostname) — it's built for many short-lived serverless connections. |
| `SESSION_SECRET` | Yes | Signs session cookies. Generate one with `openssl rand -hex 32`. There's no fallback — the app won't sign a session without it. |

### 3. Set up the database

Push the Prisma schema to your database:

```bash
npm run db:push
```

(This project manages its schema with `prisma db push` rather than versioned migrations — there's no `prisma/migrations` folder. Use `npm run db:migrate` instead if you'd rather switch to migration-based workflow.)

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/login`. Use "Create an account" to sign up; a new account starts with four default wallets (Cash, Main Bank, Savings, Credit Card).

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma Client |
| `npm run db:push` | Push `schema.prisma` to the database (no migration history) |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Open Prisma Studio (a GUI for your database) |

## Project structure

```
src/
  app/
    (auth)/           # /login, /signup — unauthenticated layout
    (app)/             # /dashboard, /wallets, /transactions, /savings, /debts — authenticated layout + sidebar
    actions/           # Server Actions (auth.ts, wallets.ts, transactions.ts) — all writes go through these
  components/
    ui.tsx             # Button, Input, Select, Field, Card, Badge, EmptyState — the shared component kit
    Dropdown.tsx        # Custom accessible dropdown (used as `Select` everywhere)
    dashboard/          # Stat cards, charts, month picker
    transactions/       # Transaction form, table, filters
    wallets/            # Wallet cards, forms
    shell/              # Sidebar / app shell
  lib/
    db.ts               # Prisma client singleton + retry logic for transient connection errors
    session.ts           # Cookie session read/write, requireUser()/getCurrentUser()
    crypto.ts            # Password hashing (scrypt) + session token signing (HMAC)
    users.ts, queries.ts, mutations.ts   # Data access layer
    finance.ts            # Wallet balance math, net worth, monthly aggregation
    transactionFilters.ts # URL search-param parsing + filtering/sorting
    categories.ts         # Fixed category lists + chart color slot assignment
  proxy.ts              # Route protection (Next.js 16's renamed `middleware.ts`) — redirects unauthenticated
                         # requests to /login and authenticated users away from /login, /signup
prisma/
  schema.prisma          # User, Wallet, Transaction models
```

## How it works

**Rendering**: pages are React Server Components that fetch data directly via Prisma (`lib/queries.ts`) — no client-side data-fetching library. All writes (create/update/delete wallet or transaction, auth) go through Server Actions in `src/app/actions/`, called directly from `<form action={...}>` and revalidating the affected routes on success.

**Auth**: there's no auth library. Signing up hashes the password with `scrypt` and a random salt (`lib/crypto.ts`); logging in issues an HMAC-signed, `httpOnly` cookie (`lib/session.ts`) containing the user id and an expiry. `src/proxy.ts` checks that cookie on every request and redirects accordingly. `getCurrentUser()` is wrapped in React's `cache()` so it only reads the cookie/DB once per request even if called from multiple components.

**Database**: `lib/db.ts` builds one Prisma Client, cached on `globalThis` so Next's dev-mode hot reload doesn't leak a new connection pool on every save, with automatic retry on transient connection errors (useful with Neon's serverless Postgres, which can cold-start). Money amounts are stored as `Decimal(14,2)` and converted to plain `number` at the data-access boundary.

**Styling**: Tailwind v4 with the design system expressed as CSS custom properties in `globals.css` (colors, radius scale, shadows), so light/dark mode is a matter of swapping variable values rather than duplicating classes.

## Deploying

This app deploys cleanly to Vercel (or any Node.js host). Set `DATABASE_URL` and `SESSION_SECRET` in your platform's environment variables — both are required, there's no fallback for either. If you're deploying to a platform that runs multiple instances of your app (Vercel included), `SESSION_SECRET` **must** be the same fixed value across all of them, since it's what lets one instance verify a session token signed by another.
