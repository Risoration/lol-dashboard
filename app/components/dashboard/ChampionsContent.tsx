'use client';

import { useMemo, useState } from 'react';
import { useAccount } from '../../lib/context/AccountContext';
import { filterMatchesByQueueType, getChampionImageUrl } from '../../lib/utils';
import type { Match, Summoner } from '../../lib/database/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import Image from 'next/image';

interface ChampionsContentProps {
  allStats: Array<{
    summonerId: string;
    matches: Match[];
  }>;
  summoners: Summoner[];
}

type SortBy = 'games' | 'winRate' | 'kda' | 'champion';

export default function ChampionsContent({
  allStats,
  summoners,
}: ChampionsContentProps) {
  const { filters } = useAccount();
  const [sortBy, setSortBy] = useState<SortBy>('games');

  // Filter and aggregate champion stats
  const champions = useMemo(() => {
    // Filter by account
    let filteredStats = allStats;
    if (filters.selectedSummonerId) {
      filteredStats = allStats.filter(
        (s) => s.summonerId === filters.selectedSummonerId
      );
    }

    // Filter matches by queue type
    const filteredMatches = filteredStats.flatMap((s) => {
      const accountMatches = filterMatchesByQueueType(
        s.matches,
        filters.queueType
      ) as Match[];
      return accountMatches;
    });

    // Aggregate by champion
    const championMap = new Map<
      number,
      {
        championId: number;
        championName: string;
        gamesPlayed: number;
        wins: number;
        losses: number;
        totalKills: number;
        totalDeaths: number;
        totalAssists: number;
      }
    >();

    filteredMatches.forEach((match) => {
      const existing = championMap.get(match.champion_id);
      if (existing) {
        existing.gamesPlayed++;
        if (match.win) {
          existing.wins++;
        } else {
          existing.losses++;
        }
        existing.totalKills += match.kills;
        existing.totalDeaths += match.deaths;
        existing.totalAssists += match.assists;
      } else {
        championMap.set(match.champion_id, {
          championId: match.champion_id,
          championName: match.champion_name,
          gamesPlayed: 1,
          wins: match.win ? 1 : 0,
          losses: match.win ? 0 : 1,
          totalKills: match.kills,
          totalDeaths: match.deaths,
          totalAssists: match.assists,
        });
      }
    });

    const championsArray = Array.from(championMap.values()).map((champ) => ({
      ...champ,
      winRate:
        champ.gamesPlayed > 0
          ? Number(((champ.wins / champ.gamesPlayed) * 100).toFixed(1))
          : 0,
      avgKDA:
        champ.totalDeaths === 0
          ? champ.totalKills + champ.totalAssists
          : Number(
              (
                (champ.totalKills + champ.totalAssists) /
                Math.max(1, champ.totalDeaths)
              ).toFixed(2)
            ),
    }));

    // Sort based on selected criteria
    return championsArray.sort((a, b) => {
      switch (sortBy) {
        case 'games':
          return b.gamesPlayed - a.gamesPlayed;
        case 'winRate':
          return b.winRate - a.winRate;
        case 'kda':
          return b.avgKDA - a.avgKDA;
        case 'champion':
          return a.championName.localeCompare(b.championName);
        default:
          return b.gamesPlayed - a.gamesPlayed;
      }
    });
  }, [allStats, filters, sortBy]);

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>All Champions ({champions.length})</CardTitle>
            <div className='flex gap-2'>
              <span className='text-sm font-medium text-muted-foreground'>
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className='px-3 py-1 rounded-md border bg-background text-sm'
              >
                <option value='games'>Games</option>
                <option value='winRate'>Win Rate</option>
                <option value='kda'>KDA</option>
                <option value='champion'>Champion</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {champions.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No champion data available. Play some games and refresh your data!
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b text-left'>
                    <th className='pb-3 pr-4'>Rank</th>
                    <th className='pb-3 pr-4'>Champion</th>
                    <th className='pb-3 pr-4 text-center'>Games</th>
                    <th className='pb-3 pr-4 text-center'>Win Rate</th>
                    <th className='pb-3 pr-4 text-center'>KDA</th>
                    <th className='pb-3 pr-4 text-center'>Avg K / D / A</th>
                  </tr>
                </thead>
                <tbody>
                  {champions.map((champion, index) => (
                    <tr
                      key={champion.championId}
                      className='border-b hover:bg-accent/50 transition-colors'
                    >
                      <td className='py-3 pr-4 font-semibold'>{index + 1}</td>
                      <td className='py-3 pr-4 font-medium'>
                        <div className='flex items-center gap-3'>
                          <Image
                            src={getChampionImageUrl(champion.championName)}
                            alt={champion.championName}
                            className='w-10 h-10 rounded-full'
                            width={40}
                            height={40}
                          />
                          <span>{champion.championName}</span>
                        </div>
                      </td>
                      <td className='py-3 pr-4 text-center'>
                        {champion.gamesPlayed}
                      </td>
                      <td className='py-3 pr-4 text-center'>
                        <Badge
                          variant={
                            champion.winRate >= 50 ? 'victory' : 'defeat'
                          }
                        >
                          {champion.winRate}%
                        </Badge>
                      </td>
                      <td className='py-3 pr-4 text-center font-semibold'>
                        {champion.avgKDA}
                      </td>
                      <td className='py-3 pr-4 text-center text-sm text-muted-foreground'>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
