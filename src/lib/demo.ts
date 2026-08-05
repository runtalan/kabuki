// Shared constants for the public, view-only demo account. Nothing sensitive
// lives behind DEMO_PASSWORD — it's fine baked into the client bundle for
// the "Try the Demo" button. IDs are hardcoded (not generateId()) so the
// seed script and the data generator can reference the same rows across
// reseeds/redeploys without drifting.
export const DEMO_USERNAME = 'demo';
export const DEMO_PASSWORD = 'try-kabuki-2026';

export const DEMO_USER_ID = 'demo-user-id';
export const DEMO_PLAID_ITEM_ID = 'demo-plaid-item-id';
export const DEMO_PLAID_ITEM_ITEM_ID = 'demo-item';

export const DEMO_CHECKING_ACCOUNT_ID = 'demo-acct-checking';
export const DEMO_CREDIT_ACCOUNT_ID = 'demo-acct-credit';
export const DEMO_SAVINGS_ACCOUNT_ID = 'demo-acct-savings';

export const DEMO_STARTING_BALANCES = {
  [DEMO_CHECKING_ACCOUNT_ID]: 4200,
  [DEMO_CREDIT_ACCOUNT_ID]: -850,
  [DEMO_SAVINGS_ACCOUNT_ID]: 15000,
} as const;
