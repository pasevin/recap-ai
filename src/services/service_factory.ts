import { GitHubMCPService } from './github_mcp';
import { config } from '../utils/config';

export function createGitHubService(): GitHubMCPService | null {
  const githubToken = config.get('github.token');
  const mcpUrl = config.get('github.mcp.url');

  if (!githubToken || !mcpUrl) {
    return null;
  }

  try {
    return new GitHubMCPService(mcpUrl, githubToken);
  } catch (error) {
    console.error('Failed to create GitHub MCP service: ', error);
    return null;
  }
}
