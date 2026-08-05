# Database Migrations

**Read this before touching `src/db/schema.ts`.** This project does not use `drizzle-kit generate` / `drizzle-kit migrate` — migrations are hand-written SQL files in `drizzle/`, applied manually with `psql`, and this file is the log of what ran where and when. See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for which database is which.

## Workflow for a new migration (do this every time)

1. Edit `src/db/schema.ts` first — the Drizzle schema is the source of truth for what the app code expects.
2. Write `drizzle/00NN_short_description.sql` by hand, next number in sequence. Use `IF NOT EXISTS` / `IF EXISTS` guards so it's safe to re-run.
3. Apply to **sandbox** and verify:
   ```bash
   psql postgresql://localhost/kabuki_sandbox -f drizzle/00NN_short_description.sql
   ```
4. Add a row to the log below — date, migration file, one-line feature description.
5. Commit the schema change + migration file + this log update together.
6. After deploying, apply the same file to **production**:
   ```bash
   psql "postgresql://postgres:<PROD_PASSWORD>@136.64.112.60:5432/kabuki" -f drizzle/00NN_short_description.sql
   ```
   Prod connection details live in Firebase secrets (`DATABASE_URL`) — see ENVIRONMENTS.md. Do not hardcode the password in scripts or commits.
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

## Current schema state

Tables as of the last migration above. Reflects sandbox and production alike — both are in sync as of `0012`.

| Table | Added in | Notes |
|---|---|---|
| `users` | 0000 | Shared household login |
| `plaid_items` | 0000 | +`is_manual` (0006) |
| `accounts` | 0000 | +`display_name`,`icon` (0002); +`owner` (0004); +`kind`,`liability_type`,`is_manual` (0006); +`mask` (0007); +`asset_type`,`address` (0009) |
| `categories` | 0000 | +`monthly_budget` (0010) |
| `transactions` | 0000 | +`category_source` (0005); +`owner_override` (0008); +`hidden` (0011) |
| `transaction_splits` | 0001 | |
| `rules` | 0003 | |
| `account_balance_history` | 0006 | |
| `tags` | 0008 | |
| `transaction_tags` | 0008 | join table |
| `recurring_series` | 0012 | User overrides + manual entries layered on heuristic detection |

## Quick reference

```bash
# Check what's actually applied in a database
psql <DATABASE_URL> -c "\dt"                                    # list tables
psql <DATABASE_URL> -c "\d transactions"                        # describe one table

# Diff sandbox vs prod schema by eye
psql postgresql://localhost/kabuki_sandbox -c "\d transactions"
psql "<PROD_DATABASE_URL>" -c "\d transactions"
```
