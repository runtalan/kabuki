# Environment Management

**CRITICAL: Read this before deploying or running locally. AI assistants MUST check this file and follow the rules below.**

## TL;DR

- **Local development**: Always use `sandbox` environment (fake data, safe to experiment)
- **Production (Firebase)**: Always use `production` environment (real Plaid API, real database)
- **Database**: Sandbox uses `kabuki_sandbox` (local, throwaway data); Production uses `kabuki` (real data on Cloud SQL)

## Three Environments

| Environment | Use Case | Plaid | Database | Command | Notes |
|---|---|---|---|---|---|
| `sandbox` | **Local development only** | Sandbox (fake data) | `kabuki_sandbox` (local) | `npm run env:sandbox` | Safe for testing; fake institutions; data is transient |
| `production-limited` | Not typically used | Real (limited tier) | `kabuki` (real) | `npm run env:production-limited` | Same credentials as `production`; kept separate for future tier-specific keys |
| `production` | **Firebase deploy only** | Real (full tier) | `kabuki` (real on Cloud SQL) | `npm run env:production` | Never use locally; syncs real bank accounts |

## Local Development Workflow

### Starting a dev session (AI: always do this first)

```bash
# 1. Check current environment
grep PLAID_ACCESS_TIER .env.local

# 2. If not sandbox, switch to sandbox
npm run env:sandbox

# 3. Restart dev server (required — Next.js caches env vars at boot)
pkill -f 'next dev'
npm run dev
```

### Developing locally

- You're now running against `kabuki_sandbox` (local Postgres) and Plaid Sandbox
- Create/delete data freely — it won't touch production
- To connect a fake institution in Plaid Link, use sandbox credentials:
  - Username: `user_good`
  - Password: `pass_good`
  - MFA: `1234`

### Database commands in sandbox

These use `kabuki_sandbox` automatically once you've run `npm run env:sandbox`:

```bash
npm run db:push       # sync schema (safe in sandbox)
npm run db:seed       # reset to demo users (renato/claudia, password: password)
npm run db:studio     # browse/edit data in Drizzle Studio
```

## Production Deployment to Firebase

### Before your first prod deploy (one-time setup)

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Set production secrets in Firebase** (use values from `envs/.env.production`):
   ```bash
   npx firebase apphosting:secrets:set DATABASE_URL --backend kabuki
   npx firebase apphosting:secrets:set AUTH_SECRET --backend kabuki
   npx firebase apphosting:secrets:set PLAID_CLIENT_ID --backend kabuki
   npx firebase apphosting:secrets:set PLAID_SECRET --backend kabuki
   npx firebase apphosting:secrets:set PLAID_ENV --backend kabuki
   npx firebase apphosting:secrets:set AUTH_URL --backend kabuki
   ```

   Use these exact values:
   - `DATABASE_URL`: Your production Postgres URL (Cloud SQL)
   - `AUTH_SECRET`: `6f8d9c2e7a1b4e5f3c9a8d2b7e4f1a6c5d9e2b8f3a7c1d4e6f9a2b5c8d1e4f`
   - `PLAID_CLIENT_ID`: `6a726935989b1b000e47014a`
   - `PLAID_SECRET`: `7790789a21002b1690c9bfff36d21e` (production, NOT sandbox)
   - `PLAID_ENV`: `production`
   - `AUTH_URL`: `https://mybuttons.casa` (or your domain)

3. **Push to main branch:**
   ```bash
   git push origin main
   ```
   Firebase CI/CD will build and deploy automatically.

### Deploying to production (every time)

1. **Ensure you're on main branch:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Verify you're still in sandbox locally** (important!):
   ```bash
   npm run env:sandbox
   npm run dev  # test locally
   ```

3. **Commit your changes:**
   ```bash
   git add -A
   git commit -m "..."
   ```

4. **Push to main (triggers Firebase deploy):**
   ```bash
   git push origin main
   ```

5. **Monitor the build:**
   ```bash
   npx firebase apphosting:builds:list --backend kabuki
   ```
   Or check https://console.firebase.google.com → buttons-abc4d → App Hosting

## Switching Between Sandbox and Production Locally

**You should almost never need to do this.** Local dev is always sandbox. But if you must:

### Switch to sandbox
```bash
npm run env:sandbox
pkill -f 'next dev'
npm run dev
```

### Switch to production (DO NOT DO THIS LOCALLY)
```bash
npm run env:production
# ⚠️  STOP. Do not proceed. This connects to REAL bank accounts.
# ⚠️  Only Firebase should run production.
```

## File Layout

