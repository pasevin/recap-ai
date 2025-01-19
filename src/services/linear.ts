import {
  LinearClient,
  Issue,
  User,
  IssueLabel,
  Comment,
  WorkflowState,
} from '@linear/sdk';

/**
 * Configuration options for the Linear service
 */
export interface LinearConfig {
  /** Linear API token */
  token: string;
  /** Optional team ID to use as default */
  teamId?: string;
}

/**
 * Options for fetching issues from Linear
 */
export interface FetchOptions {
  /** Team ID to fetch issues from */
  teamId?: string;
  /** Filter issues by state (e.g., 'open', 'closed', 'all') */
  state?: string;
  /** Fetch issues updated since this date */
  since?: Date | string;
  /** Fetch issues updated until this date */
  until?: Date | string;
  /** Filter issues by assignee (email or name) */
  assignee?: string;
  /** Filter issues by creator (email or name) */
  author?: string;
  /** Filter issues by priority (0-4) */
  priority?: number;
  /** Filter issues by label name */
  label?: string;
  /** Search in issue title and description */
  search?: string;
  /** Sort issues by field */
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Maximum number of issues to fetch */
  limit?: number;
}

/**
 * Response data from the Linear service
 */
export interface LinearData {
  /** List of issues matching the query */
  issues: Array<{
    /** Issue ID */
    id: string;
    /** Issue identifier (e.g., "ENG-123") */
    identifier: string;
    /** Issue title */
    title: string;
    /** Issue description */
    description: string;
    /** Current state */
    state: string;
    /** Priority level (0-4) */
    priority: number;
    /** Assigned user */
    assignee: string | null;
    /** Issue creator */
    creator: string;
    /** Creation timestamp */
    createdAt: string;
    /** Last update timestamp */
    updatedAt: string;
    /** Completion timestamp */
    completedAt: string | null;
    /** Applied labels */
    labels: string[];
    /** Issue comments */
    comments: Array<{
      /** Comment author */
      author: string;
      /** Comment content */
      body: string;
      /** Creation timestamp */
      createdAt: string;
      /** Last update timestamp */
      updatedAt: string;
    }>;
  }>;
  /** Aggregated statistics and metrics */
  summary: {
    /** Total number of issues */
    totalIssues: number;
    /** Number of open issues */
    openIssues: number;
    /** Number of closed issues */
    closedIssues: number;
    /** Average time to close issues */
    avgTimeToClose: string;
    /** Most active users by contribution count */
    mostActiveUsers: Array<{ user: string; contributions: number }>;
    /** Issue count by state */
    stateBreakdown: Record<string, number>;
    /** Issue count by priority */
    priorityBreakdown: Record<number, number>;
    /** Most used labels */
    labels: Array<{ name: string; count: number }>;
    /** Time-based metrics */
    timeStats: {
      /** Average time to first response */
      avgTimeToFirstResponse: string;
      /** Average time from creation to completion */
      avgCycleTime: string;
      /** Issues closed per day */
      issueVelocity: number;
      /** Average number of comments per issue */
      avgCommentsPerIssue: number;
      /** Average number of labels per issue */
      avgLabelsPerIssue: number;
      /** Percentage of issues that are completed */
      completionRate: number;
      /** Percentage of issues that were reopened */
      reopenRate: number;
    };
    /** Activity patterns */
    activity: {
      /** Issue and comment count by day */
      dailyActivity: Record<string, number>;
      /** Issue and comment count by week */
      weeklyActivity: Record<string, number>;
      /** Day with most activity */
      peakActivityDay: string;
      /** Hour with most activity (0-23) */
      peakActivityHour: number;
    };
    /** Collaboration metrics */
    collaboration: {
      /** Number of unique contributors */
      uniqueContributors: number;
      /** Average number of contributors per issue */
      avgContributorsPerIssue: number;
      /** Number of unique email domains */
      crossTeamCollaboration: number;
    };
  };
}

/**
 * Service for interacting with the Linear API
 */
export class LinearService {
  private client: LinearClient;
  private teamId?: string;

  /**
   * Creates a new Linear service instance
   * @param config - Configuration options
   */
  constructor(config: LinearConfig) {
    this.client = new LinearClient({ apiKey: config.token });
    this.teamId = config.teamId;
  }

  /**
   * Fetches issues and generates summary statistics
   * @param options - Fetch options
   * @returns Promise resolving to issues and summary data
   */
  async fetchData(options: FetchOptions = {}): Promise<LinearData> {
    const issues = await this.fetchIssues(options);
    const summary = this.generateSummary(issues);

    return {
      issues,
      summary,
    };
  }

