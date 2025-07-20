import { OpenAI } from 'openai';
import { Config } from './config';
import { ConfigManager } from '../utils/config';

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
        filesChanged?: number;
        linesAdded?: number;
        linesDeleted?: number;
        reviews?: any[];
        comments?: any[];
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
    const apiKey = this.config.get('openai.token');
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateActivitySummary(
    data: ActivityData,
    timeframe: string,
    enhanced: boolean = false
  ): Promise<string> {
    const systemPrompt = enhanced
      ? `You are an engineer summarizing your own work from ${timeframe} in a team standup. 
    Write in first person ("I", "my", etc.) and keep it conversational but professional, like you're talking to your teammates.
    
    You have access to ENHANCED data including code reviews, file changes, and detailed PR information.
    
    Structure your update like this:
    1. "Here's what I've shipped/completed this ${timeframe}..." (use the completed PRs and commits, ALWAYS mention the repository/project name for context)
    2. "Key technical changes..." (focus on WHAT was changed and WHY, not line counts. Mention the specific features/fixes and their impact)
    3. "I'm currently working on..." (list ALL Linear issues with state.type "started")
    4. "I ran into these challenges..." (analyze PR reviews, comments, and technical issues)
    5. "Next up in our current cycle..." (list ALL Linear issues with state.type "unstarted" from activeIssues)
    
    Important:
    - ALWAYS include the repository/project name when discussing PRs or commits
    - When work spans multiple repositories, make this clear (e.g., "Across different projects...")
    - Focus on the substance of changes (features, fixes, refactoring) rather than metrics
    - Mention code review activity if significant
    - Highlight collaboration with other contributors when relevant
    - Keep it concise but include technical details that would be relevant to the team
    
    CRITICAL: 
    - ONLY use Linear issue identifiers (like PLAT-XXXX) that are EXPLICITLY provided in the data
    - NEVER make up or invent Linear issue numbers
    - If GitHub work doesn't have an associated Linear issue, DO NOT add a fake issue number`
      : `You are an engineer summarizing your own work from ${timeframe} in a team standup. 
    Write in first person ("I", "my", etc.) and keep it conversational but professional, like you're talking to your teammates.
    
    Structure your update like this:
    1. "Here's what I've shipped/completed this ${timeframe}..." (use the completed PRs and commits - ALWAYS mention the repository/project name. DO NOT add Linear issue numbers unless they are explicitly in the provided Linear data)
    2. "I'm currently working on..." (IMPORTANT: List ALL Linear issues that have state.type "started". You MUST include every single one, no exceptions. If there are any started issues, do not say there are none. NEVER say you can't provide Linear data - the data is provided in the user message.)
    3. "I ran into these challenges..." (analyze the work done and extract technical challenges)
    4. "Next up in our current cycle..." (IMPORTANT: List ALL Linear issues with state.type "unstarted" from activeIssues. You MUST list them all, grouped by priority. If there are any unstarted issues, do not say there are none. NEVER say you can't provide Linear data - the data is provided in the user message.)
    
    Important notes:
    - ALWAYS include the repository/project name when discussing PRs or commits
    - When work spans multiple repositories, make this clear (e.g., "Across different projects...")
    - Focus on WHAT was changed and WHY, not file counts or line numbers
    - For current work (section 2), you MUST list EVERY SINGLE issue that has state.type "started". Never say there are no started issues if there are issues with state.type "started". NEVER say you can't provide Linear data - it's in the user message.
    - For planned work (section 4), you MUST list EVERY SINGLE issue with state.type "unstarted" from activeIssues, grouped by priority. Never say there are no unstarted issues if there are issues with state.type "unstarted". NEVER say you can't provide Linear data - it's in the user message.
    - Highlight bugs with 🐛 emoji and include their priority and labels
    - Keep it concise but include technical details that would be relevant to the team
    - Be precise about the timeframe - this summary covers exactly ${timeframe}, not a general period
    
    CRITICAL: 
    - ONLY use Linear issue identifiers (like PLAT-XXXX) that are EXPLICITLY provided in the data
    - NEVER make up or invent Linear issue numbers
    - If GitHub work doesn't have an associated Linear issue, DO NOT add a fake issue number
    - Only mention Linear issues when referring to the actual Linear data provided
    
    Remember: 
    - The Linear data includes both regular issues and activeIssues - make sure to use activeIssues for current and planned work as these are from the current cycle
    - NEVER say there are no in-progress or planned tasks if there are issues with the corresponding state.type in the data
    - ALWAYS list ALL issues provided in the data - do not summarize or skip any
    - NEVER say you can't provide Linear data - the data is provided in the user message
    - NEVER skip sections 2 or 4 - the Linear data is always provided in the user message
    
    RULE FOR LINEAR ISSUE NUMBERS:
    - Before using ANY Linear issue number (like PLAT-XXXX), verify it exists in the provided Linear data
    - GitHub commits and PRs often DO NOT have associated Linear issues - that's normal
    - When describing GitHub work in section 1, only add a Linear issue number if that exact issue exists in the Linear data
    - It's perfectly fine to describe work without an issue number`;

    // Transform the data to match the expected format
    const transformedData = {
      ...data,
      linear: data.linear
        ? {
            issues: data.linear.issues,
            activeIssues: data.linear.activeIssues,
          }
        : undefined,
    };

    const userPrompt = this.formatActivityData(transformedData, enhanced);

    try {
      const response = await this.client.responses.create({
        model: 'gpt-4.1-mini',
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
        temperature: 0.5,
        tools: [],
        top_p: 1,
        max_output_tokens: enhanced ? 2000 : 1500,
        store: true,
      });

      // Handle the new o4-mini response format
      const outputText = (response as any).output_text;
      if (outputText && typeof outputText === 'string') {
        return outputText;
      }
      return 'No summary generated';
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate activity summary');
    }
  }

  private formatActivityData(
    data: ActivityData,
    enhanced: boolean = false
  ): string {
    const sections = [];

    // Collect all valid Linear issue identifiers at the top
    let validIdentifiers: string[] = [];
    if (data.linear) {
      const allLinearIssues = [
        ...(data.linear.issues || []),
        ...(typeof data.linear.activeIssues === 'object' &&
        Array.isArray(data.linear.activeIssues)
          ? data.linear.activeIssues
          : []),
      ];
      validIdentifiers = [
        ...new Set(allLinearIssues.map((issue) => issue.identifier)),
      ];
    }

    // Add a summary count at the start
    if (
      data.linear?.activeIssues &&
      typeof data.linear.activeIssues !== 'number'
    ) {
      const inProgressIssues = data.linear.activeIssues.filter(
        (issue) => issue.state.type === 'started'
      );
      const plannedIssues = data.linear.activeIssues.filter(
        (issue) => issue.state.type === 'unstarted'
      );

      sections.push(`=== LINEAR ISSUES SUMMARY ===
Total Active Issues: ${data.linear.activeIssues.length}
In Progress: ${inProgressIssues.length} issues
Planned: ${plannedIssues.length} issues

VALID LINEAR ISSUE IDENTIFIERS (ONLY use these - DO NOT make up any others):
${validIdentifiers.join(', ')}
=== END SUMMARY ===\n`);
    }

    if (data.github) {
      sections.push('=== GITHUB ACTIVITY ===');

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
      }

      if (data.github.commits.length > 0) {
        sections.push('Commits:');
        data.github.commits.forEach((commit) => {
          // Remove any invalid Linear issue IDs from commit message
          let displayMessage = commit.message;
          const linearIdPattern = /PLAT-\d+/g;
          const matches = displayMessage.match(linearIdPattern);

          if (matches) {
            matches.forEach((match) => {
              if (!validIdentifiers.includes(match)) {
                // Remove the invalid Linear ID from the message
                displayMessage = displayMessage.replace(
                  match,
                  '[INVALID-LINEAR-ID]'
                );
              }
            });
          }

          // Include repository name if available
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

      if (data.github.pullRequests.length > 0) {
        sections.push('\nPull Requests:');
        data.github.pullRequests.forEach((pr) => {
          // Remove any invalid Linear issue IDs from PR title
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

          // Extract repository name from URL or use provided repository field
          let repoName = pr.repository;
          if (!repoName && pr.url) {
            // Extract from URL like https://github.com/owner/repo/pull/123
            const urlMatch = pr.url.match(/github\.com\/([^/]+\/[^/]+)\//);
            if (urlMatch) {
              repoName = urlMatch[1];
            }
          }
          const repoInfo = repoName ? ` [${repoName}]` : '';

          sections.push(
            `- ${displayTitle}${repoInfo} (${pr.state}) by ${pr.author}`
          );
          sections.push(
            `  Created: ${pr.createdAt}${pr.mergedAt ? `, Merged: ${pr.mergedAt}` : ''}`
          );

          // Include PR body/description if available and enhanced
          if (enhanced && pr.body) {
            const body = pr.body.substring(0, 300).replace(/\n/g, ' ');
            sections.push(
              `  Description: ${body}${pr.body.length > 300 ? '...' : ''}`
            );
          }

          // Include enhanced data if available - focus on substance, not metrics
          if (enhanced && pr.enhancedData) {
            const { reviews, comments } = pr.enhancedData;

            if (reviews && reviews.length > 0) {
              const reviewSummary = reviews
                .map((r: any) => `${r.user?.login || 'Unknown'}: ${r.state}`)
                .join(', ');
              sections.push(`  Reviews: ${reviewSummary}`);
            }
            if (comments && comments.length > 0) {
              sections.push(`  Review Comments (sample):`);
              comments.slice(0, 2).forEach((c: any) => {
                const commentBody =
                  c.body?.substring(0, 100).replace(/\n/g, ' ') || '';
                sections.push(
                  `    - ${c.user?.login || 'Unknown'}: ${commentBody}${c.body?.length > 100 ? '...' : ''}`
                );
              });
            }
          }

          if (enhanced && pr.labels && pr.labels.length > 0) {
            sections.push(`  Labels: ${pr.labels.join(', ')}`);
          }
          if (enhanced && (pr.reviewComments || pr.comments)) {
            sections.push(
              `  Engagement: ${pr.reviewComments || 0} review comments, ${pr.comments || 0} comments`
            );
          }
          sections.push(`  ${pr.url}`);
        });
      }

      if (enhanced && data.github.issues && data.github.issues.length > 0) {
        sections.push('\nIssues:');
        data.github.issues.forEach((issue) => {
          // Extract repository name from URL or use provided repository field
          let repoName = issue.repository;
          if (!repoName && issue.url) {
            // Extract from URL like https://github.com/owner/repo/issues/123
            const urlMatch = issue.url.match(/github\.com\/([^/]+\/[^/]+)\//);
            if (urlMatch) {
              repoName = urlMatch[1];
            }
          }
          const repoInfo = repoName ? ` [${repoName}]` : '';

          sections.push(
            `- ${issue.title}${repoInfo} (${issue.state}) by ${issue.author}`
          );

          // Include issue body/description if available
          if (issue.body) {
            const body = issue.body.substring(0, 300).replace(/\n/g, ' ');
            sections.push(
              `  Description: ${body}${issue.body.length > 300 ? '...' : ''}`
            );
          }

          // Include enhanced data if available
          if (issue.enhancedData) {
            if (
              issue.enhancedData.commentCount &&
              issue.enhancedData.commentCount > 0
            ) {
              sections.push(
                `  Discussion: ${issue.enhancedData.commentCount} comments`
              );
            }
            if (
              issue.enhancedData.comments &&
              issue.enhancedData.comments.length > 0
            ) {
              sections.push(`  Recent Comments:`);
              issue.enhancedData.comments.slice(0, 2).forEach((c: any) => {
                const commentBody =
                  c.body?.substring(0, 100).replace(/\n/g, ' ') || '';
                sections.push(
                  `    - ${c.author}: ${commentBody}${c.body?.length > 100 ? '...' : ''}`
                );
              });
            }
          }

          if (issue.labels && issue.labels.length > 0) {
            sections.push(`  Labels: ${issue.labels.join(', ')}`);
          }
        });
      }

      sections.push('=== END GITHUB ACTIVITY ===\n');
    }

    if (
      data.linear?.activeIssues &&
      typeof data.linear.activeIssues !== 'number'
    ) {
      // Current work (in progress)
      const inProgressIssues = data.linear.activeIssues.filter(
        (issue) => issue.state.type === 'started'
      );
      if (inProgressIssues.length > 0) {
        sections.push('=== CURRENT WORK ===');
        inProgressIssues.forEach((issue) => {
          const labels = issue.labels.nodes.map((node) => node.name);
          const isBug = labels.includes('Bug');
          sections.push(
            `- ${issue.identifier}: "${issue.title}" (Priority: ${issue.priority})${isBug ? ' 🐛' : ''} [${labels.join(', ')}]`
          );
        });
        sections.push('=== END CURRENT WORK ===\n');
      }

      // Planned work (from current cycle)
      const plannedIssues = data.linear.activeIssues.filter(
        (issue) => issue.state.type === 'unstarted'
      );

      if (plannedIssues.length > 0) {
        sections.push('=== PLANNED WORK ===');

        // Group by priority
        const priorityGroups = plannedIssues.reduce(
          (groups, issue) => {
            const priority = issue.priority;
            if (!groups[priority]) groups[priority] = [];
            groups[priority].push(issue);
            return groups;
          },
          {} as Record<number, typeof plannedIssues>
        );

        // Output in priority order (ascending)
        Object.entries(priorityGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .forEach(([priority, issues]) => {
            sections.push(`\nPriority ${priority}:`);
            issues.forEach((issue) => {
              const labels = issue.labels.nodes.map((node) => node.name);
              const isBug = labels.includes('Bug');
              sections.push(
                `- ${issue.identifier}: "${issue.title}"${isBug ? ' 🐛' : ''} [${labels.join(', ')}]`
              );
            });
          });
        sections.push('=== END PLANNED WORK ===\n');
      }
    }

    return sections.join('\n');
  }
}
