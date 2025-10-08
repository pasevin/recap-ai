import { Command, Flags } from '@oclif/core';
import { templateRegistry } from '../services/templates/registry';

export default class Templates extends Command {
  static description = 'List available summary templates';

  static examples = [
    '<%= config.bin %> templates',
    '<%= config.bin %> templates --format json',
  ];

  static flags = {
    format: Flags.string({
      char: 'f',
      description: 'Output format (json|text)',
      options: ['json', 'text'],
      default: 'json',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Templates);

    const templates = templateRegistry.listAll().map((t) => ({
      id: t.metadata.id,
      name: t.metadata.name,
      description: t.metadata.description,
      version: t.metadata.version,
      formats: t.metadata.formats,
      perspectives: t.metadata.perspectives,
      useCases: t.metadata.useCases,
    }));

    if (flags.format === 'text') {
      templates.forEach((tpl) => {
        // eslint-disable-next-line no-console
        console.log(
          `${tpl.id} - ${tpl.name} (v${tpl.version})\n  formats: ${tpl.formats.join(', ')}\n  perspectives: ${tpl.perspectives.join(', ')}\n  useCases: ${tpl.useCases.join(', ')}\n  ${tpl.description}`
        );
      });
      return;
    }

    // Default JSON output
    this.log(JSON.stringify({ templates }, null, 2));
  }
}
