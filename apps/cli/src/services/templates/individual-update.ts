import { SummaryTemplate } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

const markdownTemplatePath = join(
  __dirname,
  'markdown-templates',
  'individual-update.md'
);
const markdownTemplateContent = readFileSync(markdownTemplatePath, 'utf-8');

function parseFrontmatterJson(md: string): {
  body: string;
  frontmatter?: unknown;
} {
  const withoutLint = md.replace(
    /<!--\s*markdownlint-(?:disable|enable)[\s\S]*?-->\s*/gi,
    ''
  );
  const fmRegex = /(?:^|\n)---json\s*\n([\s\S]*?)\n---\s*\n/;
  const match = withoutLint.match(fmRegex);
  if (!match) return { body: withoutLint };
  try {
    const json = JSON.parse(match[1]);
    const body = withoutLint.replace(match[0], '');
    return { body, frontmatter: json };
  } catch {
    return { body: withoutLint };
  }
}

const parsed = parseFrontmatterJson(markdownTemplateContent);

export const individualWeeklyTemplate: SummaryTemplate = {
  metadata: {
    id: 'individual-weekly-v1',
    name: 'Individual Update',
    description:
      'Concise personal update oriented around impact and priorities',
    version: '1.0.0',
    useCases: ['personal-standups', 'weekly-updates'],
    formats: ['summary', 'markdown'],
    perspectives: ['first-person', 'third-person'],
  },

  systemPromptPrefix:
    'You are writing a concise weekly update for an individual engineer. Prioritize impact, link work to outcomes, and keep it scannable.',

  formattingRules: [
    'Follow the EXACT markdown template structure provided',
    'Use short sentences and bullet points; avoid fluff',
    'Group by themes when helpful',
  ],

  constraints: [
    'Do NOT invent identifiers or metrics',
    'If something is not applicable, leave the placeholder as-is',
  ],

  markdownTemplate: parsed.body,

  timeframeHandling: {
    displayFormat: 'YYYY-MM-DD to YYYY-MM-DD',
    includeInHeader: true,
    includeInFooter: false,
  },

  perspectiveInstructions: {
    'first-person': 'Use first-person voice focused on impact and learnings.',
    'third-person': 'Use third-person voice with the provided perspectiveName.',
  },

  normalizationRules: undefined,
};
