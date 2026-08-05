<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Environments — read before touching Plaid, the database, or deploying

**Local dev must always run Plaid sandbox + local `kabuki_sandbox`. Firebase production must always run Plaid production + the real Cloud SQL `kabuki` database. These have drifted apart before — verify, don't assume.**

- Full rules: [ENVIRONMENTS.md](./ENVIRONMENTS.md). Migration workflow: [DATABASE.md](./DATABASE.md).
- For anything production-broken (login failures, "schema is wrong" reports, Plaid behaving like sandbox, deploy/build status checks), use the `kabuki-prod-ops` skill (`.claude/skills/kabuki-prod-ops/SKILL.md`) — it has the exact diagnostic commands and the failure modes already found here, several layers deeper than where the symptom first appears.
- Before/after any push to `main` (which auto-deploys to production) that touches secrets, `.env.production`, Plaid config, or the database connection: run `npm run verify:prod-secrets`. It diffs every live Firebase secret against `envs/.env.production` and fails loudly on any mismatch.
- Known failure mode (happened once already): a Firebase secret can have the right *shape* (`PLAID_ENV=production`) while the actual key value is silently the sandbox one — production then talks to Plaid sandbox with no error, because the tier flag and the key drifted apart independently. The verify script is the only way to catch this; reading the code or the docs won't show it, since both looked correct.
- Cloud Run/App Hosting resolves secrets at container **startup**, not live — updating a secret's value does nothing until a new revision is created and traffic is routed to it (`gcloud run services update <service> --update-secrets=KEY=KEY:latest` then `gcloud run services update-traffic <service> --to-latest`, or a fresh `git push origin main`).

