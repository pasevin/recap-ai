// Core data models for Recap AI
import type { DataService, SummaryService } from './services';

export interface Configuration {
  github?: {
    token?: string;
    defaultRepo?: string;
  };
  linear?: {
    apiKey?: string;
    teamId?: string;
  };
  openai?: {
    apiKey?: string;
    model?: string;
  };
}

// Specific service interfaces for better type safety
export interface GitHubService extends DataService {
  fetchCommits(
    repo: string,
    options?: GitHubFetchOptions
  ): Promise<GitHubCommitData[]>;
  fetchPullRequests(
    repo: string,
    options?: GitHubFetchOptions
  ): Promise<GitHubPRData[]>;
  fetchIssues(
    repo: string,
    options?: GitHubFetchOptions
  ): Promise<GitHubIssueData[]>;
}

export interface LinearService extends DataService {
  fetchIssues(
    teamId: string,
    options?: LinearFetchOptions
  ): Promise<LinearIssueData[]>;
  fetchProjects(options?: LinearFetchOptions): Promise<LinearProjectData[]>;
}

export interface OpenAIService extends SummaryService {
  summarizeActivity(
    data: string,
    options?: OpenAISummaryOptions
  ): Promise<string>;
  analyzeChanges(
    data: string,
    options?: OpenAIAnalysisOptions
  ): Promise<AnalysisResult>;
}

export interface ServiceFactory {
  createGitHubService(): GitHubService;
  createLinearService(): LinearService;
  createOpenAIService(): OpenAIService;
}

// Service-specific data types
export interface GitHubFetchOptions {
  since?: Date;
  until?: Date;
  author?: string;
  state?: 'open' | 'closed' | 'all';
}

export interface LinearFetchOptions {
  since?: Date;
  until?: Date;
  assignee?: string;
  state?: 'active' | 'completed' | 'canceled' | 'all';
}

export interface OpenAISummaryOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface OpenAIAnalysisOptions extends OpenAISummaryOptions {
  analysisType?: 'changes' | 'trends' | 'productivity' | 'summary';
}

// Service-specific return types
export interface GitHubCommitData {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions: number;
  deletions: number;
}

export interface GitHubPRData {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  closedAt?: string;
}

export interface GitHubIssueData {
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: string;
  closedAt?: string;
}

export interface LinearIssueData {
  id: string;
  identifier: string;
  title: string;
  state: string;
  assignee?: string;
  createdAt: string;
  completedAt?: string;
}

export interface LinearProjectData {
  id: string;
  name: string;
  state: string;
  progress: number;
  startDate?: string;
  targetDate?: string;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  metrics: Record<string, number>;
  recommendations: string[];
}
