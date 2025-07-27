export interface RecapAITool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: Record<string, any>) => Promise<any>;
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

export interface ActivityData {
  github?: any;
  linear?: any;
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
    author?: string;
  };
}
