import { redirect } from 'next/navigation';

// The dashboard became Home > Overview in the nav restructure.
export default function DashboardRedirect() {
  redirect('/home');
}
