// Mock financial data for dashboard/reports
// Replace with real DB queries once auth and data sync are live

export const mockSpendingByCategory = [
  { name: 'Groceries', value: 450, color: '#3b82f6' },
  { name: 'Dining', value: 280, color: '#ef4444' },
  { name: 'Transport', value: 150, color: '#8b5cf6' },
  { name: 'Entertainment', value: 200, color: '#f59e0b' },
  { name: 'Utilities', value: 320, color: '#10b981' },
  { name: 'Other', value: 200, color: '#6b7280' },
];

export const mockCashFlowData = [
  { month: 'Jan', income: 8500, expenses: 3200, savings: 5300 },
  { month: 'Feb', income: 8500, expenses: 3400, savings: 5100 },
  { month: 'Mar', income: 9000, expenses: 3100, savings: 5900 },
  { month: 'Apr', income: 8500, expenses: 3600, savings: 4900 },
  { month: 'May', income: 8500, expenses: 3200, savings: 5300 },
  { month: 'Jun', income: 9500, expenses: 3800, savings: 5700 },
];

export const mockNetWorthTrend = [
  { month: 'Jan', netWorth: 40000 },
  { month: 'Feb', netWorth: 41200 },
  { month: 'Mar', netWorth: 43100 },
  { month: 'Apr', netWorth: 42500 },
  { month: 'May', netWorth: 43800 },
  { month: 'Jun', netWorth: 45230 },
];

export const mockAccounts = [
  {
    id: '1',
    name: 'Checking',
    type: 'depository',
    balance: 15230.50,
    currency: 'USD',
  },
  {
    id: '2',
    name: 'Savings',
    type: 'depository',
    balance: 25000.00,
    currency: 'USD',
  },
  {
    id: '3',
    name: 'Credit Card',
    type: 'credit',
    balance: -5000.00,
    currency: 'USD',
  },
];

export const mockRecentTransactions = [
  {
    id: '1',
    name: 'Whole Foods Market',
    category: 'Groceries',
    amount: -125.43,
    date: new Date(2024, 5, 28),
  },
  {
    id: '2',
    name: 'Salary Deposit',
    category: 'Income',
    amount: 8500.00,
    date: new Date(2024, 5, 27),
  },
  {
    id: '3',
    name: 'Amazon Purchase',
    category: 'Shopping',
    amount: -89.99,
    date: new Date(2024, 5, 26),
  },
  {
    id: '4',
    name: 'Electric Company',
    category: 'Utilities',
    amount: -120.00,
    date: new Date(2024, 5, 25),
  },
  {
    id: '5',
    name: 'Restaurant XYZ',
    category: 'Dining',
    amount: -62.35,
    date: new Date(2024, 5, 24),
  },
];
