import { redirect } from 'next/navigation';
import { getUser, getUserSummoners } from './lib/actions';
import LinkAccountSection from './components/LinkAccountSection';

export default async function Home() {
  const user = await getUser();

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/login');
  }

  // Check if user has any linked accounts
  const result = await getUserSummoners();

  // If user has linked accounts, redirect to dashboard
  if (result.success && result.summoners && result.summoners.length > 0) {
    redirect('/dashboard');
  }

  // Otherwise, show the link account page
  return (
    <div className='flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'>
      <LinkAccountSection />
    </div>
  );
}
