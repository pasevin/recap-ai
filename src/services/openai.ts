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
      identifier: string;
      title: string;
      state: string;
      priority: number;
      assignee: string;
      createdAt: string;
      updatedAt: string;
    }>;
    summary: {
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
    const systemPrompt = `You are a technical team lead summarizing the team's activity for ${timeframe}. 
    Focus on key accomplishments, progress on important issues, and any blockers or challenges. 
    Format the summary in a way that would be appropriate for a team meeting.
    
    Structure the summary with these sections:
    1. Key Accomplishments
    2. Pull Requests & Code Changes
    3. Issue Updates
    4. Challenges & Blockers
    5. Next Steps
    
    Keep the tone professional but conversational. Highlight patterns and insights rather than just listing everything.`;

    const userPrompt = this.formatActivityData(data);

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

    if (data.github) {
      sections.push('GitHub Activity:');
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
    }

    if (data.linear) {
      sections.push('\nLinear Activity:');
      sections.push(`Total Issues: ${data.linear.summary.totalIssues}`);
      sections.push(`Open Issues: ${data.linear.summary.openIssues}`);
      sections.push(`Closed Issues: ${data.linear.summary.closedIssues}`);

      sections.push('\nRecent Issues:');
      data.linear.issues?.forEach((issue) => {
        sections.push(`- ${issue.identifier}: ${issue.title}`);
        sections.push(
          `  State: ${issue.state}, Priority: ${issue.priority}, Assignee: ${issue.assignee}`
        );
      });

      sections.push('\nState Breakdown:');
      Object.entries(data.linear.summary.stateBreakdown).forEach(
        ([state, count]) => {
          sections.push(`- ${state}: ${count}`);
        }
      );
    }

    return sections.join('\n');
  }
}
