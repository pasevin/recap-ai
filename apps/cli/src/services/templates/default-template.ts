/**
 * Default summary template
 *
 * This template provides a balanced structure for technical team standups
 * with clear sections for completed work, current activities, and future plans.
 */

import { SummaryTemplate } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the markdown template at module initialization
const markdownTemplatePath = join(
  __dirname,
  'markdown-templates',
  'default-standup.md'
);
const markdownTemplateContent = readFileSync(markdownTemplatePath, 'utf-8');

// Extract optional frontmatter-style JSON block for normalization rules
// and strip markdownlint on/off comment artifacts so they don't appear in output
function parseFrontmatterJson(md: string): {
  body: string;
  frontmatter?: unknown;
} {
  // Strip markdownlint enable/disable comment blocks anywhere in the template
  const withoutLint = md.replace(
    /<!--\s*markdownlint-(?:disable|enable)[\s\S]*?-->\s*/gi,
    ''
  );

  // Allow frontmatter to appear even if not at very start (after comments/whitespace)
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

export const defaultTemplate: SummaryTemplate = {
  metadata: {
    id: 'default-standup-v1',
    name: 'Standup Summary (Default)',
    description: 'Comprehensive standup summary for engineering teams',
    version: '2.0.0',
    useCases: ['team-standups', 'weekly-updates', 'progress-reports'],
    formats: ['summary', 'markdown'],
    perspectives: ['first-person', 'third-person'],
  },

  systemPromptPrefix: `You are a senior engineer creating a professional activity summary for a team standup. Your goal is to provide clear, actionable insights about recent work.`,

  formattingRules: [
    'Follow the EXACT markdown template structure provided',
    'Do NOT change any formatting, headings, or structure',
    'Do NOT add or remove sections',
    'Replace [PLACEHOLDERS] with actual content',
    'Use **bold** ONLY where the template specifies',
    'Repository names MUST be bold: **repository-name**',
    'Do NOT generate URLs for GitHub PRs or Linear issues. Leave bare markers like (PR: #123) and **ISSUE-123** as-is; they will be linkified automatically in post-processing.',
    'Linear issue IDs MUST be bold: **ISSUE-123** (no links)',
    'Keep all markdown syntax exactly as shown in the template',
    'Do NOT use emojis or decorative unicode anywhere in the output',
    'Prioritize the most significant achievements by code quantity (lines/files changed) and number of PRs within the same category (e.g., adapter, infra, docs).',
    'The Executive Summary must highlight 2-3 biggest impact themes first (by volume and breadth), then secondary items.',
    'In Most Significant Pull Requests & Commits, surface only the top, high-signal PRs — avoid long tails of minor changes.',
    'Key Technical Highlights should be distilled into the 3-5 most impactful engineering themes (scalability, migrations, major refactors), not generic statements.',
    'Technical Challenges should elevate the hardest problems with root-cause and concrete resolution steps — skip trivial blockers.',
    'In Technical Challenges, include: root cause, blast radius, mitigation, residual risk, and concrete evidence via PR/issue links.',
  ],

  constraints: [
    'CRITICAL: Follow the template EXACTLY - do not deviate from the structure',
    'ONLY use Linear issue identifiers (like PLAT-XXXX) that are EXPLICITLY provided in the data',
    'NEVER invent or make up Linear issue numbers',
    'If GitHub work does not have an associated Linear issue, DO NOT add a fake issue number',
    'Replace ALL [PLACEHOLDERS] with appropriate content EXCEPT in the Summary Statistics table, which the system will fill automatically.',
    'Do NOT attempt to fill the Summary Statistics numbers or repository list; leave placeholders intact if present.',
    'If a section has no data, use the "No [type]" message shown in the template',
    'Do NOT skip any sections that are present in the template',
    'Maintain consistent formatting for all similar items (e.g., all repos formatted the same way)',
    'Emphasize significant achievements: prefer PRs with larger file/line deltas, cross-repo efforts, or migrations over routine chores.',
    'If there are many PRs in a single area, group and summarize them; list only the most representative ones.',
  ],

  markdownTemplate: parsed.body,

  // Sections are optional now since we use the markdown template

  timeframeHandling: {
    displayFormat: 'YYYY-MM-DD to YYYY-MM-DD',
    includeInHeader: true,
    includeInFooter: false,
  },

  perspectiveInstructions: {
    'first-person':
      'Write in first person ("I", "my", etc.) and keep it conversational but professional, like you are talking to your teammates.',
    'third-person':
      'Write in third person, referring to the individual by their name (use the provided perspectiveName) and using third-person pronouns (they/them, he/him, she/her as appropriate).',
  },
  completionMarker: '<!-- RECAP:SUMMARY:END -->',
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
    const markers = (norm.listChildMarkers ?? []).map(
      (m) =>
        new RegExp(
          `^-\\s+(\\*\\*?${m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}|${m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`,
          'i'
        )
    );
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
