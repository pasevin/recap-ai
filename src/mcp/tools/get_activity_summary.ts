import { createGitHubService } from '../../services/service_factory.js';
import { LinearService } from '../../services/linear.js';
import { OpenAIService } from '../../services/openai.js';
import { config } from '../../utils/config.js';
import { RecapAITool, ActivitySummaryArgs, TimeRange } from '../types.js';
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
        pattern: '^[^/]+/[^/]+$',
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
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Start date in YYYY-MM-DD format (overrides timeframe)',
      },
      until: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'End date in YYYY-MM-DD format (overrides timeframe)',
      },
    },
  },
  handler: async (args: ActivitySummaryArgs) => {
    try {
      // Validate author parameters - both or neither must be provided
      const hasGithubAuthor = !!args.authorGithub;
      const hasLinearAuthor = !!args.authorLinear;

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
      const timeframe = args.timeframe || '1w';

      if (args.since && args.until) {
        since = new Date(args.since);
        until = new Date(args.until);
      } else {
        // Use timeframe calculation from config
        const timeRange = calculateTimeRange(timeframe);
        since = timeRange.startDate;
        until = timeRange.endDate;
      }

      // Collect all activity data
      const activityData: any = {};

      // GitHub data (if repository specified or configured)
      if (args.repository || config.get('github.defaults.repository')) {
        const repo =
          args.repository || config.get('github.defaults.repository');

        if (!repo) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'No repository specified and no default repository configured'
          );
        }

        const [owner, repoName] = repo.split('/');
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
                author: args.authorGithub,
                includePRs: true,
                includeIssues: true,
                includeReviews: true,
              }
            );

            activityData.github = {
              commits: githubData.commits,
              pullRequests: githubData.pullRequests,
              issues: githubData.issues,
              statistics: githubData.statistics,
            };
          } else {
            // Fallback to basic service
            const githubData = await githubService.fetchData({
              since,
              until,
              author: args.authorGithub,
            });

            activityData.github = githubData;
          }
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch GitHub data: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Linear data (if configured)
      const linearToken = config.get('linear.token');
      const teamId = config.get('linear.defaults.teamId');
      if (linearToken && teamId) {
        try {
          const linearService = new LinearService(
            linearToken,
            teamId,
            timeframe
          );
          const linearData = await linearService.fetchData({
            assignee: args.authorLinear,
          });

          activityData.linear = {
            issues: linearData.issues,
            activeIssues: linearData.activeIssues,
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
        const summary = await openaiService.generateActivitySummary(
          activityData,
          timeframe,
          true // enhanced formatting
        );

        return {
          timeframe,
          period: {
            since: since?.toISOString(),
            until: until?.toISOString(),
          },
          summary,
          metadata: {
            generated_at: new Date().toISOString(),
            sources: Object.keys(activityData),
            repository: args.repository,
            authorGithub: args.authorGithub,
            authorLinear: args.authorLinear,
          },
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
