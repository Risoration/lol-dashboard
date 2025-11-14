import { redirect } from 'next/navigation';
import {
  getUser,
  getUserSummoners,
  getStatsOverview,
  getMatchHistory,
  getChampionStats,
  getRankedStats,
} from '../../lib/actions';
import FilterBar from '../../components/FilterBar';
import DashboardContent from '../../components/dashboard/DashboardContent';

export default async function DashboardPage() {
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
  const primarySummoner = summoners[0];

  // Fetch data for all summoners
  const allStats = await Promise.all(
    summoners.map(async (summoner) => {
      const stats = await getStatsOverview(summoner.id);
      const matches = await getMatchHistory(summoner.id, null); // Fetch all matches for aggregation
      const champions = await getChampionStats(summoner.id, 10);
      const ranked = await getRankedStats(summoner.id);

      return {
        summonerId: summoner.id,
        stats: stats.success ? stats.stats : null,
        matches: matches.success ? matches.matches : [],
        champions: champions.success ? champions.stats : [],
        ranked: ranked.success ? ranked.rankedStats : [],
      };
    })
  );

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Dashboard</h1>
        <p className='text-muted-foreground'>
          View your League of Legends performance across all linked accounts
        </p>
      </div>

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex-1 min-w-0'>
          <FilterBar />
        </div>
      </div>

      <DashboardContent allStats={allStats} summoners={summoners} />
    </div>
  );
}
