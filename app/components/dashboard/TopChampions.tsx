'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { getChampionImageUrl } from '@/app/lib/utils';
import Image from 'next/image';

interface ChampionStat {
  championId: number;
  championName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKDA: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
}

interface TopChampionsProps {
  champions: ChampionStat[];
}

export default function TopChampions({ champions }: TopChampionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Champions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {champions.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No champion data available. Play some games and refresh your data!
            </div>
          ) : (
            champions.map((champion, index) => (
              <div
                key={champion.championId}
                className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors'
              >
                <div className='flex items-center gap-4 flex-1'>
                  {/* Rank */}
                  <div className='w-8 text-center font-bold text-lg text-muted-foreground'>
                    #{index + 1}
                  </div>

                  {/* Champion Icon */}
                  <Image
                    src={getChampionImageUrl(champion.championName)}
                    alt={champion.championName}
                    className='w-12 h-12 rounded'
                    width={48}
                    height={48}
                  />

                  {/* Champion Info */}
                  <div className='flex-1'>
                    <div className='font-semibold'>{champion.championName}</div>
                    <div className='text-sm text-muted-foreground'>
                      {champion.gamesPlayed} games played
                    </div>
                  </div>

                  {/* Stats */}
                  <div className='flex gap-6 text-center'>
                    <div>
                      <div className='text-sm text-muted-foreground'>
                        Win Rate
                      </div>
                      <div className='flex items-center gap-2 mt-1'>
                        <Badge
                          variant={champion.winRate >= 50 ? 'victory' : 'defeat'}
                        >
                          {champion.winRate}%
                        </Badge>
                        <span className='text-sm text-muted-foreground'>
                          {champion.wins}W - {champion.losses}L
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className='text-sm text-muted-foreground'>KDA</div>
                      <div className='font-semibold mt-1'>
                        {champion.avgKDA}
                      </div>
                    </div>

                    <div className='hidden md:block'>
                      <div className='text-sm text-muted-foreground'>
                        K / D / A
                      </div>
                      <div className='text-sm mt-1'>
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
                      </div>
                    </div>
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
