// Core service interfaces for Recap AI
import type { ActivityData } from '@recap-ai/shared';

export interface DataService {
  fetchData(timeframe: string): Promise<ActivityData[]>;
  getServiceName(): string;
}

export interface SummaryService {
  generateSummary(data: ActivityData[]): Promise<string>;
}
