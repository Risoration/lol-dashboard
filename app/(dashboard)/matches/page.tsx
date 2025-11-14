import { redirect } from 'next/navigation';
import { getUser, getUserSummoners, getMatchHistory } from '../../lib/actions';
import FilterBar from '../../components/FilterBar';
import MatchesContent from '../../components/dashboard/MatchesContent';

export default async function MatchesPage() {
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

  // Fetch all matches from all accounts
  const allMatches = await Promise.all(
    summoners.map(async (summoner) => {
      const result = await getMatchHistory(summoner.id, 100);
      return result.success ? result.matches : [];
    })
  );

  const matches = allMatches
    .flat()
    .sort((a, b) => b.game_creation - a.game_creation);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Match History</h1>
        <p className='text-muted-foreground'>
          Complete match history across all your linked accounts
        </p>
      </div>

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex-1 min-w-0'>
          <FilterBar />
        </div>
      </div>

      <MatchesContent matches={matches} summoners={summoners} />
    </div>
  );
}
