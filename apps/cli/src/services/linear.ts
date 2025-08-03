import { LinearClient } from '@linear/sdk';
import { ConfigManager } from '../utils/config';

/**
 * Configuration options for the Linear service
 */
export interface LinearConfig {
  apiKey: string;
  teamId: string;
  defaults: {
    person: {
      identifier: string;
    };
  };
}

/**
 * Options for fetching issues from Linear
 */
export interface FetchOptions {
  timeframe: string;
}

/**
 * Data type for a Linear issue
 */
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  state: {
    name: string;
    type: string;
  };
  priority: number;
  labels: {
    nodes: Array<{
      name: string;
    }>;
  };
  cycle?: {
    id: string;
    number: number;
    startsAt: string;
    endsAt: string;
  };
}

/**
 * Data type for a Linear summary
 */
export interface LinearSummary {
  issues: LinearIssue[];
  activeIssues: LinearIssue[];
}

/**
 * Data type for the response from fetching Linear issues
 */
export interface LinearIssueResponse {
  issues: LinearIssue[];
  activeIssues: LinearIssue[];
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
   * Validate Linear user identifier - strict mode
   * @param authorOverride - Author provided by user (overrides config)
   * @returns Linear email or undefined (falls back to config)
   */
  private validateLinearUser(authorOverride?: string): string | undefined {
    if (!authorOverride) {
      // No override provided, use config default
      return undefined;
    }

    // User provided an override - it must be a valid email format for cross-service compatibility
    if (!authorOverride.includes('@')) {
      throw new Error(
        `Invalid author identifier: "${authorOverride}". ` +
          `When using --author flag, you must provide an EMAIL ADDRESS that works across all services:\n` +
          `  - Linear: requires email addresses (e.g., user@company.com)\n` +
          `  - GitHub: can use email or username, but email ensures consistency\n\n` +
          `Use an email address instead of GitHub username for cross-service compatibility.`
      );
    }

    return authorOverride;
  }

  /**
   * Fetches issues and generates summary statistics
   * @param options - Optional filtering options
   * @returns Promise resolving to summary data
   */
  async fetchData(options: { assignee?: string } = {}) {
    try {
      const data = await this.fetchIssues(this.timeframe, options);
      return data;
    } catch (error) {
      console.error('Error fetching Linear issues:', error);
      throw error;
    }
  }

  private async fetchIssues(
    timeframe: string,
    options: { assignee?: string } = {}
  ): Promise<LinearIssueResponse> {
    const { startDate: since, endDate: until } =
      this.configManager.parseTimeframe(timeframe);
    const personIdentifier =
      this.validateLinearUser(options.assignee) ??
      this.configManager.get('linear.defaults.person.identifier');

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
              id
              identifier
              title
              state {
                name
                type
              }
              priority
              labels {
                nodes {
                  name
                }
              }
              cycle {
                id
                number
                startsAt
                endsAt
              }
            }
          }
        }
        activeIssues: team(id: $teamId) {
          issues(
            filter: {
              assignee: { email: { eq: "${personIdentifier}" } }
              and: [
                { state: { type: { in: ["started", "unstarted"] } } },
                { state: { name: { nin: ["Merged", "Canceled", "Done"] } } }
              ]
            },
            first: 50
          ) {
            nodes {
              id
              identifier
              title
              state {
                name
                type
              }
              priority
              labels {
                nodes {
                  name
                }
              }
              cycle {
                id
                number
                startsAt
                endsAt
              }
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
            nodes: LinearIssue[];
          };
        };
        activeIssues: {
          issues: {
            nodes: LinearIssue[];
          };
        };
      },
      { teamId: string }
    >(query, variables);

    if (!response.data) {
      throw new Error('No data returned from Linear API');
    }

    return {
      issues: response.data.team.issues.nodes,
      activeIssues: response.data.activeIssues.issues.nodes,
    };
  }
}
