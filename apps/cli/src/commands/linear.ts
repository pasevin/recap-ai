import { Command, Flags } from '@oclif/core';
import { LinearService } from '../services/linear';
import { config } from '../utils/config';
import { LinearFormattedData } from '../interfaces/linear-types';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';

export default class Linear extends Command {
  static description = 'Fetch data from Linear';

  static examples = [
    '$ recap linear',
    '$ recap linear --team-id TEAM_ID',
    '$ recap linear --timeframe 2w',
    '$ recap linear --since 2024-01-01 --until 2024-01-31',
    '$ recap linear --assignee johndoe --state open',
    '$ recap linear --author janedoe --label bug',
    '$ recap linear --author janedoe --timeframe 1m --format json',
  ];

  static flags = {
    'team-id': Flags.string({
      char: 't',
      description: 'Linear team ID',
    }),
    timeframe: Flags.string({
      char: 'f',
      description: 'Timeframe to fetch data for (e.g., 1d, 1w, 1m, 1y)',
      exclusive: ['since'],
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
    assignee: Flags.string({
      char: 'a',
      description: 'Filter by assignee',
    }),
    author: Flags.string({
      description: 'Filter by issue creator',
    }),
    state: Flags.string({
      description: 'Filter issues by state (open, closed, all)',
      options: ['open', 'closed', 'all'],
    }),
    label: Flags.string({
      char: 'l',
      description: 'Filter by label',
    }),
    priority: Flags.integer({
      char: 'p',
      description: 'Filter by priority (0-4)',
      min: 0,
      max: 4,
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
    limit: Flags.integer({
      char: 'n',
      description: 'Maximum number of issues to fetch',
      min: 1,
      max: 100,
      default: 100,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Linear);
    const spinner = ora('Fetching data from Linear...').start();

    try {
      // Get Linear token and defaults from config
      const token = config.get('linear.token');
      const defaults =
        (config.get('linear.defaults') as Record<string, unknown>) ?? {};

      if (!token) {
        throw new Error(
          'Linear token not found. Run `recap config setup` first'
        );
      }

      // Calculate date range
      let since: Date | undefined;
      let until: Date | undefined;

      if (flags.since ?? flags.until) {
        // Explicit date range takes precedence
        if (flags.since) {
          since = new Date(flags.since);
          // Set time to start of day
          since.setUTCHours(0, 0, 0, 0);
        }
        if (flags.until) {
          until = new Date(flags.until);
          // Set time to end of day
          until.setUTCHours(23, 59, 59, 999);
        }
      } else if (flags.timeframe ?? (defaults.timeframe as string)) {
        // Fall back to timeframe if no explicit dates
        const timeRange = config.parseTimeframe(
          flags.timeframe ?? (defaults.timeframe as string)
        );
        since = timeRange.startDate;
        until = timeRange.endDate;
      }

      const linearService = new LinearService(
        token as string,
        flags['team-id'] ?? (defaults.teamId as string) ?? '',
        flags.timeframe ?? (defaults.timeframe as string) ?? '1w'
      );

      const data = await linearService.fetchData({
        assignee: flags.assignee,
      });

      // Format output
      let output: string;
      if (flags.format === 'json') {
        output = JSON.stringify(data, null, 2);
      } else {
        output = this.formatSummary(data as unknown as LinearFormattedData);
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
      spinner.fail(chalk.red('Failed to fetch data from Linear'));
      if (error instanceof Error) {
        this.error(error.message);
      } else {
        this.error('An unknown error occurred');
      }
    }
  }

  private formatSummary(data: LinearFormattedData): string {
    const { summary } = data;
    const lines = [
      chalk.bold('Linear Activity Summary'),
      '',
      chalk.blue('Issues:'),
      `  Total: ${summary.totalIssues}`,
      `  Open: ${summary.openIssues}`,
      `  Closed: ${summary.closedIssues}`,
      '',
      chalk.blue('State Breakdown:'),
      ...Object.entries(summary.stateBreakdown).map(
        ([state, count]) => `  ${state}: ${count}`
      ),
      '',
      chalk.blue('Priority Breakdown:'),
      ...Object.entries(summary.priorityBreakdown).map(
        ([priority, count]) => `  P${priority}: ${count}`
      ),
      '',
      chalk.blue('Time Metrics:'),
      `  Average Time to Close: ${summary.avgTimeToClose}`,
      `  Average Time to First Response: ${(summary.timeStats as Record<string, unknown>)?.avgTimeToFirstResponse ?? 'N/A'}`,
      `  Average Cycle Time: ${(summary.timeStats as Record<string, unknown>)?.avgCycleTime ?? 'N/A'}`,
      `  Issue Velocity: ${(summary.timeStats as Record<string, unknown>)?.issueVelocity ?? 'N/A'} issues/day`,
      '',
      chalk.blue('Most Active Users:'),
      ...summary.mostActiveUsers.map(
        (user: { user: string; contributions: number }) =>
          `  ${user.user}: ${user.contributions} contributions`
      ),
      '',
      chalk.blue('Top Labels:'),
      ...summary.labels.map(
        (label: { name: string; count: number }) =>
          `  ${label.name}: ${label.count} issues`
      ),
      '',
      chalk.dim('For detailed information, use --format json'),
    ];

    return lines.join('\n');
  }
}
