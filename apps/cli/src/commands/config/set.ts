import { Args, Command } from '@oclif/core';
import { config } from '../../utils/config';

export default class ConfigSet extends Command {
  static description = 'Set configuration values';

  static examples = [
    '<%= config.bin %> config set github.token YOUR_TOKEN',
    '<%= config.bin %> config set linear.token YOUR_TOKEN',
    '<%= config.bin %> config set openai.token YOUR_TOKEN',
  ];

  static args = {
    key: Args.string({
      description:
        'Configuration key (e.g., github.token, linear.token, openai.token)',
      required: true,
    }),
    value: Args.string({
      description: 'Configuration value',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(ConfigSet);

    // Validate key format
    if (!args.key.includes('.')) {
      this.error(
        'Invalid key format. Use format like "github.token" or "linear.token"'
      );
    }

    // Validate specific keys
    const validKeys = [
      'github.token',
      'github.owner',
      'github.repo',
      'github.defaults',
      'linear.token',
      'linear.defaults',
      'openai.token',
    ];
    if (!validKeys.includes(args.key)) {
      this.error(`Invalid key. Valid keys are: ${validKeys.join(', ')}`);
    }

    try {
      // Parse value as JSON if it starts with { or [
      const value =
        args.value.trim().startsWith('{') || args.value.trim().startsWith('[')
          ? (JSON.parse(args.value) as Record<string, unknown>)
          : args.value;

      config.set(args.key, value);
      this.log(`Successfully set ${args.key}`);
    } catch (error) {
      this.error(`Failed to set ${args.key}: ${(error as Error).message}`);
    }
  }
}
