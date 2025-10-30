'use server';

import { createServerClient } from '../supabase/server';
import { RiotApi } from '../riot/api';
import { z } from 'zod';
import type { SummonerInsert } from '../database/types';

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
    const rankedStats = await riotApi.getRankedInfoByPuuid(
      validated.region,
      accountData.puuid
    );

    console.log('🏆 Ranked stats:', rankedStats);

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

export async function refreshSummonerData(summonerId: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorised' };
  }

  // Get summoner data and verify ownership
  const { data: summoner, error: summonerError } = await supabase
    .from('summoners')
    .select('*')
    .eq('id', summonerId)
    .eq('user_id', user.id)
    .single();

  if (summonerError || !summoner) {
    return { error: 'Summoner not found' };
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
      error: `Please wait ${remainingSeconds} seconds before refreshing again`,
    };
  }

  try {
    const riotApi = new RiotApi();

    // Fetch recent match IDs (last 20 games)
    const matchIds = await riotApi.getMatchIds(
      summoner.region,
      summoner.puuid,
      20,
      0
    );

    if (matchIds.length === 0) {
      return { success: true, matchCount: 0 };
    }

    // Fetch match details (with rate limiting)
    const matches = await riotApi.getMultipleMatches(
      summoner.region,
      matchIds,
      5
    );

    // Process and store matches
    let storedCount = 0;
    for (const match of matches) {
      // Find player's participant data
      const participant = RiotApi.getPlayerParticipant(match, summoner.puuid);
      if (!participant) continue;

      // Insert match
      await supabase.from('matches').insert({
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
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        gold_earned: participant.goldEarned,
        damage_dealt: participant.totalDamageDealtToChampions,
        vision_score: participant.visionScore,
        synced_at: new Date().toISOString(),
      });

      storedCount++;
    }

    // Update last_synced_at
    await supabase
      .from('summoners')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', summoner.id);

    return { success: true, matchCount: storedCount };
  } catch (error) {
    console.error('Refresh summoner data error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to refresh data',
    };
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
