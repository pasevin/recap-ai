/**
 * Template Renderer
 *
 * Renders summary templates into system prompts for the AI,
 * handling conditional sections and formatting based on available data.
 */

import {
  SummaryTemplate,
  TemplateSection,
  TemplateContext,
  RenderedTemplate,
} from './types';

export class TemplateRenderer {
  /**
   * Render a template into a complete system prompt
   */
  render(
    template: SummaryTemplate,
    context: TemplateContext
  ): RenderedTemplate {
    const activeSections = template.sections
      ? this.getActiveSections(template.sections, context)
      : [];

    const systemPrompt = this.buildSystemPrompt(
      template,
      context,
      activeSections
    );

    return {
      systemPrompt,
      activeSections: activeSections.map((s) => s.id),
      templateId: template.metadata.id,
      context,
    };
  }

  /**
   * Filter sections based on data availability and conditions
   */
  private getActiveSections(
    sections: TemplateSection[],
    context: TemplateContext
  ): TemplateSection[] {
    const active: TemplateSection[] = [];

    for (const section of sections) {
      // Check if section should be shown based on conditions
      if (this.shouldShowSection(section, context)) {
        // Process subsections recursively
        const activeSubsections = section.subsections
          ? this.getActiveSections(section.subsections, context)
          : [];

        // Include section if it's required or has active subsections
        if (section.required || activeSubsections.length > 0) {
          active.push({
            ...section,
            subsections:
              activeSubsections.length > 0 ? activeSubsections : undefined,
          });
        }
      }
    }

    return active;
  }

