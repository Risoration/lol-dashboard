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
import { getChampionImageUrl } from '@/app/lib/utils';
import Image from 'next/image';
import { cn } from '@/app/lib/utils';

interface SynergyStat {
  playerChampionId: number;
  playerChampionName: string;
  teammateChampionId: number;
  teammateChampionName: string;
  teammateRole: string | null;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface SynergiesSectionProps {
  synergies: SynergyStat[];
  title?: string;
  limit?: number;
  showBest?: boolean; // true for best, false for worst
}

// Format role for display (capitalize first letter, lowercase rest; UTILITY -> Support)
function formatRoleDisplay(role: string | null): string {
  if (!role) return '';
  if (role === 'UTILITY') return 'Support';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function SynergiesSection({
  synergies,
  title = 'Synergies',
  limit = 5,
  showBest = true,
}: SynergiesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [playerChampionFilter, setPlayerChampionFilter] =
    useState<string>('ALL');

  // Reset showAll when filters change
  useEffect(() => {
    setShowAll(false);
  }, [playerChampionFilter]);

  // Get unique player champions for filters
  const uniquePlayerChampions = Array.from(
    new Set(synergies.map((s) => s.playerChampionName))
  ).sort();

  // Sort synergies: best = highest winrate, worst = lowest winrate
  // Filter to only show synergies with at least 2 games
  let allFiltered = synergies
    .filter((s) => s.games >= 3)
    .filter((s) => {
      if (
        playerChampionFilter !== 'ALL' &&
        s.playerChampionName !== playerChampionFilter
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
                htmlFor='player-champion-filter'
                className='text-sm font-medium mb-2 block'
              >
                Your Champion:
              </label>
              <select
                id='player-champion-filter'
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
                  <option
                    key={champ}
                    value={champ}
                  >
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
            No synergies found matching the selected filters.
          </div>
        ) : (
          <div className='space-y-3'>
            {displayed.map((synergy, index) => (
              <div
                key={`${synergy.playerChampionId}-${
                  synergy.teammateChampionId
                }-${synergy.teammateRole || 'NONE'}`}
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
                        src={getChampionImageUrl(synergy.playerChampionName)}
                        alt={synergy.playerChampionName}
                        className='w-10 h-10 rounded'
                        width={40}
                        height={40}
                      />
                      <span className='text-xs font-medium mt-1'>
                        {synergy.playerChampionName}
                      </span>
                    </div>
                    <span className='text-xl font-bold text-muted-foreground'>
                      +
                    </span>
                    <div className='flex flex-col items-center'>
                      <Image
                        src={getChampionImageUrl(synergy.teammateChampionName)}
                        alt={synergy.teammateChampionName}
                        className='w-10 h-10 rounded'
                        width={40}
                        height={40}
                      />
                      <span className='text-xs font-medium mt-1'>
                        {synergy.teammateChampionName}
                      </span>
                      {synergy.teammateRole && (
                        <Badge
                          variant='defeat'
                          className='text-xs mt-1 px-1.5 py-0'
                        >
                          {formatRoleDisplay(synergy.teammateRole)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className='flex gap-6 text-center'>
                  <div>
                    <div className='text-sm text-muted-foreground'>Games</div>
                    <div className='font-semibold mt-1'>{synergy.games}</div>
                  </div>
                  <div>
                    <div className='text-sm text-muted-foreground'>
                      Win Rate
                    </div>
                    <Badge
                      variant={synergy.winRate >= 50 ? 'victory' : 'defeat'}
                      className='mt-1'
                    >
                      {synergy.winRate}%
                    </Badge>
                  </div>
                  <div>
                    <div className='text-sm text-muted-foreground'>Record</div>
                    <div className='text-sm mt-1'>
                      {synergy.wins}W - {synergy.losses}L
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
