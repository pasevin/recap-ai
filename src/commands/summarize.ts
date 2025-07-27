import { Command, Flags } from '@oclif/core';
import { config } from '../utils/config';
import { LinearService } from '../services/linear';
import { OpenAIService, ActivityData } from '../services/openai';
import { FormatterService } from '../services/formatter';
import { createGitHubService } from '../services/service_factory';
import ora from 'ora';

export default class Summarize extends Command {
  static description = 'Generate an AI summary of GitHub and Linear activity';

  static examples = [
    '<%= config.bin %> summarize  # Concise AI summary for configured user',
    '<%= config.bin %> summarize --detailed  # Detailed summary with source references',
    '<%= config.bin %> summarize --author-github john@company.com --author-linear john@company.com  # Cross-service filtering',
    '<%= config.bin %> summarize --repo owner/repo  # Repository-specific activity',
    '<%= config.bin %> summarize --since 2024-01-01 --until 2024-01-31',
    '<%= config.bin %> summarize --format json  # Output raw data in JSON format',
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
    'author-github': Flags.string({
      description:
        'GitHub username/email for filtering (must be used with --author-linear)',
      dependsOn: ['author-linear'],
    }),
    'author-linear': Flags.string({
      description:
        'Linear email address for filtering (must be used with --author-github)',
      dependsOn: ['author-github'],
    }),
    format: Flags.string({
      char: 'f',
      description: 'Output format (text/json)',
      options: ['text', 'json'],
      default: 'text',
    }),
    repo: Flags.string({
      char: 'r',
      description:
        'Repository in the format owner/repo (limits search to specific repo)',
    }),
    detailed: Flags.boolean({
      char: 'd',
      description:
        'Use detailed formatting with structured sections and source references',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Summarize);

    // Get the default timeframe once
    const defaultTimeframe = config.get('github.defaults.timeframe') || '1w';

    // Get the GitHub user (from flag or config)
    const githubUser =
      flags['author-github'] ||
      config.get('github.defaults.person.identifier') ||
      config.get('github.defaults.author');

    if (!githubUser) {
      throw new Error(
        'No GitHub user specified. Use --author-github flag or set github.defaults.person.identifier in config'
      );
    }

    // Parse repo flag if provided
    let githubOwner: string | undefined;
    let githubRepo: string | undefined;

    if (flags.repo) {
      const repoParts = flags.repo.split('/');
      if (repoParts.length !== 2) {
        throw new Error('Repository must be in the format owner/repo');
      }
      githubOwner = repoParts[0];
      githubRepo = repoParts[1];
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

    // Show clean summary of what we're doing
    if (flags.repo) {
      console.log(
        `📊 Generating ${githubOwner}/${githubRepo} summary for ${githubUser} (${timeframe})`
      );
    } else {
      console.log(
        `📊 Generating activity summary for ${githubUser} (${timeframe})`
      );
    }

    try {
      let activityData: ActivityData;
      const githubService = createGitHubService();

      if (flags.repo) {
        // Repository-specific mode
        // Type guard to ensure we have enhanced service
        if (!('fetchEnhancedRepositoryData' in githubService)) {
          throw new Error('Enhanced GitHub service not available');
        }

        const enhancedData = await githubService.fetchEnhancedRepositoryData(
          githubOwner!,
          githubRepo!,
          {
            since,
            until,
            author: githubUser,
            includePRs: true,
            includeIssues: true,
            includeReviews: true,
            maxResults: 100,
          }
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
              repository: `${githubOwner}/${githubRepo}`,
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
              repository: `${githubOwner}/${githubRepo}`,
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
              repository: `${githubOwner}/${githubRepo}`,
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
        // Global user activity mode (default)
        const spinner = ora(`🔍 Fetching GitHub activity...`).start();

        // Type guard to ensure we have enhanced service
        if (!('fetchEnhancedUserActivity' in githubService)) {
          spinner.fail('Enhanced GitHub service not available');
          throw new Error('Enhanced GitHub service not available');
        }

        const activity = await githubService.fetchEnhancedUserActivity(
          githubUser,
          {
            since,
            until,
            maxResults: 100,
          }
        );

        spinner.succeed(`🔍 GitHub activity collected`);

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
              repository: pr.repository_url
                ? pr.repository_url.split('/').slice(-2).join('/')
                : undefined,
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
                repository: issue.repository_url
                  ? issue.repository_url.split('/').slice(-2).join('/')
                  : undefined,
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
      }

      // Fetch Linear data
      const linearSpinner = ora(`📋 Fetching Linear data...`).start();
      const linearData = await linearService.fetchData({
        assignee: flags['author-linear'],
      });
      activityData.linear = {
        issues: linearData.issues,
        activeIssues: linearData.activeIssues,
      };
      linearSpinner.succeed(`📋 Linear data collected`);

      // Generate summary with enhanced context if available
      const aiSpinner = ora(`🤖 Generating AI summary...`).start();
      const aiSummary = await openaiService.generateActivitySummary(
        activityData,
        timeframe,
        true
      );
      aiSpinner.succeed(`🤖 Summary generated`);

      // ASCII art separator
      console.log('\n' + '═'.repeat(60));
      console.log('                    📊 ACTIVITY RECAP                    ');
      console.log('═'.repeat(60) + '\n');

      if (flags.format === 'json') {
        this.log(
          JSON.stringify({ summary: aiSummary, data: activityData }, null, 2)
        );
      } else if (flags.detailed) {
        // Use the enhanced formatter for detailed output with source references
        const formatterService = new FormatterService();
        const formattedSummary = formatterService.formatActivitySummary(
          activityData,
          aiSummary,
          timeframe
        );
        this.log(formattedSummary);
      } else {
        // Use the concise AI-only format
        this.log(aiSummary);
      }
    } catch (error) {
      this.error('Failed to generate summary: ' + (error as Error).message);
    }
  }
}
