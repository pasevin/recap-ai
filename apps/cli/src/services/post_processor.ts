import { ActivityData } from './openai';

interface SummaryStats {
  prsMerged: number;
  commits: number;
  issuesWorked: number;
  repositories: string[];
}

/**
 * PostProcessorService
 *
 * Performs deterministic transformations on the AI-generated markdown,
 * filling simple metrics and linkifying references without wasting model tokens.
 */
export class PostProcessorService {
  apply(markdown: string, data: ActivityData): string {
    let output = markdown;

    const stats = this.computeSummaryStats(data);
    output = this.fillSummaryStatistics(output, stats);

    output = this.linkifyGitHubPRs(output, data);
    output = this.linkifyGitHubIssuesInNarrative(output, data);
    output = this.linkifyLinearIssues(output, data);

    return output;
  }

  private computeSummaryStats(data: ActivityData): SummaryStats {
    const prs = data.github?.pullRequests ?? [];
    const commits = data.github?.commits ?? [];
    const ghIssues = data.github?.issues ?? [];
    const repoStats = data.github as {
      statistics?: { totalCommits: number; totalIssues: number };
      statisticsRepo?: { totalCommits: number; totalIssues: number };
    } as unknown as {
      statistics?: { totalCommits: number; totalIssues: number };
      statisticsRepo?: { totalCommits: number; totalIssues: number };
    };
    const linearIssues = [
      ...(data.linear?.issues ?? []),
      ...(Array.isArray(data.linear?.activeIssues)
        ? (data.linear?.activeIssues as Array<{ identifier: string }>)
        : []),
    ];

    // Prefer mergedPRs from repo statistics when available
    const repoStatsMerged = (
      repoStats?.statisticsRepo as { mergedPRs?: number } | undefined
    )?.mergedPRs;
    const statsMerged = (
      repoStats?.statistics as { mergedPRs?: number } | undefined
    )?.mergedPRs;
    let prsMerged =
      (typeof repoStatsMerged === 'number' && repoStatsMerged >= 0
        ? repoStatsMerged
        : undefined) ??
      (typeof statsMerged === 'number' && statsMerged >= 0
        ? statsMerged
        : undefined);

    if (prsMerged == null) {
      const mergedByMergedAt = prs.filter((pr) => Boolean(pr.mergedAt)).length;
      const mergedByState = prs.filter((pr) => {
        const state = (pr as { state?: string }).state?.toLowerCase();
        return state === 'merged';
      }).length;
      prsMerged = mergedByMergedAt > 0 ? mergedByMergedAt : mergedByState;
    }
    const repositoriesSet = new Set<string>();
    prs.forEach((pr) => {
      if (pr.repository) repositoriesSet.add(pr.repository);
    });
    commits.forEach((c) => {
      if (c.repository) repositoriesSet.add(c.repository);
    });
    ghIssues.forEach((i) => {
      if (i.repository) repositoriesSet.add(i.repository);
    });

    // Issues worked = GitHub issues (prefer repo-wide aggregate) + unique Linear issues
    const ghIssuesCount =
      repoStats?.statisticsRepo?.totalIssues ??
      repoStats?.statistics?.totalIssues ??
      ghIssues.length;
    const linearUnique = new Set<string>();
    linearIssues.forEach((i) => {
      if ((i as { identifier?: string }).identifier) {
        linearUnique.add((i as { identifier: string }).identifier);
      }
    });

    return {
      prsMerged,
      commits:
        repoStats?.statisticsRepo?.totalCommits ??
        repoStats?.statistics?.totalCommits ??
        commits.length,
      issuesWorked: ghIssuesCount + linearUnique.size,
      repositories: Array.from(repositoriesSet.values()).sort(),
    };
  }

