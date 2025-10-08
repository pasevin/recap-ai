import { SummaryTemplate } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

const markdownTemplatePath = join(
  __dirname,
  'markdown-templates',
  'self-reflection-performance.md'
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

type Frontmatter = {
  normalization?: {
    listChildMarkers?: string[];
    indentSpaces?: number;
    onlyAfterTopLevelBullet?: boolean;
  };
};

const parsed = parseFrontmatterJson(markdownTemplateContent);

export const selfReflectionPerformanceTemplate: SummaryTemplate = {
  metadata: {
    id: 'self-reflection-performance-v1',
    name: 'Self Reflection – Performance Review',
    description:
      'Structured self-review focused on outcomes, behaviors, and growth',
    version: '1.0.0',
    useCases: ['performance-review', 'self-reflection'],
    formats: ['summary', 'markdown'],
    perspectives: ['first-person', 'third-person'],
  },

  systemPromptPrefix:
    'You are writing a self-reflection for a performance review. Be honest, outcome-oriented, and specific about behaviors and growth areas.',

  formattingRules: [
    'Follow the EXACT markdown template structure provided',
    'Use concrete examples and measurable outcomes',
    'Tie behaviors to principles/competencies where relevant',
  ],

  constraints: [
    'Do NOT invent metrics or projects; use provided data only',
    'If a section is not applicable, leave the placeholder',
  ],

  markdownTemplate: parsed.body,

  timeframeHandling: {
    displayFormat: 'YYYY-MM-DD to YYYY-MM-DD',
    includeInHeader: true,
    includeInFooter: false,
  },

  perspectiveInstructions: {
    'first-person': 'Use first-person voice with reflective, accountable tone.',
    'third-person':
      'Use third-person voice referencing the individual by perspectiveName.',
  },

  normalizationRules: (() => {
    const fm = parsed.frontmatter as Frontmatter | undefined;
    const norm = fm?.normalization;
    if (!norm) return undefined;
    const markers = (norm.listChildMarkers ?? []).map((m) => {
      const escaped = m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Match a top-level bullet line starting with "- ", followed by either **Marker or Marker
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
