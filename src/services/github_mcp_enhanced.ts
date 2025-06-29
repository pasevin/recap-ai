import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

interface EnhancedCommitData {
  commit: any;
  pullRequest?: any;
  reviews?: any[];
  files?: any[];
  comments?: any[];
}

interface EnhancedActivityData {
  commits: EnhancedCommitData[];
  pullRequests: any[];
  issues: any[];
  codeReviews: any[];
  statistics: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalReviews: number;
    avgFilesPerCommit: number;
    avgLinesChanged: number;
    topContributors: { author: string; count: number }[];
    topLabels: { label: string; count: number }[];
  };
}

export class GitHubMCPEnhancedService {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(remoteServerUrl: string, githubToken: string) {
    this.transport = new StreamableHTTPClientTransport(
      new URL(remoteServerUrl),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${githubToken}`,
          },
        },
      }
    );

    this.client = new Client({
      name: 'recap-ai-enhanced-client',
      version: '0.0.2',
    });
  }

  public async connect(): Promise<void> {
    await this.client.connect(this.transport);
    console.log('Connected to GitHub MCP Server (Enhanced)');
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('Disconnected from GitHub MCP Server');
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  /**
   * List commits (compatibility method)
   */
  public async listCommits(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date,
    branch?: string,
    author?: string
  ): Promise<any> {
    const result = await this.client.callTool({
      name: 'list_commits',
      arguments: {
        owner,
        repo,
        sha: branch,
        since: since?.toISOString(),
        until: until?.toISOString(),
        author, // Note: Author filtering was added in PR #569 but not yet in v0.5.0 release
      },
    });

    return result;
  }

  /**
   * Search user activity (compatibility method)
   */
  public async searchUserActivity(
    username: string,
    since?: Date,
    until?: Date
  ): Promise<any> {
    try {
      // Search for issues and PRs created or involved by the user
      const issueQuery =
        `author:${username}` +
        (since ? ` created:>=${since.toISOString().split('T')[0]}` : '') +
        (until ? ` created:<=${until.toISOString().split('T')[0]}` : '');

      const issuesResult = await this.client.callTool({
        name: 'search_issues',
        arguments: {
          q: issueQuery,
          sort: 'created',
          order: 'desc',
          perPage: 100,
        },
      });

      // Search for code commits by the user (this might be limited)
      const codeQuery =
        `author:${username}` +
        (since
          ? ` committer-date:>=${since.toISOString().split('T')[0]}`
          : '') +
        (until ? ` committer-date:<=${until.toISOString().split('T')[0]}` : '');

      const codeResult = await this.client.callTool({
        name: 'search_code',
        arguments: {
          q: codeQuery,
          perPage: 100,
        },
      });

      return {
        issues: issuesResult,
        code: codeResult,
      };
    } catch (error) {
      console.error('Failed to search user activity:', error);
      throw error;
    }
  }

  /**
   * Fetch comprehensive repository activity data
   */
  public async fetchEnhancedRepositoryData(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date,
    branch?: string,
    author?: string
  ): Promise<EnhancedActivityData> {
    try {
      // 1. Fetch commits with enhanced data
      const commitsResult = await this.client.callTool({
        name: 'list_commits',
        arguments: {
          owner,
          repo,
          sha: branch || 'main',
          since: since?.toISOString(),
          until: until?.toISOString(),
          perPage: 100,
        },
      });

      const commits = this.parseToolResponse(commitsResult);

      // 2. Fetch pull requests
      const prQuery =
        `repo:${owner}/${repo}` +
        (author ? ` author:${author}` : '') +
        (since ? ` created:>=${since.toISOString().split('T')[0]}` : '') +
        (until ? ` created:<=${until.toISOString().split('T')[0]}` : '');

      const prsResult = await this.client.callTool({
        name: 'search_issues',
        arguments: {
          q: prQuery + ' is:pr',
          sort: 'created',
          order: 'desc',
          perPage: 100,
        },
      });

      const prs = this.parseToolResponse(prsResult);
      console.log(
        `Found ${prs?.total_count || 0} PRs in the specified timeframe (API total_count)`
      );

      // TODO: Monitor GitHub MCP server for fix to date filtering issue
      // Issue: GitHub Search API's total_count field returns count of ALL matching items
      // without considering date filters in the query. This appears to be an undocumented
      // limitation of the search_issues tool. We searched for existing issues but couldn't
      // find any reports of this specific problem as of June 2025.
      //
      // Current workaround: Client-side filtering to get accurate counts
      // Future: Remove this workaround when GitHub MCP server properly handles date filtering
      // Check: https://github.com/github/github-mcp-server/issues for updates
      //
      // Client-side filtering because GitHub search API doesn't properly filter by date
      let filteredPRs = prs?.items || [];
      if (since || until) {
        const sinceTime = since ? since.getTime() : 0;
        const untilTime = until ? until.getTime() : Date.now();

        filteredPRs = filteredPRs.filter((pr: any) => {
          const createdTime = new Date(pr.created_at).getTime();
          return createdTime >= sinceTime && createdTime <= untilTime;
        });

        console.log(
          `  After client-side date filtering: ${filteredPRs.length} PRs actually in timeframe`
        );
      }

      // Update prs object with filtered items
      prs.items = filteredPRs;
      prs.filtered_count = filteredPRs.length;

      // 3. Fetch issues
      const issuesResult = await this.client.callTool({
        name: 'search_issues',
        arguments: {
          q: prQuery + ' is:issue',
          sort: 'created',
          order: 'desc',
          perPage: 100,
        },
      });

      const issues = this.parseToolResponse(issuesResult);
      console.log(
        `Found ${issues?.total_count || 0} issues in the specified timeframe (API total_count)`
      );

      // Client-side filtering for issues too
      let filteredIssues = issues?.items || [];
      if (since || until) {
        const sinceTime = since ? since.getTime() : 0;
        const untilTime = until ? until.getTime() : Date.now();

        filteredIssues = filteredIssues.filter((issue: any) => {
          const createdTime = new Date(issue.created_at).getTime();
          return createdTime >= sinceTime && createdTime <= untilTime;
        });

        console.log(
          `  After client-side date filtering: ${filteredIssues.length} issues actually in timeframe`
        );
      }

      // Update issues object with filtered items
      issues.items = filteredIssues;
      issues.filtered_count = filteredIssues.length;

      // 4. Enhance commits with PR data (for first 10 commits to avoid rate limits)
      const enhancedCommits: EnhancedCommitData[] = [];
      const commitSample = commits.slice(0, 10);

      for (const commit of commitSample) {
        const enhanced: EnhancedCommitData = { commit };

        // Find associated PR
        const associatedPR = prs.items?.find(
          (pr: any) =>
            pr.body?.includes(commit.sha) ||
            pr.title?.includes(commit.sha?.substring(0, 7))
        );

        if (associatedPR) {
          enhanced.pullRequest = associatedPR;

          // Fetch PR reviews
          try {
            const reviewsResult = await this.client.callTool({
              name: 'get_pull_request_reviews',
              arguments: {
                owner,
                repo,
                pullNumber: associatedPR.number,
              },
            });
            enhanced.reviews = this.parseToolResponse(reviewsResult);
          } catch (error) {
            console.debug(
              'Could not fetch reviews for PR',
              associatedPR.number
            );
          }

          // Fetch PR files
          try {
            const filesResult = await this.client.callTool({
              name: 'get_pull_request_files',
              arguments: {
                owner,
                repo,
                pullNumber: associatedPR.number,
              },
            });
            enhanced.files = this.parseToolResponse(filesResult);
          } catch (error) {
            console.debug('Could not fetch files for PR', associatedPR.number);
          }
        }

        enhancedCommits.push(enhanced);
      }

      // 5. Calculate statistics
      const statistics = this.calculateStatistics(
        commits,
        prs.items || [],
        issues.items || [],
        enhancedCommits
      );

      return {
        commits: enhancedCommits,
        pullRequests: prs.items || [],
        issues: issues.items || [],
        codeReviews: enhancedCommits
          .filter((c) => c.reviews)
          .flatMap((c) => c.reviews || []),
        statistics,
      };
    } catch (error) {
      console.error('Error fetching enhanced repository data:', error);
      throw error;
    }
  }

  /**
   * Fetch comprehensive user activity across all repositories
   */
  public async fetchEnhancedUserActivity(
    username: string,
    since?: Date,
    until?: Date
  ): Promise<any> {
    try {
      // 1. Get user details (only if it's the authenticated user)
      let userDetails = null;
      try {
        const userResult = await this.client.callTool({
          name: 'get_me',
          arguments: {
            reason: `Checking if ${username} is the authenticated user`,
          },
        });
        const me = this.parseToolResponse(userResult);
        if (me?.login === username) {
          userDetails = me;
        }
      } catch (error) {
        console.debug('Could not fetch user details');
      }

      // 2. Search for all activity with proper date filtering
      const baseQuery = `author:${username}`;
      const dateFilter =
        (since ? ` created:>=${since.toISOString().split('T')[0]}` : '') +
        (until ? ` created:<=${until.toISOString().split('T')[0]}` : '');

      console.log(
        `Searching for activity by ${username} with filter: ${baseQuery + dateFilter}`
      );

      // Fetch PRs with date filter
      const prsResult = await this.client.callTool({
        name: 'search_issues',
        arguments: {
          q: baseQuery + dateFilter + ' is:pr',
          sort: 'created',
          order: 'desc',
          perPage: 100,
        },
      });

      const prs = this.parseToolResponse(prsResult);
      console.log(
        `Found ${prs?.total_count || 0} PRs in the specified timeframe (API total_count)`
      );

      // Client-side filtering because GitHub search API doesn't properly filter by date
      let filteredPRs = prs?.items || [];
      if (since || until) {
        const sinceTime = since ? since.getTime() : 0;
        const untilTime = until ? until.getTime() : Date.now();

        filteredPRs = filteredPRs.filter((pr: any) => {
          const createdTime = new Date(pr.created_at).getTime();
          return createdTime >= sinceTime && createdTime <= untilTime;
        });

        console.log(
          `  After client-side date filtering: ${filteredPRs.length} PRs actually in timeframe`
        );
      }

      // Update prs object with filtered items
      prs.items = filteredPRs;
      prs.filtered_count = filteredPRs.length;

      // Fetch Issues with date filter
      const issuesResult = await this.client.callTool({
        name: 'search_issues',
        arguments: {
          q: baseQuery + dateFilter + ' is:issue',
          sort: 'created',
          order: 'desc',
          perPage: 100,
        },
      });

      const issues = this.parseToolResponse(issuesResult);
      console.log(
        `Found ${issues?.total_count || 0} issues in the specified timeframe (API total_count)`
      );

      // Client-side filtering for issues too
      let filteredIssues = issues?.items || [];
      if (since || until) {
        const sinceTime = since ? since.getTime() : 0;
        const untilTime = until ? until.getTime() : Date.now();

        filteredIssues = filteredIssues.filter((issue: any) => {
          const createdTime = new Date(issue.created_at).getTime();
          return createdTime >= sinceTime && createdTime <= untilTime;
        });

        console.log(
          `  After client-side date filtering: ${filteredIssues.length} issues actually in timeframe`
        );
      }

      // Update issues object with filtered items
      issues.items = filteredIssues;
      issues.filtered_count = filteredIssues.length;

      // 3. Enhance top PRs and issues with detailed content
      const enhancedPRs = await this.enhancePullRequests(prs?.items || [], 5);
      const enhancedIssues = await this.enhanceIssues(issues?.items || [], 5);

      // 4. Get notifications for context (if available)
      let notifications = [];
      if (userDetails) {
        try {
          const notificationsResult = await this.client.callTool({
            name: 'list_notifications',
            arguments: {
              since: since?.toISOString(),
              before: until?.toISOString(),
              perPage: 50,
            },
          });
          notifications = this.parseToolResponse(notificationsResult);
        } catch (error) {
          console.debug('Could not fetch notifications');
        }
      }

      return {
        user: userDetails,
        pullRequests: {
          ...prs,
          items: prs?.items || [],
          enhancedItems: enhancedPRs,
        },
        issues: {
          ...issues,
          items: issues?.items || [],
          enhancedItems: enhancedIssues,
        },
        notifications: notifications,
        summary: this.generateUserActivitySummary(prs, issues, null),
      };
    } catch (error) {
      console.error('Error fetching enhanced user activity:', error);
      throw error;
    }
  }

  /**
   * Enhance pull requests with detailed content
   */
  private async enhancePullRequests(
    prs: any[],
    limit: number = 5
  ): Promise<any[]> {
    const enhanced = [];
    const prsToEnhance = prs.slice(0, limit);

    for (const pr of prsToEnhance) {
      try {
        // Extract owner and repo from repository_url
        const urlParts = pr.repository_url?.split('/') || [];
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];

        if (!owner || !repo) {
          enhanced.push(pr);
          continue;
        }

        // Fetch detailed PR data
        const prDetailResult = await this.client.callTool({
          name: 'get_pull_request',
          arguments: {
            owner,
            repo,
            pullNumber: pr.number,
          },
        });
        const prDetail = this.parseToolResponse(prDetailResult);

        // Fetch PR comments
        let comments = [];
        try {
          const commentsResult = await this.client.callTool({
            name: 'get_pull_request_comments',
            arguments: {
              owner,
              repo,
              pullNumber: pr.number,
            },
          });
          comments = this.parseToolResponse(commentsResult) || [];
        } catch (error) {
          console.debug(`Could not fetch comments for PR #${pr.number}`);
        }

