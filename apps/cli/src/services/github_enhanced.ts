import { Octokit } from '@octokit/rest';
import { RateLimiter } from '../utils/rate_limiter';
import {
  UnifiedActivityData,
  EnhancedCommitData,
  RepositoryOptions,
  UserActivityOptions,
  Statistics,
  ActivitySummary,
} from '../interfaces/activity';
import {
  GitHubPullRequest,
  GitHubIssue,
  GitHubFile,
  GitHubCommit,
  GitHubReview,
} from '../interfaces/github-types';

export class EnhancedGitHubService {
  private octokit: Octokit;
  private rateLimiter: RateLimiter;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Fetch enhanced repository data with commit-PR associations
   */
  async fetchEnhancedRepositoryData(
    owner: string,
    repo: string,
    options: RepositoryOptions = {}
  ): Promise<UnifiedActivityData> {
    const {
      since,
      until,
      branch = 'main',
      author,
      includePRs = true,
      includeIssues = true,
      includeReviews = true,
      maxResults = 100,
    } = options;

    try {
      // Step 1: Fetch core data in parallel
      const [commits, pullRequests, issues] = await Promise.all([
        this.fetchCommits(owner, repo, {
          since,
          until,
          branch,
          author,
          maxResults,
        }),
        includePRs
          ? this.fetchPullRequests(owner, repo, {
              since,
              until,
              author,
              maxResults,
            })
          : [],
        includeIssues
          ? this.fetchIssues(owner, repo, { since, until, author, maxResults })
          : [],
      ]);

      // Step 2: Enhance commits with PR associations
      const enhancedCommits = await this.associateCommitsWithPRs(
        commits,
        pullRequests,
        owner,
        repo
      );

      // Step 3: Enhance PRs with review data (limited for performance)
      const enhancedPRs = includeReviews
        ? await this.enrichPullRequestData(
            pullRequests.slice(0, 10),
            owner,
            repo
          )
        : pullRequests;

      // Step 4: Enhance issues with comment data (limited)
      const enhancedIssues = await this.enrichIssueData(
        issues.slice(0, 10),
        owner,
        repo
      );

      // Step 5: Calculate statistics
      const statistics = this.calculateStatistics(
        enhancedCommits,
        enhancedPRs,
        enhancedIssues
      );

      // Step 6: Generate summary
      const summary = this.generateActivitySummary(
        enhancedPRs,
        enhancedIssues,
        `${owner}/${repo}`
      );

      return {
        commits: enhancedCommits,
        pullRequests: enhancedPRs,
        issues: enhancedIssues,
        codeReviews: enhancedCommits
          .filter((c) => c.reviews && c.reviews.length > 0)
          .flatMap((c) => c.reviews ?? []),
        statistics,
        summary,
      };
    } catch (error) {
      console.error('Error fetching enhanced repository data:', error);
      throw new Error(
        `Failed to fetch repository data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch enhanced user activity across all repositories
   */
  async fetchEnhancedUserActivity(
    username: string,
    options: UserActivityOptions = {}
  ): Promise<UnifiedActivityData> {
    const { since, until, maxResults = 100 } = options;

    try {
      // Build search queries
      const dateFilter = this.buildDateFilter(since, until);
      const prQuery = `author:${username} is:pr ${dateFilter}`;
      const issueQuery = `author:${username} is:issue ${dateFilter}`;

      // Search for user activity
      const [prAndIssueResults, issueAndPRResults] = await Promise.all([
        this.searchActivity(prQuery, maxResults),
        this.searchActivity(issueQuery, maxResults),
      ]);

      // Filter results by type
      const prResults = prAndIssueResults.filter(
        (item): item is GitHubPullRequest =>
          'pull_request' in item || ('number' in item && 'head' in item)
      );
      const issueResults = issueAndPRResults.filter(
        (item): item is GitHubIssue =>
          !('pull_request' in item) && !('head' in item)
      );

      // Enhance top items for better AI context
      const enhancedPRs = await this.enrichPullRequestDataFromSearch(
        prResults.slice(0, 5)
      );
      const enhancedIssues = await this.enrichIssueDataFromSearch(
        issueResults.slice(0, 5)
      );

      // Calculate statistics
      const statistics = this.calculateStatistics([], prResults, issueResults);

      // Generate summary
      const summary = this.generateActivitySummary(prResults, issueResults);

      return {
        commits: [], // User activity search doesn't include commits directly
        pullRequests: prResults,
        issues: issueResults,
        codeReviews: [],
        statistics,
        summary,
        enhancedPullRequests: enhancedPRs,
        enhancedIssues: enhancedIssues,
      };
    } catch (error) {
      console.error('Error fetching enhanced user activity:', error);
      throw new Error(
        `Failed to fetch user activity: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch commits from repository
   */
  private async fetchCommits(
    owner: string,
    repo: string,
    options: RepositoryOptions
  ): Promise<GitHubCommit[]> {
    const { since, until, branch, author, maxResults } = options;

    return this.rateLimiter.execute(async () => {
      const params = {
        owner,
        repo,
        sha: branch,
        per_page: Math.min(maxResults ?? 50, 100),
        ...(since && { since: since.toISOString() }),
        ...(until && { until: until.toISOString() }),
        ...(author && { author }),
      };

      const response = await this.octokit.repos.listCommits(params);
      return response.data as GitHubCommit[];
    });
  }

  /**
   * Fetch pull requests from repository
   */
  private async fetchPullRequests(
    owner: string,
    repo: string,
    options: RepositoryOptions
  ): Promise<GitHubPullRequest[]> {
    const { since, until, author, maxResults } = options;

    return this.rateLimiter.execute(async () => {
      const params = {
        owner,
        repo,
        state: 'all' as const,
        per_page: Math.min(maxResults ?? 50, 100),
        sort: 'updated' as const,
        direction: 'desc' as const,
      };

      const response = await this.octokit.pulls.list(params);
      let prs = response.data;

      // Filter by date and author if specified
      if (since ?? until ?? author) {
        prs = prs.filter((pr) => {
          if (author && pr.user?.login !== author) return false;
          if (since && new Date(pr.created_at) < since) return false;
          if (until && new Date(pr.created_at) > until) return false;
          return true;
        });
      }

      return prs as GitHubPullRequest[];
    });
  }

  /**
   * Fetch issues from repository
   */
  private async fetchIssues(
    owner: string,
    repo: string,
    options: RepositoryOptions
  ): Promise<GitHubIssue[]> {
    const { since, until, author, maxResults } = options;

    return this.rateLimiter.execute(async () => {
      const params = {
        owner,
        repo,
        state: 'all' as const,
        per_page: Math.min(maxResults ?? 50, 100),
        sort: 'updated' as const,
        direction: 'desc' as const,
        ...(author && { creator: author }),
        ...(since && { since: since.toISOString() }),
      };

      const response = await this.octokit.issues.listForRepo(params);
      let issues = response.data.filter((issue) => !issue.pull_request); // Exclude PRs

      // Additional filtering for until date
      if (until) {
        issues = issues.filter((issue) => new Date(issue.created_at) <= until);
      }

      return issues as GitHubIssue[];
    });
  }

  /**
   * Associate commits with their pull requests
   */
  private async associateCommitsWithPRs(
    commits: GitHubCommit[],
    pullRequests: GitHubPullRequest[],
    owner: string,
    repo: string
  ): Promise<EnhancedCommitData[]> {
    const enhancedCommits: EnhancedCommitData[] = [];

    for (const commit of commits.slice(0, 20)) {
      // Limit for performance
      const enhanced: EnhancedCommitData = { commit };

      // Find associated PR using multiple strategies
      const associatedPR = this.findAssociatedPR(commit, pullRequests);

      if (associatedPR) {
        enhanced.pullRequest = associatedPR;

        // Fetch additional PR data if available
        try {
          const [reviews, files] = await Promise.all([
            this.rateLimiter.execute(() =>
              this.octokit.pulls
                .listReviews({
                  owner,
                  repo,
                  pull_number: (associatedPR as { number: number }).number,
                })
                .then((r) => r.data)
            ),
            this.rateLimiter.execute(() =>
              this.octokit.pulls
                .listFiles({
                  owner,
                  repo,
                  pull_number: (associatedPR as { number: number }).number,
                })
                .then((r) => r.data)
            ),
          ]);

          enhanced.reviews = reviews as GitHubReview[];
          enhanced.files = files;
        } catch {
          console.debug(
            `Could not fetch PR details for #${associatedPR.number}`
          );
        }
      }

      enhancedCommits.push(enhanced);
    }

    return enhancedCommits;
  }

  /**
   * Find associated PR for a commit using multiple strategies
   */
  private findAssociatedPR(
    commit: GitHubCommit,
    pullRequests: GitHubPullRequest[]
  ): GitHubPullRequest | undefined {
    const commitSha = commit.sha;
    const commitDate = new Date(
      commit.commit.author?.date ??
        commit.commit.committer?.date ??
        new Date().toISOString()
    );

    return pullRequests.find((pr) => {
      // Strategy 1: Check if commit SHA is the merge commit
      if (pr.merge_commit_sha === commitSha) return true;

      // Strategy 2: Check if commit falls within PR timeframe
      const prCreated = new Date(pr.created_at);
      const prMerged = pr.merged_at ? new Date(pr.merged_at) : new Date();

      if (commitDate >= prCreated && commitDate <= prMerged) {
        // Strategy 3: Check if commit message references PR
        const commitMsg = commit.commit.message.toLowerCase();
        if (
          commitMsg.includes(`#${pr.number}`) ||
          commitMsg.includes(`pull/${pr.number}`) ||
          commitMsg.includes(pr.title.toLowerCase().substring(0, 20))
        ) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Enrich pull requests with detailed data
   */
  private async enrichPullRequestData(
    prs: GitHubPullRequest[],
    owner: string,
    repo: string
  ): Promise<GitHubPullRequest[]> {
    const enhanced: GitHubPullRequest[] = [];

    for (const pr of prs) {
      try {
        const [reviews, files, comments] = await Promise.all([
          this.rateLimiter.execute(() =>
            this.octokit.pulls
              .listReviews({
                owner,
                repo,
                pull_number: (pr as { number: number }).number,
              })
              .then((r) => r.data)
          ),
          this.rateLimiter.execute(() =>
            this.octokit.pulls
              .listFiles({
                owner,
                repo,
                pull_number: (pr as { number: number }).number,
              })
              .then((r) => r.data)
          ),
          this.rateLimiter.execute(
            () =>
              this.octokit.pulls
                .listReviewComments({
                  owner,
                  repo,
                  pull_number: (pr as { number: number }).number,
                })
                .then((r) => r.data.slice(0, 10)) // Limit comments
          ),
        ]);

        enhanced.push({
          ...pr,
          enhancedData: {
            url: pr.html_url,
            repository: `${owner}/${repo}`,
            labels: pr.labels || [],
            reviews: reviews as GitHubReview[],
            files: files.map((f) => ({
              filename: f.filename,
              additions: f.additions,
              deletions: f.deletions,
              changes: f.changes,
              patch: f.patch?.substring(0, 500), // First 500 chars
            })),
            comments: comments.map((c) => ({
              author: c.user?.login ?? 'Unknown',
              body: c.body?.substring(0, 300) ?? '',
              created_at: c.created_at,
            })),
            filesChanged: files.length,
            linesAdded: files.reduce((sum, f) => sum + (f.additions ?? 0), 0),
            linesDeleted: files.reduce((sum, f) => sum + (f.deletions ?? 0), 0),
          },
        });
      } catch {
        console.debug(`Could not enhance PR #${pr.number}`);
        enhanced.push(pr);
      }
    }

    return enhanced;
  }

  /**
   * Enrich issues with comment data
   */
  private async enrichIssueData(
    issues: GitHubIssue[],
    owner: string,
    repo: string
  ): Promise<GitHubIssue[]> {
    const enhanced: GitHubIssue[] = [];

    for (const issue of issues) {
      try {
        const comments = await this.rateLimiter.execute(
          () =>
            this.octokit.issues
              .listComments({
                owner,
                repo,
                issue_number: (issue as { number: number }).number,
              })
              .then((r) => r.data.slice(0, 5)) // Limit to 5 comments
        );

        enhanced.push({
          ...issue,
          enhancedData: {
            url: issue.html_url,
            repository: `${owner}/${repo}`,
            labels: issue.labels || [],
            comments: comments.map((c) => ({
              author: c.user?.login ?? 'Unknown',
              body: c.body?.substring(0, 300) ?? '',
              created_at: c.created_at,
            })),
            commentCount: comments.length,
          },
        });
      } catch {
        console.debug(`Could not enhance issue #${issue.number}`);
        enhanced.push(issue);
      }
    }

    return enhanced;
  }

  /**
   * Search for user activity using GitHub search API
   */
  private async searchActivity(
    query: string,
    maxResults: number
  ): Promise<(GitHubPullRequest | GitHubIssue)[]> {
    return this.rateLimiter.execute(async () => {
      const response = await this.octokit.search.issuesAndPullRequests({
        q: query,
        per_page: Math.min(maxResults ?? 50, 100),
        sort: 'updated',
        order: 'desc',
        advanced_search: true, // Use new advanced search API to avoid deprecation warnings
      });
      return response.data.items as (GitHubPullRequest | GitHubIssue)[];
    });
  }

  /**
   * Enrich pull requests from search results
   */
  private async enrichPullRequestDataFromSearch(
    prs: GitHubPullRequest[]
  ): Promise<GitHubPullRequest[]> {
    const enhanced: GitHubPullRequest[] = [];

    for (const pr of prs) {
      if (!pr.repository_url) continue;
      const [owner, repo] = pr.repository_url.split('/').slice(-2);

      try {
        const [reviews, files] = await Promise.all([
          this.rateLimiter.execute(() =>
            this.octokit.pulls
              .listReviews({
                owner,
                repo,
                pull_number: (pr as { number: number }).number,
              })
              .then((r) => r.data)
          ),
          this.rateLimiter.execute(() =>
            this.octokit.pulls
              .listFiles({
                owner,
                repo,
                pull_number: (pr as { number: number }).number,
              })
              .then((r) => r.data)
          ),
        ]);

        enhanced.push({
          ...pr,
          enhancedData: {
            url: pr.html_url,
            repository: `${owner}/${repo}`,
            labels: pr.labels || [],
            reviews: reviews as GitHubReview[],
            filesChanged: files.length,
            linesAdded: files.reduce((sum, f) => sum + (f.additions ?? 0), 0),
            linesDeleted: files.reduce((sum, f) => sum + (f.deletions ?? 0), 0),
          },
        });
      } catch {
        enhanced.push(pr);
      }
    }

    return enhanced;
  }

  /**
   * Enrich issues from search results
   */
  private async enrichIssueDataFromSearch(
    issues: GitHubIssue[]
  ): Promise<GitHubIssue[]> {
    const enhanced: GitHubIssue[] = [];

    for (const issue of issues) {
      if (!issue.repository_url) continue;
      const [owner, repo] = issue.repository_url.split('/').slice(-2);

      try {
        const comments = await this.rateLimiter.execute(() =>
          this.octokit.issues
            .listComments({
              owner,
              repo,
              issue_number: (issue as { number: number }).number,
            })
            .then((r) => r.data.slice(0, 3))
        );

        enhanced.push({
          ...issue,
          enhancedData: {
            url: issue.html_url,
            repository: `${owner}/${repo}`,
            labels: issue.labels || [],
            commentCount: comments.length,
            comments: comments.map((c) => ({
              author: c.user?.login ?? 'Unknown',
              body: c.body ?? '',
              created_at: c.created_at,
            })),
          },
        });
      } catch {
        enhanced.push(issue);
      }
    }

    return enhanced;
  }

  /**
   * Build date filter string for GitHub search
   */
  private buildDateFilter(since?: Date, until?: Date): string {
    const filters = [];
    if (since) filters.push(`created:>=${since.toISOString().split('T')[0]}`);
    if (until) filters.push(`created:<=${until.toISOString().split('T')[0]}`);
    return filters.join(' ');
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(
    commits: unknown[],
    pullRequests: unknown[],
    issues: unknown[]
  ): Statistics {
    // Author statistics
    const authorCounts = new Map<string, number>();
    commits.forEach((commit) => {
      const enhancedCommit = commit as EnhancedCommitData;

      // Extract author with proper priority: GitHub login > Git author name > Git author email > committer name
      const author =
        enhancedCommit.commit.author?.login ??
        enhancedCommit.commit.commit?.author?.name ??
        enhancedCommit.commit.commit?.author?.email ??
        enhancedCommit.commit.commit?.committer?.name ??
        'Unknown';

      authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
    });

    // Label statistics
    const labelCounts = new Map<string, number>();
    [...pullRequests, ...issues].forEach((item) => {
      (
        item as { labels?: Array<string | Record<string, unknown>> }
      ).labels?.forEach((label: string | Record<string, unknown>) => {
        const labelName =
          typeof label === 'string' ? label : (label.name as string);
        if (labelName && typeof labelName === 'string') {
          labelCounts.set(labelName, (labelCounts.get(labelName) ?? 0) + 1);
        }
      });
    });

    // File statistics (from enhanced commits)
    let totalFiles = 0;
    let totalLinesChanged = 0;
    commits.forEach((commit) => {
      const commitWithFiles = commit as { files?: GitHubFile[] };
      if (commitWithFiles.files) {
        totalFiles += commitWithFiles.files.length;
        totalLinesChanged += commitWithFiles.files.reduce(
          (sum: number, f: GitHubFile) =>
            sum + (f.additions ?? 0) + (f.deletions ?? 0),
          0
        );
      }
    });

    return {
      totalCommits: commits.length,
      totalPRs: pullRequests.length,
      totalIssues: issues.length,
      totalReviews: commits.filter((c) => {
        const reviews = (c as { reviews?: unknown[] }).reviews;
        return reviews && reviews.length > 0;
      }).length,
      avgFilesPerCommit: commits.length > 0 ? totalFiles / commits.length : 0,
      avgLinesChanged:
        commits.length > 0 ? totalLinesChanged / commits.length : 0,
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
    pullRequests: GitHubPullRequest[],
    issues: unknown[],
    repository?: string
  ): ActivitySummary {
    // Count PR states
    const prStates = pullRequests.reduce(
      (acc, pr) => {
        const typedPR = pr as {
          state: 'open' | 'closed';
          merged_at?: string | null;
        };
        if (typedPR.state === 'open') acc.open++;
        else if (typedPR.merged_at) acc.merged++;
        else acc.closed++;
        return acc;
      },
      { open: 0, merged: 0, closed: 0 }
    );

    // Count issue states
    const issueStates = issues.reduce(
      (acc: { open: number; closed: number }, issue) => {
        const typedIssue = issue as { state: 'open' | 'closed' };
        if (typedIssue.state === 'open') acc.open++;
        else acc.closed++;
        return acc;
      },
      { open: 0, closed: 0 }
    );

    // Top repositories (from activity)
    const repoCounts = new Map<string, number>();
    [...pullRequests, ...issues].forEach((item) => {
      const itemWithRepo = item as { repository_url?: string };
      if (itemWithRepo.repository_url) {
        const repoName = itemWithRepo.repository_url
          .split('/')
          .slice(-2)
          .join('/');
        repoCounts.set(repoName, (repoCounts.get(repoName) ?? 0) + 1);
      } else if (repository) {
        repoCounts.set(repository, (repoCounts.get(repository) ?? 0) + 1);
      }
    });

    return {
      totalActivity: pullRequests.length + issues.length,
      pullRequests: {
        total: pullRequests.length,
        ...prStates,
      },
      issues: {
        total: issues.length,
        open: issueStates.open,
        closed: issueStates.closed,
      },
      topRepositories: Array.from(repoCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([repo, count]) => ({ repo, count })),
    };
  }
}
