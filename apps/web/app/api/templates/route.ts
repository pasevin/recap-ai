import { NextRequest } from 'next/server';
import { createSuccessResponse, handleAPIError } from '@/lib/api/errors';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import { cliExecutor } from '@/lib/cli/executor';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logContext = createLogContext(request);

  try {
    apiLogger.info('Templates list request started', logContext);
    const templates = await cliExecutor.listTemplates();

    const duration = Date.now() - startTime;
    apiLogger.info('Templates list request completed', logContext, duration);

    return createSuccessResponse({ templates });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      'Templates list request failed',
      logContext,
      error as Error,
      duration
    );
    return handleAPIError(error);
  }
}
