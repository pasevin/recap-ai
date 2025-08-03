// GitHub API types - replacing any usage with proper interfaces

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  user: GitHubUser | null;
  assignees: GitHubUser[] | null | undefined;
  labels: GitHubLabel[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  base: {
    ref: string;
    repo: GitHubRepository;
  };
  head: {
    ref: string;
    repo: GitHubRepository;
  };
  html_url: string;
  repository_url?: string;
  merge_commit_sha?: string | null;
  enhancedData?: {
    url: string;
    repository: string;
    labels: GitHubLabel[];
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
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  user: GitHubUser | null;
  assignees: GitHubUser[] | null | undefined;
  labels: GitHubLabel[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
  repository_url?: string;
  enhancedData?: {
    url: string;
    repository: string;
    labels: GitHubLabel[];
    commentCount?: number;
    comments?: Array<{
      author: string;
      body: string;
      created_at: string;
    }>;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  html_url: string;
  description?: string;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  clone_url: string;
  ssh_url: string;
  homepage?: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language?: string;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license?: {
    key: string;
    name: string;
    spdx_id?: string;
    url?: string;
  };
  allow_forking: boolean;
  is_template: boolean;
  topics: string[];
  visibility: 'public' | 'private';
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    sha?: string;
    message: string;
    author?: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
    committer?: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
  };
  author?: GitHubUser | null;
  committer?: GitHubUser | null;
  url: string;
  html_url: string;
  comments_url: string;
  message?: string;
  date?: string;
  files?: Array<{
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch?: string;
  }>;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  reviews?: GitHubReview[];
}

export interface GitHubReview {
  id: number;
  user: GitHubUser | null;
  body?: string | null;
  state: string;
  html_url: string;
  pull_request_url: string;
  author_association: string;
  submitted_at?: string;
  commit_id: string | null;
}

export interface GitHubComment {
  id: number;
  user: GitHubUser | null;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  issue_url?: string;
  author_association: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubFile {
  sha: string;
  filename: string;
  status:
    | 'added'
    | 'removed'
    | 'modified'
    | 'renamed'
    | 'copied'
    | 'changed'
    | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

export interface EnhancedPullRequest extends GitHubPullRequest {
  enhancedData?: {
    url: string;
    repository: string;
    labels: GitHubLabel[];
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
}

export interface EnhancedIssue extends GitHubIssue {
  enhancedData?: {
    url: string;
    repository: string;
    labels: GitHubLabel[];
    commentCount?: number;
    comments?: Array<{
      author: string;
      body: string;
      created_at: string;
    }>;
  };
}

export interface GitHubActivityData {
  userDetails?: GitHubUser;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    repository: string;
    commit: {
      author: string;
      body: string;
      created_at: string;
    };
    events: Array<{
      event: string;
      created_at: string;
      actor: GitHubUser;
    }>;
  }>;
}

export interface GitHubEnhancedActivityData {
  userDetails?: GitHubUser;
  commits: GitHubCommit[];
  pullRequests: EnhancedPullRequest[];
  issues: EnhancedIssue[];
  enhancedPullRequests?: EnhancedPullRequest[];
  enhancedIssues?: EnhancedIssue[];
  codeReviews: GitHubReview[];
  statistics: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    avgFilesPerCommit: number;
    avgLinesChanged: number;
    topContributors: Array<{ author: string; count: number }>;
    topRepositories: Array<{ repo: string; count: number }>;
    topLabels: Array<{ label: string; count: number }>;
  };
  summary: string;
}
