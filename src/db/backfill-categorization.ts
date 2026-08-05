// One-off backfill: re-runs smart categorization (now with Plaid PFC mapping
// + the generic keyword fallback) over every user's existing transactions.
// Safe to re-run — never touches manual or rule-tagged transactions.
import { db } from "./index";
import { runSmartCategorization } from "../lib/auto-tag";

async function main() {
  const users = await db.query.users.findMany();
  for (const user of users) {
    const tagged = await runSmartCategorization(user.id);
    console.log(`${user.username}: ${tagged} transaction(s) newly categorized`);
  }
  process.exit(0);
}

main();
