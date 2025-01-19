import { Command, Flags } from '@oclif/core';
import { LinearService } from '../services/linear';
import { config } from '../utils/config';
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
  ];

  static flags = {
    'team-id': Flags.string({
      char: 't',
      description: 'Linear team ID',
    }),
    timeframe: Flags.string({
      char: 'f',
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
    assignee: Flags.string({
      char: 'a',
      description: 'Filter by assignee',
    }),
    state: Flags.string({
      description: 'Filter issues by state (open, closed, all)',
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
    const { flags } = await this.parse(Linear);
    const spinner = ora('Fetching data from Linear...').start();

    try {
      // Get Linear token and defaults from config
      const token = config.get('linear.token');
      const defaults = config.get('linear.defaults') || {};

      if (!token) {
        throw new Error(
          'Linear token not found. Run `recap config setup` first'
        );
      }

      // Calculate date range
      let since: Date | undefined;
      let until: Date | undefined;

      if (flags.timeframe || defaults.timeframe) {
        since = config.parseTimeframe(flags.timeframe || defaults.timeframe);
      } else if (flags.since) {
        since = new Date(flags.since);
      }

      if (flags.until) {
        until = new Date(flags.until);
      }

      const linearService = new LinearService({
        token,
        teamId: flags['team-id'] || defaults.teamId,
      });

      const data = await linearService.fetchData({
        since,
        until,
        teamId: flags['team-id'] || defaults.teamId,
        assignee: flags.assignee || defaults.assignee,
        state: (flags.state || defaults.state) as 'open' | 'closed' | 'all',
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
      spinner.fail(chalk.red('Failed to fetch data from Linear'));
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
      `  Average Time to First Response: ${summary.timeStats.avgTimeToFirstResponse}`,
      `  Average Cycle Time: ${summary.timeStats.avgCycleTime}`,
      `  Issue Velocity: ${summary.timeStats.issueVelocity} issues/day`,
      '',
      chalk.blue('Most Active Users:'),
      ...summary.mostActiveUsers.map(
        (user: any) => `  ${user.user}: ${user.contributions} contributions`
      ),
      '',
      chalk.blue('Top Labels:'),
      ...summary.labels.map(
        (label: any) => `  ${label.name}: ${label.count} issues`
      ),
      '',
      chalk.dim('For detailed information, use --format json'),
    ];

    return lines.join('\n');
  }
}
