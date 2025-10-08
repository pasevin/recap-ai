// API types and interfaces

export type Timeframe = '1d' | '1w' | '1m' | '1y' | string; // Preset timeframes or custom date range (startDate/endDate)
export type Format = 'summary' | 'markdown' | 'json';
export type DataSource = 'github' | 'linear';

// Base API response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  warnings?: string[];
  message?: string;
}

// Summarize API types
export interface SummarizeRequest {
  timeframe: Timeframe;
  sources: DataSource[];
  format?: Format;
  // Template selection for rendering the AI summary
  templateId?: string;
  perspective?: 'first-person' | 'third-person';
  perspectiveName?: string;
  fullContext?: boolean;
  // Extended configuration for advanced reports
  githubConfig?: {
    repository?: string;
    branch?: string;
    authorFilter?: string;
    includeIssues?: boolean;
    includePRs?: boolean;
    includeCommits?: boolean;
  };
  linearConfig?: {
    teamId?: string;
    projectIds?: string[];
    statusFilter?: string[];
    assigneeFilter?: string;
    priorityFilter?: ('Low' | 'Medium' | 'High' | 'Urgent')[];
  };
  includeMetrics?: boolean;
  includeCharts?: boolean;
  groupBy?: 'date' | 'author' | 'repository' | 'team';
  exportOptions?: {
    includeCharts?: boolean;
    includeRawData?: boolean;
  };
}

export interface SummarizeResponse {
  content?: string;
  summary?: unknown;
  data?: unknown;
  warnings?: string[];
  perspective?: 'first-person' | 'third-person';
  perspectiveName?: string;
  formattedData?: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  formats: string[];
  perspectives: Array<'first-person' | 'third-person'>;
  useCases: string[];
}

// GitHub API types
export interface GitHubRequest {
  timeframe: Timeframe;
  repository?: string;
  format?: Format;
}

export interface GitHubResponse {
  content?: string;
  data?: unknown;
  warnings?: string[];
}

// Linear API types
export interface LinearRequest {
  timeframe: Timeframe;
  teamId?: string;
  format?: Format;
}

export interface LinearResponse {
  content?: string;
  data?: unknown;
  warnings?: string[];
}

// Config API types
export interface ConfigGetRequest {
  key?: string;
}

export interface ConfigSetRequest {
  [key: string]: unknown;
}

export interface ConfigResponse {
  content?: string;
  message?: string;
  [key: string]: unknown;
}

// Error types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export interface ValidationErrorDetails {
  error?: {
    message?: string;
    issues?: { message: string; path: (string | number)[] }[];
  };
}
