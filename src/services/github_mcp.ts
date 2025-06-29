import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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
      name: 'recap-ai-client',
      version: '0.0.1',
    });
  }

  public async connect(): Promise<void> {
    await this.client.connect(this.transport);
    console.log('Connected to GitHub MCP Server');
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('Disconnected from GitHub MCP Server');
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  public async listTools(): Promise<any> {
    try {
      const result = await this.client.listTools();
      return result;
    } catch (error) {
      console.error('Failed to list tools:', error);
      return null;
    }
  }

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

  // We will add methods here to call tools like list_commits, get_pull_request, etc.
}
