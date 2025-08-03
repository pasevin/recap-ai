// CLI command execution utilities
import { spawn } from 'child_process';
import path from 'path';
import { CLIError } from '../api/errors';

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

export class CLIExecutor {
  private readonly cliPath: string;
  private readonly defaultOptions: CLIExecutorOptions;

  constructor() {
    // Navigate from apps/web to the monorepo root
    const projectRoot = path.resolve(process.cwd(), '../../');
    this.cliPath = path.join(projectRoot, 'bin/run.js');
    this.defaultOptions = {
      timeout: 30000, // 30 seconds
      cwd: projectRoot, // Set working directory to the project root
      env: process.env,
    };
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
    timeframe: '1d' | '1w' | '1m' | '1y',
    _sources: string[],
    format?: 'summary' | 'json'
  ): Promise<string> {
    // Convert timeframe to since date (rough approximation)
    const timeframeToSince: Record<string, string> = {
      '1d': new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      '1w': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      '1m': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      '1y': new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };

    const args = [
      '--since',
      timeframeToSince[timeframe],
      '--format',
      format === 'json' ? 'json' : 'summary',
    ];

    const result = await this.executeCommand('summarize', args);
    return result.stdout;
  }

  async fetchGitHub(
    timeframe: '1d' | '1w' | '1m' | '1y',
    repository?: string,
    format?: 'summary' | 'json'
  ): Promise<string> {
    const args = ['--timeframe', timeframe, '--format', format ?? 'json'];

    if (repository) {
      args.push('--repo', repository);
    }

    const result = await this.executeCommand('github', args);
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

    const result = await this.executeCommand('linear', args);
    return result.stdout;
  }

  async getConfig(key?: string): Promise<string> {
    if (key) {
      const args = ['get', key];
      const result = await this.executeCommand('config', args);
      return result.stdout;
    } else {
      // For API calls without a specific key, return a summary of common config keys
      const configKeys = [
        'github.token',
        'linear.token',
        'openai.token',
        'github.defaults.repository',
      ];
      const configSummary: Record<string, string> = {};

      for (const configKey of configKeys) {
        try {
          const result = await this.executeCommand('config', [
            'get',
            configKey,
          ]);
          configSummary[configKey] = result.stdout.trim()
            ? 'configured'
            : 'not configured';
        } catch {
          configSummary[configKey] = 'not configured';
        }
      }

      return JSON.stringify(configSummary, null, 2);
    }
  }

  async setConfig(configData: Record<string, unknown>): Promise<string> {
    const args: string[] = ['set'];

    // Convert config object to CLI arguments
    for (const [section, values] of Object.entries(configData)) {
      if (typeof values === 'object' && values !== null) {
        for (const [key, value] of Object.entries(values)) {
          args.push(`--${section}-${key}`, String(value));
        }
      }
    }

    const result = await this.executeCommand('config', args);
    return result.stdout;
  }
}

// Singleton instance
export const cliExecutor = new CLIExecutor();
