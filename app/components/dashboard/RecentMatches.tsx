import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { Match } from '../../lib/database/types';
import { getChampionImageUrl } from '@/app/lib/utils';
import Image from 'next/image';

interface RecentMatchesProps {
  matches: Match[];
  title?: string;
  limit?: number;
}

export default function RecentMatches({
  matches,
  title = 'Recent Matches',
  limit = 20,
}: RecentMatchesProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getKDAColor = (kills: number, deaths: number, assists: number) => {
    const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
    if (kda >= 5) return 'text-orange-600 dark:text-orange-400';
    if (kda >= 3) return 'text-blue-600 dark:text-blue-400';
    if (kda >= 1) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-2 overflow-y-auto max-h-[500px] rounded-lg'>
          {matches.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No matches found. Refresh your data to load recent matches.
            </div>
          ) : (
            matches.slice(0, limit).map((match) => {
              const kdaRatio =
                match.deaths === 0
                  ? match.kills + match.assists
                  : ((match.kills + match.assists) / match.deaths).toFixed(2);

              return (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    match.win
                      ? 'bg-blue-500 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                      : 'bg-red-500 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  }`}
                >
                  <div className='flex items-center gap-4 flex-1'>
                    {/* Champion */}
                    <div className='w-fit flex flex-col items-center'>
                      <Image
                        src={getChampionImageUrl(match.champion_name)}
                        alt={match.champion_name}
                        className='w-10 h-10 rounded-4xl'
                        width={40}
                        height={40}
                      />
                      <span className='text-sm font-medium'>
                        {match.champion_name}
                      </span>
                    </div>
                    <Badge
                      variant={match.win ? 'victory' : 'defeat'}
                      className='text-xs'
                    >
                      {match.win ? 'Victory' : 'Defeat'}
                    </Badge>
                    {/* KDA */}
                    <div className='w-32'>
                      <div className={`font-medium`}>
                        {match.kills} / {match.deaths} / {match.assists}
                      </div>
                      <div
                        className={`text-smfont-medium ${getKDAColor(
                          match.kills,
                          match.deaths,
                          match.assists
                        )}`}
                      >
                        {kdaRatio} KDA
                      </div>
                    </div>

                    {/* Stats */}
                    <div className='hidden md:flex gap-6 text-sm'>
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
                    </div>
                  </div>

                  {/* Time & Duration */}
                  <div className='text-right text-sm'>
                    <div className='text-muted-foreground text-xs'>
                      {formatDistanceToNow(new Date(match.game_creation), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className='font-medium'>
                      {formatDuration(match.game_duration)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
