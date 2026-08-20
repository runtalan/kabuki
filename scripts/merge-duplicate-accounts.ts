// Repairs duplicate accounts created by re-linking an institution through
// Plaid Link. Plaid mints a new account_id per Item, so a re-link inserted a
// second row for accounts the household already had — with the owner reset to
// whoever re-linked them and the transaction history split across both rows.
//
// syncAccounts now adopts instead of duplicating (src/lib/plaid-sync.ts); this
// script cleans up the rows that already exist.
//
//   npx tsx scripts/merge-duplicate-accounts.ts --user=renato --dry-run
//   npx tsx scripts/merge-duplicate-accounts.ts --user=renato
//
// Point DATABASE_URL at the environment you mean to repair. Always run
// --dry-run first and read the plan before running it for real.
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getHouseholdUserIds } from '@/lib/household';
import { householdByUsername } from '@/lib/households';
import { getPlaidClient } from '@/lib/plaid';
import { mergeDuplicateAccounts } from '@/lib/plaid-sync';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=').slice(1).join('=');
}

async function main() {
  const username = arg('user');
  const dryRun = process.argv.includes('--dry-run');

  if (!username) {
    throw new Error('Pass --user=<username> (any member of the household to repair).');
  }

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user) throw new Error(`No user with username "${username}"`);

  const household = householdByUsername(username);
  const householdUserIds = await getHouseholdUserIds(user.id);

  // Only needed to remove items left with no accounts; skipped on a dry run.
  const plaidClient = dryRun ? null : getPlaidClient(household?.plaidEnvSuffix ?? '');

  console.log(
    `${dryRun ? '[dry run] ' : ''}Merging duplicate accounts for household of "${username}" ` +
      `(${householdUserIds.length} user(s))`
  );

  const report = await mergeDuplicateAccounts(plaidClient, householdUserIds, { dryRun });

  if (report.merged.length === 0) {
    console.log('No duplicate accounts found. Nothing to do.');
  }
  for (const m of report.merged) {
    console.log(
      `  ${m.keptName}: kept ${m.keptAccountId}, ` +
        `${dryRun ? 'would remove' : 'removed'} ${m.removedAccountIds.join(', ')}` +
        (dryRun
          ? ''
          : ` — moved ${m.movedTransactions} transaction(s), ` +
            `dropped ${m.droppedDuplicateTransactions} duplicate(s)`)
    );
  }
  if (report.prunedItemIds.length > 0) {
    console.log(`  Removed ${report.prunedItemIds.length} emptied Plaid item(s).`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
