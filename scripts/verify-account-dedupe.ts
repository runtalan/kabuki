// Run with: npx tsx scripts/verify-account-dedupe.ts
// Pure-logic checks for the re-link duplicate-account fix — no database or
// Plaid credentials needed. Covers the matching rules that decide whether a
// Plaid account arriving under a NEW account_id is the same real account the
// household already has (adopt it) or a genuinely new one (insert it).
import { AccountSubtype, AccountType, type AccountBase } from 'plaid';
import { accountIdentityKey, findAdoptionCandidates } from '@/lib/plaid-sync';
import { accounts } from '@/db/schema';

type AccountRow = typeof accounts.$inferSelect;

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok: ${label}`);
  } else {
    failures++;
    console.error(`  FAIL: ${label}`);
  }
}

function row(overrides: Partial<AccountRow>): AccountRow {
  return {
    id: 'acct_' + Math.random().toString(36).slice(2, 8),
    plaidItemId: 'item_old',
    plaidAccountId: 'plaid_old',
    name: 'Everyday Checking',
    officialName: 'WELLS FARGO EVERYDAY CHECKING',
    mask: '4321',
    displayName: null,
    icon: null,
    owner: 'joint',
    type: 'depository',
    subtype: 'checking',
    kind: 'asset',
    liabilityType: null,
    assetType: null,
    address: null,
    isManual: false,
    currentBalance: '100.00',
    resetBalanceMonthly: false,
    balanceMonth: null,
    availableBalance: null,
    currency: 'USD',
    isActive: true,
    lastSyncedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  } as AccountRow;
}

function plaidAccount(overrides: Partial<AccountBase>): AccountBase {
  return {
    account_id: 'plaid_new',
    name: 'Everyday Checking',
    official_name: 'WELLS FARGO EVERYDAY CHECKING',
    mask: '4321',
    type: 'depository',
    subtype: 'checking',
    balances: {},
    ...overrides,
  } as AccountBase;
}

function main() {
  console.log('Re-link adoption matching:');

  const existing = row({});

  check(
    'same mask + type + subtype under a new account_id is adopted',
    findAdoptionCandidates([existing], plaidAccount({})).length === 1
  );

  check(
    'a different mask is a different account',
    findAdoptionCandidates([existing], plaidAccount({ mask: '9999' })).length === 0
  );

  check(
    'same mask but a different subtype is a different account',
    findAdoptionCandidates([existing], plaidAccount({ subtype: AccountSubtype.Savings })).length === 0
  );

  check(
    'same mask but a different type is a different account',
    findAdoptionCandidates([existing], plaidAccount({ type: AccountType.Credit, subtype: AccountSubtype.CreditCard }))
      .length === 0
  );

  check(
    'a renamed account still matches on mask',
    findAdoptionCandidates([existing], plaidAccount({ name: 'Primary Checking' })).length === 1
  );

  check(
    'two same-mask/same-shape candidates are ambiguous, so nothing is adopted',
    findAdoptionCandidates([existing, row({})], plaidAccount({})).length === 2
  );

  const maskless = row({ mask: null });
  check(
    'maskless accounts fall back to matching on name',
    findAdoptionCandidates([maskless], plaidAccount({ mask: null })).length === 1
  );

  check(
    'maskless accounts with a different name are not adopted',
    findAdoptionCandidates([maskless], plaidAccount({ mask: null, name: 'Vacation Fund', official_name: null }))
      .length === 0
  );

  check(
    'a masked incoming account never matches a maskless row by name alone',
    findAdoptionCandidates([maskless], plaidAccount({})).length === 0
  );

  console.log('Duplicate-merge grouping:');

  check(
    'the same real account under two items shares one identity key',
    accountIdentityKey(row({ plaidItemId: 'item_a', plaidAccountId: 'a' })) ===
      accountIdentityKey(row({ plaidItemId: 'item_b', plaidAccountId: 'b' }))
  );

  check(
    'checking and savings with the same mask are separate identities',
    accountIdentityKey(row({})) !== accountIdentityKey(row({ subtype: 'savings' }))
  );

  check(
    'an account renamed by the bank still groups with its duplicate',
    accountIdentityKey(row({})) === accountIdentityKey(row({ name: 'Primary Checking' }))
  );

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main();
