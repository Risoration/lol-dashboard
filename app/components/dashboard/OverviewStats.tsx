'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import type { RankedStats } from '../../lib/database/types';

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
  };
  rankedStats: RankedStats[];
}

export default function OverviewStats({
  stats,
  rankedStats,
}: OverviewStatsProps) {
  const getTierColor = (tier: string | null) => {
    if (!tier) return 'default';
    const lowerTier = tier.toLowerCase();
    if (lowerTier.includes('challenger')) return 'default';
    if (lowerTier.includes('grandmaster')) return 'destructive';
    if (lowerTier.includes('master')) return 'destructive';
    if (lowerTier.includes('diamond')) return 'default';
    if (lowerTier.includes('emerald')) return 'default';
    if (lowerTier.includes('platinum')) return 'secondary';
    if (lowerTier.includes('gold')) return 'secondary';
    if (lowerTier.includes('silver')) return 'outline';
    if (lowerTier.includes('bronze')) return 'outline';
    return 'outline';
  };

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
                          <div className='flex items-center gap-2 mb-2'>
                            <Badge variant={getTierColor(ranked.tier)}>
                              {ranked.tier} {ranked.rank}
                            </Badge>
                            <span className='text-sm font-medium'>
                              {ranked.league_points} LP
                            </span>
                          </div>
                          <div className='text-sm text-muted-foreground'>
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
        <h2 className='text-xl font-semibold mb-4'>Overall Statistics</h2>
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
              <div
                className={`text-xs mt-1 ${
                  stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stats.winRate >= 50 ? 'Above Average' : 'Below Average'}
              </div>
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
                {stats.avgKDA >= 3 ? 'S' : stats.avgKDA >= 2 ? 'A' : 'B'}
              </div>
              <div className='text-xs text-muted-foreground mt-1'>Grade</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
