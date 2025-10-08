/**
 * Template system for AI-generated summaries
 *
 * This module defines the structure for summary templates that enforce
 * consistent formatting while allowing flexibility in content generation.
 */

import { NarrativePerspective } from '@recap-ai/shared';

/**
 * Defines a single section in the summary template
 */
export interface TemplateSection {
  /** Unique identifier for this section */
  id: string;

  /** Display name/heading for the section */
  name: string;

  /** Whether this section is required in the output */
  required: boolean;

  /** Instructions for the AI on what to include in this section */
  instruction: string;

  /** What data sources this section should pull from */
  dataSources: ('github' | 'linear' | 'both')[];

  /** Markdown format hints (e.g., list, paragraph, table) */
  format: 'paragraph' | 'list' | 'table' | 'blockquote' | 'heading';

  /** Child sections (for nested structure) */
  subsections?: TemplateSection[];

  /** Conditional rendering based on data availability */
  showWhen?: {
    hasGitHubData?: boolean;
    hasLinearData?: boolean;
    hasCommits?: boolean;
    hasPullRequests?: boolean;
    hasIssues?: boolean;
    hasActiveLinearIssues?: boolean;
  };
}

/**
 * Template metadata and configuration
 */
export interface TemplateMetadata {
  /** Unique template identifier */
  id: string;

  /** Human-readable template name */
  name: string;

  /** Description of what this template is for */
  description: string;

  /** Template version for tracking changes */
  version: string;

  /** Who this template is designed for (use cases) */
  useCases: string[];

  /** Compatible output formats */
  formats: ('summary' | 'markdown')[];

  /** Supported perspectives */
  perspectives: NarrativePerspective[];
}

/**
 * Complete template definition
 */
export interface SummaryTemplate {
  /** Template metadata */
  metadata: TemplateMetadata;

  /** System prompt prefix that sets the context */
  systemPromptPrefix: string;

  /** Overall formatting instructions */
  formattingRules: string[];

  /** Constraints and critical rules the AI must follow */
  constraints: string[];

  /** Template sections defining the structure (legacy - for instructional templates) */
  sections?: TemplateSection[];

  /** Markdown template with exact formatting (new approach) */
  markdownTemplate?: string;

  /** How to handle the timeframe in the summary */
  timeframeHandling: {
    displayFormat: string;
    includeInHeader: boolean;
    includeInFooter: boolean;
  };

  /** Perspective-specific instructions */
  perspectiveInstructions?: {
    'first-person'?: string;
    'third-person'?: string;
  };

  /** Optional normalization rules applied to the final markdown output */
  normalizationRules?: {
    /** Rules for fixing list nesting/indentation or related formatting */
    list?: Array<{
      /** Regex patterns that identify child list lines to indent */
      childMarkers: RegExp[];
      /** Number of spaces to indent child lines when needed */
      indentSpaces: number;
      /** If true, only indent when previous non-empty line is a top-level bullet */
      onlyAfterTopLevelBullet?: boolean;
    }>;
  };

  /** Optional explicit completion marker appended by the AI at the very end */
  completionMarker?: string;
}

/**
 * Template rendering context with runtime data
 */
export interface TemplateContext {
  timeframe: string;
  actualDates?: {
    startDate: Date;
    endDate: Date;
  };
  perspective: NarrativePerspective;
  perspectiveName?: string;
  enhanced: boolean;
  hasGitHubData: boolean;
  hasLinearData: boolean;
  hasCommits: boolean;
  hasPullRequests: boolean;
  hasIssues: boolean;
  hasActiveLinearIssues: boolean;
}

/**
 * Result of template rendering
 */
export interface RenderedTemplate {
  /** The complete system prompt to send to the AI */
  systemPrompt: string;

  /** Sections that will be included based on data availability */
  activeSections: string[];

  /** Template metadata for reference */
  templateId: string;

  /** Rendering context used */
  context: TemplateContext;

  /** Completion marker expected at the end of AI output */
  completionMarker?: string;
}
