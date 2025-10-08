// CLI command execution utilities
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { CLIError } from '../api/errors';
import { SummarizeResponse } from '../api/types';

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CLIExecutorOptions {
  timeout?: number; // in milliseconds
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

// Timeout configuration types and helpers
export interface TimeoutConfig {
  baseMs: number;
  perServiceMs: number;
  timeframeCostMs: Record<'1d' | '1w' | '1m' | '1y', number>;
  maxMs: number;
}

function getTimeoutConfigFromEnv(): TimeoutConfig {
  const parseNum = (val: string | undefined, fallback: number): number => {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    // Provide generous defaults; can be tuned via env vars.
    baseMs: parseNum(process.env.RECAP_TIMEOUT_BASE_MS, 120000), // 2 minutes
    perServiceMs: parseNum(process.env.RECAP_TIMEOUT_PER_SERVICE_MS, 30000), // 30s per service
    timeframeCostMs: {
      '1d': parseNum(process.env.RECAP_TIMEOUT_COST_1D_MS, 30000),
      '1w': parseNum(process.env.RECAP_TIMEOUT_COST_1W_MS, 90000),
      '1m': parseNum(process.env.RECAP_TIMEOUT_COST_1M_MS, 180000),
      '1y': parseNum(process.env.RECAP_TIMEOUT_COST_1Y_MS, 300000),
    },
    maxMs: parseNum(process.env.RECAP_TIMEOUT_MAX_MS, 600000), // 10 minutes
  };
}

export class CLIExecutor {
  private readonly cliPath: string;
  private readonly defaultOptions: CLIExecutorOptions;

  constructor() {
    // Use robust path resolution that works in both dev and production contexts
    // Find the project root by looking for package.json starting from current working directory
    let projectRoot = process.cwd();

    // If we're in a subdirectory (like apps/web or .next), navigate up to find project root
    while (projectRoot !== path.dirname(projectRoot)) {
      const packagePath = path.join(projectRoot, 'package.json');
      const binPath = path.join(projectRoot, 'bin/run.js');

      // Check if this directory contains both package.json and bin/run.js (project root markers)
      if (existsSync(packagePath) && existsSync(binPath)) {
        break;
      }

      projectRoot = path.dirname(projectRoot);
    }

    this.cliPath = path.join(projectRoot, 'bin/run.js');
    this.defaultOptions = {
      timeout: 60000, // 60 seconds - increased default for API operations
      cwd: projectRoot, // Set working directory to the project root
      env: {
        ...process.env,
        // Ensure Node.js can find modules in the project root
        NODE_PATH: path.join(projectRoot, 'node_modules'),
      },
    };
  }

  private calculateTimeout(
    timeframe: '1d' | '1w' | '1m' | '1y',
    sources: string[]
  ): number {
    const cfg = getTimeoutConfigFromEnv();
    let timeout =
      cfg.baseMs +
      sources.length * cfg.perServiceMs +
      cfg.timeframeCostMs[timeframe];
    return Math.min(timeout, cfg.maxMs);
  }

  async executeCommand(
    command: string,
    args: string[] = [],
    options: CLIExecutorOptions = {}
  ): Promise<CLIResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      const child = spawn(this.cliPath, [command, ...args], {
        cwd: mergedOptions.cwd,
        env: mergedOptions.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(
          new CLIError(`Command timed out after ${mergedOptions.timeout}ms`)
        );
      }, mergedOptions.timeout);

      child.on('close', (exitCode) => {
        clearTimeout(timeout);

        const result: CLIResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode ?? 0,
        };

        if (exitCode === 0) {
          resolve(result);
        } else {
          reject(
            new CLIError(
              `Command failed with exit code ${exitCode}`,
              stderr ?? stdout
            )
          );
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new CLIError('Failed to execute CLI command', error.message));
      });
    });
  }

  async summarize(
    timeframe: '1d' | '1w' | '1m' | '1y' | string,
    _sources: string[],
    format?: 'summary' | 'markdown' | 'json',
    perspective?: 'first-person' | 'third-person',
    perspectiveName?: string,
    options?: { fullContext?: boolean; templateId?: string }
  ): Promise<SummarizeResponse> {
    let args: string[];
    let timeout: number;

    // Check if timeframe is a custom date range (format: "startDate/endDate")
    if (timeframe.includes('/')) {
      const [startDate, endDate] = timeframe.split('/');

      // Extract date part directly from ISO string to avoid timezone issues
      // startDate/endDate are already ISO strings like "2024-09-01T00:00:00.000Z"
      const since = startDate.split('T')[0];
      const until = endDate.split('T')[0];

      args = [
        '--since',
        since,
        '--until',
        until,
        '--format',
        format ?? 'summary',
      ];

      // For custom ranges, use a longer timeout based on date range
      const daysDiff = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const cfg = getTimeoutConfigFromEnv();
      // Start with 3 minutes and add 2s per day, cap at maxMs
      timeout = Math.min(180000 + daysDiff * 2000, cfg.maxMs);
    } else {
      // Handle preset timeframes (flexible: <number><unit>, e.g., 2w, 3m)
      // Parse number+unit
      const match = String(timeframe).match(/^(\d+)([dwmy])$/i);
      if (!match) {
        // Fallback: treat unknown as 1w to avoid crash
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        args = ['--since', since, '--format', format ?? 'summary'];
        timeout = this.calculateTimeout('1w', _sources);
      } else {
        const amount = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        const now = new Date();
        const start = new Date(now);
        switch (unit) {
          case 'd':
            start.setDate(start.getDate() - amount);
            break;
          case 'w':
            start.setDate(start.getDate() - amount * 7);
            break;
          case 'm':
            start.setMonth(start.getMonth() - amount);
            break;
          case 'y':
            start.setFullYear(start.getFullYear() - amount);
            break;
        }

        const since = start.toISOString().split('T')[0];
        const until = now.toISOString().split('T')[0];

        args = [
          '--since',
          since,
          '--until',
          until,
          '--format',
          format ?? 'summary',
        ];

        // Derive a coarse-grained timeout based on the canonical unit buckets
        const timeoutUnit =
          unit === 'd' && amount < 7
            ? '1d'
            : unit === 'w' && amount <= 4
              ? '1w'
              : unit === 'm' && amount <= 1
                ? '1m'
                : unit === 'y'
                  ? '1y'
                  : '1m';
        timeout = this.calculateTimeout(
          timeoutUnit as '1d' | '1w' | '1m' | '1y',
          _sources
        );
      }
    }

    if (perspective) {
      args.push('--perspective', perspective);
    }
    if (perspectiveName) {
      args.push('--perspective-name', perspectiveName);
    }
    if (options?.fullContext) {
      args.push('--full-context');
    }
    if (options?.templateId) {
      args.push('--template-id', options.templateId);
    }

    const result = await this.executeCommand('summarize', args, { timeout });

    if (format === 'json') {
      try {
        const parsed = JSON.parse(result.stdout) as SummarizeResponse;
        return parsed;
      } catch {
        // Attempt to recover by stripping any leading non-JSON lines
        const jsonStart = result.stdout.indexOf('{');
        if (jsonStart >= 0) {
          const maybeJson = result.stdout.slice(jsonStart);
          try {
            const parsed = JSON.parse(maybeJson) as SummarizeResponse;
            return parsed;
          } catch {
            // fallthrough
          }
        }
        // As a final fallback, return content so API can still show something
        return { content: result.stdout } as SummarizeResponse;
      }
    }

    return {
      content: result.stdout,
    };
  }

  async fetchGitHub(
    timeframe: '1d' | '1w' | '1m' | '1y',
    repository?: string,
    format?: 'summary' | 'json'
  ): Promise<string> {
    const args = ['--timeframe', timeframe, '--format', format ?? 'json'];

    if (repository?.trim()) {
      args.push('--repo', repository);
    } else {
      // When no repository is provided, use author mode to get user activity across all repos
      // Try to get author from config, otherwise use a default behavior
      try {
        const configResult = await this.executeCommand(
          'config',
          ['get', 'github.defaults.person.identifier'],
          { timeout: 5000 }
        );
        const author = configResult.stdout.trim();
        if (author) {
          args.push('--author', author);
        } else {
          // Fallback: use current authenticated user
          args.push('--author', '@me');
        }
      } catch {
        // If config fails, try using @me as fallback for authenticated user
        args.push('--author', '@me');
      }
    }

    const timeout = this.calculateTimeout(timeframe, ['github']);
    const result = await this.executeCommand('github', args, { timeout });
    return result.stdout;
  }

  async fetchLinear(
    timeframe: '1d' | '1w' | '1m' | '1y',
    teamId?: string,
    format?: 'summary' | 'json'
  ): Promise<string> {
    const args = ['--timeframe', timeframe, '--format', format ?? 'json'];

    if (teamId) {
      args.push('--team-id', teamId);
    }

    const timeout = this.calculateTimeout(timeframe, ['linear']);
    const result = await this.executeCommand('linear', args, { timeout });
    return result.stdout;
  }

  async listTemplates(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      version: string;
      formats: string[];
      perspectives: Array<'first-person' | 'third-person'>;
      useCases: string[];
    }>
  > {
    const result = await this.executeCommand('templates', ['--format', 'json']);
    try {
      const parsed = JSON.parse(result.stdout) as {
        templates: Array<{
          id: string;
          name: string;
          description: string;
          version: string;
          formats: string[];
          perspectives: Array<'first-person' | 'third-person'>;
          useCases: string[];
        }>;
      };
      return parsed.templates ?? [];
    } catch {
      return [];
    }
  }

  async getConfig(key?: string): Promise<string> {
    if (key) {
      const args = ['get', key];
      const result = await this.executeCommand('config', args);
      const output = result.stdout.trim();

      // Try to parse as JSON and return as formatted JSON, fallback to original output
      try {
        const jsonValue = JSON.parse(output);
        return JSON.stringify(jsonValue, null, 2);
      } catch {
        // Not JSON, return as-is
        return output;
      }
    } else {
      // For API calls without a specific key, return a summary of all config keys
      const configKeys = [
        'github.token',
        'github.owner',
        'github.repo',
        'github.defaults',
        'linear.token',
        'linear.defaults',
        'openai.token',
        'openai.model',
        'openai.baseUrl',
        'mcp.enabled',
        'mcp.port',
        'mcp.host',
        'logging.level',
      ];
      const configSummary: Record<string, string | null> = {};

      for (const configKey of configKeys) {
        try {
          const result = await this.executeCommand('config', [
            'get',
            configKey,
          ]);
          // Handle CLI response when key doesn't exist
          const output = result.stdout.trim();
          if (output.startsWith('No value found for key:') || !output) {
            configSummary[configKey] = null;
          } else {
            // Try to parse as JSON first (for object values), fallback to string
            try {
              const jsonValue = JSON.parse(output);
              configSummary[configKey] = jsonValue;
            } catch {
              // Not JSON, use as string
              configSummary[configKey] = output;
            }
          }
        } catch {
          configSummary[configKey] = null;
        }
      }

      return JSON.stringify(configSummary, null, 2);
    }
  }

  async setConfig(configData: Record<string, unknown>): Promise<string> {
    const results: string[] = [];

    // Set each config key individually using the correct CLI format: config set KEY VALUE
    for (const [key, value] of Object.entries(configData)) {
      if (value !== undefined && value !== null && value !== '') {
        try {
          // Properly handle complex objects by JSON stringifying them
          let stringValue: string;
          if (typeof value === 'object' && value !== null) {
            stringValue = JSON.stringify(value);
          } else {
            stringValue = String(value);
          }

          const args = ['set', key, stringValue];
          const result = await this.executeCommand('config', args);
          results.push(`${key}: ${result.stdout || 'OK'}`);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          results.push(`${key}: ERROR - ${message}`);
          // Continue with other keys instead of throwing immediately
        }
      }
    }

    return results.join('\n');
  }
}

// Singleton instance
export const cliExecutor = new CLIExecutor();
