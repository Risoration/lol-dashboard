import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserSummoners } from '../lib/actions';
import { AccountProvider } from '../lib/context/AccountContext';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import AccountManager from '../components/AccountManager';

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
        {/* Header */}
        <header className='border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50'>
          <div className='container mx-auto px-4 py-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Link
                  href='/dashboard'
                  className='text-2xl font-bold'
                >
                  LoL Dashboard
                </Link>
              </div>

              <AccountManager initialSummoners={result.summoners} />
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className='border-b bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm'>
          <div className='container mx-auto px-4'>
            <Tabs
              defaultValue='dashboard'
              className='w-full'
            >
              <TabsList className='h-12 bg-transparent border-none'>
                <Link href='/dashboard'>
                  <TabsTrigger
                    value='dashboard'
                    className='text-base'
                  >
                    Dashboard
                  </TabsTrigger>
                </Link>
                <Link href='/dashboard/champions'>
                  <TabsTrigger
                    value='champions'
                    className='text-base'
                  >
                    Champions
                  </TabsTrigger>
                </Link>
                <Link href='/dashboard/matches'>
                  <TabsTrigger
                    value='matches'
                    className='text-base'
                  >
                    Matches
                  </TabsTrigger>
                </Link>
                <Link href='/dashboard/matchups'>
                  <TabsTrigger
                    value='matchups'
                    className='text-base'
                  >
                    Matchups
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>
          </div>
        </nav>

        {/* Main Content */}
        <main className='container mx-auto px-4 py-8'>{children}</main>
      </div>
    </AccountProvider>
  );
}
