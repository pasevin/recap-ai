// API error handling utilities
import { NextResponse } from 'next/server';

export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public details?: string;
  public suggestion?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: string,
    suggestion?: string
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.suggestion = suggestion;
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class CLIError extends APIError {
  constructor(message: string, originalError?: string) {
    super(
      `CLI command failed: ${message}${originalError ? ` - ${originalError}` : ''}`,
      500,
      'CLI_ERROR',
      originalError,
      getSuggestion('CLI_ERROR')
    );
  }
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: string;
    suggestion?: string;
    service?: 'github' | 'linear' | 'openai' | 'cli' | 'unknown';
  };
  timestamp: string;
}

// Partial success envelope to standardize partial results across endpoints
export interface PartialResult<T = unknown> {
  success: boolean;
  data?: T;
  warnings?: string[];
  errors?: Array<{
    service: 'github' | 'linear' | 'openai' | 'cli' | 'unknown';
    code: string;
    message: string;
  }>;
}

export function createErrorResponse(
  error: APIError
): NextResponse<APIResponse> {
  const response: APIResponse = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      details: error.details,
      suggestion: error.suggestion ?? getSuggestion(error.code),
      service: detectService(error),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: error.statusCode });
}

export function createSuccessResponse<T>(
  data: T
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

export function handleAPIError(error: unknown): NextResponse<APIResponse> {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return createErrorResponse(error);
  }

  if (error instanceof Error) {
    return createErrorResponse(
      new APIError(
        error.message,
        500,
        'INTERNAL_ERROR',
        undefined,
        getSuggestion('INTERNAL_ERROR')
      )
    );
  }

  return createErrorResponse(new APIError('An unexpected error occurred'));
}

// Provide user-facing suggestions for common error codes
function getSuggestion(code: string): string | undefined {
  switch (code) {
    case 'CLI_ERROR':
      return 'Try increasing the timeout (set RECAP_TIMEOUT_* env vars) or verifying your configuration with `recap config`.';
    case 'VALIDATION_ERROR':
      return 'Check request parameters and try again.';
    case 'INTERNAL_ERROR':
      return 'Please retry. If the issue persists, check server logs or contact support.';
    default:
      return undefined;
  }
}

function detectService(error: {
  message?: string;
  code?: string;
}): 'github' | 'linear' | 'openai' | 'cli' | 'unknown' {
  const msg = (error.message ?? '').toLowerCase();
  if (msg.includes('github')) return 'github';
  if (msg.includes('linear')) return 'linear';
  if (msg.includes('openai')) return 'openai';
  if (msg.includes('cli')) return 'cli';
  return 'unknown';
}
