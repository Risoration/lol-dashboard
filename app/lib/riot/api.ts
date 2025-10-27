import axios, { AxiosRequestConfig } from 'axios';
import { RateLimiter } from './rate-limiter';
import { convertAxiosHeadersToHeaders } from '../utils';

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
    options: AxiosRequestConfig
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

      let attempt = 0;
      while (attempt < 3) {
        if (response.status === 429) {
          attempt++;
          const retryAfter = response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000;

          console.error(
            `Rate limit exceeded, waiting for ${waitTime}ms before retrying`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          //retry
          return this.makeRequest<T>(url, options);
        }
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
}
