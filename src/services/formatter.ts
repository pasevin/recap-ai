import chalk from 'chalk';
import { ActivityData } from './openai';

export interface FormattedSection {
  title: string;
  items: FormattedItem[];
}

export interface FormattedItem {
  content: string;
  reference?: SourceReference;
  metadata?: string;
  children?: FormattedItem[];
}

export interface SourceReference {
  type: 'github-pr' | 'github-issue' | 'github-commit' | 'linear-issue';
  url?: string;
  id: string;
  repository?: string;
}

export class FormatterService {
  constructor(private useColors: boolean = true) {}

  formatActivitySummary(
    data: ActivityData,
    aiSummary: string,
    timeframe: string
  ): string {
    const sections: FormattedSection[] = [];

    // Parse the AI summary and extract sections
    const aiSections = this.parseAISummary(aiSummary);

    // Create structured sections with references
    if (data.github) {
      const githubSection = this.formatGitHubActivity(data.github);
      if (githubSection.items.length > 0) {
        sections.push(githubSection);
      }
    }

    if (data.linear) {
      const linearSection = this.formatLinearActivity(data.linear);
      if (linearSection.items.length > 0) {
        sections.push(linearSection);
      }
    }

    // Combine AI insights with structured data
    return this.renderSummary(sections, aiSections, timeframe);
  }

  private parseAISummary(summary: string): { [key: string]: string } {
    const sections: { [key: string]: string } = {};
    const lines = summary.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detect section headers
      if (
        line.toLowerCase().includes("here's what i've shipped") ||
        line.toLowerCase().includes('completed this')
      ) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'completed';
        currentContent = [line];
      } else if (line.toLowerCase().includes('key technical changes')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'technical';
        currentContent = [line];
      } else if (line.toLowerCase().includes('currently working on')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'current';
        currentContent = [line];
      } else if (line.toLowerCase().includes('challenges')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'challenges';
        currentContent = [line];
      } else if (line.toLowerCase().includes('next up')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = 'planned';
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }

