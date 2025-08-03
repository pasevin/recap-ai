// Configuration types - replacing any usage with proper interfaces

export type ConfigValue =
  | string
  | number
  | boolean
  | ConfigObject
  | ConfigArray;
export type ConfigObject = { [key: string]: ConfigValue };
export type ConfigArray = ConfigValue[];

export interface GitHubConfig {
  token?: string;
  defaults?: {
    repository?: string;
    organization?: string;
    branch?: string;
  };
  api?: {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}

export interface LinearConfig {
  token?: string;
  defaults?: {
    teamId?: string;
    organization?: string;
  };
  api?: {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
}

export interface OpenAIConfig {
  token?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface MCPConfig {
  enabled?: boolean;
  port?: number;
  host?: string;
  auth?: {
    enabled?: boolean;
    token?: string;
  };
}

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  file?: string;
  maxSize?: string;
  maxFiles?: number;
}

export interface Config {
  github?: GitHubConfig;
  linear?: LinearConfig;
  openai?: OpenAIConfig;
  mcp?: MCPConfig;
  logging?: LoggingConfig;
  version?: string;
  lastUpdated?: string;
}

// For type-safe configuration access
export interface ConfigPaths {
  'github.token': string;
  'github.defaults.repository': string;
  'github.defaults.organization': string;
  'github.defaults.branch': string;
  'github.api.baseUrl': string;
  'github.api.timeout': number;
  'github.api.retries': number;
  'linear.token': string;
  'linear.defaults.teamId': string;
  'linear.defaults.organization': string;
  'linear.api.baseUrl': string;
  'linear.api.timeout': number;
  'linear.api.retries': number;
  'openai.token': string;
  'openai.model': string;
  'openai.baseUrl': string;
  'openai.timeout': number;
  'openai.maxTokens': number;
  'openai.temperature': number;
  'mcp.enabled': boolean;
  'mcp.port': number;
  'mcp.host': string;
  'mcp.auth.enabled': boolean;
  'mcp.auth.token': string;
  'logging.level': 'debug' | 'info' | 'warn' | 'error';
  'logging.format': 'json' | 'text';
  'logging.file': string;
  'logging.maxSize': string;
  'logging.maxFiles': number;
  version: string;
  lastUpdated: string;
}

export type ConfigKey = keyof ConfigPaths;
export type ConfigValueForKey<K extends ConfigKey> = ConfigPaths[K];

// Validation helpers
export function isValidConfigKey(key: string): key is ConfigKey {
  const validKeys: ConfigKey[] = [
    'github.token',
    'github.defaults.repository',
    'github.defaults.organization',
    'github.defaults.branch',
    'github.api.baseUrl',
    'github.api.timeout',
    'github.api.retries',
    'linear.token',
    'linear.defaults.teamId',
    'linear.defaults.organization',
    'linear.api.baseUrl',
    'linear.api.timeout',
    'linear.api.retries',
    'openai.token',
    'openai.model',
    'openai.baseUrl',
    'openai.timeout',
    'openai.maxTokens',
    'openai.temperature',
    'mcp.enabled',
    'mcp.port',
    'mcp.host',
    'mcp.auth.enabled',
    'mcp.auth.token',
    'logging.level',
    'logging.format',
    'logging.file',
    'logging.maxSize',
    'logging.maxFiles',
    'version',
    'lastUpdated',
  ];
  return validKeys.includes(key as ConfigKey);
}

export function validateConfigValue(
  key: ConfigKey,
  value: unknown
): value is ConfigValueForKey<typeof key> {
  // Add specific validation logic for each config type
  switch (key) {
    case 'github.api.timeout':
    case 'github.api.retries':
    case 'linear.api.timeout':
    case 'linear.api.retries':
    case 'openai.timeout':
    case 'openai.maxTokens':
    case 'openai.temperature':
    case 'mcp.port':
    case 'logging.maxFiles':
      return typeof value === 'number' && value >= 0;

    case 'mcp.enabled':
    case 'mcp.auth.enabled':
      return typeof value === 'boolean';

    case 'logging.level':
      return (
        typeof value === 'string' &&
        ['debug', 'info', 'warn', 'error'].includes(value)
      );

    case 'logging.format':
      return typeof value === 'string' && ['json', 'text'].includes(value);

    default:
      return typeof value === 'string';
  }
}
