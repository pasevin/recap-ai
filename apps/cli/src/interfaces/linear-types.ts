// Linear API types - now sourced from shared package with CLI extensions
import type {
  LinearUser,
  LinearTeam,
  LinearWorkflowState,
  LinearIssue,
} from '@recap-ai/shared';

// Re-export for external consumers
export type {
  LinearUser,
  LinearTeam,
  LinearWorkflowState,
  LinearIssue,
} from '@recap-ai/shared';

// CLI-specific extensions
export interface LinearIssueHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  fromState?: LinearWorkflowState;
  toState?: LinearWorkflowState;
  fromAssignee?: LinearUser;
  toAssignee?: LinearUser;
  fromPriority?: number;
  toPriority?: number;
  fromEstimate?: number;
  toEstimate?: number;
  actor: LinearUser;
  issue: LinearIssue;
  relationChanges?: Array<{
    type: string;
    identifier?: string;
  }>;
}

// API Response types
export interface LinearIssuesResponse {
  issues: {
    nodes: LinearIssue[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
  };
}

export interface LinearTeamsResponse {
  teams: {
    nodes: LinearTeam[];
  };
}

export interface LinearUsersResponse {
  users: {
    nodes: LinearUser[];
  };
}

// Activity data types
export interface LinearActivitySummary {
  totalIssues: number;
  completedIssues: number;
  openIssues: number;
  inProgressIssues: number;
  canceledIssues: number;
  averageCompletionTime: number; // in days
  issuesByPriority: Array<{
    priority: number;
    count: number;
  }>;
  issuesByState: Array<{
    state: string;
    count: number;
  }>;
  issuesByTeam: Array<{
    team: string;
    count: number;
  }>;
  topContributors: Array<{
    user: string;
    contributions: number;
  }>;
  topLabels: Array<{
    name: string;
    count: number;
  }>;
  activityTimeline: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
}

export interface LinearQueryOptions {
  teamId?: string;
  assigneeId?: string;
  creatorId?: string;
  projectId?: string;
  cycleId?: string;
  states?: string[];
  labels?: string[];
  priority?: number[];
  orderBy?: 'createdAt' | 'updatedAt' | 'priority' | 'title';
  includeArchived?: boolean;
  first?: number;
  after?: string;
  before?: string;
  last?: number;
}

export interface LinearFormattedData {
  summary: {
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    stateBreakdown: Array<{ state: string; count: number }>;
    priorityBreakdown: Array<{ priority: number; count: number }>;
    avgTimeToClose: number;
    timeStats: {
      min: number;
      max: number;
      avg: number;
    };
    mostActiveUsers: Array<{ user: string; contributions: number }>;
    labels: Array<{ name: string; count: number }>;
  };
}
