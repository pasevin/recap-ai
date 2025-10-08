// API route for testing Linear connection
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAPIError, createSuccessResponse } from '@/lib/api/errors';
import { validateRequest } from '@/lib/api/validation';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import { LinearGraphQLResponse, ConnectionTestResult } from '@recap-ai/shared';

const testRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email().optional(),
});

async function testLinearConnection(
  token: string,
  email?: string
): Promise<ConnectionTestResult> {
  try {
    // Test Linear GraphQL API connection with the provided token
    const includeTarget = typeof email === 'string' && email.trim().length > 0;
    const query = includeTarget
      ? `
      query($email: String!) {
        viewer {
          id
          name
          email
          displayName
          avatarUrl
        }
        organization {
          id
          name
          urlKey
        }
        users(filter: { email: { eq: $email } }, first: 1) {
          nodes {
            id
            name
            email
            displayName
            avatarUrl
          }
        }
      }
    `
      : `
      query {
        viewer {
          id
          name
          email
          displayName
          avatarUrl
        }
        organization {
          id
          name
          urlKey
        }
      }
    `;

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        includeTarget ? { query, variables: { email } } : { query }
      ),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid or expired Linear API key',
          details: errorData,
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          message: 'Linear API key lacks required permissions',
          details: errorData,
        };
      }

      return {
        success: false,
        message: `Linear API error: ${response.status} ${response.statusText}`,
        details: errorData,
      };
    }

    const data = (await response.json()) as LinearGraphQLResponse & {
      data?: {
        users?: {
          nodes: Array<{
            id: string;
            name?: string;
            email?: string;
            displayName?: string;
            avatarUrl?: string;
          }>;
        };
      };
    };

    if (data.errors && data.errors.length > 0) {
      return {
        success: false,
        message: `Linear GraphQL error: ${data.errors[0].message}`,
        details: data.errors,
      };
    }

    const viewer = data.data?.viewer;
    const organization = data.data?.organization;

    if (!viewer) {
      return {
        success: false,
        message: 'Unable to fetch user information from Linear API',
        details: data,
      };
    }

    const configuredEmail = email?.trim().toLowerCase();
    const viewerEmail = (viewer.email ?? '').trim().toLowerCase();
    const matches = configuredEmail
      ? configuredEmail === viewerEmail
      : undefined;

    const mismatchNote =
      matches === false
        ? ' (note: configured email differs from token owner)'
        : '';

    // Resolve target user details if provided
    const targetUser = includeTarget
      ? (data.data?.users?.nodes?.[0] ?? null)
      : null;

    return {
      success: true,
      message: `Connected as ${
        viewer.displayName ?? viewer.name ?? viewer.email ?? 'Linear User'
      }${organization ? ` in ${organization.name}` : ''}${mismatchNote}`,
      details: {
        user: {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          displayName: viewer.displayName,
          avatarUrl: viewer.avatarUrl,
        },
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              urlKey: organization.urlKey,
            }
          : null,
        configuredEmail: email ?? null,
        matchesConfiguredEmail: matches,
        targetUser,
      },
    };
  } catch (error) {
    console.error('Linear connection test error:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('ENOTFOUND') ||
        error.message.includes('network')
      ) {
        return {
          success: false,
          message: 'Network error: Unable to reach Linear API',
        };
      }

      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }

    return {
      success: false,
      message: 'Unknown error occurred while testing Linear connection',
    };
  }
}

export async function POST(request: NextRequest) {
  const logContext = createLogContext(request);

  try {
    apiLogger.info('Linear connection test started', logContext);

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;
    const validatedData = validateRequest(testRequestSchema, body);

    // Test the connection
    const result = await testLinearConnection(
      validatedData.token,
      validatedData.email
    );

    apiLogger.info('Linear connection test completed', logContext, {
      success: result.success,
    });

    return createSuccessResponse(result);
  } catch (error) {
    apiLogger.error(
      'Linear connection test failed',
      logContext,
      error as Error
    );
    return handleAPIError(error);
  }
}