        // Fetch PR reviews
        let reviews = [];
        try {
          const reviewsResult = await this.client.callTool({
            name: 'get_pull_request_reviews',
            arguments: {
              owner,
              repo,
              pullNumber: pr.number,
            },
          });
          reviews = this.parseToolResponse(reviewsResult) || [];
        } catch (error) {
          console.debug(`Could not fetch reviews for PR #${pr.number}`);
        }

        // Fetch PR files (for context)
        let files = [];
        try {
          const filesResult = await this.client.callTool({
            name: 'get_pull_request_files',
            arguments: {
              owner,
              repo,
              pullNumber: pr.number,
            },
          });
          files = this.parseToolResponse(filesResult) || [];
        } catch (error) {
          console.debug(`Could not fetch files for PR #${pr.number}`);
        }

        enhanced.push({
          ...pr,
          ...prDetail,
          enhancedData: {
            comments: comments.slice(0, 10), // Limit comments
            reviews: reviews,
            files: files.map((f: any) => ({
              filename: f.filename,
              additions: f.additions,
              deletions: f.deletions,
              changes: f.changes,
              patch: f.patch?.substring(0, 500), // First 500 chars of patch
            })),
            filesChanged: files.length,
            linesAdded: files.reduce(
              (sum: number, f: any) => sum + (f.additions || 0),
              0
            ),
            linesDeleted: files.reduce(
              (sum: number, f: any) => sum + (f.deletions || 0),
              0
            ),
          },
        });
      } catch (error) {
        console.debug(`Could not enhance PR #${pr.number}:`, error);
        enhanced.push(pr);
      }
    }

    return enhanced;
  }

  /**
   * Enhance issues with detailed content
   */
  private async enhanceIssues(
    issues: any[],
    limit: number = 5
  ): Promise<any[]> {
    const enhanced = [];
    const issuesToEnhance = issues.slice(0, limit);

    for (const issue of issuesToEnhance) {
      try {
        // Extract owner and repo from repository_url
        const urlParts = issue.repository_url?.split('/') || [];
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];

        if (!owner || !repo) {
          enhanced.push(issue);
          continue;
        }

        // Fetch detailed issue data
        const issueDetailResult = await this.client.callTool({
          name: 'get_issue',
          arguments: {
            owner,
            repo,
            issue_number: issue.number,
          },
        });
        const issueDetail = this.parseToolResponse(issueDetailResult);

        // Fetch issue comments
        let comments = [];
        try {
          const commentsResult = await this.client.callTool({
            name: 'get_issue_comments',
            arguments: {
              owner,
              repo,
              issue_number: issue.number,
              per_page: 20,
            },
          });
          comments = this.parseToolResponse(commentsResult) || [];
        } catch (error) {
          console.debug(`Could not fetch comments for issue #${issue.number}`);
        }

        enhanced.push({
          ...issue,
          ...issueDetail,
          enhancedData: {
            comments: comments.map((c: any) => ({
              author: c.user?.login || 'Unknown',
              body: c.body?.substring(0, 500), // First 500 chars
              created_at: c.created_at,
            })),
            commentCount: comments.length,
          },
        });
      } catch (error) {
        console.debug(`Could not enhance issue #${issue.number}:`, error);
        enhanced.push(issue);
      }
    }

    return enhanced;
  }

  /**
   * Parse MCP tool response
   */
  private parseToolResponse(response: any): any {
    if (!response || !response.content) return null;

    try {
      if (Array.isArray(response.content) && response.content[0]?.text) {
        return JSON.parse(response.content[0].text);
      } else if (typeof response.content === 'string') {
        return JSON.parse(response.content);
      }
      return response.content;
    } catch (error) {
      console.error('Error parsing tool response:', error);
      return null;
    }
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(
    commits: any[],
    pullRequests: any[],
    issues: any[],
    enhancedCommits: EnhancedCommitData[]
  ): any {
    // Author statistics
    const authorCounts = new Map<string, number>();
    commits.forEach((commit) => {
      const author =
        commit.author?.login || commit.commit?.author?.name || 'Unknown';
      authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    });

    // Label statistics
    const labelCounts = new Map<string, number>();
    [...pullRequests, ...issues].forEach((item) => {
      item.labels?.forEach((label: any) => {
        const labelName = typeof label === 'string' ? label : label.name;
        labelCounts.set(labelName, (labelCounts.get(labelName) || 0) + 1);
      });
    });

    // File change statistics
    let totalFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;

    enhancedCommits.forEach((ec) => {
      if (ec.files) {
        totalFiles += ec.files.length;
        ec.files.forEach((file: any) => {
          totalAdditions += file.additions || 0;
          totalDeletions += file.deletions || 0;
        });
      }
    });

    return {
      totalCommits: commits.length,
      totalPRs: pullRequests.length,
      totalIssues: issues.length,
      totalReviews: enhancedCommits.filter(
        (c) => c.reviews && c.reviews.length > 0
      ).length,
      avgFilesPerCommit:
        enhancedCommits.length > 0 ? totalFiles / enhancedCommits.length : 0,
      avgLinesChanged:
        enhancedCommits.length > 0
          ? (totalAdditions + totalDeletions) / enhancedCommits.length
          : 0,
      topContributors: Array.from(authorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([author, count]) => ({ author, count })),
      topLabels: Array.from(labelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count })),
    };
  }

  /**
   * Generate user activity summary
   */
  private generateUserActivitySummary(prs: any, issues: any, code: any): any {
    const prItems = prs?.items || [];
    const issueItems = issues?.items || [];

    // Repository statistics
    const repoCounts = new Map<string, number>();
    [...prItems, ...issueItems].forEach((item) => {
      const repo =
        item.repository_url?.split('/').slice(-2).join('/') || 'Unknown';
      repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
    });

    // State statistics
    const openPRs = prItems.filter((pr: any) => pr.state === 'open').length;
    const mergedPRs = prItems.filter(
      (pr: any) => pr.pull_request?.merged_at
    ).length;
    const openIssues = issueItems.filter(
      (issue: any) => issue.state === 'open'
    ).length;

    return {
      totalActivity: prItems.length + issueItems.length,
      pullRequests: {
        total: prItems.length,
        open: openPRs,
        merged: mergedPRs,
        closed: prItems.length - openPRs,
      },
      issues: {
        total: issueItems.length,
        open: openIssues,
        closed: issueItems.length - openIssues,
      },
      topRepositories: Array.from(repoCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([repo, count]) => ({ repo, count })),
      codeSearchResults: code?.total_count || 0,
    };
  }
}