    // Add the last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  private formatGitHubActivity(
    github: NonNullable<ActivityData['github']>
  ): FormattedSection {
    const items: FormattedItem[] = [];

    // Format Pull Requests
    github.pullRequests.forEach((pr) => {
      const reference: SourceReference = {
        type: 'github-pr',
        url: pr.url,
        id: pr.url.split('/').pop() || 'unknown',
        repository: pr.repository,
      };

      const metadata = [
        pr.state.toUpperCase(),
        `by ${pr.author}`,
        `created ${new Date(pr.createdAt).toLocaleDateString()}`,
      ];

      if (pr.mergedAt) {
        metadata.push(`merged ${new Date(pr.mergedAt).toLocaleDateString()}`);
      }

      if (pr.labels && pr.labels.length > 0) {
        metadata.push(`labels: ${pr.labels.join(', ')}`);
      }

      items.push({
        content: pr.title,
        reference,
        metadata: metadata.join(' • '),
        children: pr.enhancedData?.reviews
          ? pr.enhancedData.reviews.map((review: any) => ({
              content: `Review by ${review.user?.login || 'Unknown'}: ${review.state}`,
              metadata: review.submitted_at
                ? new Date(review.submitted_at).toLocaleDateString()
                : undefined,
            }))
          : undefined,
      });
    });

    // Format Issues
    if (github.issues) {
      github.issues.forEach((issue) => {
        const reference: SourceReference = {
          type: 'github-issue',
          url: issue.url,
          id: issue.url.split('/').pop() || 'unknown',
          repository: issue.repository,
        };

        const metadata = [
          issue.state.toUpperCase(),
          `by ${issue.author}`,
          `created ${new Date(issue.createdAt).toLocaleDateString()}`,
        ];

        if (issue.closedAt) {
          metadata.push(
            `closed ${new Date(issue.closedAt).toLocaleDateString()}`
          );
        }

        if (issue.labels && issue.labels.length > 0) {
          metadata.push(`labels: ${issue.labels.join(', ')}`);
        }

        items.push({
          content: issue.title,
          reference,
          metadata: metadata.join(' • '),
        });
      });
    }

    // Format Commits
    github.commits.forEach((commit) => {
      const reference: SourceReference = {
        type: 'github-commit',
        id: commit.sha.substring(0, 7),
        repository: commit.repository,
      };

      const metadata = [
        `by ${commit.author}`,
        new Date(commit.date).toLocaleDateString(),
      ];

      if (commit.repository) {
        metadata.unshift(commit.repository);
      }

      items.push({
        content: commit.message.split('\n')[0], // First line only
        reference,
        metadata: metadata.join(' • '),
      });
    });

    return {
      title: 'GitHub Activity',
      items,
    };
  }

  private formatLinearActivity(
    linear: NonNullable<ActivityData['linear']>
  ): FormattedSection {
    const items: FormattedItem[] = [];

    // Get all Linear issues
    const allIssues = [
      ...(linear.issues || []),
      ...(Array.isArray(linear.activeIssues) ? linear.activeIssues : []),
    ];

    // Remove duplicates based on identifier
    const uniqueIssues = allIssues.filter(
      (issue, index, self) =>
        index === self.findIndex((i) => i.identifier === issue.identifier)
    );

    uniqueIssues.forEach((issue) => {
      const reference: SourceReference = {
        type: 'linear-issue',
        id: issue.identifier,
      };

      const labels = issue.labels.nodes.map((node) => node.name);
      const isBug = labels.includes('Bug');

      const metadata = [
        `Priority ${issue.priority}`,
        issue.state.name,
        issue.state.type,
      ];

      if (labels.length > 0) {
        metadata.push(`labels: ${labels.join(', ')}`);
      }

      if (issue.cycle) {
        metadata.push(`Cycle ${issue.cycle.number}`);
      }

      items.push({
        content: `${isBug ? '🐛 ' : ''}${issue.title}`,
        reference,
        metadata: metadata.join(' • '),
      });
    });

    return {
      title: 'Linear Issues',
      items,
    };
  }

  private renderSummary(
    sections: FormattedSection[],
    aiSections: { [key: string]: string },
    timeframe: string
  ): string {
    const output: string[] = [];

    // Header
    output.push(
      this.style(chalk.bold.blue, `📋 Activity Summary - ${timeframe}`)
    );
    output.push(this.style(chalk.gray, '─'.repeat(60)));
    output.push('');

    // AI Summary sections with structured data references
    if (aiSections.completed) {
      output.push(this.style(chalk.bold.green, '🚀 Completed Work'));
      output.push('');
      output.push(this.formatAISection(aiSections.completed));
      output.push('');

      // Add structured PR/Issue references
      const completedItems = this.getCompletedItems(sections);
      if (completedItems.length > 0) {
        output.push(this.style(chalk.bold, '   📎 References:'));
        completedItems.forEach((item) => {
          output.push(this.formatStructuredItem(item, '   '));
        });
        output.push('');
      }
    }

    if (aiSections.technical) {
      output.push(this.style(chalk.bold.cyan, '🔧 Technical Changes'));
      output.push('');
      output.push(this.formatAISection(aiSections.technical));
      output.push('');
    }

    if (aiSections.current) {
      output.push(this.style(chalk.bold.yellow, '⚡ Current Work'));
      output.push('');
      output.push(this.formatAISection(aiSections.current));
      output.push('');

      // Add structured Linear issue references
      const currentItems = this.getCurrentWorkItems(sections);
      if (currentItems.length > 0) {
        output.push(this.style(chalk.bold, '   📎 References:'));
        currentItems.forEach((item) => {
          output.push(this.formatStructuredItem(item, '   '));
        });
        output.push('');
      }
    }

    if (aiSections.challenges) {
      output.push(this.style(chalk.bold.red, '🚧 Challenges'));
      output.push('');
      output.push(this.formatAISection(aiSections.challenges));
      output.push('');
    }

    if (aiSections.planned) {
      output.push(this.style(chalk.bold.magenta, '📅 Planned Work'));
      output.push('');
      output.push(this.formatAISection(aiSections.planned));
      output.push('');

      // Add structured Linear issue references
      const plannedItems = this.getPlannedWorkItems(sections);
      if (plannedItems.length > 0) {
        output.push(this.style(chalk.bold, '   📎 References:'));
        plannedItems.forEach((item) => {
          output.push(this.formatStructuredItem(item, '   '));
        });
        output.push('');
      }
    }

    // Detailed sections
    output.push(this.style(chalk.gray, '─'.repeat(60)));
    output.push(this.style(chalk.bold, '📊 Detailed Activity'));
    output.push('');

    sections.forEach((section) => {
      if (section.items.length > 0) {
        output.push(this.style(chalk.bold.blue, `${section.title}:`));
        output.push('');

        section.items.forEach((item) => {
          output.push(this.formatStructuredItem(item));
        });
        output.push('');
      }
    });

    return output.join('\n');
  }

  private formatAISection(content: string): string {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `   ${line}`)
      .join('\n');
  }

  private formatStructuredItem(
    item: FormattedItem,
    indent: string = ''
  ): string {
    const output: string[] = [];

    // Main item
    const bullet = this.getReferenceBullet(item.reference?.type);
    output.push(`${indent}${bullet} ${item.content}`);

    // Reference and metadata
    if (item.reference || item.metadata) {
      const refInfo: string[] = [];

      if (item.reference) {
        const refText = this.formatReference(item.reference);
        refInfo.push(refText);
      }

      if (item.metadata) {
        refInfo.push(this.style(chalk.gray, item.metadata));
      }

      if (refInfo.length > 0) {
        output.push(`${indent}     ${refInfo.join(' • ')}`);
      }
    }

    // Children (e.g., reviews)
    if (item.children) {
      item.children.forEach((child) => {
        output.push(this.formatStructuredItem(child, `${indent}     `));
      });
    }

    return output.join('\n');
  }

  private formatReference(ref: SourceReference): string {
    const repoInfo = ref.repository ? `${ref.repository}/` : '';

    switch (ref.type) {
      case 'github-pr': {
        const prText = `${repoInfo}PR #${ref.id}`;
        return ref.url
          ? this.style(chalk.blue.underline, `${prText} (${ref.url})`)
          : this.style(chalk.blue, prText);
      }

      case 'github-issue': {
        const issueText = `${repoInfo}Issue #${ref.id}`;
        return ref.url
          ? this.style(chalk.green.underline, `${issueText} (${ref.url})`)
          : this.style(chalk.green, issueText);
      }

      case 'github-commit': {
        const commitText = `${repoInfo}${ref.id}`;
        return this.style(chalk.yellow, commitText);
      }

      case 'linear-issue':
        return this.style(chalk.magenta.underline, ref.id);

      default:
        return this.style(chalk.gray, ref.id);
    }
  }

  private getReferenceBullet(type?: string): string {
    switch (type) {
      case 'github-pr':
        return '🔄';
      case 'github-issue':
        return '🐛';
      case 'github-commit':
        return '💻';
      case 'linear-issue':
        return '📋';
      default:
        return '•';
    }
  }

  private getCompletedItems(sections: FormattedSection[]): FormattedItem[] {
    const githubSection = sections.find((s) => s.title === 'GitHub Activity');
    if (!githubSection) return [];

    // Return merged PRs and closed issues
    return githubSection.items.filter(
      (item) =>
        (item.reference?.type === 'github-pr' &&
          item.metadata?.includes('MERGED')) ||
        (item.reference?.type === 'github-issue' &&
          item.metadata?.includes('CLOSED'))
    );
  }

  private getCurrentWorkItems(sections: FormattedSection[]): FormattedItem[] {
    const linearSection = sections.find((s) => s.title === 'Linear Issues');
    if (!linearSection) return [];

    // Return issues with "started" state
    return linearSection.items.filter((item) =>
      item.metadata?.includes('started')
    );
  }

  private getPlannedWorkItems(sections: FormattedSection[]): FormattedItem[] {
    const linearSection = sections.find((s) => s.title === 'Linear Issues');
    if (!linearSection) return [];

    // Return issues with "unstarted" state
    return linearSection.items.filter((item) =>
      item.metadata?.includes('unstarted')
    );
  }

  private style(colorFn: any, text: string): string {
    return this.useColors ? colorFn(text) : text;
  }
}