  private async fetchIssues(options: FetchOptions) {
    try {
      console.log('Fetching issues with options:', options);

      // Get the team first
      const teamId = options.teamId || this.teamId;
      if (!teamId) {
        throw new Error('Team ID is required');
      }

      console.log('Fetching team:', teamId);
      const team = await this.client.team(teamId);
      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      // Build query parameters
      const queryVariables: Record<string, unknown> = {
        first: options.limit || 100,
      };

      // Build filter object
      const filter: Record<string, unknown> = {};

      // Add filters
      if (options.state && options.state !== 'all') {
        filter.state = { name: { eq: options.state.toUpperCase() } };
      }

      if (options.since || options.until) {
        const updatedAt: Record<string, string> = {};
        if (options.since) {
          updatedAt.gte = (
            options.since instanceof Date
              ? options.since
              : new Date(options.since)
          ).toISOString();
        }
        if (options.until) {
          updatedAt.lte = (
            options.until instanceof Date
              ? options.until
              : new Date(options.until)
          ).toISOString();
        }
        filter.updatedAt = updatedAt;
      }

      if (options.assignee) {
        filter.assignee = { name: { eq: options.assignee } };
      }

      if (options.author) {
        filter.creator = { name: { eq: options.author } };
      }

      if (options.priority !== undefined) {
        filter.priority = { eq: options.priority };
      }

      if (options.label) {
        filter.labels = { name: { eq: options.label } };
      }

      if (options.search) {
        filter.or = [
          { title: { contains: options.search } },
          { description: { contains: options.search } },
        ];
      }

      // Only add filter if we have any conditions
      if (Object.keys(filter).length > 0) {
        queryVariables.filter = filter;
      }

      // Add sorting
      if (options.sortBy) {
        queryVariables.orderBy =
          options.sortBy +
          '_' +
          (options.sortDirection?.toUpperCase() || 'DESC');
      }

      // Fetch issues for the team
      console.log('Fetching issues for team:', team.name);
      const issues = await team.issues(queryVariables);

      console.log(`Found ${issues.nodes.length} issues`);

      // Transform issues into our format
      return Promise.all(
        issues.nodes.map(async (issue: Issue) => {
          // Get user display names safely
          const getDisplayName = (user: User | null | undefined) => {
            if (!user) return 'Unknown';
            return user.name || user.email || user.displayName || 'Unknown';
          };

          // Get related data
          const [state, assignee, creator, labels, comments] =
            await Promise.all([
              issue.state,
              issue.assignee,
              issue.creator,
              issue.labels(),
              issue.comments(),
            ]);

          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description || '',
            state: (state as WorkflowState)?.name || 'Unknown',
            priority: issue.priority || 0,
            assignee: assignee ? getDisplayName(assignee as User) : null,
            creator: getDisplayName(creator as User),
            createdAt: issue.createdAt.toISOString(),
            updatedAt: issue.updatedAt.toISOString(),
            completedAt: issue.completedAt
              ? issue.completedAt.toISOString()
              : null,
            labels: (labels?.nodes || []).map(
              (label: IssueLabel) => label.name
            ),
            comments: await Promise.all(
              (comments?.nodes || []).map(async (comment: Comment) => {
                const commentUser = await comment.user;
                return {
                  author: getDisplayName(commentUser as User),
                  body: comment.body,
                  createdAt: comment.createdAt.toISOString(),
                  updatedAt: comment.updatedAt.toISOString(),
                };
              })
            ),
          };
        })
      );
    } catch (error) {
      console.error('Error fetching Linear issues:', error);
      throw error;
    }
  }

  private generateSummary(issues: LinearData['issues']): LinearData['summary'] {
    // Basic statistics
    const totalIssues = issues.length;
    const openIssues = issues.filter(
      (issue) => issue.state.toLowerCase() === 'open'
    ).length;
    const closedIssues = issues.filter(
      (issue) => issue.state.toLowerCase() === 'closed'
    ).length;

    // State breakdown
    const stateBreakdown = issues.reduce(
      (acc, issue) => {
        acc[issue.state] = (acc[issue.state] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Priority breakdown
    const priorityBreakdown = issues.reduce(
      (acc, issue) => {
        acc[issue.priority] = (acc[issue.priority] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    // Label statistics
    const labelCounts = new Map<string, number>();
    issues.forEach((issue) => {
      issue.labels.forEach((label) => {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      });
    });

    const labels = Array.from(labelCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 labels

    // Time-based statistics
    const closedIssueTimes = issues
      .filter((issue) => issue.completedAt)
      .map((issue) => {
        const created = new Date(issue.createdAt);
        const completed = new Date(issue.completedAt!);
        return completed.getTime() - created.getTime();
      });

    const avgTimeToClose = closedIssueTimes.length
      ? this.formatDuration(
          closedIssueTimes.reduce((a, b) => a + b, 0) / closedIssueTimes.length
        )
      : 'N/A';

    // Calculate first response times
    const firstResponseTimes = issues
      .filter((issue) => issue.comments.length > 0)
      .map((issue) => {
        const created = new Date(issue.createdAt);
        const firstComment = new Date(issue.comments[0].createdAt);
        return firstComment.getTime() - created.getTime();
      });

    const avgTimeToFirstResponse = firstResponseTimes.length
      ? this.formatDuration(
          firstResponseTimes.reduce((a, b) => a + b, 0) /
            firstResponseTimes.length
        )
      : 'N/A';

    // Calculate cycle time (time from creation to completion)
    const cycleTimes = issues
      .filter((issue) => issue.completedAt)
      .map((issue) => {
        const created = new Date(issue.createdAt);
        const completed = new Date(issue.completedAt!);
        return completed.getTime() - created.getTime();
      });

    const avgCycleTime = cycleTimes.length
      ? this.formatDuration(
          cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        )
      : 'N/A';

    // Calculate issue velocity (issues closed per day)
    const timeRange =
      issues.length > 0
        ? (new Date(issues[0].createdAt).getTime() -
            new Date(issues[issues.length - 1].createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
        : 0;
    const issueVelocity =
      timeRange > 0 ? +(closedIssues / timeRange).toFixed(1) : 0;

    // User statistics
    const userContributions = new Map<string, number>();
    issues.forEach((issue) => {
      // Count issue creation
      userContributions.set(
        issue.creator,
        (userContributions.get(issue.creator) || 0) + 1
      );

      // Count comments
      issue.comments.forEach((comment) => {
        userContributions.set(
          comment.author,
          (userContributions.get(comment.author) || 0) + 1
        );
      });
    });

    const mostActiveUsers = Array.from(userContributions.entries())
      .map(([user, contributions]) => ({ user, contributions }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 5); // Top 5 users

    // Calculate additional time-based statistics
    const avgCommentsPerIssue =
      issues.reduce((sum, issue) => sum + issue.comments.length, 0) /
        issues.length || 0;
    const avgLabelsPerIssue =
      issues.reduce((sum, issue) => sum + issue.labels.length, 0) /
        issues.length || 0;

    // Calculate completion and reopen rates
    const completedIssues = issues.filter((issue) => issue.completedAt).length;
    const completionRate = (completedIssues / totalIssues) * 100;

    // Assuming an issue is reopened if it has multiple state transitions to 'open'
    const reopenedIssues = issues.filter((issue) => {
      const stateChanges = issue.comments.filter((comment) =>
        comment.body.toLowerCase().includes('changed state to')
      ).length;
      return stateChanges > 1;
    }).length;
    const reopenRate = (reopenedIssues / totalIssues) * 100;

    // Activity patterns
    const dailyActivity: Record<string, number> = {};
    const weeklyActivity: Record<string, number> = {};
    const hourlyActivity: Record<number, number> = {};

    issues.forEach((issue) => {
      const date = new Date(issue.createdAt);
      const day = date.toISOString().split('T')[0];
      const week = `${date.getFullYear()}-W${Math.ceil((date.getDate() + date.getDay()) / 7)}`;
      const hour = date.getHours();

      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
      weeklyActivity[week] = (weeklyActivity[week] || 0) + 1;
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;

      // Add comment activity
      issue.comments.forEach((comment) => {
        const commentDate = new Date(comment.createdAt);
        const commentDay = commentDate.toISOString().split('T')[0];
        const commentWeek = `${commentDate.getFullYear()}-W${Math.ceil((commentDate.getDate() + commentDate.getDay()) / 7)}`;
        const commentHour = commentDate.getHours();

        dailyActivity[commentDay] = (dailyActivity[commentDay] || 0) + 1;
        weeklyActivity[commentWeek] = (weeklyActivity[commentWeek] || 0) + 1;
        hourlyActivity[commentHour] = (hourlyActivity[commentHour] || 0) + 1;
      });
    });

    // Find peak activity
    const peakActivityDay =
      Object.entries(dailyActivity).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'N/A';
    const peakActivityHour = parseInt(
      Object.entries(hourlyActivity).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        '0'
    );

    // Estimate cross-team collaboration based on unique domains in email addresses
    const emailUsers = issues
      .flatMap((issue) => [
        issue.creator,
        issue.assignee,
        ...issue.comments.map((comment) => comment.author),
      ])
      .filter(
        (user): user is string => typeof user === 'string' && user.includes('@')
      );

    const crossTeamCollaboration = new Set(
      emailUsers.map((email) => email.split('@')[1])
    ).size;

    return {
      totalIssues,
      openIssues,
      closedIssues,
      avgTimeToClose,
      mostActiveUsers,
      stateBreakdown,
      priorityBreakdown,
      labels,
      timeStats: {
        avgTimeToFirstResponse,
        avgCycleTime,
        issueVelocity,
        avgCommentsPerIssue,
        avgLabelsPerIssue,
        completionRate,
        reopenRate,
      },
      activity: {
        dailyActivity,
        weeklyActivity,
        peakActivityDay,
        peakActivityHour,
      },
      collaboration: {
        uniqueContributors: crossTeamCollaboration,
        avgContributorsPerIssue: crossTeamCollaboration / totalIssues,
        crossTeamCollaboration,
      },
    };
  }

  private formatDuration(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
  }
}
