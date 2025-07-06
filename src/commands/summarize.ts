import { Command, Flags } from '@oclif/core';
import { config } from '../utils/config';
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
    '<%= config.bin %> summarize --repo owner/repo  # Override default repository',
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
    repo: Flags.string({
      char: 'r',
      description: 'Repository in the format owner/repo',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Summarize);

    // Get the default timeframe once
    const defaultTimeframe = config.get('github.defaults.timeframe') || '1w';

    // Parse repo flag if provided
    let githubOwner = config.get('github.owner');
    let githubRepo = config.get('github.repo');

    if (flags.repo) {
      const repoParts = flags.repo.split('/');
      if (repoParts.length !== 2) {
        throw new Error('Repository must be in the format owner/repo');
      }
      githubOwner = repoParts[0];
      githubRepo = repoParts[1];
    }

    const githubUser = config.get('github.defaults.person.identifier');

    // Log the repository being used
    if (githubOwner && githubRepo) {
      console.log(`Using GitHub repository: ${githubOwner}/${githubRepo}`);
    }

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
        const mcpService = createGitHubService();
        if (mcpService) {
          const spinner = ora(
            `Fetching activity for user ${flags.author}...`
          ).start();
          this.log('\nUsing GitHub MCP Service for user activity search');

          await mcpService.connect();
          const activity = await mcpService.fetchEnhancedUserActivity(
            flags.author,
            since,
            until
          );

          spinner.stop();

          // Transform unified format to ActivityData format
          activityData = {
            github: {
              commits: [], // User activity doesn't include commits directly
              pullRequests: (
                activity.enhancedPullRequests || activity.pullRequests
              ).map((pr: any) => ({
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
              })),
              issues: (activity.enhancedIssues || activity.issues).map(
                (issue: any) => ({
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
                })
              ),
              statistics: activity.statistics,
            },
            linear: {
              issues: [],
              activeIssues: 0,
            },
          };
          // Disconnect from MCP server
          await mcpService.disconnect();
        } else {
          throw new Error(
            'User activity search requires MCP to be configured. Please set github.mcp.url'
          );
        }
      } else {
        // Repository-specific mode (original behavior)
        if (!githubOwner || !githubRepo) {
          throw new Error(
            'No repository configured. Use --repo owner/repo or set github.owner and github.repo in config'
          );
        }

        // Check if we should use MCP enhanced data
        const mcpService = createGitHubService();

        if (mcpService && githubOwner && githubRepo) {
          console.log('Using GitHub MCP Service for data collection...');

          await mcpService.connect();

          // Use enhanced MCP data
          const enhancedData = await mcpService.fetchEnhancedRepositoryData(
            githubOwner,
            githubRepo,
            since,
            until,
            undefined,
            githubUser || flags.author
          );

          // Transform unified format to ActivityData format
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
          await mcpService.disconnect();
        } else {
          throw new Error(
            'GitHub MCP service is not configured. Please set github.token and github.mcp.url in your config.'
          );
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
        true
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
