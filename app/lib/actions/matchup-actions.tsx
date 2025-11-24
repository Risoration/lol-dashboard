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

export interface MatchFetchProgressType {
  total: number;
  cached: number;
  fetched: number;
  current: number;
  isComplete: boolean;
}

/**
 * Get match fetch progress for a given progress key
 */
export async function getMatchFetchProgress(
  progressKey: string
): Promise<MatchFetchProgress | null> {
  return cache.get<MatchFetchProgress>(`progress:${progressKey}`);
}

/**
 * Fetch full match data with per-match caching
 * Each match is cached individually to maximize cache hits
 * TTL: 24 hours (match data never changes once complete)
 */
async function getCachedMatches(
  region: Region,
  matchIds: string[],
  progressKey?: string
): Promise<MatchDto[]> {
  if (matchIds.length === 0) {
    return [];
  }

  const results: MatchDto[] = [];
  const uncachedMatchIds: string[] = [];

  // Check cache for each match individually
  for (const matchId of matchIds) {
    const cacheKey = `match:${region}:${matchId}`;
    const cached = cache.get<MatchDto>(cacheKey);
    if (cached) {
      results.push(cached);
    } else {
      uncachedMatchIds.push(matchId);
    }
  }

  const cachedCount = results.length;
  const uncachedCount = uncachedMatchIds.length;

  console.log(
    `getCachedMatches: ${cachedCount} cached, ${uncachedCount} need fetching`
  );

  // Update progress: all cached
  if (progressKey) {
    const progress: MatchFetchProgress = {
      total: matchIds.length,
      cached: cachedCount,
      fetched: 0,
      current: cachedCount,
      isComplete: uncachedMatchIds.length === 0,
    };
    cache.set(`progress:${progressKey}`, progress, 5 * 60 * 1000); // 5 min TTL
  }

  // If all matches are cached, return immediately
  if (uncachedMatchIds.length === 0) {
    // Sort results to match original order
    const matchMap = new Map(results.map((m) => [m.metadata.matchId, m]));
    return matchIds.map((id) => matchMap.get(id)!).filter(Boolean);
  }

  // Fetch only uncached matches from API
  // Use lower concurrency (3) to avoid hitting rate limits
  try {
    const riotApi = new RiotApi();
    // Reduce concurrency to 3 to be more conservative with rate limits
    const fetchedMatches = await riotApi.getMultipleMatches(
      region,
      uncachedMatchIds,
      3,
      progressKey
        ? (current: number, total: number) => {
            const progress: MatchFetchProgress = {
              total: matchIds.length,
              cached: cachedCount,
              fetched: current,
              current: cachedCount + current,
              isComplete: current >= total,
            };
            cache.set(`progress:${progressKey}`, progress, 5 * 60 * 1000);
          }
        : undefined
    );

    // Cache each match individually for 24 hours (match data never changes)
    for (const match of fetchedMatches) {
      const cacheKey = `match:${region}:${match.metadata.matchId}`;
      cache.set(cacheKey, match, 24 * 60 * 60 * 1000); // 24 hours
    }

    console.log(
      `getCachedMatches: Fetched ${fetchedMatches.length} matches from API`
    );

    // Update progress: complete
    if (progressKey) {
      const progress: MatchFetchProgress = {
        total: matchIds.length,
        cached: cachedCount,
        fetched: fetchedMatches.length,
        current: matchIds.length,
        isComplete: true,
      };
      cache.set(`progress:${progressKey}`, progress, 5 * 60 * 1000);
    }

    // Combine cached and fetched matches
    results.push(...fetchedMatches);

    // Sort results to match original order
    const matchMap = new Map(results.map((m) => [m.metadata.matchId, m]));
    return matchIds.map((id) => matchMap.get(id)!).filter(Boolean);
  } catch (error) {
    console.error(`getCachedMatches: Error fetching matches:`, error);
    // Return cached matches even if fetching fails
    const matchMap = new Map(results.map((m) => [m.metadata.matchId, m]));
    return matchIds
      .map((id) => matchMap.get(id))
      .filter((m): m is MatchDto => m !== undefined);
  }
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

    // Cache for 24 hours (account info changes infrequently)
    cache.set(cacheKey, account, 24 * 60 * 60 * 1000);

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

  // Check cache for computed stats (30 minute TTL)
  const cacheKey = `matchupStats:${summonerId}:${queueType || 'ALL'}`;
  const cached = cache.get<{ success: true; matchups: MatchupStat[] }>(
    cacheKey
  );
  if (cached) {
    console.log(
      `[getMatchupStats] Cache HIT for ${summonerId}:${
        queueType || 'ALL'
      } - returning ${cached.matchups.length} matchups`
    );
    return cached;
  }

  console.log(
    `[getMatchupStats] Cache MISS for ${summonerId}:${
      queueType || 'ALL'
    } - fetching from API`
  );

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
    const result = { success: true, matchups: [] };
    // Cache empty result for 30 minutes
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }

  // Limit to last 100 matches to reduce API calls
  // Match data is ordered by game_creation DESC, so first 100 are most recent
  const limitedMatches = matches.slice(0, 100);

  try {
    const matchupMap = new Map<string, MatchupStat>();

    // Fetch full match data for each match (with caching)
    // Limit to last 100 matches to reduce API calls
    const matchIds = limitedMatches.map((m) => m.match_id);
    const progressKey = `matchup:${summonerId}:${queueType || 'ALL'}`;
    console.log(
      `getMatchupStats: Processing ${matchIds.length} matches (limited from ${matches.length} total) for summoner ${summonerId}`
    );
    let fullMatches = await getCachedMatches(
      summoner.region,
      matchIds,
      progressKey
    );
    console.log(
      `getMatchupStats: Retrieved ${fullMatches.length} full matches`
    );

    // Filter by queue type if specified
    if (queueType && queueType !== 'ALL') {
      const queueIds = getQueueIdsForQueueType(queueType);
      if (queueIds) {
        const beforeFilter = fullMatches.length;
        fullMatches = fullMatches.filter((m) =>
          queueIds.includes(m.info.queueId)
        );
        console.log(
          `getMatchupStats: Filtered to ${fullMatches.length} matches (from ${beforeFilter}) for queue type ${queueType}`
        );
      }
    }

    let processedMatches = 0;
    let skippedNoParticipant = 0;
    let skippedNoOpponent = 0;

    console.log(
      `getMatchupStats: Looking for PUUID: ${summoner.puuid.substring(0, 8)}...`
    );
    for (const match of fullMatches) {
      const playerParticipant = RiotApi.getPlayerParticipant(
        match,
        summoner.puuid
      );

      if (!playerParticipant) {
        skippedNoParticipant++;
        // Log first match's participants for debugging
        if (skippedNoParticipant === 1) {
          const participantPuuid = match.info.participants[0]?.puuid;
          console.log(
            `getMatchupStats: First match participant PUUID: ${participantPuuid?.substring(
              0,
              8
            )}...`
          );
          console.log(
            `getMatchupStats: All participant PUUIDs in first match:`,
            match.info.participants.map((p) => p.puuid.substring(0, 8) + '...')
          );
        }
        continue;
      }

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

      if (!enemyParticipant) {
        skippedNoOpponent++;
        continue;
      }

      processedMatches++;

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

    console.log(
      `getMatchupStats: Processed ${processedMatches} matches, skipped ${skippedNoParticipant} (no participant), ${skippedNoOpponent} (no opponent)`
    );
    console.log(`getMatchupStats: Computed ${matchups.length} unique matchups`);
    const result = { success: true, matchups };
    // Cache computed stats for 30 minutes
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
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

  // Check cache for computed stats (30 minute TTL)
  const cacheKey = `synergyStats:${summonerId}:${queueType || 'ALL'}`;
  const cached = cache.get<{ success: true; synergies: SynergyStat[] }>(
    cacheKey
  );
  if (cached) {
    console.log(
      `[getSynergyStats] Cache HIT for ${summonerId}:${
        queueType || 'ALL'
      } - returning ${cached.synergies.length} synergies`
    );
    return cached;
  }

  console.log(
    `[getSynergyStats] Cache MISS for ${summonerId}:${
      queueType || 'ALL'
    } - fetching from API`
  );

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
    const result = { success: true, synergies: [] };
    // Cache empty result for 30 minutes
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }

  // Limit to last 100 matches to reduce API calls
  const limitedMatches = matches.slice(0, 100);

  try {
    const synergyMap = new Map<string, SynergyStat>();

    const matchIds = limitedMatches.map((m) => m.match_id);
    const progressKey = `synergy:${summonerId}:${queueType || 'ALL'}`;
    console.log(
      `getSynergyStats: Processing ${matchIds.length} matches (limited from ${matches.length} total) for summoner ${summonerId}`
    );
    let fullMatches = await getCachedMatches(
      summoner.region,
      matchIds,
      progressKey
    );
    console.log(
      `getSynergyStats: Retrieved ${fullMatches.length} full matches`
    );

    // Filter by queue type if specified
    if (queueType && queueType !== 'ALL') {
      const queueIds = getQueueIdsForQueueType(queueType);
      if (queueIds) {
        const beforeFilter = fullMatches.length;
        fullMatches = fullMatches.filter((m) =>
          queueIds.includes(m.info.queueId)
        );
        console.log(
          `getSynergyStats: Filtered to ${fullMatches.length} matches (from ${beforeFilter}) for queue type ${queueType}`
        );
      }
    }

    let processedMatches = 0;
    let skippedNoParticipant = 0;
    let totalSynergies = 0;

    console.log(
      `getSynergyStats: Looking for PUUID: ${summoner.puuid.substring(0, 8)}...`
    );
    for (const match of fullMatches) {
      const playerParticipant = RiotApi.getPlayerParticipant(
        match,
        summoner.puuid
      );

      if (!playerParticipant) {
        skippedNoParticipant++;
        // Log first match's participants for debugging
        if (skippedNoParticipant === 1) {
          const participantPuuid = match.info.participants[0]?.puuid;
          console.log(
            `getSynergyStats: First match participant PUUID: ${participantPuuid?.substring(
              0,
              8
            )}...`
          );
          console.log(
            `getSynergyStats: All participant PUUIDs in first match:`,
            match.info.participants.map((p) => p.puuid.substring(0, 8) + '...')
          );
        }
        continue;
      }

      processedMatches++;
      const playerChampionId = playerParticipant.championId;
      const playerChampionName = playerParticipant.championName;
      const playerTeamId = playerParticipant.teamId;
      const won = playerParticipant.win;

      // Find all teammates
      const teammates = match.info.participants.filter(
        (p) => p.teamId === playerTeamId && p.puuid !== summoner.puuid
      );

      for (const teammate of teammates) {
        totalSynergies++;
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

    console.log(
      `getSynergyStats: Processed ${processedMatches} matches, skipped ${skippedNoParticipant} (no participant), found ${totalSynergies} synergy entries`
    );
    console.log(
      `getSynergyStats: Computed ${synergies.length} unique synergies`
    );
    const result = { success: true, synergies };
    // Cache computed stats for 30 minutes
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
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
 * Get duo statistics (winrates with specific teammates)
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

  const cacheKey = `duoStats:${summonerId}:${queueType || 'ALL'}`;
  const cached = cache.get<{ success: true; duos: DuoStat[] }>(cacheKey);
  if (cached) {
    console.log(
      `[getDuoStats] Cache HIT for ${summonerId}:${
        queueType || 'ALL'
      } - returning ${cached.duos.length} duos`
    );
    return cached;
  }

  console.log(
    `[getDuoStats] Cache MISS for ${summonerId}:${
      queueType || 'ALL'
    } - fetching from API`
  );

  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('match_id')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  if (matchesError || !matches) {
    return { error: 'Failed to fetch matches' };
  }

  if (matches.length === 0) {
    const result = { success: true, duos: [] };
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }

  const limitedMatches = matches.slice(0, 100);

  try {
    const duoMap = new Map<string, DuoStat>();

    const matchIds = limitedMatches.map((m) => m.match_id);
    const progressKey = `duo:${summonerId}:${queueType || 'ALL'}`;
    console.log(
      `getDuoStats: Processing ${matchIds.length} matches (limited from ${matches.length} total) for summoner ${summonerId}`
    );
    let fullMatches = await getCachedMatches(
      summoner.region,
      matchIds,
      progressKey
    );
    console.log(`getDuoStats: Retrieved ${fullMatches.length} full matches`);

    if (queueType && queueType !== 'ALL') {
      const queueIds = getQueueIdsForQueueType(queueType);
      if (queueIds) {
        const beforeFilter = fullMatches.length;
        fullMatches = fullMatches.filter((m) =>
          queueIds.includes(m.info.queueId)
        );
        console.log(
          `getDuoStats: Filtered to ${fullMatches.length} matches (from ${beforeFilter}) for queue type ${queueType}`
        );
      }
    }

    let processedMatches = 0;
    let skippedNoParticipant = 0;
    let totalDuoEntries = 0;

    console.log(
      `getDuoStats: Looking for PUUID: ${summoner.puuid.substring(0, 8)}...`
    );
    for (const match of fullMatches) {
      const playerParticipant = RiotApi.getPlayerParticipant(
        match,
        summoner.puuid
      );

      if (!playerParticipant) {
        skippedNoParticipant++;
        if (skippedNoParticipant === 1) {
          const participantPuuid = match.info.participants[0]?.puuid;
          console.log(
            `getDuoStats: First match participant PUUID: ${participantPuuid?.substring(
              0,
              8
            )}...`
          );
          console.log(
            `getDuoStats: All participant PUUIDs in first match:`,
            match.info.participants.map((p) => p.puuid.substring(0, 8) + '...')
          );
        }
        continue;
      }

      processedMatches++;
      const playerTeamId = playerParticipant.teamId;
      const won = playerParticipant.win;

      const teammates = match.info.participants.filter(
        (p) => p.teamId === playerTeamId && p.puuid !== summoner.puuid
      );

      for (const teammate of teammates) {
        totalDuoEntries++;
        const key = teammate.puuid;
        const existing = duoMap.get(key);

        if (existing) {
          existing.games++;
          if (won) existing.wins++;
          else existing.losses++;
          existing.winRate = Number(
            ((existing.wins / existing.games) * 100).toFixed(1)
          );
        } else {
          duoMap.set(key, {
            teammatePuuid: teammate.puuid,
            teammateName: teammate.summonerName || 'Unknown',
            games: 1,
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            winRate: won ? 100 : 0,
          });
        }
      }
    }

    console.log(
      `getDuoStats: Processed ${processedMatches} matches, skipped ${skippedNoParticipant} (no participant), found ${totalDuoEntries} duo entries`
    );
    console.log(`getDuoStats: Aggregated ${duoMap.size} unique duo partners`);

    const teammatePuuids = Array.from(duoMap.keys());
    const accounts: { puuid: string; account: AccountDto | null }[] = [];
    const lookupConcurrency = 5;
    for (let i = 0; i < teammatePuuids.length; i += lookupConcurrency) {
      const chunk = teammatePuuids.slice(i, i + lookupConcurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (puuid) => ({
          puuid,
          account: await getCachedAccountByPuuid(summoner.region, puuid),
        }))
      );
      accounts.push(...chunkResults);
    }

    console.log(
      `getDuoStats: Completed fetching ${accounts.length} account lookups`
    );

    for (const { puuid, account } of accounts) {
      const duo = duoMap.get(puuid);
      if (duo && account) {
        duo.teammateName = `${account.gameName}#${account.tagLine}`;
      } else if (duo) {
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
      .filter((d) => d.games >= 2)
      .sort((a, b) => b.games - a.games);

    const result = { success: true, duos };
    cache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
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

    if (matchIds.length === 0) {
      console.log('getDuoMatchHistory: No match IDs found in database');
      return { success: true, matches: [] };
    }

    console.log(
      `getDuoMatchHistory: Fetching ${
        matchIds.length
      } matches for duo with PUUID ${teammatePuuid.substring(0, 8)}...`
    );
    const progressKey = `duoHistory:${summonerId}:${teammatePuuid}`;
    const fullMatches = await getCachedMatches(
      summoner.region,
      matchIds,
      progressKey
    );

    if (!fullMatches || fullMatches.length === 0) {
      console.warn(
        `getDuoMatchHistory: No matches fetched from cache/API. Requested ${
          matchIds.length
        } matches, got ${fullMatches?.length || 0}`
      );
      return { success: true, matches: [] };
    }

    console.log(
      `getDuoMatchHistory: Fetched ${fullMatches.length} matches, filtering for duo...`
    );

    // Filter matches where both user and teammate played together
    const duoMatches = fullMatches
      .filter((match) => {
        if (!match || !match.info || !match.info.participants) {
          return false;
        }

        const playerParticipant = RiotApi.getPlayerParticipant(
          match,
          summoner.puuid
        );
        const teammateParticipant = match.info.participants.find(
          (p) => p.puuid === teammatePuuid
        );

        // Both must be in the same team
        const isDuo =
          playerParticipant &&
          teammateParticipant &&
          playerParticipant.teamId === teammateParticipant.teamId;

        if (!isDuo && playerParticipant && teammateParticipant) {
          // Debug: log why match was filtered out
          console.log(
            `getDuoMatchHistory: Match ${match.metadata.matchId} filtered - player team: ${playerParticipant.teamId}, teammate team: ${teammateParticipant.teamId}`
          );
        }

        return isDuo;
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

    console.log(`getDuoMatchHistory: Found ${duoMatches.length} duo matches`);
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
