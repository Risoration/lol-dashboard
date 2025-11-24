'use server';

import { createServerClient } from '../supabase/server';
import { RiotApi } from '../riot/api';
import type { Region } from '../riot/types';
import { z } from 'zod';
import type { SummonerInsert } from '../database/types';

const MAX_MATCH_COUNT = 40;

const linkSummonerSchema = z.object({
  region: z.enum([
    'NA1',
    'EUW1',
    'EUN1',
    'KR',
    'BR1',
    'LAN1',
    'LAS1',
    'TR1',
    'RU',
    'JP1',
    'OC1',
  ]),
  gameName: z.string().min(1).max(16),
  tagLine: z.string().min(1).max(5),
});

export async function linkSummoner(formData: FormData) {
  const rawFormData = {
    region: formData.get('region'),
    gameName: formData.get('gameName'),
    tagLine: formData.get('tagLine'),
  };

  const validated = linkSummonerSchema.parse(rawFormData);

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorised' };
  }

  try {
    // Ensure profile exists before linking summoner
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || null,
      });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        return {
          error: 'Failed to create user profile. Please try again.',
        };
      }
    }

    const riotApi = new RiotApi();

    // Get account and summoner data using region, gameName and tagLine
    const accountData = await riotApi.getAccountByRiotId(
      validated.region,
      validated.gameName,
      validated.tagLine
    );

    console.log('🎮 Account data:', accountData);

    const summonerData = await riotApi.getSummonerByPuuid(
      validated.region,
      accountData.puuid
    );

    console.log('👤 Summoner data:', JSON.stringify(summonerData, null, 2));

    // Note: Riot API no longer returns summoner ID for some regions/accounts
    // We use PUUID as the primary identifier instead
    if (!summonerData?.puuid) {
      console.error('❌ Missing PUUID in response:', summonerData);
      return {
        error: 'Riot API did not return valid summoner data. Please try again.',
      };
    }

    // Fetch ranked stats using PUUID
    const rankedStats = summonerData.id
      ? await riotApi.getRankedInfoBySummonerId(
          validated.region,
          summonerData.id
        )
      : await riotApi.getRankedInfoByPuuid(validated.region, accountData.puuid);

    console.log('🏆 Ranked stats:', rankedStats);

    // Check if this is the user's first account (should be set as main)
    const { data: existingSummoners } = await supabase
      .from('summoners')
      .select('id')
      .eq('user_id', user.id);

    const isFirstAccount = !existingSummoners || existingSummoners.length === 0;

    // Store summoner data in database (upsert to handle re-linking)
    const summonerInsert: SummonerInsert = {
      user_id: user.id,
      region: validated.region,
      puuid: accountData.puuid,
      summoner_id: summonerData.id || null, // May be null in newer API responses
      summoner_name: `${accountData.gameName}#${accountData.tagLine}`,
      profile_icon_id: summonerData.profileIconId,
      summoner_level: summonerData.summonerLevel,
      last_synced_at: new Date().toISOString(),
      is_main: isFirstAccount, // Set as main if it's the first account
    };

    console.log(
      '💾 Data being inserted:',
      JSON.stringify(summonerInsert, null, 2)
    );

    const { data: summoner, error: summonerError } = await supabase
      .from('summoners')
      .upsert(summonerInsert, {
        onConflict: 'user_id,region',
      })
      .select()
      .single();

    if (summonerError) {
      console.error('Failed to store summoner in database:', summonerError);
      return { error: 'Failed to store summoner data' };
    }

    // Store ranked stats (delete old stats for this summoner first)
    if (rankedStats && rankedStats.length > 0) {
      // Delete existing ranked stats
      await supabase
        .from('ranked_stats')
        .delete()
        .eq('summoner_id', summoner.id);

      // Insert new ranked stats
      for (const entry of rankedStats) {
        await supabase.from('ranked_stats').insert({
          summoner_id: summoner.id,
          queue_type: entry.queueType,
          tier: entry.tier,
          rank: entry.rank,
          league_points: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
          synced_at: new Date().toISOString(),
        });
      }
    }

    return {
      success: true,
      summoner: {
        ...summoner,
        gameName: accountData.gameName,
        tagLine: accountData.tagLine,
      },
    };
  } catch (error) {
    console.error('Link summoner error:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to link summoner account',
    };
  }
}

type RefreshSummonerSuccess = {
  success: true;
  matchCount: number;
  lastSyncedAt: string;
  cooldownSeconds: number;
};

type RefreshSummonerError = {
  success: false;
  error: string;
  cooldownRemaining?: number;
};

export type RefreshSummonerResult =
  | RefreshSummonerSuccess
  | RefreshSummonerError;