  private fillSummaryStatistics(markdown: string, stats: SummaryStats): string {
    // Replace only the Value cell for each known row, preserving table structure
    const replaceValueCell = (text: string, key: string, value: string) => {
      const rowRegex = new RegExp(
        `(^|\\n)(\\|\\s*${this.escapeRegex(key)}\\s*\\|)\\s*([^\\n|]*?)\\s*\\|`,
        'i'
      );
      return text.replace(rowRegex, (_m, prefix: string, head: string) => {
        return `${prefix}${head} ${value} |`;
      });
    };

    let output = markdown;
    output = replaceValueCell(output, 'PRs Merged', String(stats.prsMerged));
    output = replaceValueCell(output, 'Commits', String(stats.commits));
    output = replaceValueCell(
      output,
      'Issues Worked',
      String(stats.issuesWorked)
    );
    output = replaceValueCell(
      output,
      'Repositories',
      stats.repositories.join(', ')
    );
    return output;
  }

  private linkifyGitHubPRs(markdown: string, data: ActivityData): string {
    // Build repo short name -> owner/repo map, and PR number -> full repo map
    const repoShortToFull = new Map<string, string>();
    const prKeyToUrl = new Map<string, string>(); // key: `${repoShort}#${num}` => url

    (data.github?.pullRequests ?? []).forEach((pr) => {
      if (!pr.url) return;
      const ownerRepo = pr.repository ?? this.extractOwnerRepoFromUrl(pr.url);
      if (!ownerRepo) return;
      const short = ownerRepo.split('/').pop() ?? ownerRepo;
      repoShortToFull.set(short, ownerRepo);
      const prNum = this.extractPRNumberFromUrl(pr.url);
      if (prNum) prKeyToUrl.set(`${short}#${prNum}`, pr.url);
    });

    // Build number -> urls map for fallback when repo is unknown
    const prNumToUrls = new Map<string, string[]>();
    (data.github?.pullRequests ?? []).forEach((pr) => {
      const prNum = this.extractPRNumberFromUrl(pr.url ?? '');
      if (!prNum || !pr.url) return;
      const arr = prNumToUrls.get(prNum) ?? [];
      arr.push(pr.url);
      prNumToUrls.set(prNum, arr);
    });

    const lines = markdown.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      // Look for any (PR: ...) group; handle lists and ranges
      const prGroup = line.match(/\(PR:\s*[^)]*\)/i);
      if (!prGroup) continue;

      // Try to infer repo from bold repo at line start: - **repo** –
      const repoMatch = line.match(/^\s*-\s*\*\*([^*]+)\*\*/);
      let ownerRepo: string | undefined;
      if (repoMatch) {
        const short =
          repoMatch[1].trim().split('/').pop() ?? repoMatch[1].trim();
        ownerRepo = repoShortToFull.get(short);
      }

      const originalGroup = prGroup[0];
      let inner = originalGroup.slice(1, -1); // remove parentheses

      // Expand ranges like #168–#173 or #168-#173 into comma-separated list
      inner = inner.replace(
        /#(\d+)\s*[–-]\s*#(\d+)/g,
        (_m, a: string, b: string) => {
          const start = Math.min(Number(a), Number(b));
          const end = Math.max(Number(a), Number(b));
          const span = end - start + 1;
          const cap = Math.min(span, 50); // safety cap
          const nums: string[] = [];
          for (let n = 0; n < cap; n += 1) nums.push(`#${start + n}`);
          return nums.join(', ');
        }
      );

