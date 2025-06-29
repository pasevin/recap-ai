import { Command, Flags } from '@oclif/core';
import { config } from '../utils/config';
import { GitHubService } from '../services/github';
import { LinearService } from '../services/linear';
import { OpenAIService, ActivityData } from '../services/openai';
import { createGitHubService } from '../services/service_factory';
import ora from 'ora';

export default class Summarize extends Command {
  static description = 'Generate an AI summary of GitHub and Linear activity';

  static examples = [
    '<%= config.bin %> summarize',
    '<%= config.bin %> summarize --since 2024-01-01 --until 2024-01-31',
    '<%= config.bin %> summarize --author "John Doe"',
    '<%= config.bin %> summarize --enhanced  # Use enhanced GitHub MCP data for better context',
  ];

  static flags = {
    since: Flags.string({
      char: 's',
      description:
        'Start date (YYYY-MM-DD). If not provided, uses default timeframe from config',
      required: false,
    }),
    until: Flags.string({
      char: 'u',
      description:
        'End date (YYYY-MM-DD). If not provided, uses default timeframe from config',
      required: false,
    }),
    author: Flags.string({
      char: 'a',
      description: 'Filter by author',
    }),
    format: Flags.string({
      char: 'f',
      description: 'Output format (text/json)',
      options: ['text', 'json'],
      default: 'text',
    }),
    enhanced: Flags.boolean({
      char: 'e',
      description:
        'Use enhanced GitHub MCP data for more comprehensive summaries',
      default: false,
    }),
    repo: Flags.string({
      char: 'r',
      description: 'Repository in the format owner/repo',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Summarize);

    // Get the default timeframe once
    const defaultTimeframe = config.get('github.defaults.timeframe') || '1w';

    // Get GitHub info once
    const githubOwner = config.get('github.owner');
    const githubRepo = config.get('github.repo');
    const githubUser = config.get('github.defaults.person.identifier');

    // Initialize services
    const linearService = new LinearService(
      config.get('linear.token'),
      config.get('linear.defaults.teamId'),
      defaultTimeframe
    );
    const openaiService = new OpenAIService(config);

    // Calculate date range based on flags or default timeframe
    let since: Date;
    let until: Date;

    if (flags.since && flags.until) {
      since = new Date(flags.since);
      until = new Date(flags.until);
    } else {
      // Use default timeframe from config
      const { startDate, endDate } = config.parseTimeframe(defaultTimeframe);
      since = startDate;
      until = endDate;
    }

    // Set time to start/end of day
    since.setUTCHours(0, 0, 0, 0);
    until.setUTCHours(23, 59, 59, 999);

    // Calculate timeframe for the summary
    const days = Math.ceil(
      (until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeframe = `the past ${days} days`;

    console.log(`\nGenerating activity summary for ${timeframe}...\n`);

    try {
      let activityData: ActivityData;

      // Check if we have a repo specified
      if (!flags.repo && flags.author) {
        // User activity mode - search across all repositories
        const mcpService = createGitHubService(flags.enhanced);
        if (mcpService) {
          const spinner = ora(
            `Fetching activity for user ${flags.author}...`
          ).start();
          this.log(
            '\nUsing GitHub MCP Service for user activity search' +
              (flags.enhanced ? ' (Enhanced)' : '')
          );

          let activity;
          if (flags.enhanced && 'fetchEnhancedUserActivity' in mcpService) {
            await mcpService.connect();
            activity = await mcpService.fetchEnhancedUserActivity(
              flags.author,
              since,
              until
            );
          } else {
            await mcpService.connect();
            activity = await mcpService.searchUserActivity(
              flags.author,
              since,
              until
            );
          }

          spinner.stop();

          // Transform user activity to ActivityData format
          if (flags.enhanced && activity.pullRequests?.enhancedItems) {
            // Use enhanced data
            activityData = {
              github: {
                commits: [], // User activity doesn't include commits directly
                pullRequests: activity.pullRequests.enhancedItems.map(
                  (pr: any) => ({
                    title: pr.title,
                    state: pr.state,
                    createdAt: pr.created_at,
                    mergedAt: pr.merged_at || undefined,
                    author: pr.user?.login || 'Unknown',
                    url: pr.html_url,
                    labels: pr.labels?.map((l: any) =>
                      typeof l === 'string' ? l : l.name
                    ),
                    body: pr.body,
                    enhancedData: pr.enhancedData,
                  })
                ),
                issues: activity.issues.enhancedItems.map((issue: any) => ({
                  title: issue.title,
                  state: issue.state,
                  createdAt: issue.created_at,
                  closedAt: issue.closed_at || undefined,
                  author: issue.user?.login || 'Unknown',
                  url: issue.html_url,
                  labels: issue.labels?.map((l: any) =>
                    typeof l === 'string' ? l : l.name
                  ),
                  body: issue.body,
                  enhancedData: issue.enhancedData,
                })),
                statistics: activity.summary,
              },
              linear: {
                issues: [],
                activeIssues: 0,
              },
            };
          } else {
            // Use basic data
            let issuesData = [];
            if (activity.issues && activity.issues.content) {
              try {
                if (
                  Array.isArray(activity.issues.content) &&
                  activity.issues.content[0]?.text
                ) {
                  issuesData = JSON.parse(activity.issues.content[0].text);
                } else if (typeof activity.issues.content === 'string') {
                  issuesData = JSON.parse(activity.issues.content);
                }
              } catch (error) {
                console.error('Error parsing issues data:', error);
              }
            }

            activityData = {
              github: {
                commits: [],
                pullRequests:
                  issuesData.items
                    ?.filter((item: any) => item.pull_request)
                    .map((pr: any) => ({
                      title: pr.title,
                      state: pr.state,
                      createdAt: pr.created_at,
                      mergedAt: pr.pull_request?.merged_at || undefined,
                      author: pr.user?.login || 'Unknown',
                      url: pr.html_url,
                    })) || [],
                issues:
                  issuesData.items
                    ?.filter((item: any) => !item.pull_request)
                    .map((issue: any) => ({
                      title: issue.title,
                      state: issue.state,
                      createdAt: issue.created_at,
                      closedAt: issue.closed_at || undefined,
                      author: issue.user?.login || 'Unknown',
                      url: issue.html_url,
                    })) || [],
              },
              linear: {
                issues: [],
                activeIssues: 0,
              },
            };
          }

          // Disconnect from MCP server
          await mcpService.disconnect();
        } else {
          throw new Error(
            'User activity search requires MCP to be configured. Please set github.mcp.url'
          );
        }
      } else {
        // Repository-specific mode (original behavior)
        if (!flags.repo) {
          throw new Error(
            'Repository is required when not searching for user activity. Use --repo owner/repo or --author username'
          );
        }

        // Check if we should use MCP enhanced data
        const mcpService = createGitHubService(flags.enhanced);

        if (mcpService && githubOwner && githubRepo) {
          console.log(
            'Using GitHub MCP Service' +
              (flags.enhanced ? ' (Enhanced)' : '') +
              ' for data collection...'
          );

          await mcpService.connect();

          if (flags.enhanced && 'fetchEnhancedRepositoryData' in mcpService) {
            // Use enhanced MCP data
            const enhancedData = await mcpService.fetchEnhancedRepositoryData(
              githubOwner,
              githubRepo,
              since,
              until,
              undefined,
              githubUser || flags.author
            );

            // Transform enhanced data to ActivityData format
            activityData = {
              github: {
                commits: enhancedData.commits.map((ec) => ({
                  sha: ec.commit.sha,
                  message: ec.commit.commit?.message || ec.commit.message,
                  date: ec.commit.commit?.author?.date || ec.commit.date,
                  author:
                    ec.commit.author?.login ||
                    ec.commit.commit?.author?.name ||
                    'Unknown',
                  files: ec.files?.map((f: any) => ({
                    filename: f.filename,
                    additions: f.additions,
                    deletions: f.deletions,
                    changes: f.changes,
                  })),
                  pullRequest: ec.pullRequest
                    ? {
                        number: ec.pullRequest.number,
                        title: ec.pullRequest.title,
                        state: ec.pullRequest.state,
                        reviews: ec.reviews?.map((r: any) => ({
                          state: r.state,
                          author: r.user?.login || 'Unknown',
                        })),
                      }
                    : undefined,
                })),
                pullRequests: enhancedData.pullRequests.map((pr) => ({
                  title: pr.title,
                  state: pr.state,
                  createdAt: pr.created_at,
                  mergedAt: pr.merged_at || undefined,
                  author: pr.user?.login || 'Unknown',
                  url: pr.html_url,
                  labels: pr.labels?.map((l: any) =>
                    typeof l === 'string' ? l : l.name
                  ),
                  reviewComments: pr.review_comments,
                  comments: pr.comments,
                })),
                issues: enhancedData.issues.map((issue) => ({
                  title: issue.title,
                  state: issue.state,
                  createdAt: issue.created_at,
                  closedAt: issue.closed_at || undefined,
                  author: issue.user?.login || 'Unknown',
                  url: issue.html_url,
                  labels: issue.labels?.map((l: any) =>
                    typeof l === 'string' ? l : l.name
                  ),
                })),
                statistics: enhancedData.statistics,
              },
              linear: {
                issues: [],
                activeIssues: 0,
              },
            };
          } else {
            // Use basic MCP data
            const commitsResponse = await mcpService.listCommits(
              githubOwner,
              githubRepo,
              since,
              until,
              undefined,
              githubUser || flags.author
            );

            // Parse the commits response
            let commits = [];
            if (
              Array.isArray(commitsResponse?.content) &&
              commitsResponse.content[0]?.text
            ) {
              commits = JSON.parse(commitsResponse.content[0].text);
            }

            // Transform to ActivityData format
            activityData = {
              github: {
                commits: commits.map((commit: any) => ({
                  sha: commit.sha,
                  message: commit.commit?.message || '',
                  date: commit.commit?.author?.date || '',
                  author:
                    commit.author?.login ||
                    commit.commit?.author?.name ||
                    'Unknown',
                })),
                pullRequests: [],
              },
              linear: {
                issues: [],
                activeIssues: 0,
              },
            };
          }

          await mcpService.disconnect();
        } else {
          // Fallback to traditional GitHub API
          const githubService = new GitHubService({
            token: config.get('github.token'),
            owner: githubOwner,
            repo: githubRepo,
          });

          const githubData = await githubService.fetchData({
            since: since.toISOString(),
            until: until.toISOString(),
            author: githubUser || flags.author,
          });

          activityData = {
            github: {
              commits: githubData.commits.map((commit) => ({
                sha: commit.sha,
                message: commit.message,
                date: commit.date,
                author: commit.author,
              })),
              pullRequests: githubData.pullRequests.map((pr) => ({
                title: pr.title,
                state: pr.state,
                createdAt: pr.createdAt,
                mergedAt: pr.mergedAt || undefined,
                author: pr.author,
                url: `https://github.com/${githubOwner}/${githubRepo}/pull/${pr.number}`,
              })),
            },
            linear: {
              issues: [],
              activeIssues: 0,
            },
          };
        }
      }

      // Fetch Linear data
      const linearData = await linearService.fetchData();
      activityData.linear = {
        issues: linearData.issues,
        activeIssues: linearData.activeIssues,
      };

      // Generate summary with enhanced context if available
      const summary = await openaiService.generateActivitySummary(
        activityData,
        timeframe,
        flags.enhanced
      );

      if (flags.format === 'json') {
        this.log(JSON.stringify({ summary, data: activityData }, null, 2));
      } else {
        this.log(summary);
      }
    } catch (error) {
      this.error('Failed to generate summary: ' + (error as Error).message);
    }
  }
}
