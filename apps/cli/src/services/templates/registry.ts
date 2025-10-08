/**
 * Template Registry
 *
 * Central registry for managing summary templates. Supports registering
 * custom templates and retrieving them by ID or use case.
 */

import { SummaryTemplate } from './types';
import { defaultTemplate } from './default-template';
import { executiveWeeklyTemplate } from './executive-update';
import { individualWeeklyTemplate } from './individual-update';
import { selfReflectionPerformanceTemplate } from './self-reflection-performance';

export class TemplateRegistry {
  private templates: Map<string, SummaryTemplate> = new Map();

  constructor() {
    // Register default template
    this.register(defaultTemplate);
    // Register additional templates
    this.register(executiveWeeklyTemplate);
    this.register(individualWeeklyTemplate);
    this.register(selfReflectionPerformanceTemplate);
  }

  /**
   * Register a new template in the registry
   */
  register(template: SummaryTemplate): void {
    if (this.templates.has(template.metadata.id)) {
      console.warn(
        `Template ${template.metadata.id} is already registered. Overwriting...`
      );
    }
    this.templates.set(template.metadata.id, template);
  }

  /**
   * Get a template by ID
   */
  get(templateId: string): SummaryTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get template by ID or return default template
   */
  getOrDefault(templateId?: string): SummaryTemplate {
    if (!templateId) {
      return defaultTemplate;
    }
    return this.templates.get(templateId) ?? defaultTemplate;
  }

  /**
   * Find templates by use case
   */
  findByUseCase(useCase: string): SummaryTemplate[] {
    const results: SummaryTemplate[] = [];
    for (const template of this.templates.values()) {
      if (template.metadata.useCases.includes(useCase)) {
        results.push(template);
      }
    }
    return results;
  }

  /**
   * List all registered templates
   */
  listAll(): SummaryTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * List all template IDs
   */
  listIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get templates compatible with a specific format
   */
  getByFormat(format: 'summary' | 'markdown'): SummaryTemplate[] {
    const results: SummaryTemplate[] = [];
    for (const template of this.templates.values()) {
      if (template.metadata.formats.includes(format)) {
        results.push(template);
      }
    }
    return results;
  }

  /**
   * Check if a template exists
   */
  has(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Remove a template from the registry
   */
  unregister(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Clear all templates (useful for testing)
   */
  clear(): void {
    this.templates.clear();
  }
}

// Export singleton instance
export const templateRegistry = new TemplateRegistry();
