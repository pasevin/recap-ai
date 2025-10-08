// API route for testing GitHub connection
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAPIError, createSuccessResponse } from '@/lib/api/errors';
import { validateRequest } from '@/lib/api/validation';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import { GitHubUser, ConnectionTestResult } from '@recap-ai/shared';

const testRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  username: z.string().optional(),
});

async function fetchGitHubUser(
  token: string,
  username?: string
): Promise<GitHubUser> {
  const url = username
    ? `https://api.github.com/users/${username}`
    : 'https://api.github.com/user';

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Recap-AI/1.0',
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`,
      {
        cause: errorData,
      }
    );
  }

  return (await response.json()) as GitHubUser;
}

async function testGitHubConnection(
  token: string,
  username?: string
): Promise<ConnectionTestResult> {
  try {
    // Always fetch the authenticated user first to validate the token
    const authenticatedUser = await fetchGitHubUser(token);

    let targetUser: GitHubUser | null = null;
    let targetUserError: string | null = null;

    // If a tracking username is provided, always surface a target block.
    // When it matches the token owner, use the authenticated user as the target.
    if (username) {
      if (username === authenticatedUser.login) {
        targetUser = authenticatedUser;
      } else {
        try {
          targetUser = await fetchGitHubUser(token, username);
        } catch (error) {
          console.error('Error fetching target user:', error);
          if (error instanceof Error) {
            targetUserError = error.message;
          }
        }
      }
    }

    const details: Record<string, unknown> = {
      authenticatedUser: {
        login: authenticatedUser.login,
        name: authenticatedUser.name,
        avatar_url: authenticatedUser.avatar_url,
        type: authenticatedUser.type,
        public_repos: authenticatedUser.public_repos,
        private_repos: authenticatedUser.total_private_repos,
      },
    };

    if (targetUser) {
      details.targetUser = {
        login: targetUser.login,
        name: targetUser.name,
        avatar_url: targetUser.avatar_url,
        type: targetUser.type,
        public_repos: targetUser.public_repos,
        private_repos: targetUser.total_private_repos,
      };
    } else if (targetUserError) {
      details.targetUserError = targetUserError;
    }

    let message = `Connected as ${authenticatedUser.login ?? authenticatedUser.name ?? 'GitHub User'}`;
    if (targetUser) {
      message += ` • Tracking ${targetUser.login ?? targetUser.name ?? 'Target User'}`;
    } else if (username && username !== authenticatedUser.login) {
      message += ` • Warning: Could not fetch target user "${username}"`;
    }

    return {
      success: true,
      message,
      details,
    };
  } catch (error) {
    console.error('GitHub connection test error:', error);

    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes('401')) {
        return {
          success: false,
          message: 'Invalid or expired GitHub token',
        };
      }

      if (errorMessage.includes('403')) {
        return {
          success: false,
          message: 'GitHub token lacks required permissions',
        };
      }

      if (
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('network')
      ) {
        return {
          success: false,
          message: 'Network error: Unable to reach GitHub API',
        };
      }

      return {
        success: false,
        message: `Connection error: ${errorMessage}`,
      };
    }

    return {
      success: false,
      message: 'Unknown error occurred while testing GitHub connection',
    };
  }
}

export async function POST(request: NextRequest) {
  const logContext = createLogContext(request);

  try {
    apiLogger.info('GitHub connection test started', logContext);

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;
    const validatedData = validateRequest(testRequestSchema, body);

    // Test the connection
    const result = await testGitHubConnection(
      validatedData.token,
      validatedData.username
    );

    apiLogger.info('GitHub connection test completed', logContext, {
      success: result.success,
    });

    return createSuccessResponse(result);
  } catch (error) {
    apiLogger.error(
      'GitHub connection test failed',
      logContext,
      error as Error
    );
    return handleAPIError(error);
  }
}
