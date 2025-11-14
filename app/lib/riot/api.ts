import axios, { AxiosRequestConfig } from 'axios';
import { RateLimiter } from './rate-limiter';
import { convertAxiosHeadersToHeaders } from '../utils';
import {
  type SummonerDto,
  type AccountDto,
  type MatchDto,
  type Region,
  getRegionalEndpoint,
  LeagueEntryDto,
  ParticipantDto,
} from './types';

export class RiotApi {
  private readonly apiKey: string;
  private readonly rateLimiter: RateLimiter;
  private readonly nonBlocking: boolean;

  constructor(opts?: { nonBlocking?: boolean }) {
    this.apiKey = process.env.RIOT_API_KEY!;
    this.nonBlocking = Boolean(opts?.nonBlocking);

    if (!this.apiKey) {
      throw new Error(
        'RIOT_API_KEY environment variable is not set. Please add it to your .env.local file.'
      );
    }

    // Debug: Log the API key (first and last 4 chars for security)
    const keyPreview =
      this.apiKey.length > 8
        ? `${this.apiKey.substring(0, 10)}...${this.apiKey.substring(
            this.apiKey.length - 4
          )}`
        : 'KEY_TOO_SHORT';
    console.log(
      `🔑 Riot API Key loaded: ${keyPreview} (length: ${this.apiKey.length})`
    );

    this.rateLimiter = new RateLimiter();
  }

