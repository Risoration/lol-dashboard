'use server';

import { createServerClient } from '../supabase/server';

function computeKDA(kills: number, deaths: number, assists: number): number {
  if (deaths === 0) return kills + assists;
  return Number(((kills + assists) / deaths).toFixed(2));
}

export async function getStatsOverview(summonerId: string) {
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

  // Fetch matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false });

  if (matchesError) {
    return { error: 'Failed to fetch matches' };
  }

  // Compute aggregated stats
  const totalGames = matches?.length || 0;
  const wins = matches?.filter((m) => m.win).length || 0;
  const losses = totalGames - wins;
  const winRate =
    totalGames > 0 ? Number(((wins / totalGames) * 100).toFixed(1)) : 0;

  const totalKills = matches?.reduce((sum, m) => sum + m.kills, 0) || 0;
  const totalDeaths = matches?.reduce((sum, m) => sum + m.deaths, 0) || 0;
  const totalAssists = matches?.reduce((sum, m) => sum + m.assists, 0) || 0;

  const avgKills =
    totalGames > 0 ? Number((totalKills / totalGames).toFixed(1)) : 0;
  const avgDeaths =
    totalGames > 0 ? Number((totalDeaths / totalGames).toFixed(1)) : 0;
  const avgAssists =
    totalGames > 0 ? Number((totalAssists / totalGames).toFixed(1)) : 0;
  const avgKDA = computeKDA(totalKills, totalDeaths, totalAssists);

  return {
    success: true,
    stats: {
      totalGames,
      wins,
      losses,
      winRate,
      avgKDA,
      avgKills,
      avgDeaths,
      avgAssists,
    },
  };
}

export async function getChampionStats(summonerId: string, limit: number = 10) {
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

  // Fetch matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('summoner_id', summonerId);

  if (matchesError) {
    return { error: 'Failed to fetch matches' };
  }

  // Aggregate by champion
  const championMap = new Map<
    number,
    {
      championId: number;
      championName: string;
      gamesPlayed: number;
      wins: number;
      kills: number;
      deaths: number;
      assists: number;
    }
  >();

  matches?.forEach((match) => {
    const existing = championMap.get(match.champion_id);
    if (existing) {
      existing.gamesPlayed++;
      if (match.win) existing.wins++;
      existing.kills += match.kills;
      existing.deaths += match.deaths;
      existing.assists += match.assists;
    } else {
      championMap.set(match.champion_id, {
        championId: match.champion_id,
        championName: match.champion_name,
        gamesPlayed: 1,
        wins: match.win ? 1 : 0,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
      });
    }
  });

  // Convert to array and compute stats
  const championStats = Array.from(championMap.values())
    .map((champ) => ({
      championId: champ.championId,
      championName: champ.championName,
      gamesPlayed: champ.gamesPlayed,
      wins: champ.wins,
      losses: champ.gamesPlayed - champ.wins,
      winRate: Number(((champ.wins / champ.gamesPlayed) * 100).toFixed(1)),
      avgKDA: computeKDA(champ.kills, champ.deaths, champ.assists),
      totalKills: champ.kills,
      totalDeaths: champ.deaths,
      totalAssists: champ.assists,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, limit);

  return { success: true, stats: championStats };
}

export async function getMatchHistory(summonerId: string, limit: number = 20) {
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

  // Fetch matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('summoner_id', summonerId)
    .order('game_creation', { ascending: false })
    .limit(limit);

  if (matchesError) {
    return { error: 'Failed to fetch matches' };
  }

  return { success: true, matches: matches || [] };
}

export async function getRankedStats(summonerId: string) {
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

  // Fetch ranked stats
  const { data: rankedStats, error: rankedError } = await supabase
    .from('ranked_stats')
    .select('*')
    .eq('summoner_id', summonerId);

  if (rankedError) {
    return { error: 'Failed to fetch ranked stats' };
  }

  return { success: true, rankedStats: rankedStats || [] };
}
