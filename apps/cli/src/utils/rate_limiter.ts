export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private isProcessing = false;
  private delayMs = 1000; // 1 second between requests
  private maxRetries = 2;
  private retryBaseDelayMs = 500;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRetry(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= this.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error) || attempt === this.maxRetries) {
          throw error;
        }
        const backoff = this.retryBaseDelayMs * Math.pow(2, attempt);
        await this.delay(backoff);
        attempt += 1;
      }
    }
    // Should not reach here
    throw lastError as Error;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Add delay between requests to respect rate limits
        if (this.queue.length > 0) {
          await this.delay(this.delayMs);
        }
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  // Allow customization of delay for different use cases
  setDelay(delayMs: number) {
    if (delayMs >= 0) {
      this.delayMs = delayMs;
    }
  }

  setRetryOptions(maxRetries: number, retryBaseDelayMs: number) {
    if (maxRetries >= 0) this.maxRetries = maxRetries;
    if (retryBaseDelayMs >= 0) this.retryBaseDelayMs = retryBaseDelayMs;
  }

  private isTransientError(error: unknown): boolean {
    const e = error as { status?: number; message?: string };
    if (typeof e?.status === 'number') {
      // Retry on 429 and 5xx
      if (e.status === 429 || (e.status >= 500 && e.status < 600)) return true;
    }
    const msg = (e?.message ?? '').toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('etimedout') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up') ||
      msg.includes('ratelimit') ||
      msg.includes('rate limit')
    );
  }
}
