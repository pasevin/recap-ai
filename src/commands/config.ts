import { Args, Command, Flags } from '@oclif/core';
import { config } from '../utils/config';
import chalk from 'chalk';
import password from '@inquirer/password';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import number from '@inquirer/number';

export default class Config extends Command {
  static description = 'Configure API tokens and settings';

  static examples = [
    '$ recap config setup',
    '$ recap config set github.token YOUR_TOKEN',
    '$ recap config set linear.token YOUR_TOKEN',
    '$ recap config get github.token',
    '$ recap config get linear.token',
    '$ recap config github',
    '$ recap config linear',
  ];

  static flags = {
    setup: Flags.boolean({
      description: 'Run the setup wizard',
      exclusive: ['github', 'linear'],
    }),
    github: Flags.boolean({
      description: 'Configure GitHub settings',
      exclusive: ['setup', 'linear'],
    }),
    linear: Flags.boolean({
      description: 'Configure Linear settings',
      exclusive: ['setup', 'github'],
    }),
  };

  static args = {
    action: Args.string({
      description: 'Action to perform (get/set)',
      required: false,
      options: ['get', 'set'],
    }),
    key: Args.string({
      description: 'Config key to get/set',
      required: false,
    }),
    value: Args.string({
      description: 'Value to set for the given key',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Config);

    if (flags.setup) {
      await this.runSetup();
      return;
    }

    if (flags.github) {
      await this.configureGitHub();
      return;
    }

    if (flags.linear) {
      await this.configureLinear();
      return;
    }

    if (args.action === 'get') {
      if (!args.key) {
        this.error('Please provide a key to get');
        return;
      }
      const value = config.get(args.key);
      if (value === undefined) {
        this.log(chalk.yellow(`No value found for key: ${args.key}`));
      } else {
        this.log(value);
      }
      return;
    }

    if (args.action === 'set') {
      if (!args.key || !args.value) {
        this.error('Please provide both key and value to set');
        return;
      }
      config.set(args.key, args.value);
      this.log(chalk.green('Config updated successfully'));
      return;
    }

    this.error(
      'Please provide a valid action (get/set) or use --setup/--github/--linear flags'
    );
  }

  private async runSetup(): Promise<void> {
    this.log(chalk.bold('Welcome to recap-ai setup!'));
    this.log("Let's configure your API tokens and settings.\n");

    const shouldConfigureGitHub = await confirm({
      message: 'Would you like to configure GitHub?',
      default: true,
    });

    if (shouldConfigureGitHub) {
      await this.configureGitHub();
    }

    const shouldConfigureLinear = await confirm({
      message: 'Would you like to configure Linear?',
      default: true,
    });

    if (shouldConfigureLinear) {
      await this.configureLinear();
    }

    this.log(chalk.green('\nSetup complete! You can now use recap-ai.'));
  }

  private async configureGitHub(): Promise<void> {
    this.log(chalk.bold('\nGitHub Configuration'));
    this.log(
      "You'll need your GitHub Personal Access Token. You can create one at:\n" +
        'https://github.com/settings/tokens?type=beta\n' +
        'Ensure it has the following permissions:\n' +
        '- Read access to code and metadata\n' +
        '- Read access to pull requests\n'
    );

    const token = await password({
      message: 'Enter your GitHub Personal Access Token:',
      mask: '*',
    });

    const timeframe = await input({
      message: 'Enter default timeframe (e.g., 1d, 1w, 1m):',
      default: '2w',
      validate: (value: string) => {
        try {
          config.parseTimeframe(value);
          return true;
        } catch (error) {
          return 'Invalid timeframe format. Use format: <number><unit>, e.g., 1d, 1w, 1m';
        }
      },
    });

    const branch = await input({
      message: 'Enter default branch:',
      default: 'main',
    });

    const author = await input({
      message: 'Enter default author (GitHub username):',
      default: '',
    });

    config.set('github.token', token);
    config.set('github.defaults', {
      timeframe,
      branch: branch || undefined,
      author: author || undefined,
      prState: 'all',
    });

    this.log(chalk.green('\nGitHub configuration saved!'));
  }

  private async configureLinear(): Promise<void> {
    this.log(chalk.bold('\nLinear Configuration'));
    this.log(
      "You'll need your Linear API Key. You can create one at:\n" +
        'https://linear.app/settings/api\n'
    );

    const token = await password({
      message: 'Enter your Linear API Key:',
      mask: '*',
    });

    const teamId = await input({
      message: 'Enter your Linear Team ID:',
      default: '',
    });

    const timeframe = await input({
      message: 'Enter default timeframe (e.g., 1d, 1w, 1m):',
      default: '2w',
      validate: (value: string) => {
        try {
          config.parseTimeframe(value);
          return true;
        } catch (error) {
          return 'Invalid timeframe format. Use format: <number><unit>, e.g., 1d, 1w, 1m';
        }
      },
    });

    const limit = await number({
      message: 'Enter default limit for number of issues:',
      default: 1000,
      validate: (value: number | undefined) => {
        if (!value || value < 1 || value > 1000) {
          return 'Limit must be between 1 and 1000';
        }
        return true;
      },
    });

    config.set('linear.token', token);
    config.set('linear.defaults', {
      teamId: teamId || undefined,
      timeframe,
      state: 'all',
      limit,
    });

    this.log(chalk.green('\nLinear configuration saved!'));
  }
}
