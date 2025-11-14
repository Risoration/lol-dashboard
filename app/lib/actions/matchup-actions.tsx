'use server';

import { createServerClient } from '../supabase/server';
import { RiotApi } from '../riot/api';
import {
  TeamPosition,
  type MatchDto,
  type Region,
  type AccountDto,
} from '../riot/types';
import cache from '../cache';
import { getQueueIdsForQueueType } from '../utils';

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

interface SynergyStat {
  playerChampionId: number;
  playerChampionName: string;
  teammateChampionId: number;
  teammateChampionName: string;
  teammateRole: string | null; // TeamPosition: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface DuoStat {
  teammatePuuid: string;
  teammateName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Fetch full match data with caching
 * Cache key is based on region and sorted match IDs
 * TTL: 10 minutes (match data doesn't change once complete)
 */
async function getCachedMatches(
  region: Region,
  matchIds: string[]
): Promise<MatchDto[]> {
  // Sort match IDs to ensure consistent cache key
  const sortedMatchIds = [...matchIds].sort();
  const cacheKey = `matches:${region}:${sortedMatchIds.join(',')}`;

  // Check cache first
  const cached = cache.get<MatchDto[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  // Use higher concurrency (10) for faster fetching - rate limiter will handle throttling
  const riotApi = new RiotApi();
  const matches = await riotApi.getMultipleMatches(region, matchIds, 10);

  // Cache for 10 minutes
  cache.set(cacheKey, matches, 10 * 60 * 1000);

  return matches;
}

/**
 * Fetch account information by PUUID with caching
 * Cache key is based on region and PUUID
 * TTL: 1 hour (account info changes less frequently)
 */
async function getCachedAccountByPuuid(
  region: Region,
  puuid: string
): Promise<AccountDto | null> {
  const cacheKey = `account:${region}:${puuid}`;

  // Check cache first
  const cached = cache.get<AccountDto>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Fetch from API
    const riotApi = new RiotApi();
    const account = await riotApi.getAccountByPuuid(region, puuid);

    // Cache for 1 hour
    cache.set(cacheKey, account, 60 * 60 * 1000);

    return account;
  } catch (error) {
    console.error(`Failed to fetch account for PUUID ${puuid}:`, error);
    return null;
  }
}

/**
 * Get matchup statistics (winrates vs enemy champions)
 * This requires fetching full match data from Riot API
 */
export async function getMatchupStats(
  summonerId: string,
  queueType?: 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Verify ownership
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  // Get all match IDs from database (entire match history)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('match_id')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  if (matchesError || !matches) {
    return { error: 'Failed to fetch matches' };
  }

  if (matches.length === 0) {
    return { success: true, matchups: [] };
  }

  try {
    const matchupMap = new Map<string, MatchupStat>();

    // Fetch full match data for each match (with caching)
    const matchIds = matches.map((m) => m.match_id);
    let fullMatches = await getCachedMatches(summoner.region, matchIds);

    // Filter by queue type if specified
    if (queueType && queueType !== 'ALL') {
      const queueIds = getQueueIdsForQueueType(queueType);
      if (queueIds) {
        fullMatches = fullMatches.filter((m) =>
          queueIds.includes(m.info.queueId)
        );
      }
    }

    for (const match of fullMatches) {
      const playerParticipant = RiotApi.getPlayerParticipant(
        match,
        summoner.puuid
      );

      if (!playerParticipant) continue;

      const playerChampionId = playerParticipant.championId;
      const playerChampionName = playerParticipant.championName;
      const playerTeamId = playerParticipant.teamId;
      const won = playerParticipant.win;

      // Find opponent champion (same lane/position on enemy team)
      const opponentParticipant = match.info.participants.find(
        (p) =>
          p.teamId !== playerTeamId &&
          p.individualPosition === playerParticipant.individualPosition &&
          p.individualPosition !== ('NONE' as TeamPosition)
      );

      // If no direct lane opponent, use any enemy champion
      const enemyParticipant =
        opponentParticipant ||
        match.info.participants.find(
          (p) => p.teamId !== playerTeamId && p.championId
        );

      if (!enemyParticipant) continue;

      const key = `${playerChampionId}-${enemyParticipant.championId}`;
      const existing = matchupMap.get(key);

      if (existing) {
        existing.games++;
        if (won) existing.wins++;
        else existing.losses++;
        existing.winRate = Number(
          ((existing.wins / existing.games) * 100).toFixed(1)
        );
      } else {
        matchupMap.set(key, {
          playerChampionId,
          playerChampionName,
          opponentChampionId: enemyParticipant.championId,
          opponentChampionName: enemyParticipant.championName,
          games: 1,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
          winRate: won ? 100 : 0,
        });
      }
    }

    const matchups = Array.from(matchupMap.values()).sort(
      (a, b) => b.games - a.games
    );

    return { success: true, matchups };
  } catch (error) {
    console.error('Error fetching matchup stats:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch matchup stats',
    };
  }
}

/**
 * Get synergy statistics (winrates with champions on team)
 */
export async function getSynergyStats(
  summonerId: string,
  queueType?: 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Verify ownership
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  // Get all match IDs from database (entire match history)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('match_id')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  if (matchesError || !matches) {
    return { error: 'Failed to fetch matches' };
  }

