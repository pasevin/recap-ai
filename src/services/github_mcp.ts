import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

interface EnhancedCommitData {
  commit: any;
  pullRequest?: any;
  reviews?: any[];
  files?: any[];
  comments?: any[];
}

interface UnifiedActivityData {
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
  summary?: {
    totalActivity: number;
    pullRequests: {
      total: number;
      open: number;
      merged: number;
      closed: number;
    };
    issues: {
      total: number;
      open: number;
      closed: number;
    };
    topRepositories: { repo: string; count: number }[];
    codeSearchResults: number;
  };
  userDetails?: any;
  enhancedPullRequests?: any[];
  enhancedIssues?: any[];
}

export class GitHubMCPService {
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
        author, // Author filtering now works correctly as of July 2025
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
          query: issueQuery,
          sort: 'created',
          order: 'desc',
          per_page: 100,
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
          query: codeQuery,
          per_page: 100,
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
   * Fetch comprehensive repository data with enhanced commit details
   */
  public async fetchEnhancedRepositoryData(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date,
    branch?: string,
    author?: string
  ): Promise<UnifiedActivityData> {
    try {
      // 1. Get commits with detailed information
      const commitsResult = await this.client.callTool({
        name: 'list_commits',
        arguments: {
          owner,
          repo,
          sha: branch,
          since: since?.toISOString(),
          until: until?.toISOString(),
          author, // Author filtering now works correctly as of July 2025
          per_page: 100,
        },
      });

      const commits = this.parseToolResponse(commitsResult) || [];
      console.log(`Found ${commits.length} commits`);

      // 2. Get PRs and Issues
      const { pullRequests, issues } = await this.fetchPullRequestsAndIssues(
        owner,
        repo,
        since,
        until,
        author
      );

      // 3. Enhance commits with PR/review data
      const enhancedCommits = await this.enhanceCommitsWithPRData(
        commits.slice(0, 10),
        pullRequests,
        owner,
        repo
      );

      // 4. Calculate statistics
      const statistics = this.calculateStatistics(
        commits,
        pullRequests,
        issues,
        enhancedCommits
      );

      // 5. Generate summary for consistency with user activity
      const summary = this.generateActivitySummary(
        pullRequests,
        issues,
        null,
        `${owner}/${repo}`
      );

      return {
        commits: enhancedCommits,
        pullRequests,
        issues,
        codeReviews: enhancedCommits
          .filter((c) => c.reviews)
          .flatMap((c) => c.reviews || []),
        statistics,
        summary,
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
  ): Promise<UnifiedActivityData> {
    try {
      // 1. Get user details (only if it's the authenticated user)
      let userDetails = null;
      try {
        const userResult = await this.client.callTool({
          name: 'get_authenticated_user',
          arguments: {},
        });
        const me = this.parseToolResponse(userResult);
        if (me?.login === username) {
          userDetails = me;
        }
      } catch (error) {
        console.debug('Could not fetch user details');
      }

      // 2. Search for all activity with proper date filtering
      const { pullRequests, issues } =
        await this.searchUserActivityWithPagination(username, since, until);

      // 3. Enhance top PRs and issues with detailed content
      const enhancedPullRequests = await this.enhancePullRequests(
        pullRequests.slice(0, 5)
      );
      const enhancedIssues = await this.enhanceIssues(issues.slice(0, 5));

      // 4. Calculate statistics (similar to repo-specific)
      const statistics = this.calculateStatistics([], pullRequests, issues, []);

      // 5. Generate summary
      const summary = this.generateActivitySummary(pullRequests, issues, null);

      return {
        commits: [], // User activity doesn't include commits directly
        pullRequests,
        issues,
        codeReviews: [],
        statistics,
        summary,
        userDetails,
        enhancedPullRequests,
        enhancedIssues,
      };
    } catch (error) {
      console.error('Error fetching enhanced user activity:', error);
      throw error;
    }
  }

  /**
   * Helper method to fetch pull requests and issues for a repository
   */
  private async fetchPullRequestsAndIssues(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date,
    author?: string
  ): Promise<{ pullRequests: any[]; issues: any[] }> {
    // Fetch PRs
    const prsResult = await this.client.callTool({
      name: 'list_pull_requests',
      arguments: {
        owner,
        repo,
        state: 'all',
        sort: 'created',
        direction: 'desc',
        per_page: 100,
      },
    });

    let prs = this.parseToolResponse(prsResult) || [];

    // Filter PRs by date range if specified
    if (since || until) {
      prs = this.filterByDateRange(prs, since, until);
    }

    // Filter by author if specified
    if (author) {
      prs = prs.filter((pr: any) => pr.user?.login === author);
    }

    console.log(`Found ${prs.length} PRs${author ? ` by ${author}` : ''}`);

    // Fetch Issues
    const issuesResult = await this.client.callTool({
      name: 'list_issues',
      arguments: {
        owner,
        repo,
        state: 'all',
        since: since?.toISOString(),
        sort: 'created',
        direction: 'desc',
        per_page: 100,
      },
    });

    let issues = this.parseToolResponse(issuesResult) || [];

    // Filter by until date if specified (since list_issues doesn't have 'until')
    if (until) {
      issues = issues.filter((issue: any) => {
        const createdTime = new Date(issue.created_at).getTime();
        return createdTime <= until.getTime();
      });
    }

    // Filter by author if specified
    if (author) {
      issues = issues.filter((issue: any) => issue.user?.login === author);
    }

    // Remove pull requests from issues (GitHub returns PRs as issues too)
    issues = issues.filter((issue: any) => !issue.pull_request);

    console.log(
      `Found ${issues.length} issues${author ? ` by ${author}` : ''}`
    );

    return { pullRequests: prs, issues };
  }

  /**
   * Helper method to search user activity with pagination
   */
  private async searchUserActivityWithPagination(
    username: string,
    since?: Date,
    until?: Date
  ): Promise<{ pullRequests: any[]; issues: any[] }> {
    const baseQuery = `author:${username}`;
    const dateFilter =
      (since ? ` created:>=${since.toISOString().split('T')[0]}` : '') +
      (until ? ` created:<=${until.toISOString().split('T')[0]}` : '');

    console.log(
      `Searching for activity by ${username} with filter: ${baseQuery + dateFilter}`
    );

    const fetchAllInDateRange = async (
      searchType: string,
      typeFilter: string
    ) => {
      const allItems: any[] = [];
      let page = 1;
      let hasMore = true;
      const sinceTime = since ? since.getTime() : 0;
      const untilTime = until ? until.getTime() : Date.now();

      while (hasMore) {
        const result = await this.client.callTool({
          name: 'search_issues',
          arguments: {
            query: baseQuery + dateFilter + typeFilter,
            sort: 'created',
            order: 'desc',
            per_page: 100,
            page,
          },
        });

        const response = this.parseToolResponse(result);
        const items = response?.items || [];

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        // Filter items by date range
        const filteredItems = items.filter((item: any) => {
          const createdTime = new Date(item.created_at).getTime();
          return createdTime >= sinceTime && createdTime <= untilTime;
        });

        allItems.push(...filteredItems);

        // Check if the last item in this page is still within our date range
        const lastItem = items[items.length - 1];
        const lastItemTime = new Date(lastItem.created_at).getTime();

        if (items.length < 100 || lastItemTime < sinceTime) {
          hasMore = false;
        } else {
          page++;
          console.log(
            `  Fetching page ${page} for ${searchType} (last item date: ${lastItem.created_at})`
          );
        }
      }

      console.log(
        `Found ${allItems.length} ${searchType} in the specified timeframe (after pagination)`
      );
      return allItems;
    };

    // Fetch all PRs and Issues with pagination
    const [prs, issues] = await Promise.all([
      fetchAllInDateRange('PRs', ' is:pr'),
      fetchAllInDateRange('issues', ' is:issue'),
    ]);

    return { pullRequests: prs, issues };
  }

  /**
   * Helper method to enhance commits with PR data
   */
  private async enhanceCommitsWithPRData(
    commits: any[],
    pullRequests: any[],
    owner: string,
    repo: string
  ): Promise<EnhancedCommitData[]> {
    const enhancedCommits: EnhancedCommitData[] = [];

    for (const commit of commits) {
      const enhanced: EnhancedCommitData = { commit };

      // Find associated PR
      const associatedPR = pullRequests.find(
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
          console.debug('Could not fetch reviews for PR', associatedPR.number);
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

    return enhancedCommits;
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
   * Helper method to filter items by date range
   */
  private filterByDateRange(items: any[], since?: Date, until?: Date): any[] {
    const sinceTime = since ? since.getTime() : 0;
    const untilTime = until ? until.getTime() : Date.now();

    return items.filter((item: any) => {
      const createdTime = new Date(item.created_at).getTime();
      return createdTime >= sinceTime && createdTime <= untilTime;
    });
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
   * Generate activity summary
   */
  private generateActivitySummary(
    pullRequests: any[],
    issues: any[],
    code: any,
    repoName?: string
  ): any {
    // Repository statistics
    const repoCounts = new Map<string, number>();

    if (repoName) {
      // For repo-specific searches, just use the repo name
      repoCounts.set(repoName, pullRequests.length + issues.length);
    } else {
      // For user activity searches, extract repo from URL
      [...pullRequests, ...issues].forEach((item) => {
        const repo =
          item.repository_url?.split('/').slice(-2).join('/') || 'Unknown';
        repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
      });
    }

    // State statistics
    const openPRs = pullRequests.filter(
      (pr: any) => pr.state === 'open'
    ).length;
    const mergedPRs = pullRequests.filter(
      (pr: any) => pr.pull_request?.merged_at || pr.merged_at
    ).length;
    const openIssues = issues.filter(
      (issue: any) => issue.state === 'open'
    ).length;

    return {
      totalActivity: pullRequests.length + issues.length,
      pullRequests: {
        total: pullRequests.length,
        open: openPRs,
        merged: mergedPRs,
        closed: pullRequests.length - openPRs,
      },
      issues: {
        total: issues.length,
        open: openIssues,
        closed: issues.length - openIssues,
      },
      topRepositories: Array.from(repoCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([repo, count]) => ({ repo, count })),
      codeSearchResults: code?.total_count || 0,
    };
  }
}
