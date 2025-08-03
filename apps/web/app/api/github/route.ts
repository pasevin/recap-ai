// API route for GitHub data fetching
import { NextRequest } from 'next/server';
import { handleAPIError, createSuccessResponse } from '@/lib/api/errors';
import { validateRequest, githubRequestSchema } from '@/lib/api/validation';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import { cliExecutor } from '@/lib/cli/executor';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logContext = createLogContext(request);

  try {
    apiLogger.info('GitHub request started', logContext);

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;
    const validatedData = validateRequest(githubRequestSchema, body);

    apiLogger.debug('GitHub request validated', logContext, validatedData);

    // Execute CLI command
    const result = await cliExecutor.fetchGitHub(
      validatedData.timeframe as '1d' | '1w' | '1m' | '1y',
      validatedData.repository,
      validatedData.format as 'summary' | 'json'
    );

    const duration = Date.now() - startTime;
    apiLogger.info(
      'GitHub request completed',
      logContext,
      validatedData.repository
        ? { repository: validatedData.repository }
        : undefined,
      duration
    );

    // Return appropriate response based on format
    if (validatedData.format === 'json') {
      try {
        const jsonResult = JSON.parse(result) as Record<string, unknown>;
        return createSuccessResponse(jsonResult);
      } catch {
        // If parsing fails, return as string
        return createSuccessResponse({ content: result });
      }
    } else {
      return createSuccessResponse({ content: result });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      'GitHub request failed',
      logContext,
      error as Error,
      duration
    );
    return handleAPIError(error);
  }
}

export async function GET(request: NextRequest) {
  const logContext = createLogContext(request);

  try {
    apiLogger.info('GitHub GET request', logContext);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      timeframe: searchParams.get('timeframe') ?? '1w',
      repository: searchParams.get('repository') ?? undefined,
      format: searchParams.get('format') ?? 'json',
    };

    const validatedData = validateRequest(githubRequestSchema, queryData);

    // Execute CLI command
    const result = await cliExecutor.fetchGitHub(
      validatedData.timeframe as '1d' | '1w' | '1m' | '1y',
      validatedData.repository,
      validatedData.format as 'summary' | 'json'
    );

    apiLogger.info('GitHub GET request completed', logContext);

    if (validatedData.format === 'json') {
      try {
        const jsonResult = JSON.parse(result) as Record<string, unknown>;
        return createSuccessResponse(jsonResult);
      } catch {
        return createSuccessResponse({ content: result });
      }
    } else {
      return createSuccessResponse({ content: result });
    }
  } catch (error) {
    apiLogger.error('GitHub GET request failed', logContext, error as Error);
    return handleAPIError(error);
  }
}
