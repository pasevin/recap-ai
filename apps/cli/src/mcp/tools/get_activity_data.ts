import { createGitHubService } from '../../services/service_factory.js';
import { LinearService } from '../../services/linear.js';
import { config } from '../../utils/config.js';
import { RecapAITool, ActivityDataArgs, ActivityResult } from '../types.js';
import {
  GitHubIssue,
  GitHubPullRequest,
} from '../../interfaces/github-types.js';
import { EnhancedCommitData } from '../../interfaces/activity.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const getActivityDataTool: RecapAITool = {
  name: 'get_activity_data',
  description:
    'Retrieves detailed activity data from specified sources (GitHub, Linear) within a given timeframe.',
  inputSchema: {
    type: 'object',
    properties: {
      repository: {
        type: 'string',
        description: 'GitHub repository in "owner/repo" format.',
      },
      timeframe: {
        type: 'string',
        description: 'Timeframe for activity (e.g., "1d", "1w", "1m", "1y").',
        enum: ['1d', '1w', '1m', '1y'],
        default: '1w',
      },
      authorGithub: {
        type: 'string',
        description: 'GitHub username to filter activity by.',
      },
      authorLinear: {
        type: 'string',
        description: 'Linear user ID or email to filter activity by.',
      },
      since: {
        type: 'string',
        description: 'Start date for activity (ISO 8601).',
      },
      until: {
        type: 'string',
        description: 'End date for activity (ISO 8601).',
      },
      format: {
        type: 'string',
        enum: ['enhanced', 'basic'],
        default: 'basic',
        description:
          'Format of the activity data (enhanced includes more details).',
      },
    },
    required: ['timeframe'],
  },
  handler: async (args: Record<string, unknown>) => {
    try {
      const typedArgs = args as ActivityDataArgs;
      let since: Date | undefined;
      let until: Date | undefined;
      const timeframe = typedArgs.timeframe ?? '1w';
      const format = typedArgs.format ?? 'basic';

      if (typedArgs.since) {
        since = new Date(typedArgs.since);
      }
      if (typedArgs.until) {
        until = new Date(typedArgs.until);
      }

      if (!since || !until) {
        const timeRange = config.parseTimeframe(timeframe);
        since = timeRange.startDate;
        until = timeRange.endDate;
      }

      const result: ActivityResult = {
        timeframe,
        period: {
          since: since?.toISOString(),
          until: until?.toISOString(),
        },
        metadata: {
          generated_at: new Date().toISOString(),
          sources: [],
          repository: typedArgs.repository,
          authorGithub: typedArgs.authorGithub,
          authorLinear: typedArgs.authorLinear,
          format,
        },
      };

      const githubToken = config.get('github.token') as string;
      const linearToken = config.get('linear.token') as string;

      if (githubToken) {
        result.metadata.sources?.push('github');
        const githubService = createGitHubService();
        const githubOwner =
          typedArgs.repository?.split('/')[0] ??
          (config.get('github.defaults.owner') as string);
        const githubRepo =
          typedArgs.repository?.split('/')[1] ??
          (config.get('github.defaults.repository') as string);

        if (githubOwner && githubRepo) {
          // Use enhanced service if available
          if ('fetchEnhancedRepositoryData' in githubService) {
            const githubData = await githubService.fetchEnhancedRepositoryData(
              githubOwner,
              githubRepo,
              {
                since,
                until,
                author: typedArgs.authorGithub,
                includePRs: true,
                includeIssues: true,
                includeReviews: false, // Skip reviews for performance
              }
            );

            result.data = result.data ?? {};
            result.data.github = {
              commits: githubData.commits.map((c: EnhancedCommitData) => ({
                sha: c.commit.sha,
                message:
                  c.commit.commit?.message ?? c.commit.message ?? 'No message',
                author:
                  c.commit.author?.login ??
                  c.commit.commit?.author?.name ??
                  'Unknown',
                date:
                  c.commit.commit?.author?.date ??
                  c.commit.date ??
                  new Date().toISOString(),
                repository: `${githubOwner}/${githubRepo}`,
              })),
              pullRequests: githubData.pullRequests.map(
                (pr: GitHubPullRequest) => ({
                  number: pr.number,
                  title: pr.title,
                  state: pr.state,
                  author: pr.user?.login ?? 'Unknown',
                  createdAt: pr.created_at,
                  repository: `${githubOwner}/${githubRepo}`,
                })
              ),
              issues: githubData.issues.map((issue: GitHubIssue) => ({
                number: issue.number,
                title: issue.title,
                state: issue.state,
                author: issue.user?.login ?? 'Unknown',
                createdAt: issue.created_at,
                repository: `${githubOwner}/${githubRepo}`,
              })),
              statistics: {
                totalCommits: githubData.statistics.totalCommits,
                totalPRs: githubData.statistics.totalPRs,
                totalIssues: githubData.statistics.totalIssues,
                topContributors: githubData.statistics.topContributors.map(
                  (c: { author: string; count: number }) => ({
                    author: c.author,
                    count: c.count,
                  })
                ),
              },
            };
          }
        }
      }

      if (linearToken) {
        result.metadata.sources?.push('linear');
        const teamId = config.get('linear.defaults.teamId') as string;

        if (teamId) {
          const linearService = new LinearService(
            linearToken,
            teamId,
            timeframe
          );
          const linearData = await linearService.fetchData({
            assignee: typedArgs.authorLinear,
          });

          result.data = result.data ?? {};
          result.data.linear = {
            issues: linearData.issues.map((issue) => ({
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              state: (issue as { state: { name: string } }).state.name,
              assignee:
                (issue as { assignee?: { name?: string } }).assignee?.name ??
                undefined,
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
        }
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get activity data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
};
