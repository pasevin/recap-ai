import { Command, Flags } from '@oclif/core';
import { createGitHubService } from '../services/service_factory';
import { config } from '../utils/config';
import {
  GitHubEnhancedActivityData,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  GitHubLabel,
} from '../interfaces/github-types';
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
    '$ recap github --author pasevin --timeframe 1w  # Get user activity across all repos',
    '$ recap github --repo owner/repo --format summary  # Get comprehensive data for better AI summaries',
  ];

  static flags = {
    repo: Flags.string({
      char: 'r',
      description: 'Repository in format owner/repo',
      required: false,
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
      // Get GitHub token and defaults from config
      const token = config.get('github.token');
      const defaults =
        (config.get('github.defaults') as Record<string, unknown>) ?? {};

      if (!token) {
        throw new Error(
          'GitHub token not found. Run `recap config setup` first'
        );
      }

      // Calculate date range
      let since: Date | undefined;
      let until: Date | undefined;

      if (flags.since ?? flags.until) {
        // If explicit dates are provided, use them
        if (flags.since) {
          since = new Date(flags.since);
        }
        if (flags.until) {
          until = new Date(flags.until);
        }
      } else if (flags.timeframe ?? (defaults.timeframe as string)) {
        // Only use timeframe if no explicit dates are provided
        const time_since = config.parseTimeframe(
          flags.timeframe ?? (defaults.timeframe as string)
        );
        since = time_since.startDate;
        until = time_since.endDate;
      }

      // Check if we have a repo specified
      if (!flags.repo && flags.author) {
        // User activity mode - search across all repositories
        const githubService = createGitHubService();
        spinner.text = `Fetching activity for user ${flags.author}...`;
        this.log('\nUsing Enhanced GitHub Service for user activity search');

        // Type guard to ensure we have enhanced service
        if ('fetchEnhancedUserActivity' in githubService) {
          const activity = await githubService.fetchEnhancedUserActivity(
            flags.author,
            {
              since,
              until,
              maxResults: 100,
            }
          );
          spinner.stop();

          if (flags.format === 'json') {
            this.log(JSON.stringify(activity, null, 2));
          } else {
            // Use the unified format output method
            this.log(
              this.formatEnhancedSummary(
                activity as unknown as GitHubEnhancedActivityData
              )
            );
          }

          return; // Exit after handling user activity
        } else {
          throw new Error(
            'Enhanced GitHub service not available for user activity search'
          );
        }
      }

      // Repository-specific mode (original behavior)
      if (!flags.repo) {
        throw new Error(
          'Repository is required when not searching for user activity. Use --repo owner/repo or --author username'
        );
      }

      // Parse owner/repo
      const [owner, repo] = flags.repo.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use owner/repo');
      }

      const githubService = createGitHubService();
      this.log('Using Enhanced GitHub Service');

      // Type guard to ensure we have enhanced service
      if (!('fetchEnhancedRepositoryData' in githubService)) {
        throw new Error(
          'Enhanced GitHub service not available for repository analysis'
        );
      }

      const data = await githubService.fetchEnhancedRepositoryData(
        owner,
        repo,
        {
          since,
          until,
          branch: flags.branch ?? (defaults.branch as string),
          author:
            flags.author === 'none'
              ? undefined
              : (flags.author ?? (defaults.author as string)),
          includePRs: true,
          includeIssues: true,
          includeReviews: true,
          maxResults: 100,
        }
      );

      // Format output
      let output: string;
      if (flags.format === 'json') {
        output = JSON.stringify(data, null, 2);
      } else {
        // Enhanced summary format
        output = this.formatEnhancedSummary(
          data as unknown as GitHubEnhancedActivityData
        );
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

  private formatEnhancedSummary(data: GitHubEnhancedActivityData): string {
    const { statistics, pullRequests, issues, commits, userDetails } = data;
    const summary = (data as unknown as Record<string, unknown>).summary as
      | {
          pullRequests?: { open?: number; merged?: number; closed?: number };
          issues?: { open?: number; closed?: number };
          topRepositories?: Array<{ repo: string; count: number }>;
        }
      | undefined;
    const lines = [chalk.bold(`GitHub Activity Summary`), ''];

    // Add user info if available (for user activity searches)
    if (userDetails) {
      lines.push(chalk.blue(`User: ${userDetails.login}`));
      lines.push('');
    }

    // Display Commits (only if available - not in user activity)
    if (commits && commits.length > 0) {
      lines.push(chalk.blue(`Commits (${statistics.totalCommits}):`));
      // Show first 10 commits
      commits.slice(0, 10).forEach((enhancedCommit: GitHubCommit) => {
        // Enhanced commits have the actual commit in a 'commit' property
        const commit = enhancedCommit.commit ?? enhancedCommit;

        const sha = commit.sha?.substring(0, 7) ?? 'unknown';
        const message = (enhancedCommit.commit?.message ?? '').split('\n')[0];
        const author =
          (enhancedCommit.author as { login?: string })?.login ??
          enhancedCommit.commit?.author?.name ??
          'Unknown';
        const date = new Date(
          enhancedCommit.commit?.author?.date ??
            enhancedCommit.commit?.committer?.date ??
            (enhancedCommit as { created_at?: string }).created_at ??
            Date.now()
        ).toLocaleDateString();

        lines.push(`  ${chalk.yellow(sha)} ${message}`);
        lines.push(chalk.dim(`     by ${author} on ${date}`));
        const commitWithPR = enhancedCommit as unknown as {
          pullRequest?: { number: number };
        };
        if (commitWithPR.pullRequest) {
          lines.push(chalk.dim(`     PR #${commitWithPR.pullRequest.number}`));
        }
        lines.push('');
      });
      if (statistics.totalCommits > 10) {
        lines.push(
          chalk.dim(`  ... and ${statistics.totalCommits - 10} more commits\n`)
        );
      }
    }

    // Display Pull Requests
    if (pullRequests && pullRequests.length > 0) {
      lines.push(chalk.blue(`\nPull Requests (${pullRequests.length}):`));

      // Show enhanced PRs if available, otherwise show regular PRs
      const prsToShow = data.enhancedPullRequests ?? pullRequests;
      prsToShow.slice(0, 10).forEach((pr: GitHubPullRequest) => {
        const state =
          pr.state === 'open'
            ? chalk.green('●')
            : pr.merged_at
              ? chalk.magenta('●')
              : chalk.red('●');
        const stateText = pr.merged_at ? 'merged' : pr.state;

        lines.push(`  ${state} ${pr.title}`);
        lines.push(chalk.dim(`     #${pr.number} - ${stateText}`));
        lines.push(
          chalk.dim(
            `     Created: ${new Date(pr.created_at).toLocaleDateString()}`
          )
        );

        // Add repository info for user activity searches
        if (pr.repository_url) {
          const repoName = pr.repository_url.split('/').slice(-2).join('/');
          lines.push(chalk.dim(`     Repository: ${repoName}`));
        }

        if (pr.user?.login) {
          lines.push(chalk.dim(`     Author: ${pr.user.login}`));
        }
        if (pr.labels && pr.labels.length > 0) {
          const labelNames = pr.labels
            .map((l: GitHubLabel | string) =>
              typeof l === 'string' ? l : l.name
            )
            .join(', ');
          lines.push(chalk.dim(`     Labels: ${labelNames}`));
        }
        if (pr.html_url) {
          lines.push(chalk.dim(`     ${pr.html_url}`));
        }
        lines.push('');
      });

      if (pullRequests.length > 10) {
        lines.push(
          chalk.dim(
            `  ... and ${pullRequests.length - 10} more pull requests\n`
          )
        );
      }
    }

    // Display Issues
    if (issues && issues.length > 0) {
      lines.push(chalk.blue(`\nIssues (${issues.length}):`));

      // Show enhanced issues if available, otherwise show regular issues
      const issuesToShow = data.enhancedIssues ?? issues;
      issuesToShow.slice(0, 10).forEach((issue: GitHubIssue) => {
        const state =
          issue.state === 'open' ? chalk.green('●') : chalk.red('●');

        lines.push(`  ${state} ${issue.title}`);
        lines.push(chalk.dim(`     #${issue.number} - ${issue.state}`));
        lines.push(
          chalk.dim(
            `     Created: ${new Date(issue.created_at).toLocaleDateString()}`
          )
        );

        // Add repository info for user activity searches
        if (issue.repository_url) {
          const repoName = issue.repository_url.split('/').slice(-2).join('/');
          lines.push(chalk.dim(`     Repository: ${repoName}`));
        }

        if (issue.user?.login) {
          lines.push(chalk.dim(`     Author: ${issue.user.login}`));
        }
        if (issue.labels && issue.labels.length > 0) {
          const labelNames = issue.labels
            .map((l: GitHubLabel | string) =>
              typeof l === 'string' ? l : l.name
            )
            .join(', ');
          lines.push(chalk.dim(`     Labels: ${labelNames}`));
        }
        if (issue.html_url) {
          lines.push(chalk.dim(`     ${issue.html_url}`));
        }
        lines.push('');
      });

      if (issues.length > 10) {
        lines.push(chalk.dim(`  ... and ${issues.length - 10} more issues\n`));
      }
    }

    // Summary section
    lines.push(chalk.dim('─'.repeat(50)));
    lines.push(chalk.bold('Summary:'));

    if (statistics.totalCommits > 0) {
      lines.push(`  Total Commits: ${statistics.totalCommits}`);
    }
    lines.push(`  Total Pull Requests: ${statistics.totalPRs}`);
    lines.push(`  Total Issues: ${statistics.totalIssues}`);

    // Add summary breakdown if available
    if (summary) {
      lines.push('');
      lines.push(chalk.bold('PR Breakdown:'));
      lines.push(`  Open: ${summary?.pullRequests?.open ?? 0}`);
      lines.push(`  Merged: ${summary?.pullRequests?.merged ?? 0}`);
      lines.push(`  Closed: ${summary?.pullRequests?.closed ?? 0}`);

      lines.push('');
      lines.push(chalk.bold('Issue Breakdown:'));
      lines.push(`  Open: ${summary?.issues?.open ?? 0}`);
      lines.push(`  Closed: ${summary?.issues?.closed ?? 0}`);

      if (summary?.topRepositories && summary.topRepositories.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Top Repositories:'));
        summary.topRepositories
          .slice(0, 5)
          .forEach((repo: { repo: string; count: number }) => {
            lines.push(`  ${repo.repo}: ${repo.count} items`);
          });
      }
    }

    if (statistics.avgFilesPerCommit > 0) {
      lines.push('');
      lines.push(chalk.bold('Code Metrics:'));
      lines.push(
        `  Average Files per Commit: ${statistics.avgFilesPerCommit.toFixed(1)}`
      );
      lines.push(
        `  Average Lines Changed: ${statistics.avgLinesChanged.toFixed(0)}`
      );
    }

    // Top contributors
    if (statistics.topContributors && statistics.topContributors.length > 0) {
      lines.push('');
      lines.push(chalk.bold('Top Contributors:'));
      statistics.topContributors
        .slice(0, 5)
        .forEach((contributor: { author: string; count: number }) => {
          lines.push(`  ${contributor.author}: ${contributor.count} commits`);
        });
    }

    // Top labels
    if (statistics.topLabels && statistics.topLabels.length > 0) {
      lines.push('');
      lines.push(chalk.bold('Top Labels:'));
      statistics.topLabels
        .slice(0, 5)
        .forEach((label: { label: string; count: number }) => {
          lines.push(`  ${label.label}: ${label.count} items`);
        });
    }

    return lines.join('\n');
  }
}
