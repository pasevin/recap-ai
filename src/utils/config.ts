import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Config {
  github?: {
    token?: string;
    defaults?: {
      timeframe?: string;
      branch?: string;
      author?: string;
      prState?: 'open' | 'closed' | 'all';
    };
  };
  linear?: {
    token?: string;
    defaults?: {
      teamId?: string;
      timeframe?: string;
      state?: 'open' | 'closed' | 'all';
      author?: string;
      limit?: number;
    };
  };
  [key: string]: any;
}

export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  get(key: string): any {
    try {
      console.log(`Getting config for key: ${key}`);
      const value = this.getNestedValue(this.config, key);
      console.log(`Config value:`, value);
      return value;
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return undefined;
    }
  }

  set(key: string, value: any): void {
    try {
      console.log(`Setting config for key: ${key}`, value);
      this.setNestedValue(this.config, key, value);
      this.save();
      console.log('Config saved successfully');
    } catch (error) {
      console.error(`Error setting config for key ${key}:`, error);
      throw error;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      current[key] = current[key] || {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private loadConfig(): Config {
    try {
      const configPath = path.join(os.homedir(), '.recap-cli', 'config.json');
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {};
  }

  private save(): void {
    try {
      const configPath = path.join(os.homedir(), '.recap-cli', 'config.json');
      const configDir = path.dirname(configPath);

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  parseTimeframe(timeframe: string): Date {
    const match = timeframe.match(/^(\d+)([dwmy])$/);
    if (!match) {
      throw new Error(
        'Invalid timeframe format. Use format: <number><unit>, e.g., 1d, 1w, 1m, 1y'
      );
    }

    const [, amount, unit] = match;
    const now = new Date();
    const value = parseInt(amount, 10);

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'w':
        now.setDate(now.getDate() - value * 7);
        break;
      case 'm':
        now.setMonth(now.getMonth() - value);
        break;
      case 'y':
        now.setFullYear(now.getFullYear() - value);
        break;
    }

    return now;
  }
}

export const config = new ConfigManager();
