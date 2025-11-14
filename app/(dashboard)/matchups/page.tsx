import { redirect } from 'next/navigation';
import { getUser, getUserSummoners } from '../../lib/actions';
import FilterBar from '../../components/FilterBar';
import SynergyPageContent from '../../components/dashboard/SynergyPageContent';

export default async function MatchupsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const summonersResult = await getUserSummoners();

  if (
    !summonersResult.success ||
    !summonersResult.summoners ||
    summonersResult.summoners.length === 0
  ) {
    redirect('/');
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Synergies & Matchups</h1>
        <p className='text-muted-foreground'>
          Analyze your champion matchups, synergies, and duo win rates across
          all accounts
        </p>
      </div>

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex-1 min-w-0'>
          <FilterBar />
        </div>
      </div>

      <SynergyPageContent />
    </div>
  );
}
