import { Command, Flags } from '@oclif/core';
import { GitHubService } from '../../services/github';
import { config } from '../../utils/config';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs';

export default class FetchGithub extends Command {
  static description = 'Fetch data from GitHub repository';

  static examples = [
    '$ recap fetch github --repo myorg/myrepo --since 2024-01-01 --branch main',
    '$ recap fetch github --repo myorg/myrepo --author johndoe',
  ];

  static flags = {
    repo: Flags.string({
      char: 'r',
      description: 'Repository in format owner/repo',
      required: true,
    }),
    since: Flags.string({
      char: 's',
      description: 'Fetch data since date (YYYY-MM-DD)',
    }),
    branch: Flags.string({
      char: 'b',
      description: 'Branch name to fetch from',
    }),
    author: Flags.string({
      char: 'a',
      description: 'Filter by author',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output file path',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(FetchGithub);
    const spinner = ora('Fetching data from GitHub...').start();

    try {
      // Parse owner/repo
      const [owner, repo] = flags.repo.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use owner/repo');
      }

      // Get GitHub token from config
      const token = config.get('github.token');
      if (!token) {
        throw new Error(
          'GitHub token not found. Run `recap config setup` first'
        );
      }

      const githubService = new GitHubService({
        token,
        owner,
        repo,
      });

      const data = await githubService.fetchData({
        since: flags.since,
        branch: flags.branch,
        author: flags.author,
      });

      // Output data
      if (flags.output) {
        fs.writeFileSync(flags.output, JSON.stringify(data, null, 2));
        spinner.succeed(chalk.green(`Data saved to ${flags.output}`));
      } else {
        spinner.stop();
        this.log(JSON.stringify(data, null, 2));
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
}
