# Kabuki

Self-hosted personal finance app for a two-user household (Monarch Money clone), deployed on Firebase App Hosting.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL + Drizzle ORM (bring your own host: Neon, Supabase, etc.)
- Auth.js (NextAuth v5) — credentials-based shared login
- Plaid (bank sync)
- Recharts (reporting)
- Firebase App Hosting (serverless SSR)

## ⚠️ Environment Setup (READ FIRST)

**Before running locally or deploying to production, read [ENVIRONMENTS.md](./ENVIRONMENTS.md).**

This project has three environments (sandbox/production-limited/production) with separate Plaid credentials and databases. The rules are:
- **Local dev**: Always use `sandbox` (fake data, safe)
- **Firebase production**: Always use `production` (real bank data)

Start a dev session:
```bash
npm run env:sandbox
npm run dev
```

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Ensure you're in sandbox environment (see [ENVIRONMENTS.md](./ENVIRONMENTS.md)):

   ```bash
   npm run env:sandbox
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and log in with:
   - Username: `renato` or `claudia`
   - Password: `password`

## Database (Drizzle)

Schema lives in `src/db/schema.ts`, connection client in `src/db/index.ts`.

**Migrations are hand-written SQL, not `drizzle-kit generate`/`migrate`.** See [DATABASE.md](./DATABASE.md) for the migration workflow and the full log of what ran where.

```bash
npm run db:studio     # browse data in Drizzle Studio
```

## Deploying to Firebase App Hosting

**See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for complete deployment instructions and production secret setup.**

Quick summary:
1. **Set production secrets** in Firebase (one-time):
   ```bash
   npx firebase apphosting:secrets:set DATABASE_URL --backend kabuki
   npx firebase apphosting:secrets:set AUTH_SECRET --backend kabuki
   npx firebase apphosting:secrets:set PLAID_SECRET --backend kabuki
   # ... (see ENVIRONMENTS.md for all secrets)
   ```

2. **Push to main branch** (triggers automatic build and deploy):
   ```bash
   git push origin main
   ```

3. **Monitor the build:**
   ```bash
   npx firebase apphosting:builds:list --backend kabuki
   ```

Every push to `main` triggers a Firebase deploy of the `production` environment to https://mybuttons.casa.

## Project structure

```
src/
  app/          Next.js App Router routes (app/error.tsx and app/not-found.tsx
                are the app-wide error boundary and 404 page)
  components/   Shared React components (shadcn/ui in components/ui)
  db/           Drizzle schema + client
  hooks/        Shared React hooks (e.g. useEscapeKey)
  lib/          Utilities
apphosting.yaml Firebase App Hosting runtime config
firebase.json   Firebase CLI / backend config
drizzle.config.ts
```

## Error handling

- `src/app/error.tsx` is the App Router error boundary — catches render-time exceptions anywhere in the app (no nested `error.tsx` files exist) and shows a retry/home screen instead of a blank crash.
- `src/app/not-found.tsx` handles unmatched routes.
- Client pages that fetch their own data on mount (Accounts, Categories, Rules, Transactions) use `src/components/fetch-error-banner.tsx` to surface a failed initial load with a Retry button, rather than silently rendering an empty state indistinguishable from "no data."
