import { redirect } from 'next/navigation';
import { getUser, getUserSummoners, getMatchHistory } from '../../lib/actions';
import FilterBar from '../../components/FilterBar';
import ChampionsContent from '../../components/dashboard/ChampionsContent';

export default async function ChampionsPage() {
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

  const summoners = summonersResult.summoners;

  // Fetch matches for all summoners (needed for filtering)
  const allStats = await Promise.all(
    summoners.map(async (summoner) => {
      const matches = await getMatchHistory(summoner.id, null);
      return {
        summonerId: summoner.id,
        matches: matches.success ? matches.matches : [],
      };
    })
  );

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Champion Statistics</h1>
        <p className='text-muted-foreground'>
          Detailed performance data for all champions you've played across all
          accounts
        </p>
      </div>

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex-1 min-w-0'>
          <FilterBar />
        </div>
      </div>

      <ChampionsContent allStats={allStats} summoners={summoners} />
    </div>
  );
}
