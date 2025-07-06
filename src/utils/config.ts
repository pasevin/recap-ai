import * as fs from 'fs';

interface Config {
  github?: {
    token?: string;
    owner?: string;
    repo?: string;
    mcp?: {
      url?: string;
    };
    defaults?: {
      timeframe?: string;
      branch?: string;
      person?: {
        identifier?: string; // GitHub username
        includeAuthored?: boolean; // PRs and commits they authored
        includeReviewed?: boolean; // PRs they reviewed
        includeAssigned?: boolean; // PRs assigned to them
        includeCommented?: boolean; // PRs/issues they commented on
        includeMentioned?: boolean; // Where they were mentioned
      };
      prState?: 'open' | 'closed' | 'all';
    };
  };
  linear?: {
    token?: string;
    defaults?: {
      teamId?: string;
      timeframe?: string;
      state?: 'open' | 'closed' | 'all';
      person?: {
        identifier?: string; // Linear username/email
        includeCreated?: boolean; // Issues they created
        includeAssigned?: boolean; // Issues assigned to them
        includeCommented?: boolean; // Issues they commented on
        includeSubscribed?: boolean; // Issues they're subscribed to
        includeMentioned?: boolean; // Where they were mentioned
      };
      limit?: number;
    };
  };
  openai?: {
    token?: string;
  };
  [key: string]: any;
}

export class ConfigManager {
  private config: Config;
  private configPath: string = '.recap-ai.config.json';

  constructor() {
    this.config = this.loadConfig();
  }

  get(key: string): any {
    try {
      const value = this.getNestedValue(this.config, key);

      // Only log non-sensitive, user-relevant information
      if (key === 'github.defaults.timeframe') {
        console.log(`Using time period: ${value}`);
      } else if (key === 'github.defaults.person.identifier') {
        console.log(`Fetching GitHub activity for user: ${value}`);
      } else if (key === 'linear.defaults.teamId') {
        console.log(`Using Linear team: ${value}`);
      } else if (key === 'linear.defaults.person.identifier' && value) {
        console.log(`Fetching Linear issues for user: ${value}`);
      }

      return value;
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return undefined;
    }
  }

  set(key: string, value: any): void {
    try {
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
    // Convert string 'true'/'false' to boolean if needed
    if (value === 'true') {
      target[lastKey] = true;
    } else if (value === 'false') {
      target[lastKey] = false;
    } else {
      target[lastKey] = value;
    }
  }

  private loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {};
  }

  private save(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  parseTimeframe(timeframe: string): { startDate: Date; endDate: Date } {
    const match = timeframe.match(/^(\d+)([dwmy])$/);
    if (!match) {
      throw new Error(
        'Invalid timeframe format. Use format: <number><unit>, e.g., 1d, 1w, 1m, 1y'
      );
    }

    const [, amount, unit] = match;
    const endDate = new Date();
    const startDate = new Date();
    const value = parseInt(amount, 10);

    switch (unit) {
      case 'd':
        startDate.setDate(startDate.getDate() - value);
        break;
      case 'w':
        startDate.setDate(startDate.getDate() - value * 7);
        break;
      case 'm':
        startDate.setMonth(startDate.getMonth() - value);
        break;
      case 'y':
        startDate.setFullYear(startDate.getFullYear() - value);
        break;
    }

    return { startDate, endDate };
  }
}

export const config = new ConfigManager();
