# Database Migrations

**Read this before touching `src/db/schema.ts`.** This project does not use `drizzle-kit generate` / `drizzle-kit migrate` — migrations are hand-written SQL files in `drizzle/`, applied manually with `psql`, and this file is the log of what ran where and when. See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for which database is which.

**Production runs on Supabase** (project `qqhvjcwqhfvpjlisezaq`), migrated from Google Cloud SQL on 2026-08-05. Sandbox is still a local Postgres instance (`kabuki_sandbox`), unchanged. Because the `drizzle/` files had already drifted from what was actually running in production before this migration (see note at the bottom), the Supabase schema was seeded from a `pg_dump --schema-only` of the real production database rather than by replaying `drizzle/0000`–`0013` — treat live Supabase as the source of truth going forward and keep `drizzle/` in sync with it via this log.

## Workflow for a new migration (do this every time)

1. Edit `src/db/schema.ts` first — the Drizzle schema is the source of truth for what the app code expects.
2. Write `drizzle/00NN_short_description.sql` by hand, next number in sequence. Use `IF NOT EXISTS` / `IF EXISTS` guards so it's safe to re-run.
3. Apply to **sandbox** and verify:
   ```bash
   psql postgresql://localhost/kabuki_sandbox -f drizzle/00NN_short_description.sql
   ```
4. Add a row to the log below — date, migration file, one-line feature description.
5. Commit the schema change + migration file + this log update together.
6. After deploying, apply the same file to **production** (Supabase, session pooler):
   ```bash
   psql "postgresql://postgres.qqhvjcwqhfvpjlisezaq:<PROD_PASSWORD>@aws-1-us-west-2.pooler.supabase.com:5432/postgres" -f drizzle/00NN_short_description.sql
   ```
   Prod connection details live in Firebase secrets (`DATABASE_URL`) — see ENVIRONMENTS.md. Do not hardcode the password in scripts or commits. Alternatively, use the Supabase MCP `apply_migration` tool if working from an assistant with that server configured.
7. Update the "Current schema state" table at the bottom if the migration touched it.

**Why manual and not `drizzle-kit migrate`:** the project has run `db:push`-style manual application since day one (see the `_journal.json` gap between idx 1 and the 12 migration files that actually exist). Keep doing it this way for consistency — don't switch to the journal-tracked flow mid-project without migrating the journal too.

## Migration log

