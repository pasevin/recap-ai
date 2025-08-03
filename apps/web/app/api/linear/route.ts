// API route for Linear data fetching
import { NextRequest } from 'next/server';
import { handleAPIError, createSuccessResponse } from '@/lib/api/errors';
import { validateRequest, linearRequestSchema } from '@/lib/api/validation';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import { cliExecutor } from '@/lib/cli/executor';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logContext = createLogContext(request);

  try {
    apiLogger.info('Linear request started', logContext);

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;
    const validatedData = validateRequest(linearRequestSchema, body);

    apiLogger.debug('Linear request validated', logContext, validatedData);

    // Execute CLI command
    const result = await cliExecutor.fetchLinear(
      validatedData.timeframe as '1d' | '1w' | '1m' | '1y',
      validatedData.teamId,
      validatedData.format as 'summary' | 'json'
    );

    const duration = Date.now() - startTime;
    apiLogger.info(
      'Linear request completed',
      logContext,
      validatedData.teamId ? { teamId: validatedData.teamId } : undefined,
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
      'Linear request failed',
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
    apiLogger.info('Linear GET request', logContext);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      timeframe: searchParams.get('timeframe') ?? '1w',
      teamId: searchParams.get('teamId') ?? undefined,
      format: searchParams.get('format') ?? 'json',
    };

    const validatedData = validateRequest(linearRequestSchema, queryData);

    // Execute CLI command
    const result = await cliExecutor.fetchLinear(
      validatedData.timeframe as '1d' | '1w' | '1m' | '1y',
      validatedData.teamId,
      validatedData.format as 'summary' | 'json'
    );

    apiLogger.info('Linear GET request completed', logContext);

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
    apiLogger.error('Linear GET request failed', logContext, error as Error);
    return handleAPIError(error);
  }
}
