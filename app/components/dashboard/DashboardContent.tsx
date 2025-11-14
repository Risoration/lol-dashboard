'use client';

import { useMemo } from 'react';
import { useAccount } from '../../lib/context/AccountContext';
import OverviewStats from './OverviewStats';
import TopChampions from './TopChampions';
import RecentMatches from './RecentMatches';
import MatchupSynergyDuoSection from './MatchupSynergyDuoSection';
import type { Match, RankedStats, Summoner } from '../../lib/database/types';
import {
  filterMatchesByQueueType,
  filterRankedStatsByQueueType,
} from '../../lib/utils';

interface DashboardContentProps {
  allStats: Array<{
    summonerId: string;
    stats: {
      totalGames: number;
      wins: number;
      losses: number;
      winRate: number;
      avgKDA: number;
      avgKills: number;
      avgDeaths: number;
      avgAssists: number;
    } | null;
    matches: Match[];
    champions: Array<{
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
    }>;
    ranked: RankedStats[];
  }>;
  summoners: Summoner[];
}

export default function DashboardContent({
  allStats,
  summoners,
}: DashboardContentProps) {
  const { filters } = useAccount();

  const summonerMap = useMemo(() => {
    return summoners.reduce<Record<string, Summoner>>((acc, summoner) => {
      acc[summoner.id] = summoner;
      return acc;
    }, {});
  }, [summoners]);

  // Filter data based on selected account and queue type
  const filteredData = useMemo(() => {
    // Filter by account
    let filteredStats = allStats;
    if (filters.selectedSummonerId) {
      filteredStats = allStats.filter(
        (s) => s.summonerId === filters.selectedSummonerId
      );
    }

    // Filter matches by queue type
    const filteredMatches = filteredStats
      .flatMap((s) => {
        const accountMatches = filterMatchesByQueueType(
          s.matches,
          filters.queueType
        ) as Match[];
        return accountMatches;
      })
      .sort((a, b) => b.game_creation - a.game_creation);

    // Filter ranked stats by queue type
    const filteredRankedStats = filteredStats
      .flatMap((s) => {
        const accountRanked = filterRankedStatsByQueueType(
          s.ranked,
          filters.queueType
        ) as RankedStats[];
        return accountRanked;
      })
      .filter(
        (ranked, index, self) =>
          index ===
          self.findIndex(
            (r) =>
              r.summoner_id === ranked.summoner_id &&
              r.queue_type === ranked.queue_type
          )
      );

    // Recalculate stats based on filtered matches
    const totalGames = filteredMatches.length;
    const wins = filteredMatches.filter((m) => m.win).length;
    const losses = totalGames - wins;
    const winRate =
      totalGames > 0 ? Number(((wins / totalGames) * 100).toFixed(1)) : 0;

    const totalKills = filteredMatches.reduce((sum, m) => sum + m.kills, 0);
    const totalDeaths = filteredMatches.reduce((sum, m) => sum + m.deaths, 0);
    const totalAssists = filteredMatches.reduce((sum, m) => sum + m.assists, 0);

    const avgKills =
      totalGames > 0 ? Number((totalKills / totalGames).toFixed(1)) : 0;
    const avgDeaths =
      totalGames > 0 ? Number((totalDeaths / totalGames).toFixed(1)) : 0;
    const avgAssists =
      totalGames > 0 ? Number((totalAssists / totalGames).toFixed(1)) : 0;
    const avgKDA =
      avgDeaths === 0
        ? avgKills + avgAssists
        : Number(((avgKills + avgAssists) / avgDeaths).toFixed(2));

    // Get the selected summoner or main account for display
    const selectedSummoner = filters.selectedSummonerId
      ? summoners.find((s) => s.id === filters.selectedSummonerId)
      : summoners.find((s) => s.is_main) || summoners[0];

    const combinedStats = {
      totalGames,
      wins,
      losses,
      winRate,
      avgKDA,
      avgKills,
      avgDeaths,
      avgAssists,
      summoner_name: selectedSummoner?.summoner_name || '',
      profile_icon_id: selectedSummoner?.profile_icon_id || 0,
    };

    // Recalculate champion stats
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

    const combinedChampions = Array.from(championMap.values())
      .map((champ) => ({
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
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 5);

    return {
      stats: combinedStats,
      matches: filteredMatches,
      champions: combinedChampions,
      rankedStats: filteredRankedStats,
    };
  }, [allStats, summoners, filters]);

  return (
    <>
      <OverviewStats
        stats={filteredData.stats}
        rankedStats={filteredData.rankedStats}
        summonerMap={summonerMap}
      />

      <TopChampions champions={filteredData.champions} />

      <RecentMatches
        matches={filteredData.matches}
        title='Recent Matches'
        limit={20}
      />

      <MatchupSynergyDuoSection />
    </>
  );
}
