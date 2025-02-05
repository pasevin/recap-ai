import { Command, Flags } from '@oclif/core';
import { config } from '../utils/config';
import { GitHubService } from '../services/github';
import { LinearService } from '../services/linear';
import { OpenAIService, ActivityData } from '../services/openai';

export default class Summarize extends Command {
  static description = 'Generate an AI summary of GitHub and Linear activity';

  static examples = [
    '<%= config.bin %> summarize',
    '<%= config.bin %> summarize --since 2024-01-01 --until 2024-01-31',
    '<%= config.bin %> summarize --author "John Doe"',
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
    const githubService = new GitHubService({
      token: config.get('github.token'),
      owner: githubOwner,
      repo: githubRepo,
    });

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
      // Fetch GitHub data with user filter
      const githubData = await githubService.fetchData({
        since: since.toISOString(),
        until: until.toISOString(),
        author: githubUser || flags.author,
      });

      // Fetch Linear data
      const linearData = await linearService.fetchData();

      // Prepare activity data
      const activityData: ActivityData = {
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
          issues: linearData.issues,
          activeIssues: linearData.activeIssues,
        },
      };

      // Generate summary
      const summary = await openaiService.generateActivitySummary(
        activityData,
        timeframe
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