  if (matches.length === 0) {
    return { success: true, synergies: [] };
  }

  try {
    const synergyMap = new Map<string, SynergyStat>();

    const matchIds = matches.map((m) => m.match_id);
    let fullMatches = await getCachedMatches(summoner.region, matchIds);

    // Filter by queue type if specified
    if (queueType && queueType !== 'ALL') {
      const queueIds = getQueueIdsForQueueType(queueType);
      if (queueIds) {
        fullMatches = fullMatches.filter((m) =>
          queueIds.includes(m.info.queueId)
        );
      }
    }

    for (const match of fullMatches) {
      const playerParticipant = RiotApi.getPlayerParticipant(
        match,
        summoner.puuid
      );

      if (!playerParticipant) continue;

      const playerChampionId = playerParticipant.championId;
      const playerChampionName = playerParticipant.championName;
      const playerTeamId = playerParticipant.teamId;
      const won = playerParticipant.win;

      // Find all teammates
      const teammates = match.info.participants.filter(
        (p) => p.teamId === playerTeamId && p.puuid !== summoner.puuid
      );

      for (const teammate of teammates) {
        // Use individualPosition for role, fallback to teamPosition
        const teammateRole =
          teammate.individualPosition !== 'NONE'
            ? teammate.individualPosition
            : teammate.teamPosition !== 'NONE'
            ? teammate.teamPosition
            : null;

        const key = `${playerChampionId}-${teammate.championId}-${
          teammateRole || 'NONE'
        }`;
        const existing = synergyMap.get(key);

        if (existing) {
          existing.games++;
          if (won) existing.wins++;
          else existing.losses++;
          existing.winRate = Number(
            ((existing.wins / existing.games) * 100).toFixed(1)
          );
        } else {
          synergyMap.set(key, {
            playerChampionId,
            playerChampionName,
            teammateChampionId: teammate.championId,
            teammateChampionName: teammate.championName,
            teammateRole,
            games: 1,
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            winRate: won ? 100 : 0,
          });
        }
      }
    }

    const synergies = Array.from(synergyMap.values()).sort(
      (a, b) => b.games - a.games
    );

    return { success: true, synergies };
  } catch (error) {
    console.error('Error fetching synergy stats:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch synergy stats',
    };
  }
}

/**
 * Get duo statistics (winrates with summoners on team)
 */
