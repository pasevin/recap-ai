// Shared TypeScript types for Recap AI - sourced from CLI as the base

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

// Configuration types - replacing any usage with proper interfaces
export type ConfigValue =
  | string
  | number
  | boolean
  | ConfigObject
  | ConfigArray;
export type ConfigObject = { [key: string]: ConfigValue };
export type ConfigArray = ConfigValue[];

export interface GitHubConfig {
  token?: string;
  defaults?: {
    repository?: string;
    organization?: string;
    branch?: string;
    person?: {
      identifier?: string;
    };
  };
  api?: {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}

export interface LinearConfig {
  token?: string;
  defaults?: {
    teamId?: string;
    organization?: string;
    person?: {
      identifier?: string;
    };
  };
  api?: {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}

export interface OpenAIConfig {
  token?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface MCPConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
  auth?: {
    enabled?: boolean;
    token?: string;
  };
}

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  file?: string;
  maxSize?: string;
  maxFiles?: number;
}

export type NarrativePerspective = 'first-person' | 'third-person';

export interface SummaryConfig {
  perspective?: NarrativePerspective;
  name?: string;
}

export interface Config {
  github?: GitHubConfig;
  linear?: LinearConfig;
  openai?: OpenAIConfig;
  mcp?: MCPConfig;
  logging?: LoggingConfig;
  summary?: SummaryConfig;
  version?: string;
  lastUpdated?: string;
}

export interface PerspectiveOptions {
  fallbackName?: string;
}

export function resolvePerspectiveName(
  identifier?: string,
  options?: PerspectiveOptions
): string | undefined {
  if (!identifier || typeof identifier !== 'string') {
    return options?.fallbackName;
  }

  const trimmed = identifier.trim();
  if (!trimmed) {
    return options?.fallbackName;
  }

  // If identifier looks like an email, use the part before @
  const emailMatch = trimmed.match(/^([^@]+)@/u);
  if (emailMatch) {
    return emailMatch[1];
  }

  return trimmed;
}

// GitHub API types - comprehensive from CLI
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
  name?: string;
  public_repos?: number;
  total_private_repos?: number;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  html_url: string;
  description?: string;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  clone_url: string;
  ssh_url: string;
  homepage?: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language?: string;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license?: {
    key: string;
    name: string;
    spdx_id?: string;
    url?: string;
  };
  allow_forking: boolean;
  is_template: boolean;
  topics: string[];
  visibility: 'public' | 'private';
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
}

// Linear API Types - comprehensive from CLI
export interface LinearUser {
  id: string;
  name: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isMe: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  active: boolean;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
  icon?: string;
  private: boolean;
  archivedAt?: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  color: string;
  description?: string;
  position: number;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  team: LinearTeam;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  isGroup: boolean;
  parent?: LinearLabel;
  children?: LinearLabel[];
}

export interface LinearPriority {
  priority: number;
  label: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  state:
    | 'backlog'
    | 'planned'
    | 'started'
    | 'paused'
    | 'completed'
    | 'canceled';
  progress: number;
  createdAt: string;
  updatedAt: string;
  targetDate?: string;
  startDate?: string;
  completedAt?: string;
  canceledAt?: string;
  lead?: LinearUser;
  members: LinearUser[];
}

export interface LinearCycle {
  id: string;
  number: number;
  name?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  completedAt?: string;
  team: LinearTeam;
  progress: number;
  completedIssueCountHistory: number[];
  completedEstimateHistory: number[];
  issueCountHistory: number[];
  inProgressHistory: number[];
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  estimate?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  canceledAt?: string;
  archivedAt?: string;
  assignee?: LinearUser;
  creator: LinearUser;
  team: LinearTeam;
  state: LinearWorkflowState;
  labels: {
    nodes: LinearLabel[];
  };
  project?: LinearProject;
  cycle?: LinearCycle;
  parent?: LinearIssue;
  children?: {
    nodes: LinearIssue[];
  };
  subscribers: {
    nodes: LinearUser[];
  };
  url: string;
  branchName?: string;
  customerTicketCount: number;
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  user: LinearUser;
  issue: LinearIssue;
  parent?: LinearComment;
  children?: {
    nodes: LinearComment[];
  };
  url: string;
}

export interface LinearOrganization {
  id: string;
  name: string;
  logoUrl?: string;
  urlKey: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  allowedAuthServices: string[];
  gitBranchFormat?: string;
  gitPublicLinkbackEnabled: boolean;
  gitLinkbackMessagesEnabled: boolean;
  roadmapEnabled: boolean;
  projectUpdatesReminderFrequency: 'never' | 'weekly' | 'biweekly' | 'monthly';
}

export interface LinearGraphQLResponse {
  data?: {
    viewer?: LinearUser;
    organization?: LinearOrganization;
  };
  errors?: Array<{ message: string }>;
}

// OpenAI API Types
export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface OpenAIModelsResponse {
  data: OpenAIModel[];
  object: string;
}

// API Connection Test Types
export interface ConnectionTestResult extends BaseResponse {
  details?: unknown;
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
