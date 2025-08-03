// Shared TypeScript types for Recap AI

// Type for metadata that can hold various structured data
export type MetadataValue =
  | string
  | number
  | boolean
  | null
  | MetadataValue[]
  | { [key: string]: MetadataValue };

export interface BaseResponse {
  success: boolean;
  message?: string;
}

export interface ActivityData {
  id: string;
  type: 'github' | 'linear';
  timestamp: Date;
  description: string;
  metadata?: Record<string, MetadataValue>;
}

export interface SummaryRequest {
  timeframe: string;
  sources: string[];
  format?: 'markdown' | 'json';
}
