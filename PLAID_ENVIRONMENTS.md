# Plaid environments

This app can run against three different Plaid/database configurations.
Reader note (human or AI): this file is the source of truth for how
switching works and what each mode means — read this before touching
`.env.local`, `src/lib/plaid.ts`, or anything under `envs/`.

## The three modes

| Mode | `PLAID_ENV` | Plaid data | Database |
|---|---|---|---|
| `sandbox` | `sandbox` | Fake institutions/accounts, no real money | `kabuki_sandbox` (separate local Postgres DB) |
| `production-limited` | `production` | **Real** bank data, Plaid's "Limited Production" access tier | `kabuki` (real data) |
| `production` | `production` | **Real** bank data, fully-approved Plaid "Production" tier | `kabuki` (real data, same as above by default) |

`production-limited` is the default/current mode as of when this file was
written.

### Why production-limited and production look almost identical

Plaid does not issue separate API credentials for "Limited Production" vs.
full "Production" — that distinction is an **access-tier approval status on
your Plaid account**, not a different `client_id`/`secret` pair. Both modes
here use the exact same Plaid credentials and the same `PLAID_ENV=production`
base URL. They're kept as separate profiles so you can:

- point them at different databases later if you ever want to (e.g. a
  staging real-data DB vs. a live one)
- flip a `PLAID_ACCESS_TIER` label for your own bookkeeping (this variable is
  not read by the Plaid SDK at all — it's a human/AI-readable marker only,
  set in each profile file and nowhere else)

If Plaid ever does start issuing tier-specific credentials, update
`envs/.env.production` with the new secret and this table.

### Why sandbox gets its own database

Plaid Sandbox returns fake institutions and fake transaction data. If it
shared a database with real synced accounts, fake test transactions would
mix with real financial data. `kabuki_sandbox` is a completely separate
local Postgres database, schema-identical to `kabuki` (created via
`drizzle-kit push`, then seeded via `npm run db:seed`).

## How to switch

```bash
npm run env:sandbox              # switch to Plaid Sandbox + kabuki_sandbox DB
npm run env:production-limited   # switch to real data, limited-production tier
npm run env:production           # switch to real data, full-production tier
```

Each command copies the matching profile from `envs/.env.<mode>` over
`.env.local` (backing up the previous `.env.local` to `.env.local.bak`
first).

**You must restart the dev server after switching** — Next.js only reads
`.env.local` at process boot, so changing the file while `next dev` is
already running has no effect until it restarts:

```bash
pkill -f 'next dev'
npm run dev
```

To check which mode is currently active without switching:

```bash
grep PLAID_ACCESS_TIER .env.local
```

## File layout

```
envs/
  .env.sandbox              # Plaid Sandbox credentials + kabuki_sandbox DB
  .env.production-limited   # Production Plaid credentials + kabuki DB
  .env.production            # Production Plaid credentials + kabuki DB (default)
scripts/
  switch-env.sh              # copies the chosen profile over .env.local
.env.local                   # active config — gitignored, never committed
```

All files under `envs/` start with `.env` and are therefore covered by the
repo's existing `.gitignore` rule (`.env*`) — they hold real secrets
(including a real Plaid production secret with access to real bank data) and
must never be committed. Verify with `git check-ignore -v envs/.env.production`
if you're ever unsure.

## Setting up the sandbox database from scratch

If `kabuki_sandbox` doesn't exist yet (e.g. on a fresh machine):

```bash
createdb kabuki_sandbox
DATABASE_URL=postgresql://localhost/kabuki_sandbox npx drizzle-kit push
DATABASE_URL=postgresql://localhost/kabuki_sandbox npx tsx src/db/seed.ts
```

This creates the schema straight from `src/db/schema.ts` (no migration
history replay needed) and seeds the two app users (`renato` / `claudia`,
password `password`) plus the default category set.

## Testing in sandbox mode

Once switched to sandbox and logged in, use Plaid Link's sandbox
credentials to connect a fake institution:

- Username: `user_good`
- Password: `pass_good`
- Any MFA prompt: use `1234` or follow the on-screen fake value

This is standard Plaid Sandbox behavior, not something specific to this app
— see Plaid's own Sandbox docs if a particular test institution needs
different fake credentials.

## Safety notes

- `production-limited` and `production` both connect to **real bank
  accounts** and **real transaction data**. Plaid also bills API usage
  against these credentials. Don't leave the app running against real
  credentials during exploratory/destructive testing — switch to `sandbox`
  first.
- The base URL mapping lives in `src/lib/plaid.ts`. If link-token generation
  ever fails with `INVALID_API_KEYS`, check two things before assuming the
  secret is wrong: (1) does `PLAID_ENV` in `.env.local` actually match the
  tier the current `PLAID_SECRET` was issued for (sandbox secrets only work
  against `PLAID_ENV=sandbox`, production secrets only work against
  `PLAID_ENV=production`), and (2) did the dev server actually restart after
  the last `.env.local` change (check the process start time / PID, not just
  that you edited the file).
