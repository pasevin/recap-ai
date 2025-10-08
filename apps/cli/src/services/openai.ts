import { OpenAI } from 'openai';
import { Config } from './config';
import { ConfigManager } from '../utils/config';
import {
  GitHubReview,
  GitHubComment,
  GitHubLabel,
} from '../interfaces/github-types';
import { normalizeIdentifier } from '../utils/author';
import {
  NarrativePerspective,
  SummaryConfig,
  formatPerspectiveDisplayName,
  formatThirdPersonSentence,
} from '@recap-ai/shared';
import {
  templateRegistry,
  templateRenderer,
  TemplateContext,
} from './templates';

export interface ActivityData {
  github?: {
    commits: Array<{
      sha: string;
      message: string;
      date: string;
      author: string;
      repository?: string;
      files?: Array<{
        filename: string;
        additions: number;
        deletions: number;
        changes: number;
      }>;
      pullRequest?: {
        number: number;
        title: string;
        state: string;
        reviews?: Array<{
          state: string;
          author: string;
        }>;
      };
    }>;
    pullRequests: Array<{
      title: string;
      state: string;
      createdAt: string;
      mergedAt?: string;
      author: string;
      url: string;
      repository?: string;
      labels?: string[];
      reviewComments?: number;
      comments?: number;
      body?: string;
      enhancedData?: {
        url?: string;
        repository?: string;
        labels?: GitHubLabel[];
        filesChanged?: number;
        linesAdded?: number;
        linesDeleted?: number;
        reviews?: GitHubReview[];
        comments?:
          | GitHubComment[]
          | Array<{
              author: string;
              body: string;
              created_at: string;
            }>;
        files?: Array<{
          filename: string;
          additions: number;
          deletions: number;
          changes: number;
          patch?: string;
        }>;
      };
    }>;
    issues?: Array<{
      title: string;
      state: string;
      createdAt: string;
      closedAt?: string;
      author: string;
      url: string;
      repository?: string;
      labels?: string[];
      body?: string;
      enhancedData?: {
        commentCount?: number;
        comments?: Array<{
          author: string;
          body: string;
          created_at: string;
        }>;
      };
    }>;
    statistics?: {
      totalCommits: number;
      totalPRs: number;
      totalIssues: number;
      totalReviews: number;
      avgFilesPerCommit: number;
      avgLinesChanged: number;
      topContributors: { author: string; count: number }[];
      topLabels: { label: string; count: number }[];
    };
  };
  linear?: {
    issues?: Array<{
      id: string;
      identifier: string;
      title: string;
      state: {
        name: string;
        type: string;
      };
      priority: number;
      labels: {
        nodes: Array<{
          name: string;
        }>;
      };
      cycle?: {
        id: string;
        number: number;
        startsAt: string;
        endsAt: string;
      };
    }>;
    activeIssues?:
      | Array<{
          id: string;
          identifier: string;
          title: string;
          state: {
            name: string;
            type: string;
          };
          priority: number;
          labels: {
            nodes: Array<{
              name: string;
            }>;
          };
          cycle?: {
            id: string;
            number: number;
            startsAt: string;
            endsAt: string;
          };
        }>
      | number; // Support both array and number for backwards compatibility
    summary?: {
      totalIssues: number;
      openIssues: number;
      closedIssues: number;
      stateBreakdown: Record<string, number>;
      priorityBreakdown: Record<string, number>;
    };
  };
}

export class OpenAIService {
  private client: OpenAI;

  constructor(private config: Config | ConfigManager) {
    const apiKeyRaw = this.config.get('openai.token');
    if (!apiKeyRaw || typeof apiKeyRaw !== 'string') {
      throw new Error('OpenAI API key is required');
    }
    const apiKey = apiKeyRaw as string;
    this.client = new OpenAI({ apiKey });
  }
  // Expose the exact formatted activity data fed to the model (for debugging/UX)
  public getFormattedActivityData(
    data: ActivityData,
    enhanced: boolean = false,
    fullContext: boolean = false
  ): string {
    return this.formatActivityData(data, enhanced, fullContext);
  }

