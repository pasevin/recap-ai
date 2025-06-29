import { Command, Flags } from '@oclif/core';
import { createGitHubService } from '../services/service_factory';
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
    '$ recap github --author pasevin --timeframe 1w  # Get user activity across all repos',
    '$ recap github --repo owner/repo --enhanced  # Get comprehensive data for better AI summaries',
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
    enhanced: Flags.boolean({
      char: 'e',
      description:
        'Fetch enhanced data including PR reviews, files changed, and more context for AI summaries',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Github);
    const spinner = ora('Fetching data from GitHub...').start();

    try {
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
        const time_since = config.parseTimeframe(
          flags.timeframe || defaults.timeframe
        );
        since = time_since.startDate;
        until = time_since.endDate;
      }

      // Check if we have a repo specified
      if (!flags.repo && flags.author) {
        // User activity mode - search across all repositories
        const mcpService = createGitHubService(flags.enhanced);
        if (mcpService) {
          spinner.text = `Fetching activity for user ${flags.author}...`;
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

          // Format and display the activity
          if (flags.format === 'json') {
            this.log(JSON.stringify(activity, null, 2));
          } else {
            if (flags.enhanced && activity.summary) {
              this.log(
                chalk.bold(`\nGitHub Activity for ${flags.author} (Enhanced)`)
              );
              this.log(
                chalk.dim(
                  'Comprehensive data including PRs, issues, code contributions, and notifications\n'
                )
              );

              const summary = activity.summary;
              this.log(chalk.blue('Activity Summary:'));
              this.log(`  Total Activity: ${summary.totalActivity} items`);
              this.log('');

              this.log(chalk.blue('Pull Requests:'));
              this.log(`  Total: ${summary.pullRequests.total}`);
              this.log(`  Open: ${summary.pullRequests.open}`);
              this.log(`  Merged: ${summary.pullRequests.merged}`);
              this.log(`  Closed: ${summary.pullRequests.closed}\n`);

              this.log(chalk.blue('Issues:'));
              this.log(`  Total: ${summary.issues.total}`);
              this.log(`  Open: ${summary.issues.open}`);
              this.log(`  Closed: ${summary.issues.closed}\n`);

              this.log(chalk.blue('Top Repositories:'));
              summary.topRepositories.slice(0, 5).forEach((repo: any) => {
                this.log(`  ${repo.repo}: ${repo.count} contributions`);
              });

              if (activity.notifications && activity.notifications.length > 0) {
                this.log(chalk.blue('\nRecent Notifications:'));
                this.log(`  Total: ${activity.notifications.length}`);
              }

              // Display enhanced PR details
              if (
                activity.pullRequests?.enhancedItems &&
                activity.pullRequests.enhancedItems.length > 0
              ) {
                this.log(chalk.blue('\nRecent Pull Requests (with details):'));
                activity.pullRequests.enhancedItems
                  .slice(0, 3)
                  .forEach((pr: any) => {
                    const state =
                      pr.state === 'open'
                        ? chalk.green('open')
                        : pr.merged
                          ? chalk.magenta('merged')
                          : chalk.red('closed');
                    this.log(
                      `\n  ${chalk.bold(`#${pr.number}`)} ${pr.title} (${state})`
                    );
                    this.log(`  ${chalk.dim(pr.html_url)}`);

                    if (pr.body) {
                      const body = pr.body
                        .substring(0, 200)
                        .replace(/\n/g, ' ');
                      this.log(
                        `  ${chalk.dim('Description:')} ${body}${pr.body.length > 200 ? '...' : ''}`
                      );
                    }

                    if (pr.enhancedData) {
                      const {
                        filesChanged,
                        linesAdded,
                        linesDeleted,
                        reviews,
                        comments,
                      } = pr.enhancedData;
                      this.log(
                        `  ${chalk.dim('Changes:')} ${filesChanged} files, +${linesAdded} -${linesDeleted} lines`
                      );

                      if (reviews && reviews.length > 0) {
                        const approvals = reviews.filter(
                          (r: any) => r.state === 'APPROVED'
                        ).length;
                        const changesRequested = reviews.filter(
                          (r: any) => r.state === 'CHANGES_REQUESTED'
                        ).length;
                        this.log(
                          `  ${chalk.dim('Reviews:')} ${approvals} approved, ${changesRequested} changes requested`
                        );
                      }

                      if (comments && comments.length > 0) {
                        this.log(
                          `  ${chalk.dim('Comments:')} ${comments.length} review comments`
                        );
                      }
                    }
                  });
              }

              // Display enhanced issue details
              if (
                activity.issues?.enhancedItems &&
                activity.issues.enhancedItems.length > 0
              ) {
                this.log(chalk.blue('\nRecent Issues (with details):'));
                activity.issues.enhancedItems
                  .slice(0, 3)
                  .forEach((issue: any) => {
                    const state =
                      issue.state === 'open'
                        ? chalk.green('open')
                        : chalk.red('closed');
                    this.log(
                      `\n  ${chalk.bold(`#${issue.number}`)} ${issue.title} (${state})`
                    );
                    this.log(`  ${chalk.dim(issue.html_url)}`);

                    if (issue.body) {
                      const body = issue.body
                        .substring(0, 200)
                        .replace(/\n/g, ' ');
                      this.log(
                        `  ${chalk.dim('Description:')} ${body}${issue.body.length > 200 ? '...' : ''}`
                      );
                    }

                    if (
                      issue.enhancedData &&
                      issue.enhancedData.commentCount > 0
                    ) {
                      this.log(
                        `  ${chalk.dim('Discussion:')} ${issue.enhancedData.commentCount} comments`
                      );
                    }

                    if (issue.labels && issue.labels.length > 0) {
                      const labelNames = issue.labels.map((l: any) =>
                        typeof l === 'string' ? l : l.name
                      );
                      this.log(
                        `  ${chalk.dim('Labels:')} ${labelNames.join(', ')}`
                      );
                    }
                  });
              }
            } else {
              // Original simple display
              this.log(chalk.bold(`\nGitHub Activity for ${flags.author}`));
              this.log(
                chalk.dim('Note: This shows issues/PRs created by the user')
              );

              if (activity.issues && activity.issues.content) {
                try {
                  // MCP returns content as an array with text objects
                  let issuesData;
                  if (
                    Array.isArray(activity.issues.content) &&
                    activity.issues.content[0]?.text
                  ) {
                    issuesData = JSON.parse(activity.issues.content[0].text);
                  } else if (typeof activity.issues.content === 'string') {
                    issuesData = JSON.parse(activity.issues.content);
                  } else {
                    throw new Error('Unexpected response format');
                  }

                  this.log(chalk.blue('\nIssues and Pull Requests:'));
                  this.log(`  Total found: ${issuesData.total_count || 0}`);

                  if (issuesData.items && issuesData.items.length > 0) {
                    this.log('\n  Recent items:');
                    issuesData.items.slice(0, 10).forEach((item: any) => {
                      const type = item.pull_request ? 'PR' : 'Issue';
                      const state =
                        item.state === 'open'
                          ? chalk.green('open')
                          : chalk.red('closed');
                      this.log(`    [${type}] ${item.title} (${state})`);
                      this.log(`       ${item.html_url}`);
                      this.log(
                        `       Created: ${new Date(item.created_at).toLocaleDateString()}`
                      );
                    });
                  }
                } catch (parseError) {
                  this.log(chalk.yellow('\nNote: Unable to parse issues data'));
                  this.log(chalk.dim('Error:'), parseError);
                }
              }
            }

            // Disconnect from MCP server
            await mcpService.disconnect();
            return;
          }
        } else {
          // Fallback message if MCP is not configured
          throw new Error(
            'User activity search requires MCP to be configured. Please set github.mcp.url'
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

      const mcpService = createGitHubService(flags.enhanced);
      if (mcpService) {
        this.log(
          'Using GitHub MCP Service' +
            (flags.enhanced ? ' (Enhanced)' : ' (experimental)')
        );

        await mcpService.connect();

        let data;
        if (flags.enhanced && 'fetchEnhancedRepositoryData' in mcpService) {
          // Use enhanced data fetching
          spinner.text = 'Fetching comprehensive repository data...';
          data = await mcpService.fetchEnhancedRepositoryData(
            owner,
            repo,
            since,
            until,
            flags.branch || defaults.branch,
            flags.author === 'none'
              ? undefined
              : flags.author || defaults.author
          );
        } else {
          // Use basic MCP data fetching
          const commits = await mcpService.listCommits(
            owner,
            repo,
            since,
            until,
            flags.branch || defaults.branch,
            flags.author === 'none'
              ? undefined
              : flags.author || defaults.author
          );
          data = commits;
        }

        // Format output
        let output: string;
        if (flags.format === 'json') {
          output = JSON.stringify(data, null, 2);
        } else {
          if (flags.enhanced && 'statistics' in data) {
            // Enhanced summary format
            output = this.formatEnhancedSummary(data);
          } else {
            // Original MCP summary format
            if (data && data.summary) {
              output = this.formatSummary(data);
            } else {
              // Simple formatting for MCP response
              output = chalk.bold('GitHub Activity Summary\n');
              output += chalk.dim('Using MCP Service (raw data)\n\n');

              if (Array.isArray(data?.content) && data.content[0]?.text) {
                try {
                  const parsedData = JSON.parse(data.content[0].text);

                  // Client-side filtering workaround until GitHub MCP server v0.5.1+ is released
                  // The author parameter was added in PR #569 but is not in the current v0.5.0 release
                  let filteredCommits = parsedData;
                  if (flags.author && flags.author !== 'none') {
                    filteredCommits = parsedData.filter(
                      (commit: any) =>
                        commit.author?.login?.toLowerCase() ===
                          flags.author?.toLowerCase() ||
                        commit.commit?.author?.name?.toLowerCase() ===
                          flags.author?.toLowerCase() ||
                        commit.commit?.author?.email
                          ?.toLowerCase()
                          .includes(flags.author?.toLowerCase())
                    );
                  }

                  output += chalk.blue('Commits:\n');
                  output += `  Total: ${filteredCommits.length}\n`;

                  if (
                    flags.author &&
                    filteredCommits.length !== parsedData.length
                  ) {
                    output += chalk.dim(
                      `  (Filtered from ${parsedData.length} total commits)\n`
                    );
                  }
                  output += '\n';

                  if (filteredCommits.length > 0) {
                    output += '  Recent commits:\n';
                    filteredCommits.slice(0, 10).forEach((commit: any) => {
                      const message =
                        commit.commit?.message?.split('\n')[0] || 'No message';
                      const authorName =
                        commit.commit?.author?.name ||
                        commit.author?.login ||
                        'Unknown';
                      const date = commit.commit?.author?.date
                        ? new Date(
                            commit.commit.author.date
                          ).toLocaleDateString()
                        : 'Unknown date';
                      output += `    ${message}\n`;
                      output += chalk.dim(
                        `      by ${authorName} on ${date}\n`
                      );
                    });
                  }
                } catch (error) {
                  output += chalk.red('Error parsing commit data\n');
                }
              } else {
                output += chalk.yellow('No commit data received\n');
              }
            }
          }
        }

        // Output data
        if (flags.output) {
          fs.writeFileSync(flags.output, output);
          spinner.succeed(chalk.green(`Data saved to ${flags.output}`));
        } else {
          spinner.stop();
          this.log(output);
        }

        // Disconnect from MCP server
        await mcpService.disconnect();
      } else {
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
            flags.author === 'none'
              ? undefined
              : flags.author || defaults.author,
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

  private formatEnhancedSummary(data: any): string {
    const { statistics } = data;
    const lines = [
      chalk.bold('GitHub Activity Summary (Enhanced)'),
      chalk.dim(
        'Comprehensive data with PR reviews, file changes, and detailed context'
      ),
      '',
      chalk.blue('Repository Activity:'),
      `  Total Commits: ${statistics.totalCommits}`,
      `  Total Pull Requests: ${statistics.totalPRs}`,
      `  Total Issues: ${statistics.totalIssues}`,
      `  Total Reviews: ${statistics.totalReviews}`,
      '',
      chalk.blue('Code Metrics:'),
      `  Average Files per Commit: ${statistics.avgFilesPerCommit.toFixed(1)}`,
      `  Average Lines Changed: ${statistics.avgLinesChanged.toFixed(0)}`,
      '',
      chalk.blue('Top Contributors:'),
      ...statistics.topContributors.map(
        (contributor: any) =>
          `  ${contributor.author}: ${contributor.count} commits`
      ),
      '',
      chalk.blue('Top Labels:'),
      ...statistics.topLabels.map(
        (label: any) => `  ${label.label}: ${label.count} items`
      ),
      '',
      chalk.blue('Recent Activity:'),
      `  Commits analyzed: ${data.commits.length}`,
      `  Pull Requests: ${data.pullRequests.length}`,
      `  Issues: ${data.issues.length}`,
      `  Code Reviews: ${data.codeReviews.length}`,
      '',
      chalk.dim(
        'This enhanced data provides better context for AI-powered summaries'
      ),
      chalk.dim('For full details, use --format json'),
    ];

    return lines.join('\n');
  }
}
