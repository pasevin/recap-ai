// Request validation utilities using Zod
import { z } from 'zod';
import { ValidationError } from './errors';

// Common validation schemas
export const timeframeSchema = z.enum(['1d', '1w', '1m', '1y'], {
  errorMap: () => ({ message: 'Timeframe must be one of: 1d, 1w, 1m, 1y' }),
});

export const formatSchema = z.enum(['summary', 'json'], {
  errorMap: () => ({ message: 'Format must be either summary or json' }),
});

// Summarize API schemas
export const summarizeRequestSchema = z
  .object({
    timeframe: timeframeSchema.default('1w'),
    sources: z
      .array(z.enum(['github', 'linear']))
      .min(1, 'At least one source must be specified'),
    format: formatSchema.default('summary'),
    repository: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    timeframe: data.timeframe as '1d' | '1w' | '1m' | '1y',
    format: data.format as 'summary' | 'json',
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
    timeframe: data.timeframe as '1d' | '1w' | '1m' | '1y',
    format: data.format as 'summary' | 'json',
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
    timeframe: data.timeframe as '1d' | '1w' | '1m' | '1y',
    format: data.format as 'summary' | 'json',
  }));

export type LinearRequest = z.infer<typeof linearRequestSchema>;

// Config API schemas
export const configGetSchema = z.object({
  key: z.string().optional(),
});

export const configSetSchema = z.object({
  github: z
    .object({
      token: z.string().optional(),
      defaultRepo: z.string().optional(),
    })
    .optional(),
  linear: z
    .object({
      apiKey: z.string().optional(),
      teamId: z.string().optional(),
    })
    .optional(),
  openai: z
    .object({
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

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