export async function refreshSummonerData(
  summonerId: string
): Promise<RefreshSummonerResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorised' };
  }

  // Get summoner data and verify ownership
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { success: false, error: 'Summoner not found' };
  }

  // Check cooldown (2 minutes)
  const lastSync = summoner.last_synced_at
    ? new Date(summoner.last_synced_at)
    : null;
  const cooldownMinutes = 2;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  if (lastSync && Date.now() - lastSync.getTime() < cooldownMs) {
    const remainingSeconds = Math.ceil(
      (cooldownMs - (Date.now() - lastSync.getTime())) / 1000
    );
    return {
      success: false,
      error: `Please wait ${remainingSeconds} seconds before refreshing again`,
      cooldownRemaining: remainingSeconds,
    };
  }

  try {
    const riotApi = new RiotApi();
    let activePuuid = summoner.puuid;

    const ensureValidPuuid = async () => {
      if (activePuuid && activePuuid.trim().length > 0) {
        return activePuuid;
      }
      const refreshedAccount = await refreshAccountIdentifiersFromRiotId({
        riotApi,
        supabase,
        summoner,
      });
      if (!refreshedAccount) {
        throw new Error(
          'Stored summoner is missing a valid PUUID. Please relink the account.'
        );
      }
      activePuuid = refreshedAccount.puuid;
      return activePuuid;
    };

    // Fetch recent match IDs (last 40 games)
    const fetchMatchIds = async (puuid: string) =>
      riotApi.getMatchIds(summoner.region, puuid, MAX_MATCH_COUNT, 0);

    let matchIds: string[] = [];
    try {
      const puuidForFetch = await ensureValidPuuid();
      matchIds = await fetchMatchIds(puuidForFetch);
    } catch (error) {
      const shouldRetry =
        error instanceof Error &&
        error.message.toLowerCase().includes('exception decrypting');
      if (!shouldRetry) {
        throw error;
      }
      const refreshedAccount = await refreshAccountIdentifiersFromRiotId({
        riotApi,
        supabase,
        summoner,
      });
      if (!refreshedAccount) {
        throw error;
      }
      activePuuid = refreshedAccount.puuid;
      matchIds = await fetchMatchIds(activePuuid);
    }

    const syncedAt = new Date().toISOString();

    const { error: deleteMatchesError } = await supabase
      .from('matches')
      .delete()
      .eq('summoner_id', summoner.id);

    if (deleteMatchesError) {
      console.error('Failed to clear previous matches:', deleteMatchesError);
    }

    const { error: deleteRankedError } = await supabase
      .from('ranked_stats')
      .delete()
      .eq('summoner_id', summoner.id);

    if (deleteRankedError) {
      console.error(
        'Failed to clear previous ranked stats:',
        deleteRankedError
      );
    }

    let storedCount = 0;

    if (matchIds.length > 0) {
      // Fetch match details (with rate limiting)
      // Use lower concurrency (5) to avoid hitting rate limits
      const matches = await riotApi.getMultipleMatches(
        summoner.region,
        matchIds,
        5
      );

      const matchRows = matches
        .map((match) => {
          const participant = RiotApi.getPlayerParticipant(match, activePuuid);
          if (!participant) return null;

          return {
            summoner_id: summoner.id,
            match_id: match.metadata.matchId,
            game_creation: match.info.gameCreation,
            game_duration: match.info.gameDuration,
            queue_id: match.info.queueId,
            champion_id: participant.championId,
            champion_name: participant.championName,
            role: participant.role,
            team_position: participant.teamPosition,
            win: participant.win,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            cs:
              participant.totalMinionsKilled + participant.neutralMinionsKilled,
            gold_earned: participant.goldEarned,
            damage_dealt: participant.totalDamageDealtToChampions,
            vision_score: participant.visionScore,
            synced_at: syncedAt,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (matchRows.length > 0) {
        const { error: insertMatchesError } = await supabase
          .from('matches')
          .insert(matchRows);

        if (insertMatchesError) {
          console.error('Failed to store match data:', insertMatchesError);
        } else {
          storedCount = matchRows.length;
        }
      }
    }

    // Fetch ranked stats using PUUID
    // Prefer fetching by Summoner ID; if missing, fetch it via PUUID and persist it
    let effectiveSummonerId = summoner.summoner_id as string | null;
    if (!effectiveSummonerId) {
      const refreshedSummoner = await riotApi.getSummonerByPuuid(
        summoner.region,
        summoner.puuid
      );
      effectiveSummonerId = refreshedSummoner.id ?? null;
      if (effectiveSummonerId) {
        await supabase
          .from('summoners')
          .update({ summoner_id: effectiveSummonerId })
          .eq('id', summoner.id);
      }
    }

    let rankedStats: Awaited<
      ReturnType<typeof riotApi.getRankedInfoBySummonerId>
    > = [];
    if (effectiveSummonerId) {
      rankedStats = await riotApi.getRankedInfoBySummonerId(
        summoner.region,
        effectiveSummonerId
      );
    } else {
      const puuidForRanked = await ensureValidPuuid();
      rankedStats = await riotApi.getRankedInfoByPuuid(
        summoner.region,
        puuidForRanked
      );
    }

    if (rankedStats && rankedStats.length > 0) {
      const rankedRows = rankedStats.map((entry) => ({
        summoner_id: summoner.id,
        queue_type: entry.queueType,
        tier: entry.tier,
        rank: entry.rank,
        league_points: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
        synced_at: syncedAt,
      }));

      // Use upsert with unique constraint on (summoner_id, queue_type)
      const { error: insertRankedError } = await supabase
        .from('ranked_stats')
        .upsert(rankedRows, {
          onConflict: 'summoner_id,queue_type',
        });

      if (insertRankedError) {
        console.error('Failed to store ranked stats:', insertRankedError);
      }
    }

    // Update last_synced_at (even if no matches were stored)
    await supabase
      .from('summoners')
      .update({ last_synced_at: syncedAt })
      .eq('id', summoner.id);

    return {
      success: true,
      matchCount: storedCount,
      lastSyncedAt: syncedAt,
      cooldownSeconds: cooldownMinutes * 60,
    };
  } catch (error) {
    console.error('Refresh summoner data error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh data',
    };
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

async function refreshAccountIdentifiersFromRiotId({
  riotApi,
  supabase,
  summoner,
}: {
  riotApi: RiotApi;
  supabase: SupabaseClient;
  summoner: {
    id: string;
    region: Region;
    summoner_name: string | null;
  };
}) {
  const riotId = summoner.summoner_name ?? '';
  const [rawGameName, rawTagLine] = riotId.split('#');

  if (!rawGameName || !rawTagLine) {
    console.warn(
      `Unable to refresh identifiers for summoner ${summoner.id}: missing Riot ID`
    );
    return null;
  }

  try {
    const account = await riotApi.getAccountByRiotId(
      summoner.region,
      rawGameName.trim(),
      rawTagLine.trim()
    );

    const { error: updateError } = await supabase
      .from('summoners')
      .update({
        puuid: account.puuid,
        summoner_name: `${account.gameName}#${account.tagLine}`,
      })
      .eq('id', summoner.id);

    if (updateError) {
      console.error(
        'Failed to store refreshed account identifiers:',
        updateError
      );
    }

    return account;
  } catch (err) {
    console.error('Failed to refresh account identifiers from Riot ID:', err);
    return null;
  }
}

export async function getSummonerById(id: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  const { data: summoner, error } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return { error: 'Summoner not found' };
  }

  return { success: true, summoner };
}

export async function getUserSummoners() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  const { data: summoners, error } = await supabase
    .from('summoners')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: 'Failed to fetch summoners' };
  }

  return { success: true, summoners: summoners || [] };
}