  /**
   * Check if a section should be displayed based on context
   */
  private shouldShowSection(
    section: TemplateSection,
    context: TemplateContext
  ): boolean {
    if (!section.showWhen) {
      return true; // No conditions, always show
    }

    const conditions = section.showWhen;

    // Check all conditions
    if (conditions.hasGitHubData !== undefined) {
      if (conditions.hasGitHubData !== context.hasGitHubData) {
        return false;
      }
    }

    if (conditions.hasLinearData !== undefined) {
      if (conditions.hasLinearData !== context.hasLinearData) {
        return false;
      }
    }

    if (conditions.hasCommits !== undefined) {
      if (conditions.hasCommits !== context.hasCommits) {
        return false;
      }
    }

    if (conditions.hasPullRequests !== undefined) {
      if (conditions.hasPullRequests !== context.hasPullRequests) {
        return false;
      }
    }

    if (conditions.hasIssues !== undefined) {
      if (conditions.hasIssues !== context.hasIssues) {
        return false;
      }
    }

    if (conditions.hasActiveLinearIssues !== undefined) {
      if (conditions.hasActiveLinearIssues !== context.hasActiveLinearIssues) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build the complete system prompt from template
   */
  private buildSystemPrompt(
    template: SummaryTemplate,
    context: TemplateContext,
    activeSections: TemplateSection[]
  ): string {
    const lines: string[] = [];

    // Add system prompt prefix
    lines.push(template.systemPromptPrefix);
    lines.push('');

    // Add perspective instructions
    const perspectiveInstruction =
      template.perspectiveInstructions?.[context.perspective];
    if (perspectiveInstruction) {
      lines.push(perspectiveInstruction);
      if (context.perspective === 'third-person' && context.perspectiveName) {
        lines.push(
          `When referring to the individual by name, ALWAYS use: **${context.perspectiveName}** (with bold formatting)`
        );
      }
      lines.push('');
    }

    // Add timeframe context
    if (context.actualDates) {
      const startDate = context.actualDates.startDate
        .toISOString()
        .split('T')[0];
      const endDate = context.actualDates.endDate.toISOString().split('T')[0];
      lines.push(`This summary covers: ${startDate} to ${endDate}`);
      lines.push(`Timeframe reference: ${context.timeframe}`);
      lines.push('');
    }

    // If markdown template is provided, use prescriptive approach
    if (template.markdownTemplate) {
      lines.push('## CRITICAL: Use This Exact Template');
      lines.push('');
      lines.push(
        'You MUST fill in the template below EXACTLY. Do NOT wrap it in code fences. Do NOT add any markdown code block syntax. Only replace content inside [SQUARE BRACKETS].'
      );
      lines.push('');
      lines.push('TEMPLATE TO FILL (output this directly as markdown):');
      lines.push('');
      lines.push('--- TEMPLATE START ---');
      lines.push(template.markdownTemplate);
      lines.push('--- TEMPLATE END ---');
      lines.push('');
      lines.push('## Formatting Rules:');
      template.formattingRules.forEach((rule) => {
        lines.push(`- ${rule}`);
      });
      lines.push('');
      lines.push('## CRITICAL CONSTRAINTS:');
      template.constraints.forEach((constraint) => {
        lines.push(`- ${constraint}`);
      });
      lines.push('');
      lines.push('## Final Instructions:');
      lines.push(
        '- Template-specific constraints override any general instructions below. If there is a conflict, follow the constraints.'
      );
      lines.push('- Output ONLY the filled template as raw markdown');
      lines.push('- Do NOT wrap your output in ```markdown code fences');
      lines.push('- Do NOT add introductory or concluding remarks');
      lines.push('- Do NOT change any markdown syntax or structure');
      lines.push(
        '- Replace [PLACEHOLDERS] with actual content from the provided data EXCEPT where the template constraints instruct you to preserve placeholders (e.g., Summary Statistics, URLs).'
      );
      lines.push('- Maintain exact spacing, indentation, and formatting');
      lines.push(
        '- Output should start directly with the blockquote (>) character'
      );
      lines.push('');
      if (template.completionMarker) {
        lines.push('## Completion Marker:');
        lines.push(
          `At the very end of your output (after everything else), add this exact marker on a new line: ${template.completionMarker}`
        );
        lines.push(
          'This is required to confirm the summary is fully generated.'
        );
        lines.push('');
      }
    } else {
      // Fall back to instructional approach (legacy)
      // Add formatting rules
      lines.push('## Formatting Rules:');
      template.formattingRules.forEach((rule) => {
        lines.push(`- ${rule}`);
      });
      // Enforce: no emojis or decorative unicode in output
      lines.push(
        '- Do NOT use emojis or decorative unicode characters in any section'
      );
      lines.push('');

      // Add constraints
      lines.push('## CRITICAL CONSTRAINTS:');
      template.constraints.forEach((constraint) => {
        lines.push(`- ${constraint}`);
      });
      lines.push('');

      // Add structure instructions
      lines.push('## Required Structure:');
      lines.push('');
      lines.push(
        'You MUST follow this EXACT structure in your output. Do not skip sections or rearrange them:'
      );
      lines.push('');

      // Add section structure
      this.addSectionStructure(lines, activeSections, context);

      // Add final instructions
      lines.push('');
      lines.push('## Final Instructions:');
      lines.push('- Follow the structure EXACTLY as defined above');
      lines.push('- Include ALL required sections');
      lines.push('- Use the specified markdown formatting for each section');
      lines.push(
        '- If a section has no data, state that clearly rather than omitting it'
      );
      lines.push('- Be concise but complete');
      lines.push('- Focus on technical substance over metrics');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Add section structure to prompt
   */
  private addSectionStructure(
    lines: string[],
    sections: TemplateSection[],
    context: TemplateContext,
    depth: number = 0
  ): void {
    const indent = '  '.repeat(depth);

    for (const section of sections) {
      // Add section heading
      const requiredBadge = section.required ? '[REQUIRED]' : '[OPTIONAL]';
      const formatHint = this.getFormatHint(section.format);

      lines.push(`${indent}${requiredBadge} **${section.name}** ${formatHint}`);
      lines.push(`${indent}  Instruction: ${section.instruction}`);

      // Add data source info
      const sources = section.dataSources.join(', ');
      lines.push(`${indent}  Data sources: ${sources}`);

      // Add subsections
      if (section.subsections && section.subsections.length > 0) {
        lines.push(`${indent}  Subsections:`);
        this.addSectionStructure(
          lines,
          section.subsections,
          context,
          depth + 1
        );
      }

      lines.push('');
    }
  }

  /**
   * Get format hint for section
   */
  private getFormatHint(format: TemplateSection['format']): string {
    switch (format) {
      case 'paragraph':
        return '(format: paragraph)';
      case 'list':
        return '(format: bullet list)';
      case 'table':
        return '(format: table)';
      case 'blockquote':
        return '(format: blockquote >)';
      case 'heading':
        return '(format: markdown heading)';
      default:
        return '';
    }
  }

  /**
   * Apply template-defined normalization to a generated markdown string
   */
  public applyNormalization(
    template: SummaryTemplate,
    markdown: string
  ): string {
    if (!template.normalizationRules) return markdown;

    let output = markdown;

    // List normalization: ensure child markers are indented
    if (
      template.normalizationRules.list &&
      template.normalizationRules.list.length
    ) {
      const lines = output.split('\n');

      const isTopLevelBullet = (s: string) => /^-\s+/.test(s);

      for (const rule of template.normalizationRules.list) {
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          const leadingSpaces = (line.match(/^\s*/) || [''])[0].length;
          const trimmed = line.trimStart();

          const matchesChild = rule.childMarkers.some((re) => re.test(trimmed));
          if (!matchesChild) continue;

          // Optionally ensure previous non-empty line is a top-level bullet
          if (rule.onlyAfterTopLevelBullet) {
            let j = i - 1;
            while (j >= 0 && lines[j].trim() === '') j -= 1;
            if (j < 0 || !isTopLevelBullet(lines[j].trimStart())) continue;
          }

          if (leadingSpaces < rule.indentSpaces) {
            lines[i] = ' '.repeat(rule.indentSpaces) + trimmed;
          }
        }
      }

      output = lines.join('\n');
    }

    return output;
  }
}

// Export singleton instance
export const templateRenderer = new TemplateRenderer();
