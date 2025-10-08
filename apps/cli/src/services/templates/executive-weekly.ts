import { SummaryTemplate } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the markdown template at module initialization
const markdownTemplatePath = join(
  __dirname,
  'markdown-templates',
  'executive-weekly.md'
);
const markdownTemplateContent = readFileSync(markdownTemplatePath, 'utf-8');

// Extract optional frontmatter-style JSON block for normalization rules
// and strip markdownlint on/off comment artifacts so they don't appear in output
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

export const executiveWeeklyTemplate: SummaryTemplate = {
  metadata: {
    id: 'executive-weekly-v1',
    name: 'Executive Weekly',
    description:
      'Leadership-focused weekly update emphasizing outcomes, risks, and asks',
    version: '1.0.0',
    useCases: ['executive-reports', 'leadership-updates', 'status-reports'],
    formats: ['summary', 'markdown'],
    perspectives: ['third-person', 'first-person'],
  },

  systemPromptPrefix:
    'You are preparing a crisp executive weekly update for leadership. Focus on outcomes, measurable impact, risks, and explicit asks. Keep it concise and decision-oriented.',

  formattingRules: [
    'Follow the EXACT markdown template structure provided',
    'Keep language business-focused and concise',
    'Quantify impact where possible (PR count, lines changed, incidents resolved)',
    'Group related work under clear themes',
    'Do NOT add or remove sections',
  ],

  constraints: [
    'Do NOT invent metrics or issue IDs; only use provided data',
    'If a section has no data, leave the placeholder text as instructed',
    'Always highlight top risks and explicit asks with owners',
  ],

  markdownTemplate: parsed.body,

  timeframeHandling: {
    displayFormat: 'YYYY-MM-DD to YYYY-MM-DD',
    includeInHeader: true,
    includeInFooter: false,
  },

  perspectiveInstructions: {
    'third-person':
      'Write in third person and refer to the individual by the provided perspectiveName.',
    'first-person': 'Write succinctly in first person focused on outcomes.',
  },

  normalizationRules: (() => {
    const fm = parsed.frontmatter as
      | {
          normalization?: {
            listChildMarkers?: string[];
            indentSpaces?: number;
            onlyAfterTopLevelBullet?: boolean;
          };
        }
      | undefined;
    const norm = fm?.normalization;
    if (!norm) return undefined;
    const markers = (norm.listChildMarkers ?? []).map((m) => {
      const escaped = m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = '^-\\s+(?:\\*\\*?' + escaped + '|' + escaped + ')';
      return new RegExp(pattern, 'i');
    });
    return {
      list: [
        {
          childMarkers: markers,
          indentSpaces: norm.indentSpaces ?? 2,
          onlyAfterTopLevelBullet: norm.onlyAfterTopLevelBullet ?? true,
        },
      ],
    };
  })(),
};
