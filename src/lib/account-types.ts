export const LIABILITY_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'other', label: 'Other' },
];

// Color-coded account type/category — subtype takes priority (checking,
// savings, credit card, etc.), falling back to liabilityType for manual
// liabilities, then a generic asset/liability color.
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
  other: '#64748b',
};

interface AccountTypeInfo {
  type: string;
  subtype?: string | null;
  kind?: 'asset' | 'liability' | string | null;
  liabilityType?: string | null;
}

export function getTypeBadge(account: AccountTypeInfo) {
  const key = (account.liabilityType || account.subtype || account.type || '').toLowerCase();
  const color = TYPE_COLORS[key] || (account.kind === 'liability' ? '#ef4444' : '#3b82f6');
  const label = account.liabilityType
    ? LIABILITY_TYPES.find((t) => t.value === account.liabilityType)?.label || account.liabilityType
    : account.subtype || account.type || 'Account';
  return { color, label };
}
