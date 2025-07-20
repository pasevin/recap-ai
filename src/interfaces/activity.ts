export interface UnifiedActivityData {
  commits: EnhancedCommitData[];
  pullRequests: any[];
  issues: any[];
  codeReviews: any[];
  statistics: Statistics;
  summary?: ActivitySummary;
  userDetails?: any;
  enhancedPullRequests?: any[];
  enhancedIssues?: any[];
}

export interface EnhancedCommitData {
  commit: any;
  pullRequest?: any;
  reviews?: any[];
  files?: any[];
  comments?: any[];
}

export interface RepositoryOptions {
  since?: Date;
  until?: Date;
  branch?: string;
  author?: string;
  includePRs?: boolean;
  includeIssues?: boolean;
  includeReviews?: boolean;
  maxResults?: number;
}

export interface UserActivityOptions {
  since?: Date;
  until?: Date;
  includePrivate?: boolean;
  maxResults?: number;
  organizations?: string[];
}

export interface Statistics {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  avgFilesPerCommit: number;
  avgLinesChanged: number;
  topContributors: { author: string; count: number }[];
  topLabels: { label: string; count: number }[];
}

export interface ActivitySummary {
  totalActivity: number;
  pullRequests: {
    total: number;
    open: number;
    merged: number;
    closed: number;
  };
  issues: {
    total: number;
    open: number;
    closed: number;
  };
  topRepositories: { repo: string; count: number }[];
}
