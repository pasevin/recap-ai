import { createGitHubService } from '../../services/service_factory.js';
import { LinearService } from '../../services/linear.js';
import { OpenAIService } from '../../services/openai.js';
import { config } from '../../utils/config.js';
import {
  GitHubIssue,
  GitHubPullRequest,
} from '../../interfaces/github-types.js';
import { EnhancedCommitData } from '../../interfaces/activity.js';
import {
  RecapAITool,
  ActivitySummaryArgs,
  TimeRange,
  ActivityData,
} from '../types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const getActivitySummaryTool: RecapAITool = {
  name: 'get_activity_summary',
  description:
    'Get a comprehensive AI-powered summary of development activity combining GitHub and Linear data',
  inputSchema: {
    type: 'object',
    properties: {
      repository: {
        type: 'string',
        description:
          'GitHub repository in format owner/repo (optional, uses config default)',
      },
      timeframe: {
        type: 'string',
        enum: ['1d', '1w', '1m', '1y'],
        description: 'Time period to analyze',
        default: '1w',
      },
      authorGithub: {
        type: 'string',
        description:
          'GitHub username/email for filtering (must be used with authorLinear)',
      },
      authorLinear: {
        type: 'string',
        description:
          'Linear email address for filtering (must be used with authorGithub)',
      },
      since: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (overrides timeframe)',
      },
      until: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (overrides timeframe)',
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    try {
      const typedArgs = args as ActivitySummaryArgs;

      // Validate author parameters - both or neither must be provided
      const hasGithubAuthor = !!typedArgs.authorGithub;
      const hasLinearAuthor = !!typedArgs.authorLinear;

      if (hasGithubAuthor !== hasLinearAuthor) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Author filtering requires both authorGithub and authorLinear parameters. ' +
            'Provide both for cross-service filtering or neither to use default config.'
        );
      }

      // Determine timeframe and dates
      let since: Date | undefined;
      let until: Date | undefined;
      const timeframe = typedArgs.timeframe ?? '1w';

      if (typedArgs.since && typedArgs.until) {
        since = new Date(typedArgs.since);
        until = new Date(typedArgs.until);
      } else {
        // Use timeframe calculation from config
        const timeRange = calculateTimeRange(timeframe);
        since = timeRange.startDate;
        until = timeRange.endDate;
      }

      // Collect all activity data with proper typing
      const activityData: ActivityData = {};

      // GitHub data (if repository specified or configured)
      if (typedArgs.repository ?? config.get('github.defaults.repository')) {
        const repo =
          typedArgs.repository ?? config.get('github.defaults.repository');

        if (!repo) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'No repository specified and no default repository configured'
          );
        }

        const repoParts = (repo as string).split('/');
        const [owner, repoName] = repoParts;
        if (!owner || !repoName) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid repository format. Expected: owner/repo'
          );
        }

        try {
          const githubService = createGitHubService();

          // Check if enhanced service is available
          if ('fetchEnhancedRepositoryData' in githubService) {
            const githubData = await githubService.fetchEnhancedRepositoryData(
              owner,
              repoName,
              {
                since,
                until,
                author: typedArgs.authorGithub,
                includePRs: true,
                includeIssues: true,
                includeReviews: true,
              }
            );

            activityData.github = {
              commits: githubData.commits.map((commit: EnhancedCommitData) => ({
                sha: commit.commit.sha,
                message:
                  commit.commit.commit?.message ??
                  commit.commit.message ??
                  'No message',
                author:
                  commit.commit.author?.login ??
                  commit.commit.commit?.author?.name ??
                  'Unknown',
                date:
                  commit.commit.commit?.author?.date ??
                  commit.commit.date ??
                  new Date().toISOString(),
                repository: `${owner}/${repoName}`,
              })),
              pullRequests: githubData.pullRequests.map(
                (pr: GitHubPullRequest) => ({
                  number: pr.number,
                  title: pr.title,
                  state: pr.state,
                  author: pr.user?.login ?? 'Unknown',
                  createdAt: pr.created_at,
                  repository: `${owner}/${repoName}`,
                })
              ),
              issues: githubData.issues.map((issue: GitHubIssue) => ({
                number: issue.number,
                title: issue.title,
                state: issue.state,
                author: issue.user?.login ?? 'Unknown',
                createdAt: issue.created_at,
                repository: `${owner}/${repoName}`,
              })),
              statistics: githubData.statistics,
            };
          } else {
            // Fallback to basic service (note: basic service may not have issues)
            const githubData = await githubService.fetchData({
              since,
              until,
              author: typedArgs.authorGithub,
            });

            activityData.github = {
              commits: githubData.commits.map(
                (commit: {
                  sha: string;
                  message: string;
                  author: string;
                  date: string;
                }) => ({
                  sha: commit.sha,
                  message: commit.message,
                  author: commit.author,
                  date: commit.date,
                  repository: `${owner}/${repoName}`,
                })
              ),
              pullRequests: githubData.pullRequests.map(
                (pr: {
                  number: number;
                  title: string;
                  state: string;
                  author: string;
                  createdAt: string;
                }) => ({
                  number: pr.number,
                  title: pr.title,
                  state: pr.state,
                  author: pr.author,
                  createdAt: pr.createdAt,
                  repository: `${owner}/${repoName}`,
                })
              ),
              issues: [], // Basic service doesn't include issues
              statistics: {
                totalCommits: githubData.commits.length,
                totalPRs: githubData.pullRequests.length,
                totalIssues: 0,
                topContributors: [],
              },
            };
          }
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch GitHub data: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Linear data (if configured)
      const linearToken = config.get('linear.token') as string;
      const teamId = config.get('linear.defaults.teamId') as string;
      if (linearToken && teamId) {
        try {
          const linearService = new LinearService(
            linearToken,
            teamId,
            timeframe
          );
          const linearData = await linearService.fetchData({
            assignee: typedArgs.authorLinear,
          });

          activityData.linear = {
            issues: linearData.issues.map((issue) => ({
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              state: (issue as { state: { name: string } }).state.name,
              assignee: (issue as { assignee?: { name?: string } }).assignee
                ?.name,
              createdAt: (issue as unknown as { createdAt: string }).createdAt,
            })),
            statistics: {
              totalIssues: linearData.issues.length,
              completedIssues: linearData.issues.filter(
                (issue) => issue.state.type === 'completed'
              ).length,
              topContributors: [], // Linear API doesn't provide this directly
            },
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch Linear data: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Generate AI summary
      try {
        const openaiService = new OpenAIService(config);

        // Convert our MCP ActivityData to OpenAI ActivityData format
        const openaiActivityData: {
          github?: {
            commits: Array<{
              sha: string;
              message: string;
              date: string;
              author: string;
              repository?: string;
            }>;
            pullRequests: Array<{
              title: string;
              state: string;
              createdAt: string;
              mergedAt?: string;
              author: string;
              url: string;
              repository?: string;
              labels?: string[];
            }>;
            issues?: Array<{
              title: string;
              state: string;
              createdAt: string;
              closedAt?: string;
              author: string;
              url: string;
              repository?: string;
              labels?: string[];
            }>;
          };
          linear?: {
            issues: Array<{
              id: string;
              identifier: string;
              title: string;
              state: string;
              assignee?: string;
              createdAt: string;
            }>;
          };
        } = {};

        if (activityData.github) {
          openaiActivityData.github = {
            commits: activityData.github.commits,
            pullRequests: activityData.github.pullRequests.map((pr) => ({
              title: pr.title,
              state: pr.state,
              createdAt: pr.createdAt,
              author: pr.author,
              url: `https://github.com/${pr.repository}/pull/${pr.number}`, // Generate URL
              repository: pr.repository,
            })),
            issues: activityData.github.issues.map((issue) => ({
              title: issue.title,
              state: issue.state,
              createdAt: issue.createdAt,
              author: issue.author,
              url: `https://github.com/${issue.repository}/issues/${issue.number}`, // Generate URL
              repository: issue.repository,
            })),
          };
        }

        if (activityData.linear) {
          // Note: OpenAI service expects a different Linear format, so we skip linear data for now
          // TODO: Adapt Linear data format to match OpenAI service expectations
        }

        const summary = await openaiService.generateActivitySummary(
          openaiActivityData as Parameters<
            typeof openaiService.generateActivitySummary
          >[0],
          timeframe,
          true // enhanced formatting
        );

        return {
          success: true,
          data: {
            timeframe,
            period: {
              since: since?.toISOString(),
              until: until?.toISOString(),
            },
            summary,
            metadata: {
              generated_at: new Date().toISOString(),
              sources: Object.keys(activityData),
              repository: typedArgs.repository,
              authorGithub: typedArgs.authorGithub,
              authorLinear: typedArgs.authorLinear,
            },
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to generate AI summary: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate activity summary: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

// Helper function for time range calculation
function calculateTimeRange(timeframe: string): TimeRange {
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);

  switch (timeframe) {
    case '1d':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '1w':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '1m':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7); // default to 1 week
  }

  return { startDate, endDate };
}
