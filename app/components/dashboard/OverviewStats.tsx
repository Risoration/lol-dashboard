'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import type { RankedStats, Summoner } from '../../lib/database/types';
import Image from 'next/image';
import { getProfileIcon, getTierIcon } from '@/app/lib/utils';

interface OverviewStatsProps {
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    avgKDA: number;
    avgKills: number;
    avgDeaths: number;
    avgAssists: number;
    profile_icon_id: number;
    summoner_name: string;
  };
  rankedStats: RankedStats[];
  summonerMap: Record<string, Summoner>;
}

export default function OverviewStats({
  stats,
  rankedStats,
  summonerMap,
}: OverviewStatsProps) {
  return (
    <div className='space-y-6'>
      {/* Ranked Stats */}
      {rankedStats && rankedStats.length > 0 && (
        <div>
          <h2 className='text-xl font-semibold mb-4'>Ranked Status</h2>
          <div className='grid md:grid-cols-2 gap-4'>
            {rankedStats.map((ranked) => (
              <Card key={ranked.id}>
                <CardHeader>
                  <CardTitle className='text-base'>
                    {ranked.queue_type === 'RANKED_SOLO_5x5'
                      ? 'Ranked Solo/Duo'
                      : 'Ranked Flex'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center justify-between'>
                    <div>
                      {ranked.tier ? (
                        <>
                          <div className='flex items-center justify-between gap-2 mb-2'>
                            {(() => {
                              const account =
                                summonerMap[ranked.summoner_id] ?? null;
                              const displayName =
                                account?.summoner_name || stats.summoner_name;
                              const profileIconId =
                                account?.profile_icon_id ||
                                stats.profile_icon_id;

                              return (
                                <>
                                  <Image
                                    src={getProfileIcon(Number(profileIconId))}
                                    className='w-10 h-10 rounded-4xl'
                                    alt={displayName}
                                    height={40}
                                    width={40}
                                  />
                                  <span className='font-medium'>
                                    {displayName}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <div className='flex items-center justify-between gap-2 mb-2'>
                            <Image
                              src={getTierIcon(ranked.tier)}
                              className='w-10 h-10'
                              alt={ranked.tier}
                              height={40}
                              width={40}
                            />
                            <span className='text-sm font-medium'>
                              {ranked.tier} {ranked.rank}
                            </span>
                          </div>
                          <div className='flex items-center justify-between text-sm text-muted-foreground'>
                            {ranked.wins}W {ranked.losses}L
                            <span className='ml-2'>
                              (
                              {(
                                (ranked.wins / (ranked.wins + ranked.losses)) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className='text-sm text-muted-foreground'>
                          Unranked
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div>
        <h2 className='text-xl font-semibold mb-4'>Recent Match Statistics</h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.totalGames}</div>
              <div className='text-xs text-muted-foreground mt-1'>
                {stats.wins}W {stats.losses}L
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.winRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Average KDA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.avgKDA}</div>
              <div className='text-xs text-muted-foreground mt-1'>
                {stats.avgKills} / {stats.avgDeaths} / {stats.avgAssists}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {stats.avgKDA >= 5 ? 'S' : stats.avgKDA >= 3 ? 'A' : 'B'}
              </div>
              <div className='text-xs text-muted-foreground mt-1'>Grade</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
