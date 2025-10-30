import { redirect } from 'next/navigation';
import { getUser, getUserSummoners, getMatchHistory } from '../../lib/actions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

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

  const summoners = summonersResult.summoners;

  // Fetch all matches from all accounts
  const allMatches = await Promise.all(
    summoners.map(async (summoner) => {
      const result = await getMatchHistory(summoner.id, 100);
      return result.success ? result.matches : [];
    })
  );

  const matches = allMatches.flat();

  // Build matchup statistics
  // For now, this is a simplified version
  // In a full implementation, we'd need to track opponent champions from match data
  const matchupMap = new Map<
    string,
    {
      playerChampion: string;
      opponentChampion: string;
      games: number;
      wins: number;
    }
  >();

  // This is a placeholder since we don't have opponent champion data yet
  // In reality, you'd need to modify the match storage to include opponent data
  const matchups = Array.from(matchupMap.values())
    .map((matchup) => ({
      ...matchup,
      winRate: Number(((matchup.wins / matchup.games) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.games - a.games);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Matchup Statistics</h1>
        <p className='text-muted-foreground'>
          Head-to-head performance against specific champion matchups
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Champion Matchups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-12 text-muted-foreground'>
            <h3 className='text-lg font-semibold mb-2'>Coming Soon</h3>
            <p>
              Matchup statistics require additional data processing. This
              feature will analyze your lane opponent matchups and provide
              detailed win rates for specific champion versus champion
              combinations.
            </p>
            <p className='mt-4 text-sm'>
              For now, check out your Champion Stats and Match History pages for
              detailed performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
