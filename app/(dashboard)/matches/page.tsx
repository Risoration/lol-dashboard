import { redirect } from 'next/navigation';
import { getUser, getUserSummoners, getMatchHistory } from '../../lib/actions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getKDAColor = (kills: number, deaths: number, assists: number) => {
    const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
    if (kda >= 3) return 'text-green-600 dark:text-green-400';
    if (kda >= 2) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold mb-2'>Match History</h1>
        <p className='text-muted-foreground'>
          Complete match history across all your linked accounts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Matches ({matches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No matches found. Refresh your data to load recent matches.
            </div>
          ) : (
            <div className='space-y-2'>
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    match.win
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  }`}
                >
                  <div className='flex items-center gap-6 flex-1'>
                    {/* Champion */}
                    <div className='w-32'>
                      <div className='font-semibold'>{match.champion_name}</div>
                      <Badge variant={match.win ? 'default' : 'destructive'}>
                        {match.win ? 'Victory' : 'Defeat'}
                      </Badge>
                    </div>

                    {/* Role */}
                    {match.team_position && (
                      <div className='w-20 hidden md:block'>
                        <Badge variant='outline'>{match.team_position}</Badge>
                      </div>
                    )}

                    {/* KDA */}
                    <div className='w-32'>
                      <div
                        className={`font-semibold ${getKDAColor(
                          match.kills,
                          match.deaths,
                          match.assists
                        )}`}
                      >
                        {match.kills} / {match.deaths} / {match.assists}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {match.deaths === 0
                          ? 'Perfect'
                          : (
                              (match.kills + match.assists) /
                              match.deaths
                            ).toFixed(2)}{' '}
                        KDA
                      </div>
                    </div>

                    {/* Stats */}
                    <div className='hidden lg:flex gap-8 text-sm'>
                      <div>
                        <div className='text-muted-foreground text-xs'>CS</div>
                        <div className='font-medium'>{match.cs}</div>
                      </div>
                      <div>
                        <div className='text-muted-foreground text-xs'>
                          Damage
                        </div>
                        <div className='font-medium'>
                          {(match.damage_dealt / 1000).toFixed(1)}k
                        </div>
                      </div>
                      <div>
                        <div className='text-muted-foreground text-xs'>
                          Gold
                        </div>
                        <div className='font-medium'>
                          {(match.gold_earned / 1000).toFixed(1)}k
                        </div>
                      </div>
                      <div>
                        <div className='text-muted-foreground text-xs'>
                          Vision
                        </div>
                        <div className='font-medium'>{match.vision_score}</div>
                      </div>
                    </div>
                  </div>

                  {/* Time & Duration */}
                  <div className='text-right'>
                    <div className='text-sm text-muted-foreground'>
                      {formatDistanceToNow(new Date(match.game_creation), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className='font-medium'>
                      {formatDuration(match.game_duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
