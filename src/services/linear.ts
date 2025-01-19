import { LinearClient } from '@linear/sdk';

export interface LinearConfig {
  token: string;
  teamId?: string;
}

export interface FetchOptions {
  since?: string | Date;
  until?: string | Date;
  teamId?: string;
  assignee?: string;
  state?: 'open' | 'closed' | 'all';
}

export interface LinearData {
  issues: Array<{
    id: string;
    identifier: string;
    title: string;
    description: string;
    state: string;
    priority: number;
    assignee: string | null;
    creator: string;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    labels: string[];
    comments: Array<{
      author: string;
      body: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
  summary: {
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    avgTimeToClose: string;
    mostActiveUsers: Array<{ user: string; contributions: number }>;
    stateBreakdown: {
      [state: string]: number;
    };
    priorityBreakdown: {
      [priority: number]: number;
    };
    labels: Array<{ name: string; count: number }>;
    timeStats: {
      avgTimeToFirstResponse: string;
      avgCycleTime: string;
      issueVelocity: number; // Issues closed per day
    };
  };
}

export class LinearService {
  private client: LinearClient;
  private teamId?: string;

  constructor(config: LinearConfig) {
    this.client = new LinearClient({ apiKey: config.token });
    this.teamId = config.teamId;
  }

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

      // Build filter conditions
      const filter: Record<string, any> = {};

      if (options.state && options.state !== 'all') {
        filter.state = { name: { eq: options.state.toUpperCase() } };
      }

      // Fetch issues for the team
      console.log('Fetching issues for team:', team.name);
      const issues = await team.issues();
      console.log(`Found ${issues.nodes.length} issues`);

      // Transform issues into our format
      return Promise.all(
        issues.nodes.map(async (issue) => {
          // Get user display names safely
          const getDisplayName = (user: any) => {
            if (!user) return 'Unknown';
            return user.name || user.email || 'Unknown';
          };

          // Get related data
          const [state, assignee, creator] = await Promise.all([
            issue.state,
            issue.assignee,
            issue.creator,
          ]);

          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description || '',
            state: state?.name || 'Unknown',
            priority: issue.priority || 0,
            assignee: assignee ? getDisplayName(assignee) : null,
            creator: getDisplayName(creator),
            createdAt: new Date(issue.createdAt).toISOString(),
            updatedAt: new Date(issue.updatedAt).toISOString(),
            completedAt: issue.completedAt
              ? new Date(issue.completedAt).toISOString()
              : null,
            labels: [], // We'll fetch these separately if needed
            comments: [], // We'll fetch these separately if needed
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
