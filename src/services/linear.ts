import { LinearClient } from '@linear/sdk';
import { ConfigManager } from '../utils/config';

/**
 * Configuration options for the Linear service
 */
export interface LinearConfig {
  /** Linear API token */
  token: string;
  /** Team ID to use as default */
  teamId: string;
  /** Timeframe to filter issues */
  timeframe?: string;
  /** Filter issues by state (e.g., 'open', 'closed', 'all') */
  state?: string;
  /** Filter issues by person */
  person?: {
    /** Person identifier */
    identifier: string;
    /** Include issues created by the person */
    includeCreated?: boolean;
    /** Include issues assigned to the person */
    includeAssigned?: boolean;
    /** Include issues commented by the person */
    includeCommented?: boolean;
    /** Include issues subscribed to by the person */
    includeSubscribed?: boolean;
    /** Include issues mentioned by the person */
    includeMentioned?: boolean;
  };
  /** Maximum number of issues to fetch */
  limit?: number;
}

/**
 * Options for fetching issues from Linear
 */
export interface FetchOptions {
  teamId?: string;
  since?: Date;
  until?: Date;
  state?: string;
  assignee?: string;
  label?: string;
  limit?: number;
  search?: string;
}

// Define interfaces for our data types
interface LinearIssue {
  title: string;
  state: string;
  priority: number;
}

interface LinearSummary {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  stateBreakdown: Record<string, number>;
  priorityBreakdown: Record<number, number>;
}

/**
 * Service for interacting with the Linear API
 */
export class LinearService {
  private client: LinearClient;
  private teamId: string;
  private timeframe: string;
  private configManager: ConfigManager;

  /**
   * Creates a new Linear service instance
   * @param token - Linear API token
   * @param teamId - Team ID to use as default
   * @param timeframe - Timeframe to filter issues
   */
  constructor(token: string, teamId: string, timeframe: string) {
    this.client = new LinearClient({ apiKey: token });
    this.teamId = teamId;
    this.timeframe = timeframe;
    this.configManager = new ConfigManager();
  }

  /**
   * Fetches issues and generates summary statistics
   * @returns Promise resolving to summary data
   */
  async fetchData() {
    try {
      console.log('Fetching issues with options:', {
        teamId: this.teamId,
        timeframe: this.timeframe,
      });

      const issues = await this.fetchIssues(this.timeframe);
      return this.generateSummary(issues);
    } catch (error) {
      console.error('Error fetching Linear issues:', error);
      throw error;
    }
  }

  private async fetchIssues(timeframe: string): Promise<LinearIssue[]> {
    const { startDate: since, endDate: until } =
      this.configManager.parseTimeframe(timeframe);
    const personIdentifier = this.configManager.get(
      'linear.defaults.person.identifier'
    );

    const query = `
      query($teamId: String!) {
        team(id: $teamId) {
          issues(
            filter: {
              createdAt: {
                gte: "${since.toISOString()}",
                lte: "${until.toISOString()}"
              }
              or: [
                { creator: { email: { eq: "${personIdentifier}" } } },
                { assignee: { email: { eq: "${personIdentifier}" } } },
                { subscribers: { some: { email: { eq: "${personIdentifier}" } } } }
              ]
            },
            first: 50
          ) {
            nodes {
              title
              state {
                name
              }
              priority
            }
          }
        }
      }
    `;

    const variables = {
      teamId: this.teamId,
    };

    const response = await this.client.client.rawRequest<
      {
        team: {
          issues: {
            nodes: Array<{
              title: string;
              state: { name: string };
              priority: number;
            }>;
          };
        };
      },
      { teamId: string }
    >(query, variables);

    if (!response.data) {
      throw new Error('No data returned from Linear API');
    }

    const issues = response.data.team.issues;

    // Transform the data
    return issues.nodes.map((issue) => ({
      title: issue.title,
      state: issue.state.name,
      priority: issue.priority || 0,
    }));
  }

  private generateSummary(issues: LinearIssue[]): LinearSummary {
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

    return {
      totalIssues,
      openIssues,
      closedIssues,
      stateBreakdown,
      priorityBreakdown,
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

  private formatActivityData(
    commits: Array<{ message: string; date: string; author: string }>,
    prs: Array<{
      title: string;
      state: string;
      createdAt: string;
      author: string;
    }>,
    issues: LinearIssue[]
  ): string {
    let summary = '';

    if (commits.length > 0) {
      summary += '## Commits\n\n';
      commits.forEach((commit) => {
        summary += `- ${commit.message} (${commit.author} on ${commit.date})\n`;
      });
      summary += '\n';
    }

    if (prs.length > 0) {
      summary += '## Pull Requests\n\n';
      prs.forEach((pr) => {
        summary += `- ${pr.title} (${pr.state}, created by ${pr.author} on ${pr.createdAt})\n`;
      });
      summary += '\n';
    }

    if (issues.length > 0) {
      summary += '## Linear Issues\n\n';
      issues.forEach((issue) => {
        summary += `- ${issue.title} (${issue.state}, Priority: ${issue.priority})\n`;
      });
    }

    return summary;
  }
}
