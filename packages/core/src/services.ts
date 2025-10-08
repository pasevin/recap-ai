// Core service interfaces for Recap AI
import type { ActivityData } from '@recap-ai/shared';

export interface DataService {
  getActivityData(options: {
    timeframe: string;
    // Add other options if needed
  }): Promise<ActivityData[]>;
  getServiceName(): string;
}

export interface SummaryService {
  generateSummary(data: ActivityData[]): Promise<string>;
}