  async generateActivitySummary(
    data: ActivityData,
    timeframe: string,
    enhanced: boolean = false,
    _format: 'summary' | 'markdown' = 'summary',
    actualDates?: { startDate: Date; endDate: Date },
    perspectiveOverride?: NarrativePerspective,
    perspectiveNameOverride?: string,
    templateId?: string,
    options?: { fullContext?: boolean }
  ): Promise<string> {
    const transformedData = this.filterActivityData(data);
    const perspective = perspectiveOverride ?? this.getNarrativePerspective();
    const perspectiveName =
      perspectiveNameOverride ?? this.getPerspectiveName(perspectiveOverride);

    // Build template context from activity data
    const templateContext = this.buildTemplateContext(
      transformedData,
      timeframe,
      actualDates,
      perspective,
      perspectiveName,
      enhanced
    );

    // Get template and render it
    const template = templateRegistry.getOrDefault(templateId);
    const renderedTemplate = templateRenderer.render(template, templateContext);
    const systemPrompt = renderedTemplate.systemPrompt;

    // Format activity data for the user prompt
    const userPrompt = this.formatActivityData(
      transformedData,
      enhanced,
      options?.fullContext === true
    );
    const focusAreas = this.extractFocusAreas(transformedData);
    const metadata: Record<string, string> = {
      timeframe,
      templateId: template.metadata.id,
      templateVersion: template.metadata.version,
    };

    if (focusAreas.length > 0) {
      metadata.focusAreas = focusAreas.join(', ');
    }

    try {
      // Get the configured model or use a default
      const model = await this.getConfiguredModel();

      // GPT-5 models don't support temperature parameter
      const isGpt5Model = model.includes('gpt-5');

      // Dynamically scale output tokens with timeframe length
      let maxOutputTokens = enhanced ? 3000 : 2000;
      if (actualDates?.startDate && actualDates?.endDate) {
        const days = Math.max(
          1,
          Math.ceil(
            (actualDates.endDate.getTime() - actualDates.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        if (days > 90 && days <= 180) maxOutputTokens = 5000;
        else if (days > 180 && days <= 365) maxOutputTokens = 7000;
        else if (days > 365) maxOutputTokens = 9000;
      }

      const requestParams: Record<string, unknown> = {
        model: model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        text: {
          format: {
            type: 'text',
          },
        },
        reasoning: {},
        tools: [],
        top_p: 1,
        max_output_tokens: maxOutputTokens,
        store: true,
        metadata,
      };

      // Only add temperature for non-GPT-5 models
      if (!isGpt5Model) {
        requestParams.temperature = 0.5;
      }

      const response = await this.client.responses.create(requestParams);

      // Extract text from Responses API with robust fallbacks
      let outputText = this.extractTextFromResponse(response);

      if (!outputText) {
        // Fallback to chat completions if Responses API text is missing
        const chatText = await this.fallbackChatCompletion(
          model,
          systemPrompt,
          userPrompt,
          enhanced,
          isGpt5Model,
          maxOutputTokens
        );
        if (chatText && typeof chatText === 'string') {
          outputText = chatText;
        }
      }

      if (outputText && typeof outputText === 'string') {
        // Clean up the output - remove code fences if AI added them
        const cleanedOutput = this.cleanupAIOutput(outputText);

        // Apply requested perspective
        const perspectiveApplied = this.applyPerspectiveToSummary(
          cleanedOutput,
          perspective,
          perspectiveName
        );

        // Normalize markdown structure for consistent nested list indentation
        // Apply template-specific normalization rules (lists, indentation)
        const normalized = templateRenderer.applyNormalization(
          template,
          perspectiveApplied
        );
        // Verify completion marker if configured; retry once if missing.
        // If still missing, return best-effort normalized content instead of failing hard.
        if (this.templateHasCompletionMarker(template)) {
          if (!this.hasCompletionMarker(normalized, template)) {
            const retryNormalized = await this.regenerateIfIncomplete(
              requestParams,
              template
            );
            if (!this.hasCompletionMarker(retryNormalized, template)) {
              console.warn(
                'Summary missing completion marker after retry; returning best-effort result.'
              );
              return this.stripCompletionMarker(retryNormalized, template);
            }
            return this.stripCompletionMarker(retryNormalized, template);
          }
          return this.stripCompletionMarker(normalized, template);
        }

        return normalized;
      }

      // Log to stderr for debugging without polluting stdout
      console.error('Could not extract text from OpenAI response');
      // Build a minimal fallback summary so the request doesn't return empty content
      return this.buildFallbackSummary(transformedData, timeframe, actualDates);
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate activity summary');
    }
  }

  /**
   * Clean up AI output - remove code fences if present
   */
  private cleanupAIOutput(output: string): string {
    let cleaned = output.trim();

    // Remove markdown code fences if AI wrapped the output
    const codeBlockPattern = /^```(?:markdown)?\n([\s\S]*?)\n```$/;
    const match = cleaned.match(codeBlockPattern);

    if (match) {
      cleaned = match[1].trim();
    }

    // Remove any leading/trailing code fence markers that might be partial
    cleaned = cleaned.replace(/^```(?:markdown)?\n/, '');
    cleaned = cleaned.replace(/\n```$/, '');

    return cleaned.trim();
  }

  /**
   * Ensure completion marker is present at the end; if missing, we retry once.
   * If still missing, throw an error so caller can inform the user.
   */
  private async regenerateIfIncomplete(
    originalRequest: Record<string, unknown>,
    template: ReturnType<typeof templateRegistry.getOrDefault>
  ): Promise<string> {
    const retryResponse = await this.client.responses.create(originalRequest);
    const retryOutput = this.extractTextFromResponse(retryResponse) ?? '';
    const cleaned = this.cleanupAIOutput(retryOutput);
    const perspective = this.getNarrativePerspective();
    const perspectiveName = this.getPerspectiveName();
    const perspectiveApplied = this.applyPerspectiveToSummary(
      cleaned,
      perspective,
      perspectiveName
    );
    const normalized = templateRenderer.applyNormalization(
      template,
      perspectiveApplied
    );
    return normalized;
  }

  /**
   * Extract plain text from a Responses API result regardless of SDK shape.
   * Tries output_text, then walks output[].content[].text, then chat choices.
   */
  private extractTextFromResponse(response: unknown): string | undefined {
    try {
      const r = response as Record<string, unknown>;
      // 1) Direct output_text (preferred by Responses API)
      const direct = (r as { output_text?: unknown }).output_text;
      if (typeof direct === 'string' && direct.trim()) return direct;

      // 2) output array → message.content[] → text
      const output = (r as { output?: unknown }).output as
        | Array<Record<string, unknown>>
        | undefined;
      if (Array.isArray(output)) {
        for (const item of output) {
          // Some SDK responses nest text under message.content or item.content arrays
          const message = item?.message as Record<string, unknown> | undefined;
          const msgContent = message?.content as
            | Array<Record<string, unknown>>
            | string
            | undefined;
          if (typeof msgContent === 'string' && msgContent.trim())
            return msgContent;
          if (Array.isArray(msgContent)) {
            const txt = this.extractFromContentArray(msgContent);
            if (txt) return txt;
          }

          const content = item?.content as
            | Array<Record<string, unknown>>
            | undefined;
          if (Array.isArray(content)) {
            const txt = this.extractFromContentArray(content);
            if (txt) return txt;
          }
        }
      }

      // 3) Chat-style choices fallback
      const choices = (r as { choices?: unknown }).choices as
        | Array<Record<string, unknown>>
        | undefined;
      if (Array.isArray(choices) && choices.length > 0) {
        const first = choices[0] as Record<string, unknown>;
        const message = first?.message as Record<string, unknown> | undefined;
        const content = message?.content as unknown;
        if (typeof content === 'string' && content.trim()) return content;
        if (Array.isArray(content) && content.length > 0) {
          const firstPart = content[0] as Record<string, unknown>;
          const t =
            (firstPart?.text as string | undefined) ??
            (firstPart?.content as string | undefined);
          if (typeof t === 'string' && t.trim()) return t;
        }
      }

      // 4) Generic content string fallback
      const generic = (r as { content?: unknown }).content;
      if (typeof generic === 'string' && generic.trim()) return generic;

      return undefined;
    } catch {
      return undefined;
    }
  }

  private extractFromContentArray(
    content: Array<Record<string, unknown>>
  ): string | undefined {
    for (const c of content) {
      // Responses API often has { type: 'output_text', text: { value: '...' }}
      const textField = c?.text as unknown;
      if (typeof textField === 'string' && textField.trim()) return textField;
      if (textField && typeof textField === 'object') {
        const value = (textField as { value?: unknown }).value;
        if (typeof value === 'string' && value.trim()) return value;
      }
      const outputText = (c?.output_text as string | undefined) ?? undefined;
      if (typeof outputText === 'string' && outputText.trim())
        return outputText;
      const rawContent = (c?.content as string | undefined) ?? undefined;
      if (typeof rawContent === 'string' && rawContent.trim())
        return rawContent;
      const valueField = (c?.value as string | undefined) ?? undefined;
      if (typeof valueField === 'string' && valueField.trim())
        return valueField;
      // Some SDKs nest arrays in text
      if (Array.isArray(textField)) {
        for (const t of textField as Array<unknown>) {
          if (typeof t === 'string' && t.trim()) return t;
          if (t && typeof t === 'object') {
            const v = (t as { value?: unknown }).value;
            if (typeof v === 'string' && v.trim()) return v;
          }
        }
      }
    }
    return undefined;
  }

  private buildFallbackSummary(
    data: ActivityData,
    timeframe: string,
    actualDates?: { startDate: Date; endDate: Date }
  ): string {
    const prCount = data.github?.pullRequests?.length ?? 0;
    const issueCount = data.github?.issues?.length ?? 0;
    const commitCount = data.github?.commits?.length ?? 0;
    const datesLine = actualDates
      ? ` (${actualDates.startDate.toISOString().split('T')[0]} → ${
          actualDates.endDate.toISOString().split('T')[0]
        })`
      : '';

    const lines: string[] = [];
    lines.push(`Activity Overview${datesLine}`);
    lines.push('');
    lines.push(`- Timeframe: ${timeframe}`);
    lines.push(`- Pull Requests: ${prCount}`);
    lines.push(`- Issues: ${issueCount}`);
    if (commitCount > 0) lines.push(`- Commits: ${commitCount}`);
    lines.push('');
    if (prCount > 0) {
      lines.push('Recent Pull Requests:');
      (data.github?.pullRequests ?? []).slice(0, 10).forEach((pr) => {
        lines.push(`- ${pr.title} (${pr.repository ?? ''})`);
      });
    }
    if (issueCount > 0) {
      lines.push('');
      lines.push('Recent Issues:');
      (data.github?.issues ?? []).slice(0, 10).forEach((issue) => {
        lines.push(`- ${issue.title} (${issue.repository ?? ''})`);
      });
    }
    return lines.join('\n');
  }

  private async fallbackChatCompletion(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    _enhanced: boolean,
    isGpt5Model: boolean,
    maxTokens: number
  ): Promise<string | undefined> {
    try {
      // Some environments may still require chat.completions for compatibility
      // We map our prompts to messages and request a single completion
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: Math.max(1500, maxTokens),
        top_p: 1,
      };
      if (!isGpt5Model) {
        body.temperature = 0.5;
      }

      // Use the client's raw fetch as a fallback (API base handled by SDK)
      // The OpenAI SDK may not expose a direct chat endpoint in this version,
      // so we call the REST path via fetch.
      const baseUrl = 'https://api.openai.com/v1';
      const apiKey = (this.config.get('openai.token') as string) ?? '';
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return undefined;
      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      return typeof text === 'string' && text.trim() ? text : undefined;
    } catch {
      return undefined;
    }
  }

  private templateHasCompletionMarker(
    template: ReturnType<typeof templateRegistry.getOrDefault>
  ): boolean {
    return (
      typeof template.completionMarker === 'string' &&
      !!template.completionMarker
    );
  }

  private hasCompletionMarker(
    markdown: string,
    template: ReturnType<typeof templateRegistry.getOrDefault>
  ): boolean {
    const marker = template.completionMarker;
    if (!marker) return true;
    return markdown.trimEnd().endsWith(marker);
  }

  private stripCompletionMarker(
    markdown: string,
    template: ReturnType<typeof templateRegistry.getOrDefault>
  ): string {
    const marker = template.completionMarker;
    if (!marker) return markdown;
    const trimmed = markdown.trimEnd();
    if (trimmed.endsWith(marker)) {
      const without = trimmed.slice(0, trimmed.length - marker.length);
      return without.trimEnd();
    }
    return markdown;
  }

  /**
   * Build template context from activity data
   */
  private buildTemplateContext(
    data: ActivityData,
    timeframe: string,
    actualDates: { startDate: Date; endDate: Date } | undefined,
    perspective: NarrativePerspective,
    perspectiveName: string | undefined,
    enhanced: boolean
  ): TemplateContext {
    const hasGitHubData = !!data.github;
    const hasLinearData = !!data.linear;
    const hasCommits = (data.github?.commits?.length ?? 0) > 0;
    const hasPullRequests = (data.github?.pullRequests?.length ?? 0) > 0;
    const hasIssues = (data.github?.issues?.length ?? 0) > 0;
    const hasActiveLinearIssues =
      Array.isArray(data.linear?.activeIssues) &&
      data.linear.activeIssues.length > 0;

    return {
      timeframe,
      actualDates,
      perspective,
      perspectiveName,
      enhanced,
      hasGitHubData,
      hasLinearData,
      hasCommits,
      hasPullRequests,
      hasIssues,
      hasActiveLinearIssues,
    };
  }

  private getNarrativePerspective(): NarrativePerspective {
    const configValue = this.config.get('summary.perspective');
    if (configValue === 'third-person' || configValue === 'first-person') {
      return configValue;
    }
    return 'first-person';
  }

  private getPerspectiveName(
    _override?: NarrativePerspective
  ): string | undefined {
    const summaryConfig = this.config.get('summary') as
      | SummaryConfig
      | undefined;
    const configuredName = summaryConfig?.name;
    const githubIdentifier = this.getConfiguredGitHubUser();
    const fallbackName =
      typeof configuredName === 'string' && configuredName.trim()
        ? configuredName
        : undefined;

    return formatPerspectiveDisplayName(githubIdentifier, fallbackName);
  }

  private applyPerspectiveToSummary(
    summary: string,
    perspective: NarrativePerspective,
    perspectiveName?: string
  ): string {
    if (perspective !== 'third-person' || !perspectiveName) {
      return summary;
    }

    return summary
      .split('\n')
      .map((line) => formatThirdPersonSentence(line, perspectiveName))
      .join('\n');
  }

  private filterActivityData(data: ActivityData): ActivityData {
    const configuredUser = this.getConfiguredGitHubUser();
    const normalizedConfigured = normalizeIdentifier(configuredUser);

    if (!data.github || !normalizedConfigured) {
      return data;
    }

    const filterByAuthor = <T extends { author: string }>(items: T[]) =>
      items.filter(
        (item) => normalizeIdentifier(item.author) === normalizedConfigured
      );

    return {
      ...data,
      github: {
        ...data.github,
        commits: filterByAuthor(data.github.commits ?? []),
        pullRequests: filterByAuthor(data.github.pullRequests ?? []),
        issues: filterByAuthor(data.github.issues ?? []),
      },
    };
  }

  private extractFocusAreas(data: ActivityData): string[] {
    const focusAreas = new Set<string>();

    (data.github?.pullRequests ?? []).forEach((pr) => {
      const repoName = (pr.repository ?? '').toLowerCase();

      if (!repoName) {
        return;
      }

      if (repoName.includes('ui-builder')) {
        focusAreas.add('OpenZeppelin/ui-builder enhancements');
      }

      if (repoName.includes('stellar')) {
        focusAreas.add('Stellar platform integrations');
      }
    });

    if (data.linear?.activeIssues && Array.isArray(data.linear.activeIssues)) {
      const hasStartedIssues = data.linear.activeIssues.some(
        (issue) => issue.state.type === 'started'
      );
      if (hasStartedIssues) {
        focusAreas.add('Linear issues in progress');
      }
    }

    return Array.from(focusAreas);
  }

  private getConfiguredGitHubUser(): string | undefined {
    const primary = this.config.get('github.defaults.person.identifier');
    if (typeof primary === 'string' && primary.trim()) {
      return primary.trim();
    }

    const fallback = this.config.get('github.defaults.author');
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }

    return undefined;
  }

  private async getConfiguredModel(): Promise<string> {
    // Try to get the configured model from OpenAI config
    const configuredModel = this.config.get('openai.model');
    if (typeof configuredModel === 'string' && configuredModel.trim()) {
      return configuredModel.trim();
    }

    // If no model is configured, fetch the latest available GPT model
    return await this.getLatestAvailableModel();
  }

  private async getLatestAvailableModel(): Promise<string> {
    try {
      // Get the base URL from config or use default
      const baseUrl =
        (this.config.get('openai.baseUrl') as string) ||
        'https://api.openai.com/v1';

      // Get API key for fetching models
      const apiKey = this.config.get('openai.token') as string;
      if (!apiKey) {
        console.warn(
          'No OpenAI API key available for fetching models, using default model'
        );
        return 'gpt-5-mini'; // Default fallback
      }

      // Fetch available models from OpenAI API
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch OpenAI models: ${response.status} ${response.statusText}`
        );
        return 'gpt-5-mini'; // Default fallback
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string; owned_by: string }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        console.warn('Unexpected response format from OpenAI models API');
        return 'gpt-5-mini'; // Default fallback
      }

      // Find the latest GPT model by filtering for GPT models and sorting by version
      // Prioritize GPT-5 over GPT-4 models
      const gptModels = data.data
        .filter(
          (model) =>
            model.id.startsWith('gpt-') &&
            !model.id.includes('instruct') &&
            !model.id.includes('base')
        )
        .sort((a, b) => {
          // First, prioritize GPT-5 over GPT-4
          const aIsGpt5 = a.id.includes('gpt-5') ? 1 : 0;
          const bIsGpt5 = b.id.includes('gpt-5') ? 1 : 0;

          if (aIsGpt5 !== bIsGpt5) {
            return bIsGpt5 - aIsGpt5; // GPT-5 models come first
          }

          // Then sort by version number within the same generation
          const aVersion = this.extractVersionNumber(a.id);
          const bVersion = this.extractVersionNumber(b.id);
          return bVersion - aVersion; // Descending order (newest first)
        });

      if (gptModels.length > 0) {
        const latestModel = gptModels[0].id;
        return latestModel;
      }

      console.warn('No suitable GPT models found in OpenAI API response');
      return 'gpt-4o-mini'; // Default fallback
    } catch (error) {
      console.warn('Error fetching latest OpenAI model:', error);
      return 'gpt-4o-mini'; // Default fallback
    }
  }

  private extractVersionNumber(modelId: string): number {
    // Extract version number from model ID like 'gpt-4o', 'gpt-4.1', 'gpt-5', etc.
    // Handle special cases like 'gpt-4o' which should be treated as version 4.1
    if (modelId.includes('gpt-5')) {
      // GPT-5 models get highest priority (version 5.0+)
      return modelId.includes('gpt-5-turbo') ? 5.1 : 5.0;
    }

    if (modelId.includes('gpt-4o')) {
      return modelId.includes('gpt-4o-mini') ? 4.05 : 4.1;
    }

    if (modelId.includes('gpt-4-turbo')) {
      return 4.2; // GPT-4 Turbo is newer than regular GPT-4
    }

    if (modelId.includes('gpt-4')) {
      return 4.0; // Base GPT-4
    }

    if (modelId.includes('gpt-3.5')) {
      return 3.5;
    }

    const match = modelId.match(/gpt-(\d+(?:\.\d+)?)/);
    if (match) {
      const version = parseFloat(match[1]);
      return isNaN(version) ? 0 : version;
    }
    return 0;
  }

  private formatActivityData(
    data: ActivityData,
    enhanced: boolean = false,
    fullContext: boolean = false
  ): string {
    const sections = [];

    const configuredGitHubUser = this.getConfiguredGitHubUser();

    let validIdentifiers: string[] = [];
    let activeIssuesArray: Array<{
      id: string;
      identifier: string;
      title: string;
      state: {
        name: string;
        type: string;
      };
      priority: number;
      labels: { nodes: Array<{ name: string }> };
      cycle?: {
        id: string;
        number: number;
        startsAt: string;
        endsAt: string;
      };
    }> = [];

    if (data.linear) {
      const baseIssues = data.linear.issues ?? [];
      activeIssuesArray = Array.isArray(data.linear.activeIssues)
        ? data.linear.activeIssues
        : [];

      const allLinearIssues = [...baseIssues, ...activeIssuesArray];
      validIdentifiers = [
        ...new Set(allLinearIssues.map((issue) => issue.identifier)),
      ];
    }

    if (data.linear && Array.isArray(data.linear.activeIssues)) {
      const inProgressIssues = activeIssuesArray.filter(
        (issue) => issue.state.type === 'started'
      );
      const plannedIssues = activeIssuesArray.filter(
        (issue) => issue.state.type === 'unstarted'
      );

      sections.push(`=== LINEAR ISSUES SUMMARY ===
Total Active Issues: ${activeIssuesArray.length}
In Progress: ${inProgressIssues.length} issues
Planned: ${plannedIssues.length} issues

VALID LINEAR ISSUE IDENTIFIERS (ONLY use these - DO NOT make up any others):
${validIdentifiers.join(', ')}
=== END SUMMARY ===\n`);

      if (activeIssuesArray.length === 0) {
        sections.push(
          'NO_ACTIVE_LINEAR_ISSUES: There are no Linear issues in progress for this user during the timeframe. DO NOT INVENT any Linear identifiers or tasks.'
        );
        sections.push('');
      } else {
        sections.push('Active Linear Issues:');
        activeIssuesArray.forEach((issue) => {
          const labels = issue.labels.nodes.map((node) => node.name).join(', ');
          sections.push(
            `- ${issue.identifier} | ${issue.title} | State: ${issue.state.name} (${issue.state.type}) | Priority: ${issue.priority}`
          );
          if (labels) {
            sections.push(`  Labels: ${labels}`);
          }
          if (issue.cycle) {
            sections.push(`  Cycle: ${issue.cycle.number}`);
          }
        });
        sections.push('');
      }
    } else {
      sections.push(
        'NO_LINEAR_DATA: Linear data unavailable for the configured user. DO NOT INVENT any Linear identifiers or tasks.'
      );
      sections.push('');
    }

    if (data.github) {
      sections.push('=== MOST SIGNIFICANT PULL REQUESTS & COMMITS ===');

      if (enhanced && data.github.statistics) {
        sections.push('Statistics:');
        sections.push(
          `- Total Commits: ${data.github.statistics.totalCommits}`
        );
        sections.push(`- Total PRs: ${data.github.statistics.totalPRs}`);
        sections.push(`- Total Issues: ${data.github.statistics.totalIssues}`);
        sections.push(`- Code Reviews: ${data.github.statistics.totalReviews}`);
        sections.push(
          `- Avg Files/Commit: ${data.github.statistics.avgFilesPerCommit.toFixed(1)}`
        );
        sections.push(
          `- Avg Lines Changed: ${data.github.statistics.avgLinesChanged.toFixed(0)}`
        );

        if (data.github.statistics.topContributors.length > 0) {
          sections.push('\nTop Contributors:');
          data.github.statistics.topContributors.forEach((contrib) => {
            sections.push(`- ${contrib.author}: ${contrib.count} commits`);
          });
        }
        sections.push('');

        // If repo+author stats are available, show side-by-side summary
        const statsRepo = (
          data.github as {
            statisticsRepo?: typeof data.github.statistics | undefined;
          }
        ).statisticsRepo;
        const statsAuthor = (
          data.github as {
            statisticsAuthor?: typeof data.github.statistics | undefined;
          }
        ).statisticsAuthor;
        if (statsRepo && statsAuthor) {
          sections.push('Statistics (Repo vs Yours):');
          sections.push(
            `- Total PRs: ${statsRepo.totalPRs} | yours ${statsAuthor.totalPRs}`
          );
          sections.push(
            `- Total Commits: ${statsRepo.totalCommits} | yours ${statsAuthor.totalCommits}`
          );
          sections.push(
            `- Total Issues: ${statsRepo.totalIssues} | yours ${statsAuthor.totalIssues}`
          );
          sections.push('');
        }
      }

      const normalizedConfigured = normalizeIdentifier(configuredGitHubUser);

      const shouldKeepItem = (author: string | undefined) => {
        if (!normalizedConfigured) {
          return true;
        }
        return normalizeIdentifier(author) === normalizedConfigured;
      };

      // Rank items by significance (files/lines if available, else presence of PR, else length of title)
      const scorePR = (pr: {
        enhancedData?: {
          filesChanged?: number;
          linesAdded?: number;
          linesDeleted?: number;
        };
        title: string;
      }) => {
        const files = pr.enhancedData?.filesChanged ?? 0;
        const lines =
          (pr.enhancedData?.linesAdded ?? 0) +
          (pr.enhancedData?.linesDeleted ?? 0);
        return files * 5 + lines;
      };
      const scoreCommit = (c: {
        files?: Array<{ additions: number; deletions: number }>;
        pullRequest?: unknown;
        message: string;
      }) => {
        const fileCount = c.files?.length ?? 0;
        const lineChange = (c.files ?? []).reduce(
          (s, f) => s + (f.additions ?? 0) + (f.deletions ?? 0),
          0
        );
        const hasPR = c.pullRequest ? 100 : 0;
        return fileCount * 5 + lineChange + hasPR;
      };

      // Top PRs first
      if (data.github.pullRequests.length > 0) {
        const topPRs = [...data.github.pullRequests]
          .filter((pr) => shouldKeepItem(pr.author))
          .sort((a, b) => scorePR(b) - scorePR(a))
          .slice(0, fullContext ? 50 : 10);

        if (topPRs.length > 0) {
          sections.push('\nPull Requests:');
          topPRs.forEach((pr) => {
            let displayTitle = pr.title;
            const linearIdPattern = /PLAT-\d+/g;
            const matches = displayTitle.match(linearIdPattern);

            if (matches) {
              matches.forEach((match) => {
                if (!validIdentifiers.includes(match)) {
                  displayTitle = displayTitle.replace(
                    match,
                    '[INVALID-LINEAR-ID]'
                  );
                }
              });
            }

            const repoInfo = pr.repository ? ` [${pr.repository}]` : '';
            sections.push(
              `- ${displayTitle}${repoInfo} (${pr.state}) - ${pr.url}`
            );

            if (pr.labels && pr.labels.length > 0) {
              sections.push(`  Labels: ${pr.labels.join(', ')}`);
            }

            if (enhanced && pr.enhancedData) {
              if (pr.enhancedData.filesChanged) {
                sections.push(
                  `  Files changed: ${pr.enhancedData.filesChanged}`
                );
              }
              if (
                pr.enhancedData.linesAdded !== undefined &&
                pr.enhancedData.linesDeleted !== undefined
              ) {
                sections.push(
                  `  Lines: +${pr.enhancedData.linesAdded} -${pr.enhancedData.linesDeleted}`
                );
              }
            }
          });
        }
      }

      // Then top commits (excluding ones already represented by PR details)
      if (data.github.commits.length > 0) {
        const topCommits = [...data.github.commits]
          .filter((commit) => shouldKeepItem(commit.author))
          .sort((a, b) => scoreCommit(b) - scoreCommit(a))
          .slice(0, fullContext ? 50 : 10);

        if (topCommits.length > 0) {
          sections.push('\nCommits:');
          topCommits.forEach((commit) => {
            let displayMessage = commit.message;
            const linearIdPattern = /PLAT-\d+/g;
            const matches = displayMessage.match(linearIdPattern);

            if (matches) {
              matches.forEach((match) => {
                if (!validIdentifiers.includes(match)) {
                  displayMessage = displayMessage.replace(
                    match,
                    '[INVALID-LINEAR-ID]'
                  );
                }
              });
            }

            const repoInfo = commit.repository ? ` [${commit.repository}]` : '';
            sections.push(
              `- ${displayMessage}${repoInfo} (${commit.author} on ${commit.date})`
            );

            if (enhanced && commit.files) {
              sections.push(`  Files changed: ${commit.files.length}`);
              const totalAdditions = commit.files.reduce(
                (sum, f) => sum + f.additions,
                0
              );
              const totalDeletions = commit.files.reduce(
                (sum, f) => sum + f.deletions,
                0
              );
              sections.push(`  Lines: +${totalAdditions} -${totalDeletions}`);
            }

            if (enhanced && commit.pullRequest) {
              sections.push(
                `  PR: #${commit.pullRequest.number} - ${commit.pullRequest.title}`
              );
              if (commit.pullRequest.reviews) {
                const approvals = commit.pullRequest.reviews.filter(
                  (r) => r.state === 'APPROVED'
                ).length;
                sections.push(`  Reviews: ${approvals} approvals`);
              }
            }
          });
        }
      }

      if (data.github.issues && data.github.issues.length > 0) {
        sections.push('\nIssues:');
        data.github.issues
          .filter((issue) => shouldKeepItem(issue.author))
          .forEach((issue) => {
            let displayTitle = issue.title;
            const linearIdPattern = /PLAT-\d+/g;
            const matches = displayTitle.match(linearIdPattern);

            if (matches) {
              matches.forEach((match) => {
                if (!validIdentifiers.includes(match)) {
                  displayTitle = displayTitle.replace(
                    match,
                    '[INVALID-LINEAR-ID]'
                  );
                }
              });
            }

            const repoInfo = issue.repository ? ` [${issue.repository}]` : '';
            sections.push(
              `- ${displayTitle}${repoInfo} (${issue.state}) - ${issue.url}`
            );

            if (issue.labels && issue.labels.length > 0) {
              sections.push(`  Labels: ${issue.labels.join(', ')}`);
            }

            if (issue.body) {
              if (fullContext) {
                sections.push(`  Body: ${issue.body}`);
              } else {
                const truncatedBody =
                  issue.body.length > 200
                    ? `${issue.body.substring(0, 197)}...`
                    : issue.body;
                sections.push(`  Body: ${truncatedBody}`);
              }
            }
          });
      }
    }

    return sections.join('\n');
  }
}
