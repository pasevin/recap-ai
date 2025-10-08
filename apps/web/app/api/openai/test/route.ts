// API route for testing OpenAI connection
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleAPIError, createSuccessResponse } from '@/lib/api/errors';
import { validateRequest } from '@/lib/api/validation';
import { apiLogger, createLogContext } from '@/lib/api/logger';
import {
  OpenAIModel,
  OpenAIModelsResponse,
  ConnectionTestResult,
} from '@recap-ai/shared';

const testRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  baseUrl: z.string().url().optional(),
});

async function testOpenAIConnection(
  token: string,
  baseUrl?: string
): Promise<ConnectionTestResult> {
  try {
    const apiUrl = baseUrl ?? 'https://api.openai.com/v1';

    // Test OpenAI API connection by listing models
    const response = await fetch(`${apiUrl}/models`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid or expired OpenAI API key',
          details: errorData,
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          message: 'OpenAI API key lacks required permissions',
          details: errorData,
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          message: 'OpenAI API rate limit exceeded',
          details: errorData,
        };
      }

      return {
        success: false,
        message: `OpenAI API error: ${response.status} ${response.statusText}`,
        details: errorData,
      };
    }

    const data = (await response.json()) as OpenAIModelsResponse;

    if (!data.data || !Array.isArray(data.data)) {
      return {
        success: false,
        message: 'Unexpected response format from OpenAI API',
        details: data,
      };
    }

    // Filter and sort GPT models by version (newest first)
    const availableModels = data.data
      .filter(
        (model: OpenAIModel) =>
          model.id.startsWith('gpt-') &&
          !model.id.includes('instruct') &&
          !model.id.includes('base')
      )
      .map((model: OpenAIModel) => model.id)
      .sort((a: string, b: string) => {
        // Prioritize GPT-5 over GPT-4
        const aIsGpt5 = a.includes('gpt-5') ? 1 : 0;
        const bIsGpt5 = b.includes('gpt-5') ? 1 : 0;

        if (aIsGpt5 !== bIsGpt5) {
          return bIsGpt5 - aIsGpt5; // GPT-5 models come first
        }

        // Extract version numbers for comparison
        const aVersion = extractModelVersion(a);
        const bVersion = extractModelVersion(b);
        return bVersion - aVersion; // Descending order (newest first)
      })
      .slice(0, 10); // Show first 10 most relevant models

    function extractModelVersion(modelId: string): number {
      if (modelId.includes('gpt-5')) {
        return modelId.includes('gpt-5-turbo') ? 5.1 : 5.0;
      }
      if (modelId.includes('gpt-4o')) {
        return modelId.includes('gpt-4o-mini') ? 4.05 : 4.1;
      }
      if (modelId.includes('gpt-4-turbo')) {
        return 4.2;
      }
      if (modelId.includes('gpt-4')) {
        return 4.0;
      }
      if (modelId.includes('gpt-3.5')) {
        return 3.5;
      }
      const match = modelId.match(/gpt-(\d+(?:\.\d+)?)/);
      if (match) {
        const version = parseFloat(match[1]);
        return isNaN(version) ? 0 : version;
      }
      return 0;
    }

    return {
      success: true,
      message: `Connected to OpenAI API successfully. ${availableModels.length} GPT models available.`,
      details: {
        totalModels: data.data.length,
        availableGptModels: availableModels,
        apiUrl: apiUrl,
      },
    };
  } catch (error) {
    console.error('OpenAI connection test error:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('ENOTFOUND') ||
        error.message.includes('network')
      ) {
        return {
          success: false,
          message: 'Network error: Unable to reach OpenAI API',
        };
      }

      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }

    return {
      success: false,
      message: 'Unknown error occurred while testing OpenAI connection',
    };
  }
}

export async function POST(request: NextRequest) {
  const logContext = createLogContext(request);

  try {
    apiLogger.info('OpenAI connection test started', logContext);

    // Parse and validate request body
    const body = (await request.json()) as Record<string, unknown>;
    const validatedData = validateRequest(testRequestSchema, body);

    // Test the connection
    const result = await testOpenAIConnection(
      validatedData.token,
      validatedData.baseUrl
    );

    apiLogger.info('OpenAI connection test completed', logContext, {
      success: result.success,
    });

    return createSuccessResponse(result);
  } catch (error) {
    apiLogger.error(
      'OpenAI connection test failed',
      logContext,
      error as Error
    );
    return handleAPIError(error);
  }
}
