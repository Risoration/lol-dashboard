'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { getChampionImageUrl, cn } from '@/app/lib/utils';
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
  limit = 3,
  showBest = true,
}: MatchupsSectionProps) {
  const [playerChampionFilter, setPlayerChampionFilter] =
    useState<string>('ALL');
  const [opponentChampionFilter, setOpponentChampionFilter] =
    useState<string>('ALL');
  const [showAll, setShowAll] = useState(false);

  // Reset showAll when filters change
  useEffect(() => {
    setShowAll(false);
  }, [playerChampionFilter, opponentChampionFilter]);

  // Get unique player champions and opponent champions for filters
  const uniquePlayerChampions = Array.from(
    new Set(matchups.map((m) => m.playerChampionName))
  ).sort();

  const uniqueOpponentChampions = Array.from(
    new Set(matchups.map((m) => m.opponentChampionName))
  ).sort();

  // Sort matchups: best = highest winrate, worst = lowest winrate
  // Filter to only show matchups with at least 2 games
  let allFiltered = matchups
    .filter((m) => m.games >= 2)
    .filter((m) => {
      if (
        playerChampionFilter !== 'ALL' &&
        m.playerChampionName !== playerChampionFilter
      ) {
        return false;
      }
      if (
        opponentChampionFilter !== 'ALL' &&
        m.opponentChampionName !== opponentChampionFilter
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (showBest ? b.winRate - a.winRate : a.winRate - b.winRate));

  const displayed = showAll ? allFiltered : allFiltered.slice(0, limit);
  const hasMore = allFiltered.length > limit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters - Always visible */}
        <div className='mb-4 space-y-4 pb-4 border-b'>
          <div className='flex flex-col sm:flex-row gap-4'>
            {/* Player Champion Filter */}
            <div className='flex-1'>
              <label
                htmlFor={`player-champion-filter-${title}`}
                className='text-sm font-medium mb-2 block'
              >
                Your Champion:
              </label>
              <select
                id={`player-champion-filter-${title}`}
                value={playerChampionFilter}
                onChange={(e) => setPlayerChampionFilter(e.target.value)}
                className={cn(
                  'w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:bg-slate-900 dark:border-slate-700'
                )}
              >
                <option value='ALL'>All Champions</option>
                {uniquePlayerChampions.map((champ) => (
                  <option key={champ} value={champ}>
                    {champ}
                  </option>
                ))}
              </select>
            </div>

            {/* Opponent Champion Filter */}
            <div className='flex-1'>
              <label
                htmlFor={`opponent-champion-filter-${title}`}
                className='text-sm font-medium mb-2 block'
              >
                Enemy Champion:
              </label>
              <select
                id={`opponent-champion-filter-${title}`}
                value={opponentChampionFilter}
                onChange={(e) => setOpponentChampionFilter(e.target.value)}
                className={cn(
                  'w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:bg-slate-900 dark:border-slate-700'
                )}
              >
                <option value='ALL'>All Champions</option>
                {uniqueOpponentChampions.map((champ) => (
                  <option key={champ} value={champ}>
                    {champ}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {allFiltered.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            No matchups found matching the selected filters.
          </div>
        ) : (
          <div className='space-y-3'>
            {displayed.map((matchup, index) => (
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
                    <div className='text-sm text-muted-foreground'>
                      Win Rate
                    </div>
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
            {hasMore && (
              <div className='mt-4 flex justify-center'>
                <Button
                  variant='outline'
                  onClick={() => setShowAll(!showAll)}
                  className='w-full'
                >
                  {showAll
                    ? 'Show Less'
                    : `Show More (${allFiltered.length - limit} more)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
