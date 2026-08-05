import { redirect } from 'next/navigation';

// Reports folded into Spending > Overview in the nav restructure.
export default function ReportsRedirect() {
  redirect('/spending');
}
