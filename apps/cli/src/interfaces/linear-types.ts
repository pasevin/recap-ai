// Linear API types - replacing any usage with proper interfaces

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
