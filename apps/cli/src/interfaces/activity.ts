import {
  GitHubPullRequest,
  GitHubIssue,
  GitHubCommit,
  GitHubReview,
  GitHubFile,
  GitHubComment,
  GitHubUser,
  EnhancedPullRequest,
  EnhancedIssue,
} from './github-types';
import { LinearIssue, LinearUser } from './linear-types';

export interface UnifiedActivityData {
  commits: EnhancedCommitData[];
  pullRequests: GitHubPullRequest[];
  issues: GitHubIssue[];
  codeReviews: GitHubReview[];
  statistics: Statistics;
  summary?: ActivitySummary;
  userDetails?: GitHubUser | LinearUser;
  enhancedPullRequests?: EnhancedPullRequest[];
  enhancedIssues?: EnhancedIssue[];
  linearIssues?: LinearIssue[];
}

export interface EnhancedCommitData {
  commit: GitHubCommit;
  pullRequest?: GitHubPullRequest;
  reviews?: GitHubReview[];
  files?: GitHubFile[];
  comments?: GitHubComment[];
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
