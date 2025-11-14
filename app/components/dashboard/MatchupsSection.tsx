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

interface MatchupStat {
  playerChampionId: number;
  playerChampionName: string;
  opponentChampionId: number;
  opponentChampionName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface MatchupsSectionProps {
  matchups: MatchupStat[];
  title?: string;
  limit?: number;
  showBest?: boolean; // true for best, false for worst
}

export default function MatchupsSection({
  matchups,
  title = 'Matchups',
  limit = 5,
  showBest = true,
}: MatchupsSectionProps) {
  // Sort matchups: best = highest winrate, worst = lowest winrate
  // Filter to only show matchups with at least 2 games
  const filtered = matchups
    .filter((m) => m.games >= 2)
    .sort((a, b) => (showBest ? b.winRate - a.winRate : a.winRate - b.winRate))
    .slice(0, limit);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {filtered.map((matchup, index) => (
            <div
              key={`${matchup.playerChampionId}-${matchup.opponentChampionId}`}
              className='flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors'
            >
              <div className='flex items-center gap-4 flex-1'>
                {/* Rank */}
                <div className='w-8 text-center font-bold text-lg text-muted-foreground'>
                  #{index + 1}
                </div>

                {/* Champions */}
                <div className='flex items-center gap-3'>
                  <div className='flex flex-col items-center'>
                    <Image
                      src={getChampionImageUrl(matchup.playerChampionName)}
                      alt={matchup.playerChampionName}
                      className='w-10 h-10 rounded'
                      width={40}
                      height={40}
                    />
                    <span className='text-xs font-medium mt-1'>
                      {matchup.playerChampionName}
                    </span>
                  </div>
                  <span className='text-xl font-bold text-muted-foreground'>
                    vs
                  </span>
                  <div className='flex flex-col items-center'>
                    <Image
                      src={getChampionImageUrl(matchup.opponentChampionName)}
                      alt={matchup.opponentChampionName}
                      className='w-10 h-10 rounded'
                      width={40}
                      height={40}
                    />
                    <span className='text-xs font-medium mt-1'>
                      {matchup.opponentChampionName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className='flex gap-6 text-center'>
                <div>
                  <div className='text-sm text-muted-foreground'>Games</div>
                  <div className='font-semibold mt-1'>{matchup.games}</div>
                </div>
                <div>
                  <div className='text-sm text-muted-foreground'>Win Rate</div>
                  <Badge
                    variant={matchup.winRate >= 50 ? 'victory' : 'defeat'}
                    className='mt-1'
                  >
                    {matchup.winRate}%
                  </Badge>
                </div>
                <div>
                  <div className='text-sm text-muted-foreground'>Record</div>
                  <div className='text-sm mt-1'>
                    {matchup.wins}W - {matchup.losses}L
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
