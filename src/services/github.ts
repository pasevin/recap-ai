import { Octokit } from '@octokit/rest';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface FetchOptions {
  since?: string | Date;
  until?: string | Date;
  branch?: string;
  author?: string;
  prState?: 'open' | 'closed' | 'all';
}

export interface GitHubData {
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    description: string;
    state: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    labels: string[];
    reviewStatus: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    comments: Array<{
      author: string;
      body: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
  summary: {
    totalCommits: number;
    totalPRs: number;
    openPRs: number;
    closedPRs: number;
    mergedPRs: number;
    avgTimeToMerge: string;
    mostActiveAuthors: Array<{ author: string; contributions: number }>;
    reviewStatus: {
      approved: number;
      changesRequested: number;
      commented: number;
      pending: number;
      dismissed: number;
    };
    labels: Array<{ name: string; count: number }>;
    codeChanges: {
      totalAdditions: number;
      totalDeletions: number;
      totalChangedFiles: number;
      avgPRSize: string;
    };
    timeStats: {
      avgTimeToFirstReview: string;
      avgTimeToClose: string;
      prVelocity: number; // PRs merged per day
    };
  };
}

type ContributionItem = {
  author: string;
  [key: string]: any;
};

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  async fetchData(options: FetchOptions = {}): Promise<GitHubData> {
    const [commits, pullRequests] = await Promise.all([
      this.fetchCommits(options),
      this.fetchPullRequests(options),
    ]);

    const summary = this.generateSummary(commits, pullRequests);

    return {
      commits,
      pullRequests,
      summary,
    };
  }

