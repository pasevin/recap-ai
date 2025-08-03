export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private isProcessing = false;
  private delayMs = 1000; // 1 second between requests

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
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
}
