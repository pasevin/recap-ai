import OpenAI from 'openai';
import { Config } from './config';
import { ConfigManager } from '../utils/config';

export interface ActivityData {
  github?: {
    commits: Array<{
      sha: string;
      message: string;
      date: string;
      author: string;
    }>;
    pullRequests: Array<{
      title: string;
      state: string;
      createdAt: string;
      mergedAt?: string;
      author: string;
      url: string;
    }>;
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
    activeIssues?: Array<{
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
    timeframe: string
  ): Promise<string> {
    const systemPrompt = `You are an engineer summarizing your own work from ${timeframe} in a team standup. 
    Write in first person ("I", "my", etc.) and keep it conversational but professional, like you're talking to your teammates.
    
    Structure your update like this:
    1. "Here's what I've shipped/completed this ${timeframe}..." (use the completed PRs and commits)
    2. "I'm currently working on..." (IMPORTANT: List ALL Linear issues that have state.type "started". You MUST include every single one, no exceptions. If there are any started issues, do not say there are none. NEVER say you can't provide Linear data - the data is provided in the user message.)
    3. "I ran into these challenges..." (analyze the work done and extract technical challenges)
    4. "Next up in our current cycle..." (IMPORTANT: List ALL Linear issues with state.type "unstarted" from activeIssues. You MUST list them all, grouped by priority. If there are any unstarted issues, do not say there are none. NEVER say you can't provide Linear data - the data is provided in the user message.)
    
    Important notes:
    - For current work (section 2), you MUST list EVERY SINGLE issue that has state.type "started". Never say there are no started issues if there are issues with state.type "started". NEVER say you can't provide Linear data - it's in the user message.
    - For planned work (section 4), you MUST list EVERY SINGLE issue with state.type "unstarted" from activeIssues, grouped by priority. Never say there are no unstarted issues if there are issues with state.type "unstarted". NEVER say you can't provide Linear data - it's in the user message.
    - Highlight bugs with 🐛 emoji and include their priority and labels
    - Keep it concise but include technical details that would be relevant to the team
    - Be precise about the timeframe - this summary covers exactly ${timeframe}, not a general period
    
    Remember: 
    - The Linear data includes both regular issues and activeIssues - make sure to use activeIssues for current and planned work as these are from the current cycle
    - NEVER say there are no in-progress or planned tasks if there are issues with the corresponding state.type in the data
    - ALWAYS list ALL issues provided in the data - do not summarize or skip any
    - NEVER say you can't provide Linear data - the data is provided in the user message
    - NEVER skip sections 2 or 4 - the Linear data is always provided in the user message`;

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

    const userPrompt = this.formatActivityData(transformedData);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      return response.choices[0].message.content || 'No summary generated';
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate activity summary');
    }
  }

  private formatActivityData(data: ActivityData): string {
    const sections = [];

    // Add a summary count at the start
    if (data.linear?.activeIssues) {
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
=== END SUMMARY ===\n`);
    }

    if (data.github) {
      sections.push('=== GITHUB ACTIVITY ===');
      if (data.github.commits.length > 0) {
        sections.push('Commits:');
        data.github.commits.forEach((commit) => {
          sections.push(
            `- ${commit.message} (${commit.author} on ${commit.date})`
          );
        });
      }

      if (data.github.pullRequests.length > 0) {
        sections.push('\nPull Requests:');
        data.github.pullRequests.forEach((pr) => {
          sections.push(`- ${pr.title} (${pr.state}) by ${pr.author}`);
          sections.push(
            `  Created: ${pr.createdAt}${pr.mergedAt ? `, Merged: ${pr.mergedAt}` : ''}`
          );
          sections.push(`  ${pr.url}`);
        });
      }
      sections.push('=== END GITHUB ACTIVITY ===\n');
    }

    if (data.linear?.activeIssues) {
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
