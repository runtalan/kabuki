---
name: kabuki-prod-ops
description: Diagnose and fix Kabuki production issues on Firebase App Hosting/Cloud Run/Cloud SQL — login failures, "schema is wrong" reports, Plaid acting like sandbox, deploy verification. Use whenever the user reports something broken in production, asks to deploy, or asks to check build/runtime status.
---

# Kabuki production operations

Kabuki runs on Firebase App Hosting (Cloud Run under the hood) with a
Cloud SQL Postgres backend and Plaid for bank sync. This project's
production incidents have consistently **not** been where they first
appeared — a user-reported "schema is wrong" or "Plaid is showing fake
data" has twice turned out to be a secrets/networking problem several
layers down. Read this before assuming the obvious explanation.

Project ID: `buttons-abc4d`. Backend: `kabuki`. Region: `us-east4`.
Domain: `https://mybuttons.casa`. Cloud SQL instance: `kabuki-db`
(`us-central1-a`, IP `136.64.112.60`).

See also: [ENVIRONMENTS.md](../../ENVIRONMENTS.md) (env/secret
architecture), [DATABASE.md](../../DATABASE.md) (migration workflow),
`AGENTS.md` (the always-loaded summary of this).

## First move for almost any prod report

```bash
npm run verify:prod-secrets
```

This diffs every live Firebase secret against `envs/.env.production`.
It has caught two real incidents already:

- `DATABASE_URL` pointed at the `postgres` database instead of `kabuki`,
  with a password that didn't even authenticate.
- `PLAID_ENV=production` while `PLAID_SECRET` silently held the
  **sandbox** key — the tier flag and the key drift independently, so
  reading the code or `PLAID_ENV` alone tells you nothing is wrong.

If this fails, fix the reported key with the `secrets:set` command it
prints, then jump to "Deploying a secret change" below — updating the
secret does *nothing* by itself.

## Checking build/deploy status

`npx firebase apphosting:builds:list --backend kabuki` **does not
exist** in this Firebase CLI version (confirmed repeatedly — don't
retry it, it wastes a turn). Use these instead:

```bash
# Did the build succeed?
gcloud builds list --project=buttons-abc4d --region=us-east4 --limit=5 --sort-by=~createTime

# Is the right revision actually serving traffic?
gcloud run services describe kabuki --project=buttons-abc4d --region=us-east4 \
  --format="value(status.traffic)"

# Is the site actually up?
curl -sS -o /dev/null -w "%{http_code}\n" https://mybuttons.casa/
```

A build showing `SUCCESS` does not mean the *feature* works — it only
means the container built. Cross-check runtime logs (below) too.

## Reading runtime logs

```bash
# App logs (stdout/stderr) for a specific revision
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="kabuki" AND resource.labels.revision_name="<REVISION>"' \
  --project=buttons-abc4d --limit=50 --freshness=1h

# Cloud SQL's own connection/auth log (separate from app logs, and often
# more diagnostic — shows the *real* rejection reason)
gcloud logging read 'resource.type="cloudsql_database"' \
  --project=buttons-abc4d --limit=50 --freshness=1h
```

**Two different Postgres errors mean two different root causes — don't
conflate them:**

- `FATAL: password authentication failed for user "postgres"` → the
  connection reached Postgres and the password is wrong. This is a
  credentials problem. (Cloud SQL logs this with a `DETAIL` line citing
  the exact `pg_hba.conf` rule it matched.)
- `CONNECT_TIMEOUT` (from the app's Node logs, not Cloud SQL's) → the
  TCP connection never reached Postgres at all. This is almost always
  Cloud SQL's **authorized networks** allowlist rejecting the caller's
  IP before auth is even attempted. Check:
  ```bash
  gcloud sql instances describe kabuki-db --project=buttons-abc4d \
    --format="yaml(settings.ipConfiguration.authorizedNetworks)"
  ```
  This instance was created with only one entry (`SF-home`, the
  developer's home IP) — meaning Cloud Run could never reach it, from
  the very first deploy, independent of whatever credentials were in
  `DATABASE_URL`. A working `psql` connection from a developer laptop
  proves nothing about whether the *deployed app* can connect — the
  laptop's IP is allowlisted; Cloud Run's isn't, unless someone added
  `0.0.0.0/0` (open, gated only by password+TLS) or set up a private-IP
  + Serverless VPC connector (the correct fix, more setup).

`gcloud sql connect` / `psql` from this machine can authenticate
directly against Cloud SQL using the current `DATABASE_URL` secret
(`npx firebase apphosting:secrets:access DATABASE_URL --project
buttons-abc4d` to read it) — use this to inspect schema or data
directly rather than guessing from code.

## Deploying a secret change

Cloud Run/App Hosting resolves a secret's value **at container
startup**, not live. After `firebase apphosting:secrets:set`, existing
running instances keep the *old* value indefinitely. To force the new
value to actually take effect:

```bash
gcloud run services update kabuki --project=buttons-abc4d --region=us-east4 \
  --update-secrets=<KEY>=<KEY>:latest
```

Then check traffic — this command has been observed to create a new
revision *without* routing traffic to it, leaving the old (stale)
revision still serving 100%:

```bash
gcloud run services update-traffic kabuki --project=buttons-abc4d --region=us-east4 --to-latest
```

Verify with `gcloud run services describe ... --format="value(status.traffic)"`
that the newest revision is actually at 100% before declaring the fix
live. A normal `git push origin main` deploy doesn't have this
traffic-routing gap — it's specifically a risk when using
`gcloud run services update` directly to force a secret refresh
without a full rebuild.

## Resetting a user's password directly

The app hashes with bcryptjs (`bcrypt.hash(password, 10)`). To reset
directly in the database (e.g. user locked out, forgot password, no
email-reset flow exists — shared household credentials only):

```bash
node -e "require('bcryptjs').hash('newpassword', 10).then(h => console.log(h))"
# then, against the DATABASE_URL from the secret:
# UPDATE users SET password_hash = '<hash>', updated_at = now() WHERE username = '<username>';
```

Never submit real login credentials against the live production
credentials endpoint yourself (e.g. `curl -X POST
.../api/auth/callback/credentials`) — the environment's safety
classifier reasonably treats that as credential testing and blocks it.
Verify login by asking the user to try it and reading the logs
afterward instead.

## Environment rules (see AGENTS.md for the enforced summary)

- Local dev: always sandbox (`kabuki_sandbox` DB, Plaid sandbox). Never
  run `npm run env:production` locally.
- Firebase production: always production tier. `git push origin main`
  auto-deploys it.
- `envs/.env.*` files are gitignored — they're the source of truth for
  what *should* be live, but nothing keeps them in sync with Firebase
  Secret Manager automatically. That's what `verify:prod-secrets` is
  for. If you change a value in `envs/.env.production`, it does not
  change production — you still have to push the new value with
  `firebase apphosting:secrets:set` and cycle the revision.
