// API error handling utilities
import { NextResponse } from 'next/server';

export class APIError extends Error {
  public statusCode: number;
  public code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
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
      'CLI_ERROR'
    );
  }
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
  timestamp: string;
}

export function createErrorResponse(
  error: APIError
): NextResponse<APIResponse> {
  const response: APIResponse = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
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
    return createErrorResponse(new APIError(error.message));
  }

  return createErrorResponse(new APIError('An unexpected error occurred'));
}
