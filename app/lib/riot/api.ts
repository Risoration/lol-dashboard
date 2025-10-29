import axios, { AxiosRequestConfig } from 'axios';
import { RateLimiter } from './rate-limiter';
import { convertAxiosHeadersToHeaders } from '../utils';
import {
  type SummonerData,
  type MatchData,
  type Region,
  getRegionalEndpoint,
  RankedInformationData,
  ParticipantData,
} from './types';
import { Match } from '../database/types';
import { match } from 'assert';

export class RiotApi {
  private readonly apiKey: string;
  private readonly rateLimiter: RateLimiter;

  constructor() {
    this.apiKey = process.env.RIOT_API_KEY!;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Make a request to the Riot API with rate limiting and queuing
   */
  private async makeRequest<T>(
    url: string,
    options: AxiosRequestConfig = {}
  ): Promise<T> {
    //wait for token to become available
    await this.rateLimiter.waitForToken();

    //make request
    try {
      const response = await axios.request<T>({
        url,
        ...options,
        headers: {
          ...options.headers,
          'X-Riot-Token': this.apiKey,
        },
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 429,
      });

      //update limiter based on response headers
      //convert axios headers to headers object
      const headers = convertAxiosHeadersToHeaders(response.headers);
      this.rateLimiter.updateFromHeaders(headers);

      if (response.status === 429) {
        const retryAfter = response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;
        console.log(
          `Rate limit exceeded, waiting for ${waitTime}ms before retrying`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.makeRequest<T>(url, options);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Riot API error: ${error.response?.statusText}`);
      } else {
        throw new Error(
          `Riot API error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  }

  /**
   * Get summoner by name
   * @throws Error if name or region are empty
   * @returns Summoner data
   */
  async getSummonerByName(region: Region, name: string): Promise<SummonerData> {
    //validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Summoner name cannot be empty');
    }
    //validate region
    if (!region) {
      throw new Error('Region is required');
    }

    const encodedName = encodeURIComponent(name.trim());
    const url = `https://${region.toLowerCase()}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedName}`;

    return this.makeRequest<SummonerData>(url);
  }

  /**
   * Get ranked information by summoner ID
   * @param region
   * @param summonerId
   * @returns
   */

  async getRankedInfoBySummonerId(
    region: Region,
    summonerId: string
  ): Promise<RankedInformationData[]> {
    const url = `https://${getRegionalEndpoint(
      region
    )}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    return this.makeRequest<RankedInformationData[]>(url);
  }

  /**
   * Get match IDs by PUUID
   * @param region
   * @param puuid
   * @param count
   * @param start
   * @returns
   */
  async getMatchIds(
    region: Region,
    puuid: string,
    count: number = 20,
    start: number = 0
  ): Promise<string[]> {
    //validate count
    if (count < 1 || count > 100) {
      throw new Error('Count must be between 1 and 100');
    }

    //validate start
    if (start < 0) {
      throw new Error('Start must be greater than 0');
    }

    const regionalEndpoint = getRegionalEndpoint(region);
    const url = `https://${regionalEndpoint}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;

    return this.makeRequest<string[]>(url);
  }

  /**
   * Get match details by match ID
   * @param region
   * @param matchId
   * @returns
   */

  async getMatchDetails(region: Region, matchId: string) {
    const regionalEndpoint = getRegionalEndpoint(region);
    const url = `https://${regionalEndpoint}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return this.makeRequest<MatchData>(url);
  }

  async getMutipleMatches(
    region: Region,
    matchIds: string[],
    concurrency: number = 5
  ): Promise<MatchData[]> {
    //validate concurrency
    if (concurrency < 1 || concurrency > 10) {
      throw new Error('Concurrency must be between 1 and 10');
    }
    if (matchIds.length === 0) {
      return [];
    }

    const results: MatchData[] = [];

    //fetch matches in batches
    for (let i = 0; i < matchIds.length; i += concurrency) {
      //get batch of match ids
      const batch = matchIds.slice(i, i + concurrency);

      //fetch match details for batch
      const batchResults = await Promise.all(
        batch.map((id) => this.getMatchDetails(region, id))
      );

      //add batch results to results array
      results.push(...batchResults);

      //wait for next batch
      if (i + concurrency < matchIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Helper method to extract a player's data from a match by PUUID
   * @param region
   * @param puuid
   * @param match
   * @returns
   */

  static getPlayerParticipant(
    match: MatchData,
    puuid: string
  ): ParticipantData | undefined {
    return match.info.participants.find((p) => p.puuid == puuid);
  }
}
