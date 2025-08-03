import { EnhancedGitHubService } from './github_enhanced';
import { GitHubService } from './github';
import { config } from '../utils/config';

export function createGitHubService(): EnhancedGitHubService | GitHubService {
  const githubTokenRaw = config.get('github.token');

  if (!githubTokenRaw || typeof githubTokenRaw !== 'string') {
    throw new Error(
      'GitHub token not found. Please configure with: recap config set github.token YOUR_TOKEN'
    );
  }

  const githubToken = githubTokenRaw as string;

  try {
    // Always use enhanced service now (no MCP dependency)
    return new EnhancedGitHubService(githubToken);
  } catch (error) {
    console.error('Failed to create GitHub service: ', error);
    // Fallback to basic GitHub service if enhanced service fails
    const githubConfig = {
      token: githubToken,
      owner: (config.get('github.owner') as string) || '',
      repo: (config.get('github.repo') as string) || '',
    };
    return new GitHubService(githubConfig);
  }
}

// Export type for better TypeScript support
export type GitHubServiceType = EnhancedGitHubService | GitHubService;