export async function getDuoStats(
  summonerId: string,
  queueType?: 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Verify ownership
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  // Get all match IDs from database (entire match history)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('match_id')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  if (matchesError || !matches) {
    return { error: 'Failed to fetch matches' };
  }

  if (matches.length === 0) {
    return { success: true, duos: [] };
  }

  try {
    const duoMap = new Map<string, DuoStat>();

    const matchIds = matches.map((m) => m.match_id);
    let fullMatches = await getCachedMatches(summoner.region, matchIds);

    // Filter by queue type if specified
    if (queueType && queueType !== 'ALL') {
      const queueIds = getQueueIdsForQueueType(queueType);
      if (queueIds) {
        fullMatches = fullMatches.filter((m) =>
          queueIds.includes(m.info.queueId)
        );
      }
    }

    // Collect all unique teammate PUUIDs
    const teammatePuuidSet = new Set<string>();

    for (const match of fullMatches) {
      const playerParticipant = RiotApi.getPlayerParticipant(
        match,
        summoner.puuid
      );

      if (!playerParticipant) continue;

      const playerTeamId = playerParticipant.teamId;
      const won = playerParticipant.win;

      // Find all teammates
      const teammates = match.info.participants.filter(
        (p) => p.teamId === playerTeamId && p.puuid !== summoner.puuid
      );

      for (const teammate of teammates) {
        teammatePuuidSet.add(teammate.puuid);

        const existing = duoMap.get(teammate.puuid);

        if (existing) {
          existing.games++;
          if (won) existing.wins++;
          else existing.losses++;
          existing.winRate = Number(
            ((existing.wins / existing.games) * 100).toFixed(1)
          );
        } else {
          duoMap.set(teammate.puuid, {
            teammatePuuid: teammate.puuid,
            teammateName: 'Loading...', // Will be updated below
            games: 1,
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            winRate: won ? 100 : 0,
          });
        }
      }
    }

    // Fetch account information for all unique teammates
    const accountPromises = Array.from(teammatePuuidSet).map((puuid) =>
      getCachedAccountByPuuid(summoner.region, puuid).then((account) => ({
        puuid,
        account,
      }))
    );

    const accounts = await Promise.all(accountPromises);

    // Update duo names with Riot IDs
    for (const { puuid, account } of accounts) {
      const duo = duoMap.get(puuid);
      if (duo && account) {
        duo.teammateName = `${account.gameName}#${account.tagLine}`;
      } else if (duo) {
        // Fallback to summonerName from match if account lookup fails
        const matchWithTeammate = fullMatches.find((m) =>
          m.info.participants.some((p) => p.puuid === puuid)
        );
        if (matchWithTeammate) {
          const teammate = matchWithTeammate.info.participants.find(
            (p) => p.puuid === puuid
          );
          if (teammate?.summonerName) {
            duo.teammateName = teammate.summonerName;
          } else {
            duo.teammateName = 'Unknown';
          }
        } else {
          duo.teammateName = 'Unknown';
        }
      }
    }

    const duos = Array.from(duoMap.values())
      .filter((d) => d.games >= 2) // Only show duos with 2+ games
      .sort((a, b) => b.games - a.games);

    return { success: true, duos };
  } catch (error) {
    console.error('Error fetching duo stats:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Failed to fetch duo stats',
    };
  }
}

/**
 * Get match history between user and a specific duo partner
 */
export async function getDuoMatchHistory(
  summonerId: string,
  teammatePuuid: string
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Verify ownership
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  // Get all match IDs from database
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('match_id')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  if (matchesError || !matches) {
    return { error: 'Failed to fetch matches' };
  }

  if (matches.length === 0) {
    return { success: true, matches: [] };
  }

  try {
    const matchIds = matches.map((m) => m.match_id);
    const fullMatches = await getCachedMatches(summoner.region, matchIds);

    // Filter matches where both user and teammate played together
    const duoMatches = fullMatches
      .filter((match) => {
        const playerParticipant = RiotApi.getPlayerParticipant(
          match,
          summoner.puuid
        );
        const teammateParticipant = match.info.participants.find(
          (p) => p.puuid === teammatePuuid
        );

        // Both must be in the same team
        return (
          playerParticipant &&
          teammateParticipant &&
          playerParticipant.teamId === teammateParticipant.teamId
        );
      })
      .map((match) => {
        const playerParticipant = RiotApi.getPlayerParticipant(
          match,
          summoner.puuid
        )!;
        const teammateParticipant = match.info.participants.find(
          (p) => p.puuid === teammatePuuid
        )!;

        return {
          matchId: match.metadata.matchId,
          gameCreation: match.info.gameCreation,
          gameDuration: match.info.gameDuration,
          queueId: match.info.queueId,
          win: playerParticipant.win,
          playerChampion: playerParticipant.championName,
          playerChampionId: playerParticipant.championId,
          playerKills: playerParticipant.kills,
          playerDeaths: playerParticipant.deaths,
          playerAssists: playerParticipant.assists,
          teammateChampion: teammateParticipant.championName,
          teammateChampionId: teammateParticipant.championId,
          teammateKills: teammateParticipant.kills,
          teammateDeaths: teammateParticipant.deaths,
          teammateAssists: teammateParticipant.assists,
        };
      })
      .sort((a, b) => b.gameCreation - a.gameCreation);

    return { success: true, matches: duoMatches };
  } catch (error) {
    console.error('Error fetching duo match history:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch duo match history',
    };
  }
}
