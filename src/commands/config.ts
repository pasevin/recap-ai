import { Command, Flags } from '@oclif/core';
import { config } from '../utils/config';
import chalk from 'chalk';
import inquirer from 'inquirer';

export default class Config extends Command {
  static description = 'Configure API tokens and settings';

  static examples = [
    '$ recap config setup',
    '$ recap config set github.token YOUR_TOKEN',
    '$ recap config get github.token',
    '$ recap config github',
  ];

  static flags = {
    get: Flags.string({
      char: 'g',
      description: 'Get a configuration value',
    }),
    set: Flags.string({
      char: 's',
      description: 'Set a configuration value',
    }),
    value: Flags.string({
      char: 'v',
      description: 'Value to set',
      dependsOn: ['set'],
    }),
    github: Flags.boolean({
      description: 'Configure GitHub defaults',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Config);

    if (flags.get) {
      const value = config.get(flags.get);
      if (value) {
        this.log(value);
      } else {
        this.warn(`No value found for ${flags.get}`);
      }
      return;
    }

    if (flags.set && flags.value) {
      config.set(flags.set, flags.value);
      this.log(chalk.green(`Set ${flags.set} to ${flags.value}`));
      return;
    }

    if (flags.github) {
      await this.configureGitHub();
      return;
    }

    // Interactive setup
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'githubToken',
        message: 'Enter your GitHub personal access token:',
        validate: (input: string) => input.length > 0 || 'Token is required',
      },
      {
        type: 'input',
        name: 'slackToken',
        message: 'Enter your Slack API token (optional):',
      },
      {
        type: 'input',
        name: 'linearToken',
        message: 'Enter your Linear API token (optional):',
      },
      {
        type: 'confirm',
        name: 'configureGitHub',
        message: 'Would you like to configure GitHub defaults?',
        default: true,
      },
    ]);

    config.set('github.token', answers.githubToken);
    if (answers.slackToken) config.set('slack.token', answers.slackToken);
    if (answers.linearToken) config.set('linear.token', answers.linearToken);

    if (answers.configureGitHub) {
      await this.configureGitHub();
    }

    this.log(chalk.green('Configuration saved successfully!'));
    this.log(
      chalk.blue(
        'You can now use the CLI to fetch data from configured services.'
      )
    );
  }

  private async configureGitHub() {
    const currentDefaults = config.get('github.defaults') || {};

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'timeframe',
        message: 'Default timeframe (e.g., 1d, 1w, 1m, 1y):',
        default: currentDefaults.timeframe || '1w',
        validate: (input: string) => {
          try {
            config.parseTimeframe(input);
            return true;
          } catch (error) {
            return 'Invalid timeframe format. Use format: 1d, 1w, 1m, 1y';
          }
        },
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Default branch:',
        default: currentDefaults.branch || 'main',
      },
      {
        type: 'input',
        name: 'author',
        message: 'Default author (leave empty for all):',
        default: currentDefaults.author || '',
      },
      {
        type: 'list',
        name: 'prState',
        message: 'Default PR state:',
        choices: ['all', 'open', 'closed'],
        default: currentDefaults.prState || 'all',
      },
    ]);

    config.set('github.defaults', answers);
    this.log(chalk.green('GitHub defaults configured successfully!'));
  }
}
