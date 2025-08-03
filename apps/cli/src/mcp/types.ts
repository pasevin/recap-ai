// MCP Types with strict type safety (no 'any' usage)

// JSON Schema property type for input schemas
export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  format?: string;
  default?: string | number | boolean;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
}

// Tool result with proper typing
export interface ToolResult {
  success?: boolean;
  data?: unknown;
  error?: string;
  timestamp?: string;
  [key: string]: unknown; // Allow additional properties for tool-specific results
}

export interface RecapAITool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JsonSchemaProperty>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ActivitySummaryArgs {
  repository?: string;
  timeframe?: string;
  authorGithub?: string;
  authorLinear?: string;
  since?: string;
  until?: string;
}

export interface ActivityDataArgs {
  repository?: string;
  timeframe?: string;
  authorGithub?: string;
  authorLinear?: string;
  since?: string;
  until?: string;
  format?: 'enhanced' | 'basic';
}

export interface ConfigurationArgs {
  key?: string;
  includeDefaults?: boolean;
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

// Specific GitHub activity data structure
export interface GitHubActivityData {
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    repository?: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    state: string;
    author: string;
    createdAt: string;
    repository?: string;
  }>;
  issues: Array<{
    number: number;
    title: string;
    state: string;
    author: string;
    createdAt: string;
    repository?: string;
  }>;
  statistics?: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    topContributors: Array<{ author: string; count: number }>;
  };
}

// Specific Linear activity data structure
export interface LinearActivityData {
  issues: Array<{
    id: string;
    identifier: string;
    title: string;
    state: string;
    assignee?: string;
    createdAt: string;
  }>;
  statistics?: {
    totalIssues: number;
    completedIssues: number;
    topContributors: Array<{ user: string; contributions: number }>;
  };
}

// Combined activity data
export interface ActivityData {
  github?: GitHubActivityData;
  linear?: LinearActivityData;
}

export interface ActivityResult {
  timeframe: string;
  period: {
    since?: string;
    until?: string;
  };
  summary?: string;
  data?: ActivityData;
  metadata: {
    generated_at?: string;
    collected_at?: string;
    format?: string;
    sources?: string[];
    repository?: string;
    authorGithub?: string;
    authorLinear?: string;
  };
}