  /**
   * Make a request to the Riot API with rate limiting and queuing
   */
  private async makeRequest<T>(
    url: string,
    options: AxiosRequestConfig = {}
  ): Promise<T> {
    // If non-blocking and no tokens are available, fail fast so callers can use cache
    const waitMs = this.rateLimiter.getWaitTime();
    if (this.nonBlocking && waitMs > 0) {
      const err: any = new Error('RATE_LIMIT_NO_TOKENS');
      err.code = 'RATE_LIMIT_NO_TOKENS';
      err.waitSeconds = Math.ceil(waitMs / 1000);
      throw err;
    }

    // Otherwise wait for a token to become available
    await this.rateLimiter.waitForToken();

    // Add API key as query parameter
    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}api_key=${
      this.apiKey
    }`;

    // Debug: Log the actual request URL with API key (masked for security)
    const maskedUrl = urlWithKey.replace(/api_key=([^&]+)/, 'api_key=****');
    console.log(`🌐 Riot API Request: ${maskedUrl}`);

    //make request
    try {
      const response = await axios.request<T>({
        url: urlWithKey,
        ...options,
        timeout: options.timeout ?? 10000,
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
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorMessage = error.response?.data?.status?.message || '';

        // Debug: Log detailed error info
        console.error(`❌ Riot API Error: ${status} ${statusText}`);
        console.error(`   URL: ${url}`);
        console.error(`   Response data:`, error.response?.data);

        // Provide more helpful error messages
        if (status === 403) {
          throw new Error(
            `Riot API key is invalid or expired. Status: ${status} ${statusText}. ` +
              `Please get a new API key from https://developer.riotgames.com and update your .env.local file. ` +
              `Development keys expire every 24 hours.`
          );
        } else if (status === 404) {
          throw new Error(
            `Summoner not found. Please check the game name and tag line are correct.`
          );
        } else if (status === 429) {
          throw new Error(
            `Rate limit exceeded. Please wait a moment and try again.`
          );
        } else {
          throw new Error(
            `Riot API error: ${status} ${statusText}${
              errorMessage ? ` - ${errorMessage}` : ''
            }`
          );
        }
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
   * Get account by Riot ID (gameName#tagLine)
   * @param region - Regional routing value (e.g., 'americas', 'europe', 'asia')
   * @param gameName - Game name (part before #)
   * @param tagLine - Tag line (part after #)
   * @returns Account data with PUUID
   */
  async getAccountByRiotId(
    region: Region,
    gameName: string,
    tagLine: string
  ): Promise<AccountDto> {
    if (!gameName || gameName.trim().length === 0) {
      throw new Error('Game name cannot be empty');
    }
    if (!tagLine || tagLine.trim().length === 0) {
      throw new Error('Tag line cannot be empty');
    }
    if (!region) {
      throw new Error('Region is required');
    }

    const regionalEndpoint = getRegionalEndpoint(region);
    const encodedGameName = encodeURIComponent(gameName.trim());
    const encodedTagLine = encodeURIComponent(tagLine.trim());
    // console.log('regionalEndpoint', regionalEndpoint);
    // console.log('encodedGameName', encodedGameName);
    // console.log('encodedTagLine', encodedTagLine);
    // console.log('apiKey', this.apiKey);
    // console.log(
    //   'url',
    //   `https://${regionalEndpoint}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}?api_key=${this.apiKey}`
    // );
    // const url = `https://${regionalEndpoint}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}?api_key=${this.apiKey}`;

    const url = `https://${regionalEndpoint}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}`;
    return this.makeRequest<AccountDto>(url);
  }

  /**
   * Get account by PUUID
   * @param region - Regional routing value (e.g., 'americas', 'europe', 'asia')
   * @param puuid - Player UUID
   * @returns Account data with Riot ID (gameName#tagLine)
   */
  async getAccountByPuuid(region: Region, puuid: string): Promise<AccountDto> {
    if (!puuid || puuid.trim().length === 0) {
      throw new Error('PUUID cannot be empty');
    }
    if (!region) {
      throw new Error('Region is required');
    }

    const regionalEndpoint = getRegionalEndpoint(region);
    const url = `https://${regionalEndpoint}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(
      puuid
    )}`;
    return this.makeRequest<AccountDto>(url);
  }

  /**
   * Get summoner by PUUID
   * @param region - Platform region (e.g., 'NA1', 'EUW1')
   * @param puuid - Player UUID
   * @returns Summoner data
   */
  async getSummonerByPuuid(
    region: Region,
    puuid: string
  ): Promise<SummonerDto> {
    if (!puuid || puuid.trim().length === 0) {
      throw new Error('PUUID cannot be empty');
    }
    if (!region) {
      throw new Error('Region is required');
    }

    const url = `https://${region.toLowerCase()}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(
      puuid
    )}`;

    return this.makeRequest<SummonerDto>(url);
  }

  /**
   * Get summoner by Riot ID (convenience method that combines account + summoner lookup)
   * @param region - Platform region (e.g., 'NA1', 'EUW1')
   * @param gameName - Game name (part before #)
   * @param tagLine - Tag line (part after #)
   * @returns Summoner data
   */
  async getSummonerByRiotId(
    region: Region,
    gameName: string,
    tagLine: string
  ): Promise<SummonerDto> {
    // First get account to get PUUID
    const account = await this.getAccountByRiotId(region, gameName, tagLine);
    // Then get summoner data using PUUID
    return this.getSummonerByPuuid(region, account.puuid);
  }

  /**
   * Get ranked information by PUUID
   * Uses platform routing (e.g., na1, euw1, kr)
   * @param region - Platform region (e.g., 'NA1', 'EUW1')
   * @param puuid - Encrypted PUUID
   * @returns Array of league entries for the summoner
   */
  async getRankedInfoByPuuid(
    region: Region,
    puuid: string
  ): Promise<LeagueEntryDto[]> {
    if (!puuid || puuid.trim().length === 0) {
      throw new Error('PUUID cannot be empty');
    }
    if (!region) {
      throw new Error('Region is required');
    }

    const url = `https://${region.toLowerCase()}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(
      puuid
    )}`;
    return this.makeRequest<LeagueEntryDto[]>(url);
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
    count: number,
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
    return this.makeRequest<MatchDto>(url);
  }

  async getMultipleMatches(
    region: Region,
    matchIds: string[],
    concurrency: number = 5
  ): Promise<MatchDto[]> {
    //validate concurrency
    if (concurrency < 1 || concurrency > 10) {
      throw new Error('Concurrency must be between 1 and 10');
    }
    if (matchIds.length === 0) {
      return [];
    }

    const results: MatchDto[] = [];
    const totalBatches = Math.ceil(matchIds.length / concurrency);

    console.log(
      `getMultipleMatches: Starting to fetch ${matchIds.length} matches in ${totalBatches} batches (concurrency: ${concurrency})`
    );

    //fetch matches in batches with better rate limit handling
    for (let i = 0; i < matchIds.length; i += concurrency) {
      const batchNumber = Math.floor(i / concurrency) + 1;
      //get batch of match ids
      const batch = matchIds.slice(i, i + concurrency);

      console.log(
        `getMultipleMatches: Fetching batch ${batchNumber}/${totalBatches} (${batch.length} matches, ${results.length}/${matchIds.length} total fetched)`
      );

      //fetch match details for batch with error handling
      const batchResults = await Promise.allSettled(
        batch.map((id) => this.getMatchDetails(region, id))
      );

      // Filter out any failed requests and extract successful results
      const validResults = batchResults
        .filter(
          (result): result is PromiseFulfilledResult<MatchDto> =>
            result.status === 'fulfilled' &&
            result.value !== null &&
            result.value !== undefined
        )
        .map((result) => result.value);

      // Log any failures for debugging
      const failures = batchResults.filter(
        (result) => result.status === 'rejected'
      );
      if (failures.length > 0) {
        console.warn(
          `getMultipleMatches: Batch ${batchNumber}: ${failures.length} matches failed to fetch`
        );
      }

      //add batch results to results array
      results.push(...validResults);

      console.log(
        `getMultipleMatches: Batch ${batchNumber} complete: ${validResults.length} matches fetched, ${results.length}/${matchIds.length} total`
      );

      // Add delay between batches to avoid hitting rate limits
      // Increase delay to 200ms to be more conservative with rate limits
      if (i + concurrency < matchIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(
      `getMultipleMatches: Completed fetching ${results.length}/${matchIds.length} matches`
    );

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
    match: MatchDto,
    puuid: string
  ): ParticipantDto | undefined {
    // Use strict equality and also log if not found for debugging
    const participant = match.info.participants.find((p) => p.puuid === puuid);
    if (!participant && match.info.participants.length > 0) {
      // Log first few characters for debugging (don't log full PUUID for security)
      console.log(
        `getPlayerParticipant: PUUID mismatch. Looking for: ${puuid.substring(
          0,
          8
        )}..., found participants with PUUIDs: ${match.info.participants
          .slice(0, 2)
          .map((p) => p.puuid.substring(0, 8) + '...')
          .join(', ')}`
      );
    }
    return participant;
  }
}
