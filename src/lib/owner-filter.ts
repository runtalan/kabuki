// Shared "Renato / Claudia / All" household filter used across Home,
// Spending, and Transactions. "All" means no filtering at all — the sum of
// renato + claudia + joint, i.e. today's default behavior. Selecting an
// individual excludes joint accounts/transactions too (strictly that
// person's own), it does not fold joint into either person's view.
export type OwnerFilter = 'renato' | 'claudia' | 'all';

export function parseOwnerFilter(value?: string | string[]): OwnerFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return v === 'renato' || v === 'claudia' ? v : 'all';
}

// A transaction's effective owner: its own manual override if set, else the
// owning account's owner, else 'joint' for unassigned accounts.
export function effectiveOwner(
  ownerOverride: string | null | undefined,
  accountOwner: string | null | undefined
): string {
  return ownerOverride || accountOwner || 'joint';
}

export function matchesOwnerFilter(
  ownerOverride: string | null | undefined,
  accountOwner: string | null | undefined,
  filter: OwnerFilter
): boolean {
  if (filter === 'all') return true;
  return effectiveOwner(ownerOverride, accountOwner) === filter;
}

// Account-level filter (net worth / balances have no per-transaction
// override concept — an account belongs to whoever it belongs to).
export function filterAccountsByOwner<T extends { owner?: string | null }>(
  accounts: T[],
  filter: OwnerFilter
): T[] {
  if (filter === 'all') return accounts;
  return accounts.filter((acc) => (acc.owner || 'joint') === filter);
}
