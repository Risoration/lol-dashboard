'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import type { Match } from '../../lib/database/types';
import { formatDistanceToNow } from 'date-fns';
import { RiotApi } from '../../lib/riot/api';
import type { Region } from '@/app/lib/riot/types';
import Image from 'next/image';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { AvatarFallback } from '@radix-ui/react-avatar';

interface RecentMatchesProps {
  region: Region;
  matchIds: string[];
}

const riotApi = new RiotApi();

export default async function RecentMatches({
  region,
  matchIds,
}: RecentMatchesProps) {
  const matches = await riotApi.getMultipleMatches(region, matchIds, 10);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getKDAColor = (kills: number, deaths: number, assists: number) => {
    const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
    if (kda >= 3) return 'text-orange-600 dark:text-orange-400';
    if (kda >= 2) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Matches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          {matches.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No matches found. Refresh your data to load recent matches.
            </div>
          ) : (
            matches.slice(0, 20).map((match) => (
              <div
                key={match.metadata.matchId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  match.info.teams[0].win
                    ? 'bg-blue-500 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                    : 'bg-red-500 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                }`}
              >
                <div className='flex items-center gap-4 flex-1'>
                  {/* Champion */}
                  <div className='w-24'>
                    <Badge
                      variant={match.info.teams[0].win ? 'victory' : 'defeat'}
                      className='text-xs'
                    >
                      {match.info.teams[0].win ? 'Victory' : 'Defeat'}
                    </Badge>
                  </div>

                  {/* KDA */}
                  <div className='w-32'>
                    <div
                      className={`font-medium ${getKDAColor(
                        match.info.participants[0].kills,
                        match.info.participants[0].deaths,
                        match.info.participants[0].assists
                      )}`}
                    >
                      {match.info.participants[0].kills} /{' '}
                      {match.info.participants[0].deaths} /{' '}
                      {match.info.participants[0].assists}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {match.info.participants[0].deaths === 0
                        ? 'Perfect'
                        : (
                            (match.info.participants[0].kills +
                              match.info.participants[0].assists) /
                            match.info.participants[0].deaths
                          ).toFixed(2)}{' '}
                      KDA
                    </div>
                  </div>

                  {/* Stats */}
                  <div className='hidden md:flex gap-6 text-sm'>
                    <div>
                      <div className='text-muted-foreground text-xs'>CS</div>
                      <div className='font-medium'>
                        {match.info.participants[0].totalMinionsKilled}
                      </div>
                    </div>
                    <div>
                      <div className='text-muted-foreground text-xs'>
                        Damage
                      </div>
                      <div className='font-medium'>
                        {(
                          match.info.participants[0].totalDamageDealt / 1000
                        ).toFixed(1)}
                        k
                      </div>
                    </div>
                    <div>
                      <div className='text-muted-foreground text-xs'>Gold</div>
                      <div className='font-medium'>
                        {(match.info.participants[0].goldEarned / 1000).toFixed(
                          1
                        )}
                        k
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time & Duration */}
                <div className='text-right text-sm'>
                  <div className='text-muted-foreground text-xs'>
                    {formatDistanceToNow(new Date(match.info.gameCreation), {
                      addSuffix: true,
                    })}
                  </div>
                  <div className='font-medium'>
                    {formatDuration(match.info.gameDuration)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
