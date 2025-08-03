// API route for configuration management
import { NextRequest } from 'next/server';
import { handleAPIError, createSuccessResponse } from '@/lib/api/errors';
import {
  validateRequest,
  configGetSchema,
  configSetSchema,
} from '@/lib/api/validation';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import { cliExecutor } from '@/lib/cli/executor';

export async function GET(request: NextRequest) {
  const logContext = createLogContext(request);

  try {
    apiLogger.info('Config GET request', logContext);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      key: searchParams.get('key') ?? undefined,
    };

    const validatedData = validateRequest(configGetSchema, queryData);

    // Execute CLI command
    const result = await cliExecutor.getConfig(validatedData.key);

    apiLogger.info('Config GET request completed', logContext);

    // Try to parse as JSON, fallback to string
    try {
      const jsonResult = JSON.parse(result) as Record<string, unknown>;
      return createSuccessResponse(jsonResult);
    } catch {
      return createSuccessResponse({ content: result });
    }
  } catch (error) {
    apiLogger.error('Config GET request failed', logContext, error as Error);
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logContext = createLogContext(request);

  try {
    apiLogger.info('Config POST request started', logContext);

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;
    const validatedData = validateRequest(configSetSchema, body);

    apiLogger.debug('Config request validated', logContext, {
      // Don't log sensitive data like API keys
      keys: Object.keys(validatedData),
    });

    // Execute CLI command
    const result = await cliExecutor.setConfig(validatedData);

    const duration = Date.now() - startTime;
    apiLogger.info(
      'Config POST request completed',
      logContext,
      undefined,
      duration
    );

    // Try to parse as JSON, fallback to string
    try {
      const jsonResult = JSON.parse(result) as Record<string, unknown>;
      return createSuccessResponse(jsonResult);
    } catch {
      return createSuccessResponse({
        content: result,
        message: 'Configuration updated successfully',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      'Config POST request failed',
      logContext,
      error as Error,
      duration
    );
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest) {
  // PUT is an alias for POST for configuration updates
  return POST(request);
}
