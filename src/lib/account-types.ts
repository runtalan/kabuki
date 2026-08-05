export const LIABILITY_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'other', label: 'Other' },
];

export const ASSET_TYPES = [
  { value: 'car', label: 'Car', icon: 'Car' },
  { value: 'property', label: 'Real Estate', icon: 'Home' },
  { value: 'other', label: 'Other', icon: 'Wallet' },
];

// Color-coded account type/category — subtype takes priority (checking,
// savings, credit card, etc.), falling back to liability/asset type for
// manual accounts, then a generic asset/liability color.
export const TYPE_COLORS: Record<string, string> = {
  checking: '#3b82f6',
  savings: '#10b981',
  'credit card': '#ef4444',
  credit_card: '#ef4444',
  loan: '#f97316',
  student_loan: '#f97316',
  mortgage: '#a855f7',
  'money market': '#14b8a6',
  cd: '#64748b',
  brokerage: '#6366f1',
  investment: '#6366f1',
  personal_loan: '#f59e0b',
  car: '#0ea5e9',
  property: '#8b5cf6',
  other: '#64748b',
};

interface AccountTypeInfo {
  type: string;
  subtype?: string | null;
  kind?: 'asset' | 'liability' | string | null;
  liabilityType?: string | null;
  assetType?: string | null;
}

export function getTypeBadge(account: AccountTypeInfo) {
  const key = (account.liabilityType || account.assetType || account.subtype || account.type || '').toLowerCase();
  const color = TYPE_COLORS[key] || (account.kind === 'liability' ? '#ef4444' : '#3b82f6');
  const label = account.liabilityType
    ? LIABILITY_TYPES.find((t) => t.value === account.liabilityType)?.label || account.liabilityType
    : account.assetType
    ? ASSET_TYPES.find((t) => t.value === account.assetType)?.label || account.assetType
    : account.subtype || account.type || 'Account';
  return { color, label };
}

// Auto-suggested icon for a chosen asset/liability type — "generate an icon
// for it" without making the user pick one manually every time.
export function suggestIcon(kind: 'asset' | 'liability', typeValue: string): string {
  if (kind === 'asset') {
    return ASSET_TYPES.find((t) => t.value === typeValue)?.icon || 'Wallet';
  }
  if (typeValue === 'credit_card') return 'CreditCard';
  if (typeValue === 'mortgage') return 'Home';
  return 'PiggyBank';
}
