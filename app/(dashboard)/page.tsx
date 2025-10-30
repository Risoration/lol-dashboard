import { redirect } from 'next/navigation';
import {
  getUser,
  getUserSummoners,
  getStatsOverview,
  getMatchHistory,
  getChampionStats,
  getRankedStats,
} from '../lib/actions';
import OverviewStats from '../components/dashboard/OverviewStats';
import RecentMatches from '../components/dashboard/RecentMatches';
import TopChampions from '../components/dashboard/TopChampions';
import FilterBar from '../components/FilterBar';
import { Skeleton } from '../../components/ui/skeleton';

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

  // Fetch data for all summoners
  const allStats = await Promise.all(
    summoners.map(async (summoner) => {
      const stats = await getStatsOverview(summoner.id);
      const matches = await getMatchHistory(summoner.id, 20);
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

  // Combine stats from all accounts
  const combinedMatches = allStats
    .flatMap((s) => s.matches)
    .sort((a, b) => b.game_creation - a.game_creation);

  const combinedStats = {
    totalGames: allStats.reduce(
      (sum, s) => sum + (s.stats?.totalGames || 0),
      0
    ),
    wins: allStats.reduce((sum, s) => sum + (s.stats?.wins || 0), 0),
    losses: allStats.reduce((sum, s) => sum + (s.stats?.losses || 0), 0),
    winRate: 0,
    avgKDA: 0,
    avgKills: 0,
    avgDeaths: 0,
    avgAssists: 0,
  };

  if (combinedStats.totalGames > 0) {
    combinedStats.winRate = Number(
      ((combinedStats.wins / combinedStats.totalGames) * 100).toFixed(1)
    );
    combinedStats.avgKills = Number(
      (
        allStats.reduce(
          (sum, s) =>
            sum + (s.stats?.avgKills || 0) * (s.stats?.totalGames || 0),
          0
        ) / combinedStats.totalGames
      ).toFixed(1)
    );
    combinedStats.avgDeaths = Number(
      (
        allStats.reduce(
          (sum, s) =>
            sum + (s.stats?.avgDeaths || 0) * (s.stats?.totalGames || 0),
          0
        ) / combinedStats.totalGames
      ).toFixed(1)
    );
    combinedStats.avgAssists = Number(
      (
        allStats.reduce(
          (sum, s) =>
            sum + (s.stats?.avgAssists || 0) * (s.stats?.totalGames || 0),
          0
        ) / combinedStats.totalGames
      ).toFixed(1)
    );
    combinedStats.avgKDA =
      combinedStats.avgDeaths === 0
        ? combinedStats.avgKills + combinedStats.avgAssists
        : Number(
            (
              (combinedStats.avgKills + combinedStats.avgAssists) /
              combinedStats.avgDeaths
            ).toFixed(2)
          );
  }

  // Combine champion stats
  const championMap = new Map();
  allStats.forEach((accountStats) => {
    accountStats.champions.forEach((champ) => {
      const existing = championMap.get(champ.championId);
      if (existing) {
        existing.gamesPlayed += champ.gamesPlayed;
        existing.wins += champ.wins;
        existing.losses += champ.losses;
        existing.totalKills += champ.totalKills;
        existing.totalDeaths += champ.totalDeaths;
        existing.totalAssists += champ.totalAssists;
      } else {
        championMap.set(champ.championId, { ...champ });
      }
    });
  });

  const combinedChampions = Array.from(championMap.values())
    .map((champ) => ({
      ...champ,
      winRate: Number(((champ.wins / champ.gamesPlayed) * 100).toFixed(1)),
      avgKDA:
        champ.totalDeaths === 0
          ? champ.totalKills + champ.totalAssists
          : Number(
              (
                (champ.totalKills + champ.totalAssists) /
                champ.totalDeaths
              ).toFixed(2)
            ),
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 5);

  const combinedRankedStats = allStats.flatMap((s) => s.ranked);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Dashboard</h1>
        <p className='text-muted-foreground'>
          View your League of Legends performance across all linked accounts
        </p>
      </div>

      <FilterBar />

      <OverviewStats
        stats={combinedStats}
        rankedStats={combinedRankedStats}
      />

      <div className='grid md:grid-cols-2 gap-6'>
        <RecentMatches
          region={summoners[0].region}
          matchIds={combinedMatches.map((match) => match.metadata.matchId)}
        />
        <TopChampions champions={combinedChampions} />
      </div>
    </div>
  );
}
