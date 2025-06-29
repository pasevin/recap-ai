import { GitHubMCPService } from './github_mcp';
import { GitHubMCPEnhancedService } from './github_mcp_enhanced';
import { config } from '../utils/config';

export function createGitHubService(
  enhanced: boolean = false
): GitHubMCPService | GitHubMCPEnhancedService | null {
  const githubToken = config.get('github.token');
  const mcpUrl = config.get('github.mcp.url');

  if (!githubToken || !mcpUrl) {
    return null;
  }

  try {
    if (enhanced) {
      return new GitHubMCPEnhancedService(mcpUrl, githubToken);
    } else {
      return new GitHubMCPService(mcpUrl, githubToken);
    }
  } catch (error) {
    console.error('Failed to create GitHub MCP service: ', error);
    return null;
  }
}