  private async fetchCommits(options: FetchOptions) {
    console.log('Fetching commits with options:', {
      since: options.since,
      until: options.until,
      branch: options.branch,
      author: options.author,
    });

    const { data } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      since:
        options.since instanceof Date
          ? options.since.toISOString()
          : options.since,
      until:
        options.until instanceof Date
          ? options.until.toISOString()
          : options.until,
      sha: options.branch,
      author: options.author,
    });

    // console.log(`Found ${data.length} commits`);

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || new Date().toISOString(),
    }));
  }

  private async fetchPullRequests(options: FetchOptions) {
    console.log('Fetching pull requests with options:', {
      since: options.since,
      until: options.until,
      branch: options.branch,
      author: options.author,
      prState: options.prState,
    });

    const prs = await this.octokit.paginate(this.octokit.pulls.list, {
      owner: this.owner,
      repo: this.repo,
      state: options.prState || 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      base: options.branch,
      since:
        options.since instanceof Date
          ? options.since.toISOString()
          : options.since,
    });

    // console.log(`Found ${prs.length} pull requests before filtering`);

    const sinceDate: Date | null = options.since
      ? options.since instanceof Date
        ? options.since
        : new Date(options.since)
      : null;
    const untilDate: Date | null = options.until
      ? options.until instanceof Date
        ? options.until
        : new Date(options.until)
      : null;

    const filteredPRs = prs.filter((pr) => {
      const createdAt = new Date(pr.created_at);
      const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;

      // A PR is considered active in the period if:
      // 1. It was created during the period, OR
      // 2. It was closed during the period, OR
      // 3. It was updated during the period (excluding PRs that were closed before the period)
      const wasCreatedInPeriod =
        sinceDate === null ||
        (createdAt >= sinceDate &&
          (untilDate === null || createdAt <= untilDate));
      const wasClosedInPeriod =
        closedAt !== null &&
        (sinceDate === null || closedAt >= sinceDate) &&
        (untilDate === null || closedAt <= untilDate);
      const wasUpdatedInPeriod =
        (sinceDate === null || new Date(pr.updated_at) >= sinceDate) &&
        (untilDate === null || new Date(pr.updated_at) <= untilDate);

      const matchesAuthor =
        !options.author || pr.user?.login === options.author;
      const matchesBranch = !options.branch || pr.base.ref === options.branch;

      // console.log(`PR #${pr.number}:`, {
      //   createdAt: createdAt.toISOString(),
      //   closedAt: closedAt?.toISOString() || 'null',
      //   wasCreatedInPeriod,
      //   wasClosedInPeriod,
      //   wasUpdatedInPeriod,
      //   matchesAuthor,
      //   matchesBranch,
      //   sinceDate: sinceDate?.toISOString() || 'null',
      //   untilDate: untilDate?.toISOString() || 'null',
      // });

      return (
        (wasCreatedInPeriod || wasClosedInPeriod || wasUpdatedInPeriod) &&
        matchesAuthor &&
        matchesBranch
      );
    });

    // console.log(`Found ${filteredPRs.length} pull requests after filtering`);

    const prsWithDetails = await Promise.all(
      filteredPRs.map(async (pr) => {
        const [reviews, prDetails, comments] = await Promise.all([
          this.octokit.pulls.listReviews({
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number,
          }),
          this.octokit.pulls.get({
            owner: this.owner,
            repo: this.repo,
            pull_number: pr.number,
          }),
          this.octokit.issues.listComments({
            owner: this.owner,
            repo: this.repo,
            issue_number: pr.number,
          }),
        ]);

        const lastReview = reviews.data[reviews.data.length - 1];
        const reviewStatus = lastReview ? lastReview.state : 'PENDING';

        return {
          number: pr.number,
          title: pr.title,
          description: prDetails.data.body || '',
          state: pr.state,
          author: pr.user?.login || 'Unknown',
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          closedAt: pr.closed_at,
          mergedAt: pr.merged_at,
          labels: pr.labels.map((label) => label.name),
          reviewStatus,
          additions: prDetails.data.additions,
          deletions: prDetails.data.deletions,
          changedFiles: prDetails.data.changed_files,
          comments: comments.data.map((comment) => ({
            author: comment.user?.login || 'Unknown',
            body: comment.body || '',
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
          })),
        };
      })
    );

    return prsWithDetails;
  }

  private generateSummary(
    commits: GitHubData['commits'],
    prs: GitHubData['pullRequests']
  ): GitHubData['summary'] {
    // Basic statistics
    const totalCommits = commits.length;
    const totalPRs = prs.length;
    const openPRs = prs.filter((pr) => pr.state === 'open').length;
    const closedPRs = prs.filter((pr) => pr.state === 'closed').length;
    const mergedPRs = prs.filter((pr) => pr.mergedAt).length;

    // Review status statistics
    const reviewStatus = {
      approved: prs.filter((pr) => pr.reviewStatus === 'APPROVED').length,
      changesRequested: prs.filter(
        (pr) => pr.reviewStatus === 'CHANGES_REQUESTED'
      ).length,
      commented: prs.filter((pr) => pr.reviewStatus === 'COMMENTED').length,
      pending: prs.filter((pr) => pr.reviewStatus === 'PENDING').length,
      dismissed: prs.filter((pr) => pr.reviewStatus === 'DISMISSED').length,
    };

    // Label statistics
    const labelCounts = new Map<string, number>();
    prs.forEach((pr) => {
      pr.labels.forEach((label) => {
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      });
    });

    const labels = Array.from(labelCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 labels

    // Code change statistics
    const totalAdditions = prs.reduce((sum, pr) => sum + pr.additions, 0);
    const totalDeletions = prs.reduce((sum, pr) => sum + pr.deletions, 0);
    const totalChangedFiles = prs.reduce((sum, pr) => sum + pr.changedFiles, 0);
    const avgPRSize = this.formatChanges(
      Math.floor((totalAdditions + totalDeletions) / totalPRs)
    );

    // Time-based statistics
    const mergedPRTimes = prs
      .filter((pr) => pr.mergedAt)
      .map((pr) => {
        const created = new Date(pr.createdAt);
        const merged = new Date(pr.mergedAt!);
        return merged.getTime() - created.getTime();
      });

    const closedPRTimes = prs
      .filter((pr) => pr.closedAt)
      .map((pr) => {
        const created = new Date(pr.createdAt);
        const closed = new Date(pr.closedAt!);
        return closed.getTime() - created.getTime();
      });

    const avgTimeToMerge = mergedPRTimes.length
      ? this.formatDuration(
          mergedPRTimes.reduce((a, b) => a + b, 0) / mergedPRTimes.length
        )
      : 'N/A';

    const avgTimeToClose = closedPRTimes.length
      ? this.formatDuration(
          closedPRTimes.reduce((a, b) => a + b, 0) / closedPRTimes.length
        )
      : 'N/A';

    // Calculate PR velocity (PRs merged per day)
    const timeRange =
      prs.length > 0
        ? (new Date(prs[0].createdAt).getTime() -
            new Date(prs[prs.length - 1].createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
        : 0;
    const prVelocity = timeRange > 0 ? +(mergedPRs / timeRange).toFixed(1) : 0;

    // Author statistics
    const authorContributions = new Map<string, number>();
    const items: ContributionItem[] = [...commits, ...prs];
    items.forEach((item) => {
      authorContributions.set(
        item.author,
        (authorContributions.get(item.author) || 0) + 1
      );
    });

    const mostActiveAuthors = Array.from(authorContributions.entries())
      .map(([author, contributions]) => ({ author, contributions }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 5);

    return {
      totalCommits,
      totalPRs,
      openPRs,
      closedPRs,
      mergedPRs,
      avgTimeToMerge,
      mostActiveAuthors,
      reviewStatus,
      labels,
      codeChanges: {
        totalAdditions,
        totalDeletions,
        totalChangedFiles,
        avgPRSize,
      },
      timeStats: {
        avgTimeToFirstReview: 'N/A', // TODO: Implement first review time calculation
        avgTimeToClose,
        prVelocity,
      },
    };
  }

  private formatDuration(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
  }

  private formatChanges(lines: number): string {
    if (lines >= 1000) {
      return `${(lines / 1000).toFixed(1)}k`;
    }
    return lines.toString();
  }
}
