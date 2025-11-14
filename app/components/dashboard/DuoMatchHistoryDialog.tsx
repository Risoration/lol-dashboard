'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { getChampionImageUrl } from '@/app/lib/utils';
import { getDuoMatchHistory } from '../../lib/actions';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/app/lib/utils';

interface DuoMatch {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  queueId: number;
  win: boolean;
  playerChampion: string;
  playerChampionId: number;
  playerKills: number;
  playerDeaths: number;
  playerAssists: number;
  teammateChampion: string;
  teammateChampionId: number;
  teammateKills: number;
  teammateDeaths: number;
  teammateAssists: number;
}

interface DuoMatchHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summonerId: string;
  teammatePuuid: string;
  teammateName: string;
}

export default function DuoMatchHistoryDialog({
  open,
  onOpenChange,
  summonerId,
  teammatePuuid,
  teammateName,
}: DuoMatchHistoryDialogProps) {
  const [matches, setMatches] = useState<DuoMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerChampionFilter, setPlayerChampionFilter] = useState<string>('ALL');
  const [teammateChampionFilter, setTeammateChampionFilter] = useState<string>('ALL');

  useEffect(() => {
    if (open && summonerId && teammatePuuid) {
      fetchMatchHistory();
    }
  }, [open, summonerId, teammatePuuid]);

  async function fetchMatchHistory() {
    setLoading(true);
    setError(null);
    try {
      const result = await getDuoMatchHistory(summonerId, teammatePuuid);
      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setError(result.error || 'Failed to fetch match history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch match history');
    } finally {
      setLoading(false);
    }
  }

  // Get unique champions for filters
  const uniquePlayerChampions = useMemo(() => {
    return Array.from(new Set(matches.map((m) => m.playerChampion))).sort();
  }, [matches]);

  const uniqueTeammateChampions = useMemo(() => {
    return Array.from(new Set(matches.map((m) => m.teammateChampion))).sort();
  }, [matches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (playerChampionFilter !== 'ALL' && match.playerChampion !== playerChampionFilter) {
        return false;
      }
      if (teammateChampionFilter !== 'ALL' && match.teammateChampion !== teammateChampionFilter) {
        return false;
      }
      return true;
    });
  }, [matches, playerChampionFilter, teammateChampionFilter]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Match History with {teammateName}</DialogTitle>
          <DialogDescription>
            {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''} found
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className='space-y-4 pb-4 border-b'>
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
                  <option key={champ} value={champ}>
                    {champ}
                  </option>
                ))}
              </select>
            </div>

            {/* Teammate Champion Filter */}
            <div className='flex-1'>
              <label
                htmlFor='teammate-champion-filter'
                className='text-sm font-medium mb-2 block'
              >
                {teammateName.split('#')[0]}'s Champion:
              </label>
              <select
                id='teammate-champion-filter'
                value={teammateChampionFilter}
                onChange={(e) => setTeammateChampionFilter(e.target.value)}
                className={cn(
                  'w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
                  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:bg-slate-900 dark:border-slate-700'
                )}
              >
                <option value='ALL'>All Champions</option>
                {uniqueTeammateChampions.map((champ) => (
                  <option key={champ} value={champ}>
                    {champ}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Match List */}
        {loading ? (
          <div className='text-center py-8 text-muted-foreground'>
            Loading match history...
          </div>
        ) : error ? (
          <div className='text-center py-8 text-destructive'>
            {error}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            No matches found matching the selected filters.
          </div>
        ) : (
          <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
            {filteredMatches.map((match) => {
              const playerKDA = match.playerDeaths === 0
                ? match.playerKills + match.playerAssists
                : ((match.playerKills + match.playerAssists) / match.playerDeaths).toFixed(2);
              const teammateKDA = match.teammateDeaths === 0
                ? match.teammateKills + match.teammateAssists
                : ((match.teammateKills + match.teammateAssists) / match.teammateDeaths).toFixed(2);

              return (
                <div
                  key={match.matchId}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    match.win
                      ? 'bg-blue-500 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                      : 'bg-red-500 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  )}
                >
                  <div className='flex items-center gap-4 flex-1'>
                    {/* Player Champion */}
                    <div className='flex flex-col items-center'>
                      <Image
                        src={getChampionImageUrl(match.playerChampion)}
                        alt={match.playerChampion}
                        className='w-10 h-10 rounded'
                        width={40}
                        height={40}
                      />
                      <span className='text-xs font-medium mt-1'>
                        {match.playerChampion}
                      </span>
                      <div className={cn('text-xs mt-1', getKDAColor(match.playerKills, match.playerDeaths, match.playerAssists))}>
                        {match.playerKills}/{match.playerDeaths}/{match.playerAssists}
                      </div>
                      <div className={cn('text-xs', getKDAColor(match.playerKills, match.playerDeaths, match.playerAssists))}>
                        {playerKDA} KDA
                      </div>
                    </div>

                    <span className='text-xl font-bold text-muted-foreground'>+</span>

                    {/* Teammate Champion */}
                    <div className='flex flex-col items-center'>
                      <Image
                        src={getChampionImageUrl(match.teammateChampion)}
                        alt={match.teammateChampion}
                        className='w-10 h-10 rounded'
                        width={40}
                        height={40}
                      />
                      <span className='text-xs font-medium mt-1'>
                        {match.teammateChampion}
                      </span>
                      <div className={cn('text-xs mt-1', getKDAColor(match.teammateKills, match.teammateDeaths, match.teammateAssists))}>
                        {match.teammateKills}/{match.teammateDeaths}/{match.teammateAssists}
                      </div>
                      <div className={cn('text-xs', getKDAColor(match.teammateKills, match.teammateDeaths, match.teammateAssists))}>
                        {teammateKDA} KDA
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-4'>
                    <Badge
                      variant={match.win ? 'victory' : 'defeat'}
                      className='text-xs'
                    >
                      {match.win ? 'Victory' : 'Defeat'}
                    </Badge>
                    <div className='text-sm text-muted-foreground'>
                      {formatDuration(match.gameDuration)}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {formatDistanceToNow(new Date(match.gameCreation), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

