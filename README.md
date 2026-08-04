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

## Getting started

1. Copy the env template and fill in real values:

   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies (already done if you just ran setup):

   ```bash
   npm install
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Database (Drizzle)

Schema lives in `src/db/schema.ts`, connection client in `src/db/index.ts`.

```bash
npm run db:generate   # generate SQL migrations from schema changes
npm run db:migrate    # apply migrations
npm run db:push       # push schema directly (dev convenience)
npm run db:studio     # browse data in Drizzle Studio
```

## Deploying to Firebase App Hosting

1. Install the Firebase CLI (bundled as a dev dependency, or `npm i -g firebase-tools`).
2. Log in and set your project: `npx firebase login`, then edit `.firebaserc` with your project ID (or run `npx firebase use --add`).
3. Create the backend once: `npx firebase apphosting:backends:create`.
4. Set secrets referenced in `apphosting.yaml` (`DATABASE_URL`, `AUTH_SECRET`, `PLAID_CLIENT_ID`, `PLAID_SECRET`):

   ```bash
   npx firebase apphosting:secrets:set DATABASE_URL
   npx firebase apphosting:secrets:grantaccess DATABASE_URL --backend kabuki
   ```

5. Connect the backend to your GitHub repo's main branch in the Firebase console (or via CLI) so pushes to `main` trigger automatic builds/deploys. Runtime config (instance sizing, env vars) lives in `apphosting.yaml`.

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
