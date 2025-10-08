import { z } from 'zod';

// Token validation schemas
export const githubTokenSchema = z
  .string()
  .min(1, 'GitHub token is required')
  .refine(
    (token) =>
      token.startsWith('ghp_') ||
      token.startsWith('github_pat_') ||
      token.startsWith('gho_') ||
      token.startsWith('ghr_') ||
      token.startsWith('ghs_'),
    'Invalid GitHub token format'
  )
  .refine(
    (token) => token.length >= 20,
    'GitHub token must be at least 20 characters long'
  );

export const linearTokenSchema = z
  .string()
  .min(1, 'Linear token is required')
  .refine(
    (token) => token.startsWith('lin_api_'),
    'Invalid Linear API key format'
  )
  .refine(
    (token) => token.length >= 40,
    'Linear API key must be at least 40 characters long'
  );

// Linear team validation schema - Linear team IDs can be various formats, so just require non-empty string
export const linearTeamIdSchema = z
  .string()
  .min(1, 'Linear Team ID is required')
  .trim();

// Linear person identifier (email)
export const linearUserEmailSchema = z
  .string()
  .min(1, 'Linear person email is required')
  .email('Invalid Linear email address');

export const openaiTokenSchema = z
  .string()
  .min(1, 'OpenAI token is required')
  .refine((token) => token.startsWith('sk-'), 'Invalid OpenAI API key format')
  .refine(
    (token) => token.length >= 40,
    'OpenAI API key must be at least 40 characters long'
  );

// GitHub repository validation schemas
export const githubOwnerSchema = z
  .string()
  .min(1, 'GitHub owner/organization is required')
  .regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9\-_])*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/,
    'Invalid GitHub owner format'
  );

export const githubRepoSchema = z
  .string()
  .min(1, 'GitHub repository name is required')
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9\-_.]*)?$/, 'Invalid GitHub repository name');

// Configuration schemas
export const settingsFormSchema = z.object({
  githubToken: githubTokenSchema.optional(),
  githubOwner: githubOwnerSchema.optional(),
  githubRepo: githubRepoSchema.optional(),
  githubUsername: z.string().min(1, 'GitHub username is required').optional(),
  linearToken: linearTokenSchema.optional(),
  linearTeamId: linearTeamIdSchema.optional(),
  linearUserEmail: linearUserEmailSchema.optional(),
  openaiToken: openaiTokenSchema.optional(),
  openaiModel: z.string().default('gpt-5-mini'),
  openaiBaseUrl: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().url().optional()
  ),
  mcpEnabled: z.boolean().default(false),
  mcpPort: z.number().int().min(1000).max(65535).default(3001),
  mcpHost: z.string().default('localhost'),
  loggingLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type SettingsFormData = z.infer<typeof settingsFormSchema>;

// Configuration keys mapping
export const CONFIG_KEY_MAPPING: Record<keyof SettingsFormData, string> = {
  githubToken: 'github.token',
  githubOwner: 'github.owner',
  githubRepo: 'github.repo',
  githubUsername: 'github.defaults.person.identifier',
  linearToken: 'linear.token',
  linearTeamId: 'linear.defaults.teamId',
  linearUserEmail: 'linear.defaults.person.identifier',
  openaiToken: 'openai.token',
  openaiModel: 'openai.model',
  openaiBaseUrl: 'openai.baseUrl',
  mcpEnabled: 'mcp.enabled',
  mcpPort: 'mcp.port',
  mcpHost: 'mcp.host',
  loggingLevel: 'logging.level',
};

// Utility functions
export function validateTokenFormat(
  token: string,
  service: 'github' | 'linear' | 'openai'
): boolean {
  try {
    switch (service) {
      case 'github':
        githubTokenSchema.parse(token);
        return true;
      case 'linear':
        linearTokenSchema.parse(token);
        return true;
      case 'openai':
        openaiTokenSchema.parse(token);
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function maskToken(token: string): string {
  if (!token || token.length < 8) return token;

  const start = token.slice(0, 4);
  const end = token.slice(-4);
  const middle = '*'.repeat(Math.min(token.length - 8, 20));

  return `${start}${middle}${end}`;
}

export function getTokenValidationError(
  token: string,
  service: 'github' | 'linear' | 'openai'
): string | undefined {
  try {
    switch (service) {
      case 'github':
        githubTokenSchema.parse(token);
        break;
      case 'linear':
        linearTokenSchema.parse(token);
        break;
      case 'openai':
        openaiTokenSchema.parse(token);
        break;
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid token format';
    }
    return 'Invalid token format';
  }
}

export function isConfigurationComplete(
  config: Partial<SettingsFormData>
): boolean {
  // Check if at least one integration is configured
  const hasGitHub =
    config.githubToken &&
    config.githubOwner &&
    config.githubRepo &&
    config.githubUsername;
  const hasLinear =
    config.linearToken && config.linearTeamId && config.linearUserEmail;
  const hasOpenAI = config.openaiToken;

  // At least one integration must be fully configured
  return !!(hasGitHub ?? hasLinear ?? hasOpenAI);
}

export function getMissingConfigurationFields(
  config: Partial<SettingsFormData>
): string[] {
  const requiredFields: (keyof SettingsFormData)[] = [
    'githubToken',
    'linearToken',
    'openaiToken',
  ];

  return requiredFields
    .filter(
      (field) =>
        !config[field] ||
        typeof config[field] !== 'string' ||
        config[field]!.length === 0
    )
    .map((field) => CONFIG_KEY_MAPPING[field]);
}
