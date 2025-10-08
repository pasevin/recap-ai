// Request validation utilities using Zod
import { z } from 'zod';
import { ValidationError } from './errors';

// Common validation schemas
export const timeframeSchema = z.union(
  [
    // Flexible preset values: <number><unit> where unit is d|w|m|y (e.g., 1d, 2w, 3m, 6m, 1y)
    z.string().regex(/^[0-9]+[dwmy]$/i, {
      message:
        'Preset timeframe must be <number><unit> with unit in d|w|m|y (e.g., 1d, 2w, 3m, 1y)',
    }),
    // Custom date range format: "startDate/endDate"
    z.string().refine(
      (val) => {
        const parts = val.split('/');
        if (parts.length !== 2) return false;

        try {
          const start = new Date(parts[0]);
          const end = new Date(parts[1]);
          return (
            !isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end
          );
        } catch {
          return false;
        }
      },
      {
        message:
          'Custom timeframe must be in format: startDate/endDate with valid ISO dates',
      }
    ),
  ],
  {
    errorMap: () => ({
      message:
        'Timeframe must be <number><unit> (d|w|m|y) or custom date range (startDate/endDate)',
    }),
  }
);

export const formatSchema = z.enum(['summary', 'markdown', 'json'], {
  errorMap: () => ({
    message: 'Format must be one of: summary, markdown, json',
  }),
});

// Summarize API schemas
export const summarizeRequestSchema = z
  .object({
    timeframe: timeframeSchema.default('1w'),
    sources: z
      .array(z.enum(['github', 'linear']))
      .min(1, 'At least one source must be specified'),
    format: formatSchema.default('summary'),
    fullContext: z.boolean().optional().default(false),
    // Template to use for rendering (maps to CLI/OpenAI templateId)
    templateId: z.string().optional(),
    perspective: z
      .enum(['first-person', 'third-person'])
      .optional()
      .default('first-person'),
    perspectiveName: z.string().optional(),
    repository: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    timeframe: data.timeframe as string, // Ensure timeframe is typed as string
    format: data.format as 'summary' | 'markdown' | 'json',
    perspective: data.perspective as 'first-person' | 'third-person',
  }));

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

// GitHub API schemas
export const githubRequestSchema = z
  .object({
    timeframe: timeframeSchema.default('1w'),
    repository: z.string().optional(),
    format: formatSchema.default('json'),
  })
  .transform((data) => ({
    ...data,
    timeframe: data.timeframe as string,
    format: data.format as 'summary' | 'markdown' | 'json',
  }));

export type GitHubRequest = z.infer<typeof githubRequestSchema>;

// Linear API schemas
export const linearRequestSchema = z
  .object({
    timeframe: timeframeSchema.default('1w'),
    teamId: z.string().optional(),
    format: formatSchema.default('json'),
  })
  .transform((data) => ({
    ...data,
    timeframe: data.timeframe as string,
    format: data.format as 'summary' | 'markdown' | 'json',
  }));

export type LinearRequest = z.infer<typeof linearRequestSchema>;

// Config API schemas
export const configGetSchema = z.object({
  key: z.string().optional(),
});

export const configSetSchema = z
  .object({
    // Flat keys that match CLI format
    'github.token': z.string().optional(),
    'github.owner': z.string().optional(),
    'github.repo': z.string().optional(),
    'linear.token': z.string().optional(),
    'openai.token': z.string().optional(),
    'openai.model': z.string().optional(),
    'openai.baseUrl': z.string().optional(),
    'mcp.enabled': z.boolean().optional(),
    'mcp.port': z.number().optional(),
    'mcp.host': z.string().optional(),
    'logging.level': z.string().optional(),
  })
  .passthrough(); // Allow additional keys

export type ConfigGetRequest = z.infer<typeof configGetSchema>;
export type ConfigSetRequest = z.infer<typeof configSetSchema>;

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new ValidationError(`Validation failed: ${errorMessage}`);
    }
    throw new ValidationError('Invalid request data');
  }
}
