'use server';

import { RiotApi } from '../riot/api';
import { z } from 'zod';
import { getProfileIcon } from '../utils';
import type { LeagueEntryDto, MatchDto } from '../riot/types';
import cache from '../cache';

const searchPlayerSchema = z.object({
  region: z.string().min(1, 'Region is required'),
  gameName: z.string().min(1, 'Game name is required'),
  tagLine: z.string().min(1, 'Tag line is required'),
});

type SearchPlayerSuccess = {
  success: true;
  stale?: boolean;
  player: {
    puuid: string;
    gameName: string;
    tagLine: string;
    region: string;
    profileIconId: number;
    profileIcon: string;
    summonerLevel: number;
    rankedStats: LeagueEntryDto[];
    matchIds: string[];
    matches: MatchDto[];
  };
};

type SearchPlayerError = {
  success: false;
  error: string;
};

type SearchPlayerResult = SearchPlayerSuccess | SearchPlayerError;

export async function searchPlayer(
  formData: FormData
): Promise<SearchPlayerResult> {
  const rawData = {
    region: formData.get('region'),
    gameName: formData.get('gameName'),
    tagLine: formData.get('tagLine'),
  };

  const validated = searchPlayerSchema.parse(rawData);

  const cacheKey = `public:${validated.region}:${validated.gameName}#${validated.tagLine}`;

  try {
    // Use non-blocking mode so we don't hang the UI when no tokens are available
    const riotApi = new RiotApi({ nonBlocking: true });

    // Get account data
    const accountData = await riotApi.getAccountByRiotId(
      validated.region as any,
      validated.gameName,
      validated.tagLine
    );

    console.log('🔍 Search - Account data:', accountData);

    // Get summoner data
    const summonerData = await riotApi.getSummonerByPuuid(
      validated.region as any,
      accountData.puuid
    );

    console.log('🔍 Search - Summoner data:', summonerData);

    // Get ranked stats
    const rankedStats = await riotApi.getRankedInfoByPuuid(
      validated.region as any,
      accountData.puuid
    );

    console.log('🔍 Search - Ranked stats:', rankedStats);

    // Get recent match IDs (last 10)
    const matchIds = await riotApi.getMatchIds(
      validated.region as any,
      accountData.puuid,
      10,
      0
    );

    console.log('🔍 Search - Match IDs:', matchIds);

    // Fetch match details
    let matches: MatchDto[] = [];
    if (matchIds && matchIds.length > 0) {
      try {
        // Use higher concurrency (10) for faster fetching - rate limiter will handle throttling
        matches = await riotApi.getMultipleMatches(
          validated.region as any,
          matchIds,
          10
        );
        console.log('🔍 Search - Match details:', matches.length, 'matches');
      } catch (error) {
        console.error('Failed to fetch match details:', error);
      }
    }

    const payload: SearchPlayerSuccess = {
      success: true,
      player: {
        puuid: accountData.puuid,
        gameName: accountData.gameName,
        tagLine: accountData.tagLine,
        region: validated.region,
        profileIconId: summonerData.profileIconId,
        profileIcon: await getProfileIcon(summonerData.profileIconId),
        summonerLevel: summonerData.summonerLevel,
        rankedStats: rankedStats || [],
        matchIds: matchIds || [],
        matches: matches || [],
      },
    };

    // Cache for 10 minutes
    cache.set(cacheKey, payload, 10 * 60 * 1000);
    return payload;
  } catch (error) {
    console.error('Search player error:', error);

    // If rate limited or no tokens, try cache fallback
    const code = (error as any)?.code as string | undefined;
    if (code === 'RATE_LIMIT_NO_TOKENS') {
      const cached = cache.get<SearchPlayerSuccess>(cacheKey);

      if (cached) {
        return { ...cached, stale: true } as SearchPlayerSuccess;
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to find player. Please check the name, tag, and region.',
    } as SearchPlayerError;
  }
}
