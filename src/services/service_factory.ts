import { config } from '../utils/config';
import { GitHubMCPService } from './github_mcp';

export function createGitHubService(): GitHubMCPService | null {
  const mcpUrl = config.get('github.mcp.url');
  const githubToken = config.get('github.token');

  if (mcpUrl && githubToken) {
    try {
      const service = new GitHubMCPService(mcpUrl, githubToken);
      // Attempt to connect, but don't block. The service can handle its connection state.
      service.connect().catch((error) => {
        console.error(
          'Failed to connect to GitHub MCP service in background:',
          error
        );
      });
      return service;
    } catch (error) {
      console.error('Failed to create GitHub MCP service:', error);
      return null;
    }
  }

  if (!githubToken) {
    console.error(
      'GitHub token not configured. Run `recap config set github.token YOUR_TOKEN`'
    );
  }

  // Fallback to REST API will be handled here later.
  return null;
}