      // Linkify all #num occurrences in the inner content
      inner = inner.replace(/#(\d+)/g, (_m, n: string) => {
        const prNum = String(n);
        if (ownerRepo) {
          const url = `https://github.com/${ownerRepo}/pull/${prNum}`;
          return `[#${prNum}](${url})`;
        }
        const urls = prNumToUrls.get(prNum) ?? [];
        if (urls.length === 1) {
          return `[#${prNum}](${urls[0]})`;
        }
        // As a last fallback, try prKeyToUrl entries (repoShort keyed)
        for (const [key, url] of prKeyToUrl.entries()) {
          if (key.endsWith(`#${prNum}`)) return `[#${prNum}](${url})`;
        }
        return `#${prNum}`;
      });

      lines[i] = line.replace(originalGroup, `(${inner})`);
    }

    return lines.join('\n');
  }

  private linkifyLinearIssues(markdown: string, data: ActivityData): string {
    // Build id -> url map when available
    const idToUrl = new Map<string, string>();
    const pushIssue = (issue: { identifier?: string; url?: string }) => {
      if (issue.identifier && issue.url)
        idToUrl.set(issue.identifier, issue.url);
    };

    (data.linear?.issues ?? []).forEach(pushIssue);
    if (Array.isArray(data.linear?.activeIssues)) {
      (
        data.linear?.activeIssues as Array<{
          identifier?: string;
          url?: string;
        }>
      ).forEach(pushIssue);
    }

    if (idToUrl.size === 0) return markdown;

    // Replace **ABC-123** with **[ABC-123](url)** when url known
    return markdown.replace(
      /\*\*([A-Z][A-Z0-9]+-\d+)\*\*/g,
      (_m, id: string) => {
        const url = idToUrl.get(id);
        if (!url) return `**${id}**`;
        return `**[${id}](${url})**`;
      }
    );
  }

  private linkifyGitHubIssuesInNarrative(
    markdown: string,
    data: ActivityData
  ): string {
    // Build number -> urls map (only use when unique to avoid ambiguity)
    const issueNumToUrls = new Map<string, string[]>();
    (data.github?.issues ?? []).forEach((issue) => {
      const numMatch = issue.url?.match(/\/issues\/(\d+)/);
      const num = numMatch ? numMatch[1] : undefined;
      if (!num || !issue.url) return;
      const arr = issueNumToUrls.get(num) ?? [];
      arr.push(issue.url);
      issueNumToUrls.set(num, arr);
    });

    const repoShortToFull = new Map<string, string>();
    (data.github?.issues ?? []).forEach((issue) => {
      if (issue.repository) {
        const short = issue.repository.split('/').pop() ?? issue.repository;
        repoShortToFull.set(short, issue.repository);
      }
    });

    const lines = markdown.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (!/issue/i.test(line)) continue;

      // Try to infer repo from bold repo at line start: - **repo** –
      const repoMatch = line.match(/^\s*-\s*\*\*([^*]+)\*\*/);
      let ownerRepo: string | undefined;
      if (repoMatch) {
        const short =
          repoMatch[1].trim().split('/').pop() ?? repoMatch[1].trim();
        ownerRepo = repoShortToFull.get(short);
      }

      // Focus only the substring after the first occurrence of 'Issue'/'Issues'
      const idx = line.search(/issues?/i);
      if (idx < 0) continue;
      const prefix = line.slice(0, idx);
      let tail = line.slice(idx);

      // Expand ranges e.g., Issue #10-#12 → Issue #10, #11, #12
      tail = tail.replace(
        /#(\d+)\s*[–-]\s*#(\d+)/g,
        (_m, a: string, b: string) => {
          const start = Math.min(Number(a), Number(b));
          const end = Math.max(Number(a), Number(b));
          const span = end - start + 1;
          const cap = Math.min(span, 50);
          const nums: string[] = [];
          for (let n = 0; n < cap; n += 1) nums.push(`#${start + n}`);
          return nums.join(', ');
        }
      );

      // Linkify all #num after the word Issue/Issues
      tail = tail.replace(/#(\d+)/g, (_m, n: string) => {
        const num = String(n);
        if (ownerRepo) {
          return `[#${num}](https://github.com/${ownerRepo}/issues/${num})`;
        }
        const urls = issueNumToUrls.get(num) ?? [];
        if (urls.length === 1) return `[#${num}](${urls[0]})`;
        return `#${num}`; // ambiguous; leave plain
      });

      lines[i] = prefix + tail;
    }

    return lines.join('\n');
  }

  private extractOwnerRepoFromUrl(url: string): string | undefined {
    const m = url.match(/github\.com\/([^/]+\/[^/]+)\//i);
    return m ? m[1] : undefined;
  }

  private extractPRNumberFromUrl(url: string): string | undefined {
    const m = url.match(/\/pull\/(\d+)/i);
    return m ? m[1] : undefined;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const postProcessorService = new PostProcessorService();
