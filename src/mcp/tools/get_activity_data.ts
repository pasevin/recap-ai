import { createGitHubService } from '../../services/service_factory.js';
import { LinearService } from '../../services/linear.js';
import { config } from '../../utils/config.js';
import { RecapAITool, ActivityDataArgs, TimeRange } from '../types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const getActivityDataTool: RecapAITool = {
  name: 'get_activity_data',
  description:
    'Get raw development activity data from GitHub and Linear for custom analysis',
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
      format: {
        type: 'string',
        enum: ['enhanced', 'basic'],
        description: 'Data collection mode',
        default: 'enhanced',
      },
    },
  },
  handler: async (args: ActivityDataArgs) => {
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

      // Same time calculation logic as summary tool
      let since: Date | undefined;
      let until: Date | undefined;
      const timeframe = args.timeframe || '1w';

      if (args.since && args.until) {
        since = new Date(args.since);
        until = new Date(args.until);
      } else {
        const timeRange = calculateTimeRange(timeframe);
        since = timeRange.startDate;
        until = timeRange.endDate;
      }

      const result: any = {
        timeframe,
        period: {
          since: since?.toISOString(),
          until: until?.toISOString(),
        },
        data: {},
        metadata: {
          collected_at: new Date().toISOString(),
          format: args.format || 'enhanced',
          repository: args.repository,
          authorGithub: args.authorGithub,
          authorLinear: args.authorLinear,
        },
      };

      // GitHub data collection
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

          if ('fetchEnhancedRepositoryData' in githubService) {
            // Use EnhancedGitHubService
            const includeExtras = args.format === 'enhanced';
            result.data.github =
              await githubService.fetchEnhancedRepositoryData(owner, repoName, {
                since,
                until,
                author: args.authorGithub,
                includePRs: true,
                includeIssues: includeExtras,
                includeReviews: includeExtras,
              });
          } else {
            // Use basic GitHubService
            result.data.github = await githubService.fetchData({
              since,
              until,
              author: args.authorGithub,
            });
          }
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch GitHub data: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Linear data collection
      const linearToken = config.get('linear.token');
      const teamId = config.get('linear.defaults.teamId');
      if (linearToken && teamId) {
        try {
          const linearService = new LinearService(
            linearToken,
            teamId,
            timeframe
          );
          result.data.linear = await linearService.fetchData({
            assignee: args.authorLinear,
          });
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch Linear data: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      return result;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch activity data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

// Reuse the time calculation helper
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
      startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}
