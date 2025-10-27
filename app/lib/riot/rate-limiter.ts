interface RateLimitBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<string, RateLimitBucket>;

  constructor() {
    this.buckets = new Map();

    // Initialize buckets for Riot API rate limiting

    // 20 requests per second
    this.buckets.set('app-1s', {
      tokens: 20,
      maxTokens: 20,
      refillRate: 20, // 20 tokens per second
      lastRefill: Date.now(),
    });

    // 100 requests per 2 minutes (120 seconds)
    this.buckets.set('app-120s', {
      tokens: 100,
      maxTokens: 100,
      refillRate: 100 / 120, // ~0.833 tokens per second
      lastRefill: Date.now(),
    });
  }

  /**
   * Refill the bucket based on time elapsed since last refill
   * call when checking the token count of a bucket to have a fresh count
   * @param bucket
   */
  private refillBucket(bucket: RateLimitBucket): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // convert to seconds
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.tokens + tokensToAdd, bucket.maxTokens);
    bucket.lastRefill = now;
  }

  /**
   * Check if a request can be made, e.g. if there are any tokens available in any bucket
   * @returns true if request can be made, false otherwise
   */
  private canMakeRequest(): boolean {
    for (const bucket of this.buckets.values()) {
      //refill the bucket based on time elapsed since last refill and then check if there are any tokens
      this.refillBucket(bucket);
      if (bucket.tokens < 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Consume 1 token from each bucket
   */
  private consumeToken(): void {
    for (const bucket of this.buckets.values()) {
      bucket.tokens -= 1;
    }
  }

  /**
   * Get the maximum wait time for the next request to be able to make a request
   * @returns the maximum wait time in milliseconds
   */
  getWaitTime(): number {
    let maxWaitTime = 0;

    for (const bucket of this.buckets.values()) {
      this.refillBucket(bucket);
      if (bucket.tokens < 1) {
        const tokensNeeded = 1 - bucket.tokens;
        const waitTime = (tokensNeeded / bucket.refillRate) * 1000; //convert to milliseconds
        maxWaitTime = Math.max(maxWaitTime, waitTime);
      }
    }

    return Math.ceil(maxWaitTime); //round up to the nearest integer in milliseconds
  }

  /**
   * Wait for a token to be available
   * Blocks the current thread until a token is available
   */
  async waitForToken(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      console.log(`Waiting for ${waitTime}ms for a token`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.consumeToken();
  }

  /**
   * Get the time in seconds until a request can be made
   */
  getWaitTimeSeconds(): number {
    const waitTimeMs = this.getWaitTime();
    return Math.ceil(waitTimeMs / 1000); // Convert to seconds
  }

  /**
   * Update rate limits based on response headers from Riot API
   * Riot sends headers like:
   * - X-App-Rate-Limit: 20:1, 100:60,
   * - X-App-Rate-Limit-Count: 5:1, 10:120,
   * This means:
   * - 20 requests per second, 100 requests per minute
   * - 5 requests per second, 10 requests every 2 minutes
   * @param headers - The response headers from Riot API
   */

  updateFromHeaders(headers: Headers): void {
    const appLimit = headers.get('X-App-Rate-Limit');
    const appCount = headers.get('X-App-Rate-Limit-Count');

    if (appLimit && appCount) {
      const limits = this.parseRateLimitHeader(appLimit);
      const counts = this.parseRateLimitHeader(appCount);

      //{1: 20}
      //update 1 second bucket
      if (limits['1'] && counts['1']) {
        const bucket = this.buckets.get('app-1s');
        if (bucket) {
          bucket.maxTokens = limits['1'];
          bucket.tokens = limits['1'] - counts['1'];
        }
      }
      //{120: 100}
      //update 2 minute bucket
      if (limits['120'] && counts['120']) {
        const bucket = this.buckets.get('app-120s');
        if (bucket) {
          bucket.maxTokens = limits['120'];
          bucket.tokens = limits['120'] - counts['120'];
        }
      }
    }
  }

  /**
   * Parse rate limit header into a record with {name, limit} key-value pairs
   * Example : "20:1, 100:120"
   * Returns: {'1' : 20, '120' : 100}
   * @param header - The header to parse
   */
  private parseRateLimitHeader(header: string): Record<string, number> {
    const result: Record<string, number> = {};
    const pairs = header.split(',');
    for (const pair of pairs) {
      const [count, seconds] = pair.trim().split(':').map(Number);
      result[seconds.toString()] = count;
    }
    return result;
  }

  /**
   * Reset all buckets (testing purposes)
   */
  reset(): void {
    for (const bucket of this.buckets.values()) {
      bucket.tokens = bucket.maxTokens;
      bucket.lastRefill = Date.now();
    }
  }
}
