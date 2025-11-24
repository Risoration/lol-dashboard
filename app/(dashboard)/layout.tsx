import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserSummoners } from '../lib/actions';
import { AccountProvider } from '../lib/context/AccountContext';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DashboardTopBar from '../components/dashboard/DashboardTopBar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const result = await getUserSummoners();

  if (!result.success || !result.summoners || result.summoners.length === 0) {
    redirect('/');
  }

  return (
    <AccountProvider>
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'>
        {/* Header + Navigation */}
        <header className='border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50'>
          <div className='container mx-auto px-4 py-4 space-y-4'>
            {result.summoners && result.summoners.length > 0 && (
              <DashboardTopBar
                summoners={result.summoners}
                refreshSummonerId={
                  result.summoners.find((s) => s.is_main)?.id ||
                  result.summoners[0].id
                }
                refreshLastSyncedAt={
                  result.summoners.find((s) => s.is_main)?.last_synced_at ||
                  result.summoners[0].last_synced_at
                }
              />
            )}

            <Tabs
              defaultValue='dashboard'
              className='w-full'
            >
              <TabsList className='h-12 bg-transparent border-none px-0'>
                <Link href='/dashboard'>
                  <TabsTrigger
                    value='dashboard'
                    className='text-base'
                  >
                    Dashboard
                  </TabsTrigger>
                </Link>
                <Link href='/champions'>
                  <TabsTrigger
                    value='champions'
                    className='text-base'
                  >
                    Champions
                  </TabsTrigger>
                </Link>
                <Link href='/matches'>
                  <TabsTrigger
                    value='matches'
                    className='text-base'
                  >
                    Matches
                  </TabsTrigger>
                </Link>
                <Link href='/matchups'>
                  <TabsTrigger
                    value='matchups'
                    className='text-base'
                  >
                    Synergies & Matchups
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Main Content */}
        <main className='container mx-auto px-4 py-8'>{children}</main>
      </div>
    </AccountProvider>
  );
}