/**
 * Set a summoner as the main account
 * This will unset any other main account for the user
 */
export async function setMainAccount(summonerId: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Verify the summoner belongs to the user
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  // Unset all other main accounts for this user
  const { error: unsetError } = await supabase
    .from('summoners')
    .update({ is_main: false })
    .eq('user_id', user.id)
    .neq('id', summonerId);

  if (unsetError) {
    console.error('Failed to unset other main accounts:', unsetError);
    return { error: 'Failed to update main account' };
  }

  // Set this summoner as main
  const { error: setError } = await supabase
    .from('summoners')
    .update({ is_main: true })
    .eq('id', summonerId);

  if (setError) {
    console.error('Failed to set main account:', setError);
    return { error: 'Failed to set main account' };
  }

  return { success: true };
}

export type UnlinkSummonerResult = { success: true } | { error: string };

export async function unlinkSummoner(
  summonerId: string
): Promise<UnlinkSummonerResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Verify the summoner belongs to the user
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
  }

  // Check if this is the only account
  const { data: allSummoners, error: countError } = await supabase
    .from('summoners')
    .select('id')
    .eq('user_id', user.id);

  if (countError) {
    return { error: 'Failed to check account count' };
  }

  if (!allSummoners || allSummoners.length <= 1) {
    return {
      error:
        'Cannot unlink your only account. Please link another account first.',
    };
  }

  // If this is the main account, set another account as main first
  if (summoner.is_main) {
    const otherSummoner = allSummoners.find((s) => s.id !== summonerId);
    if (otherSummoner) {
      const { error: setMainError } = await supabase
        .from('summoners')
        .update({ is_main: true })
        .eq('id', otherSummoner.id);

      if (setMainError) {
        console.error('Failed to set new main account:', setMainError);
        return { error: 'Failed to reassign main account' };
      }
    }
  }

  // Delete the summoner (CASCADE will handle matches and ranked_stats)
  const { error: deleteError } = await supabase
    .from('summoners')
    .delete()
    .eq('id', summonerId);

  if (deleteError) {
    console.error('Failed to unlink summoner:', deleteError);
    return { error: 'Failed to unlink account' };
  }

  return { success: true };
}