| Date | Migration | Feature |
|---|---|---|
| 2026-08-04 | `0000_keen_doomsday.sql` | Initial schema — users, plaid_items, accounts, categories, transactions |
| 2026-08-04 | `0001_tearful_spyke.sql` | Transaction splits (divide one transaction across categories) |
| 2026-08-04 | `0002_accounts_customization.sql` | Account display name + custom icon |
| 2026-08-04 | `0003_rules_table.sql` | Auto-tag rules (merchant → category) |
| 2026-08-04 | `0004_account_owner.sql` | Account owner assignment (Renato / Claudia / Joint) |
| 2026-08-04 | `0005_category_source.sql` | Track how a transaction got its category (manual / rule / smart) |
| 2026-08-04 | `0006_liabilities_and_history.sql` | Manual accounts, liabilities, balance history tracking |
| 2026-08-04 | `0007_account_mask.sql` | Account mask (last 4 digits) for display |
| 2026-08-04 | `0008_tags_and_owner_override.sql` | Freeform tags + per-transaction owner override |
| 2026-08-04 | `0009_asset_types.sql` | Asset type + address for manual asset accounts (real estate, vehicles) |
| 2026-08-04 | `0010_category_budgets.sql` | Monthly budget per category |
| 2026-08-04 | `0011_transaction_hidden.sql` | Per-transaction hide toggle (excluded from totals/budgets/reports) |
| 2026-08-05 | `0012_recurring_series.sql` | Recurring transactions — review queue, manual entries, calendar projection |
| 2026-08-05 | `0013_demo_account.sql` | `users.is_demo` flag for the shared, view-only public demo account |
| 2026-08-05 | `0014_institution_logo.sql` | `plaid_items.institution_id` + `institution_logo_url` (cached Plaid logo, uploaded to Supabase Storage) |
| 2026-08-05 | `0015_transaction_merchant_logo_and_pfc.sql` | `transactions.merchant_entity_id`, `merchant_logo_url` (cached Plaid merchant logo), `pfc_primary`, `pfc_detailed` (Plaid's personal_finance_category) |
| 2026-08-05 | `0016_transaction_transfer_type.sql` | `transactions.transfer_type` — marks internal transfers/credit card payments so they're excluded from income, expense, cash-flow, and budget totals |
| 2026-08-06 | `0017_apple_card_integration.sql` | `integration_tokens` table — per-user hashed API tokens for personal transaction-ingest integrations (Apple Card Sync) |
| 2026-08-06 | `0018_api_request_logs.sql` | `api_request_logs` table — dev/debug log of every request to public ingest endpoints (Apple Card Sync), headers included |
| 2026-08-06 | `0019_properties_and_holdings.sql` | `properties`, `property_value_history`, `holdings` tables — real estate tracking (excluded from net worth) and investment holdings |
| 2026-08-06 | `0020_trading_and_options.sql` | `trading_orders` and `option_holdings` tables — trade execution history and active option contracts |
| 2026-08-06 | `0021_add_email_column.sql` | Add `users.email` column + populate for existing users; make `users.password_hash` optional (for Google OIDC migration) |
| 2026-08-06 | `0022_trades_table.sql` | `trades` table — tracks buy/sell orders (symbol, qty, price, type, side, status) |

## Current schema state

Tables as of the last migration above. Reflects sandbox and production alike — both are in sync as of `0013`.

| Table | Added in | Notes |
|---|---|---|
| `users` | 0000 | Shared household login; +`is_demo` (0013); +`email` (0021); `password_hash` now optional (0021) |
| `plaid_items` | 0000 | +`is_manual` (0006) |
| `accounts` | 0000 | +`display_name`,`icon` (0002); +`owner` (0004); +`kind`,`liability_type`,`is_manual` (0006); +`mask` (0007); +`asset_type`,`address` (0009) |
| `categories` | 0000 | +`monthly_budget` (0010) |
| `transactions` | 0000 | +`category_source` (0005); +`owner_override` (0008); +`hidden` (0011); +`merchant_entity_id`,`merchant_logo_url`,`pfc_primary`,`pfc_detailed` (0015); +`transfer_type` (0016) |
| `transaction_splits` | 0001 | |
| `rules` | 0003 | |
| `account_balance_history` | 0006 | |
| `tags` | 0008 | |
| `transaction_tags` | 0008 | join table |
| `recurring_series` | 0012 | User overrides + manual entries layered on heuristic detection |
| `plaid_items` | 0000 | +`is_manual` (0006); +`institution_id`,`institution_logo_url` (0014) |
| `integration_tokens` | 0017 | Hashed per-user tokens for personal transaction-ingest integrations |
| `api_request_logs` | 0018 | Dev/debug log of requests to public ingest endpoints, headers included |
| `properties` | 0019 | Manually-tracked real estate; deliberately not linked to `accounts` — excluded from net worth |
| `property_value_history` | 0019 | Manual value snapshots; drives the combined equity chart |
| `holdings` | 0019 | Investment holdings inside a brokerage `accounts` row |
| `trades` | 0022 | Trade execution history (symbol, qty, price, order type, side, status) |

## Quick reference

```bash
# Check what's actually applied in a database
psql <DATABASE_URL> -c "\dt"                                    # list tables
psql <DATABASE_URL> -c "\d transactions"                        # describe one table

# Diff sandbox vs prod schema by eye
psql postgresql://localhost/kabuki_sandbox -c "\d transactions"
psql "<PROD_SUPABASE_DATABASE_URL>" -c "\d transactions"
```

## Known drift (found during the Supabase migration, 2026-08-05)

`drizzle/0000_keen_doomsday.sql` creates `users.email`, but the app (`src/db/schema.ts`) and live production have used `users.username` since the very first commit — the rename was applied by hand at some point and never captured as a migration file. If you're ever rebuilding a database from the `drizzle/` files in order, this table will come out wrong. Prefer `pg_dump --schema-only` from live production as the source of truth when in doubt, and consider writing the missing rename as an explicit migration to close this gap.