```
envs/
  .env.sandbox              # ← Local dev (sandbox Plaid + kabuki_sandbox DB)
  .env.production-limited   # ← Rarely used (production Plaid + kabuki DB)
  .env.production           # ← Firebase deploy (production Plaid + kabuki DB)
scripts/
  switch-env.sh             # ← Powers npm run env:*
.env.local                  # ← Active env (gitignored, never commit)
PLAID_ENVIRONMENTS.md       # ← Detailed Plaid docs (read if debugging API issues)
ENVIRONMENTS.md             # ← This file
firebase.json              # ← Firebase backend config (refs secrets above)
```

All `envs/.env.*` files are gitignored and contain real secrets; they are never committed.

## Common Tasks (For AI and Humans)

### "I want to test a feature locally"
1. `npm run env:sandbox` (if not already)
2. `npm run dev`
3. Log in with demo account (renato/password)
4. Make changes, commit to a branch
5. When ready: `git push origin main` (Firebase auto-deploys)

### "I broke production and need to roll back"
1. Identify the last good commit: `git log --oneline`
2. `git revert <commit>` (creates a new commit that undoes it)
3. `git push origin main` (Firebase re-deploys old state)
4. Check https://console.firebase.google.com to verify

### "Production deployment failed"
1. Check build logs: `npx firebase apphosting:builds:list --backend kabuki`
2. Likely causes:
   - Missing/incorrect secret in Firebase (check `firebase.json` env array)
   - Build error (run `npm run build` locally to reproduce)
   - Database connection failed (verify `DATABASE_URL` secret is set correctly)
3. Fix locally, commit, push to main again

### "I want to use production secrets locally to debug" (DO NOT)
Don't. Sandbox is fully functional and safe. If you absolutely must test production behavior:
1. Use a separate machine or Docker container
2. Use `npm run env:production` and run the app there (not in your main dev directory)
3. Remember you're syncing real bank accounts and will incur Plaid API charges
4. Switch back to sandbox immediately after

## Database Setup (First Time)

**For adding a new migration to an existing setup, see [DATABASE.md](./DATABASE.md) instead** — the workflow and full migration log live there.


### For sandbox (local throwaway DB)
```bash
createdb kabuki_sandbox
npm run env:sandbox
DATABASE_URL=postgresql://localhost/kabuki_sandbox npx drizzle-kit push
DATABASE_URL=postgresql://localhost/kabuki_sandbox npx tsx src/db/seed.ts
```

### For production (Cloud SQL, one-time)
1. Create Cloud SQL Postgres instance in GCP
2. Get the connection string (looks like `postgresql://user:pass@host:5432/kabuki`)
3. Set it in Firebase: `npx firebase apphosting:secrets:set DATABASE_URL`
4. Run migrations via Firebase deploy (set `npm run db:push` in `apphosting.yaml`, or run it manually once)

## Troubleshooting

### "Plaid Link says INVALID_API_KEYS"
- Check `PLAID_ENV` in `.env.local` matches the secret tier
  - Sandbox secret → `PLAID_ENV=sandbox`
  - Production secret → `PLAID_ENV=production`
- Restart dev server: `pkill -f 'next dev' && npm run dev`

### "Database connection refused"
- Check `DATABASE_URL` in `.env.local` points to the right database
- If using sandbox, should be `postgresql://localhost/kabuki_sandbox`
- If production, should be your Cloud SQL URL
- Verify Postgres is running: `psql -c "SELECT 1"`

### "Switch script says profile does not exist"
- Profile files live in `envs/` directory
- Verify: `ls -la envs/.env.sandbox envs/.env.production`
- If missing, see PLAID_ENVIRONMENTS.md setup section

## For AI Assistants Reading This

This file is the source of truth for environment strategy. Follow these rules strictly:

1. **Always start a local session with sandbox:**
   ```bash
   npm run env:sandbox
   npx tsc --noEmit -p .  # verify types compile
   npm run dev
   ```

2. **Never run `npm run env:production` locally** unless the user explicitly asks and acknowledges the warning.

3. **Before deploying to Firebase:**
   - Ensure all tests pass locally on sandbox
   - Verify `git push origin main` will deploy to production
   - Check https://console.firebase.google.com for build status post-push

4. **Document environment changes** in commit messages (e.g., "Switch to production-tier Plaid API in Firebase").

5. **If a build fails in Firebase**, check the logs, fix it locally in sandbox, then retry the push.

---

Last updated: 2026-08-05 (deployed to production)

Refer to this doc every time you set up a dev session or deploy to production.
