'use server';

import { RiotApi } from '../riot/api';
import { z } from 'zod';
import { getProfileIcon } from '../utils';
import type { MatchDto } from '../riot/types';

const searchPlayerSchema = z.object({
  region: z.string().min(1, 'Region is required'),
  gameName: z.string().min(1, 'Game name is required'),
  tagLine: z.string().min(1, 'Tag line is required'),
});

export async function searchPlayer(formData: FormData) {
  const rawData = {
    region: formData.get('region'),
    gameName: formData.get('gameName'),
    tagLine: formData.get('tagLine'),
  };

  const validated = searchPlayerSchema.parse(rawData);

  try {
    const riotApi = new RiotApi();

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

    return {
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
  } catch (error) {
    console.error('Search player error:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to find player. Please check the name, tag, and region.',
    };
  }
}
