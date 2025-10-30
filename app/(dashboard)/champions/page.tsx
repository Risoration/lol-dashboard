import { redirect } from 'next/navigation';
import { getUser, getUserSummoners, getChampionStats } from '../../lib/actions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

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

  // Fetch champion stats for all summoners
  const allChampionStats = await Promise.all(
    summoners.map(async (summoner) => {
      const result = await getChampionStats(summoner.id, 100);
      return result.success ? result.stats : [];
    })
  );

  // Combine champion stats from all accounts
  const championMap = new Map();
  allChampionStats.flat().forEach((champ) => {
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

  const champions = Array.from(championMap.values())
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
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Champion Statistics</h1>
        <p className='text-muted-foreground'>
          Detailed performance data for all champions you've played
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Champions ({champions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {champions.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No champion data available. Play some games and refresh your data!
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b text-left'>
                    <th className='pb-3 pr-4'>Rank</th>
                    <th className='pb-3 pr-4'>Champion</th>
                    <th className='pb-3 pr-4 text-center'>Games</th>
                    <th className='pb-3 pr-4 text-center'>Win Rate</th>
                    <th className='pb-3 pr-4 text-center'>KDA</th>
                    <th className='pb-3 pr-4 text-center'>Avg K / D / A</th>
                  </tr>
                </thead>
                <tbody>
                  {champions.map((champion, index) => (
                    <tr
                      key={champion.championId}
                      className='border-b hover:bg-accent/50 transition-colors'
                    >
                      <td className='py-3 pr-4 font-semibold'>{index + 1}</td>
                      <td className='py-3 pr-4 font-medium'>
                        {champion.championName}
                      </td>
                      <td className='py-3 pr-4 text-center'>
                        {champion.gamesPlayed}
                      </td>
                      <td className='py-3 pr-4 text-center'>
                        <Badge
                          variant={
                            champion.winRate >= 50 ? 'default' : 'secondary'
                          }
                        >
                          {champion.winRate}%
                        </Badge>
                      </td>
                      <td className='py-3 pr-4 text-center font-semibold'>
                        {champion.avgKDA}
                      </td>
                      <td className='py-3 pr-4 text-center text-sm text-muted-foreground'>
                        {(champion.totalKills / champion.gamesPlayed).toFixed(
                          1
                        )}{' '}
                        /{' '}
                        {(champion.totalDeaths / champion.gamesPlayed).toFixed(
                          1
                        )}{' '}
                        /{' '}
                        {(champion.totalAssists / champion.gamesPlayed).toFixed(
                          1
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
