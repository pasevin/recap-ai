import { EnhancedGitHubService } from './github_enhanced';
import { GitHubService } from './github';
import { config } from '../utils/config';

export function createGitHubService(): EnhancedGitHubService | GitHubService {
  const githubToken = config.get('github.token');

  if (!githubToken) {
    throw new Error(
      'GitHub token not found. Please configure with: recap config set github.token YOUR_TOKEN'
    );
  }

  try {
    // Always use enhanced service now (no MCP dependency)
    return new EnhancedGitHubService(githubToken);
  } catch (error) {
    console.error('Failed to create GitHub service: ', error);
    // Fallback to basic GitHub service if enhanced service fails
    return new GitHubService(githubToken);
  }
}

// Export type for better TypeScript support
export type GitHubServiceType = EnhancedGitHubService | GitHubService;
