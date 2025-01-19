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
    setup: Flags.boolean({
      description: 'Run interactive setup',
    }),
    github: Flags.boolean({
      description: 'Configure GitHub defaults',
    }),
    linear: Flags.boolean({
      description: 'Configure Linear defaults',
    }),
    get: Flags.string({
      description: 'Get config value',
    }),
    set: Flags.string({
      description: 'Set config value',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Config);

    if (flags.setup) {
      await this.runSetup();
    } else if (flags.github) {
      await this.configureGitHub();
    } else if (flags.linear) {
      await this.configureLinear();
    } else if (flags.get) {
      this.getConfig(flags.get);
    } else if (flags.set) {
      await this.setConfig();
    } else {
      this.error('No command specified');
    }
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

  private async configureLinear() {
    try {
      console.log('Starting Linear configuration...');
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'token',
          message: 'Enter your Linear API token:',
          when: !config.get('linear.token'),
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Token cannot be empty';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'teamId',
          message: 'Enter your default Linear team ID (optional):',
        },
        {
          type: 'input',
          name: 'timeframe',
          message: 'Enter default timeframe (e.g., 1w, 2w, 1m):',
          default: '1w',
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
          type: 'list',
          name: 'state',
          message: 'Select default issue state:',
          choices: ['all', 'open', 'closed'],
          default: 'all',
        },
      ]);

      console.log('Answers received:', answers);

      if (answers.token) {
        config.set('linear.token', answers.token);
      }

      config.set('linear.defaults', {
        teamId: answers.teamId || undefined,
        timeframe: answers.timeframe,
        state: answers.state,
      });

      this.log(chalk.green('Linear configuration updated successfully'));
    } catch (error) {
      console.error('Error during Linear configuration:', error);
      throw error;
    }
  }

  private async runSetup() {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureGitHub',
        message: 'Would you like to configure GitHub?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'configureLinear',
        message: 'Would you like to configure Linear?',
        default: true,
      },
    ]);

    if (answers.configureGitHub) {
      await this.configureGitHub();
    }

    if (answers.configureLinear) {
      await this.configureLinear();
    }

    this.log(chalk.green('Setup completed successfully'));
  }

  private getConfig(key: string) {
    const value = config.get(key);
    if (value) {
      this.log(value);
    } else {
      this.warn(`No value found for ${key}`);
    }
  }

  private async setConfig() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'key',
        message: 'Enter the configuration key:',
      },
      {
        type: 'input',
        name: 'value',
        message: 'Enter the configuration value:',
      },
    ]);

    config.set(answers.key, answers.value);
    this.log(chalk.green(`Set ${answers.key} to ${answers.value}`));
  }
}
