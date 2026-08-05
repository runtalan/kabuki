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

```bash
npm run db:generate   # generate SQL migrations from schema changes
npm run db:migrate    # apply migrations
npm run db:push       # push schema directly (dev convenience)
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
  app/          Next.js App Router routes
  components/   Shared React components (shadcn/ui in components/ui)
  db/           Drizzle schema + client
  lib/          Utilities
apphosting.yaml Firebase App Hosting runtime config
firebase.json   Firebase CLI / backend config
drizzle.config.ts
```
