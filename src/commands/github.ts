import { Command, Flags } from '@oclif/core';
import { GitHubService } from '../services/github';
import { config } from '../utils/config';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs';

export default class Github extends Command {
  static description = 'Fetch data from GitHub repository';

  static examples = [
    '$ recap github --repo owner/repo',
    '$ recap github --repo owner/repo --timeframe 2w',
    '$ recap github --repo owner/repo --since 2024-01-01 --until 2024-01-31',
    '$ recap github --repo owner/repo --author johndoe --pr-state open',
  ];

  static flags = {
    repo: Flags.string({
      char: 'r',
      description: 'Repository in format owner/repo',
      required: true,
    }),
    timeframe: Flags.string({
      char: 't',
      description: 'Timeframe to fetch data for (e.g., 1d, 1w, 1m, 1y)',
    }),
    since: Flags.string({
      char: 's',
      description: 'Fetch data since date (YYYY-MM-DD)',
      exclusive: ['timeframe'],
    }),
    until: Flags.string({
      char: 'u',
      description: 'Fetch data until date (YYYY-MM-DD)',
      exclusive: ['timeframe'],
    }),
    branch: Flags.string({
      char: 'b',
      description: 'Branch name to fetch from',
    }),
    author: Flags.string({
      char: 'a',
      description: 'Filter by author (use "none" to disable author filtering)',
    }),
    'pr-state': Flags.string({
      description: 'Filter PRs by state (open, closed, all)',
      options: ['open', 'closed', 'all'],
    }),
    format: Flags.string({
      char: 'f',
      description: 'Output format (json, summary)',
      options: ['json', 'summary'],
      default: 'summary',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output file path',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Github);
    const spinner = ora('Fetching data from GitHub...').start();

    try {
      // Parse owner/repo
      const [owner, repo] = flags.repo.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use owner/repo');
      }

      // Get GitHub token and defaults from config
      const token = config.get('github.token');
      const defaults = config.get('github.defaults') || {};

      if (!token) {
        throw new Error(
          'GitHub token not found. Run `recap config setup` first'
        );
      }

      // Calculate date range
      let since: Date | undefined;
      let until: Date | undefined;

      if (flags.since || flags.until) {
        // If explicit dates are provided, use them
        if (flags.since) {
          since = new Date(flags.since);
        }
        if (flags.until) {
          until = new Date(flags.until);
        }
      } else if (flags.timeframe || defaults.timeframe) {
        // Only use timeframe if no explicit dates are provided
        since = config.parseTimeframe(flags.timeframe || defaults.timeframe);
      }

      const githubService = new GitHubService({
        token,
        owner,
        repo,
      });

      const data = await githubService.fetchData({
        since,
        until,
        branch: flags.branch || defaults.branch,
        author:
          flags.author === 'none' ? undefined : flags.author || defaults.author,
        prState: (flags['pr-state'] || defaults.prState) as
          | 'open'
          | 'closed'
          | 'all',
      });

      // Format output
      let output: string;
      if (flags.format === 'json') {
        output = JSON.stringify(data, null, 2);
      } else {
        output = this.formatSummary(data);
      }

      // Output data
      if (flags.output) {
        fs.writeFileSync(flags.output, output);
        spinner.succeed(chalk.green(`Data saved to ${flags.output}`));
      } else {
        spinner.stop();
        this.log(output);
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch data from GitHub'));
      if (error instanceof Error) {
        this.error(error.message);
      } else {
        this.error('An unknown error occurred');
      }
    }
  }

  private formatSummary(data: any): string {
    const { summary } = data;
    const lines = [
      chalk.bold('GitHub Activity Summary'),
      '',
      chalk.blue('Commits:'),
      `  Total: ${summary.totalCommits}`,
      '',
      chalk.blue('Pull Requests:'),
      `  Total: ${summary.totalPRs}`,
      `  Open: ${summary.openPRs}`,
      `  Closed: ${summary.closedPRs}`,
      `  Merged: ${summary.mergedPRs}`,
      '',
      chalk.blue('Review Status:'),
      `  Approved: ${summary.reviewStatus.approved}`,
      `  Changes Requested: ${summary.reviewStatus.changesRequested}`,
      `  Commented: ${summary.reviewStatus.commented}`,
      `  Pending: ${summary.reviewStatus.pending}`,
      `  Dismissed: ${summary.reviewStatus.dismissed}`,
      '',
      chalk.blue('Time Metrics:'),
      `  Average Time to Merge: ${summary.avgTimeToMerge}`,
      `  Average Time to Close: ${summary.timeStats.avgTimeToClose}`,
      `  PR Velocity: ${summary.timeStats.prVelocity} PRs/day`,
      '',
      chalk.blue('Code Changes:'),
      `  Total Additions: ${summary.codeChanges.totalAdditions}`,
      `  Total Deletions: ${summary.codeChanges.totalDeletions}`,
      `  Changed Files: ${summary.codeChanges.totalChangedFiles}`,
      `  Average PR Size: ${summary.codeChanges.avgPRSize} lines`,
      '',
      chalk.blue('Most Active Contributors:'),
      ...summary.mostActiveAuthors.map(
        (author: any) =>
          `  ${author.author}: ${author.contributions} contributions`
      ),
      '',
      chalk.blue('Top Labels:'),
      ...summary.labels.map(
        (label: any) => `  ${label.name}: ${label.count} PRs`
      ),
      '',
      chalk.dim('For detailed information, use --format json'),
    ];

    return lines.join('\n');
  }
}
