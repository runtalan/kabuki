import { redirect } from 'next/navigation';

// Transactions now lives under the Spending section.
export default function TransactionsRedirect() {
  redirect('/spending/transactions');
}
