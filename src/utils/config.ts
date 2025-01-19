import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Load environment variables
dotenv.config();

interface Config {
  github?: {
    token: string;
    owner: string;
    repo: string;
    defaults?: {
      timeframe: string; // '1w', '2w', '1m', etc.
      branch: string;
      author: string;
      prState: 'open' | 'closed' | 'all';
    };
  };
  slack?: {
    token: string;
  };
  linear?: {
    token: string;
  };
}

class ConfigManager {
  private configPath: string;
  private config: Config;

  constructor() {
    this.configPath = path.join(os.homedir(), '.recap', 'config.json');
    this.config = this.loadConfig();
    this.ensureDefaults();
  }

  private loadConfig(): Config {
    try {
      if (!fs.existsSync(this.configPath)) {
        const dirPath = path.dirname(this.configPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(this.configPath, '{}');
        return {};
      }
      const configData = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error loading config:', error);
      return {};
    }
  }

  private ensureDefaults() {
    if (!this.config.github) {
      this.config.github = {
        token: '',
        owner: '',
        repo: '',
        defaults: {
          timeframe: '1w',
          branch: 'main',
          author: '',
          prState: 'all',
        },
      };
    } else if (!this.config.github.defaults) {
      this.config.github.defaults = {
        timeframe: '1w',
        branch: 'main',
        author: '',
        prState: 'all',
      };
    }
    this.saveConfig();
  }

  private saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  get(key: string): any {
    const envKey = `RECAP_${key.toUpperCase()}`;
    return process.env[envKey] || this.getNestedValue(this.config, key);
  }

  set(key: string, value: any) {
    this.setNestedValue(this.config, key, value);
    this.saveConfig();
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      current[key] = current[key] || {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Helper function to parse timeframe string into Date
  parseTimeframe(timeframe: string): Date {
    const now = new Date();
    const value = parseInt(timeframe.slice(0, -1));
    const unit = timeframe.slice(-1).toLowerCase();

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
      default:
        throw new Error('Invalid timeframe format. Use format: 1d, 1w, 1m, 1y');
    }

    return now;
  }
}

export const config = new ConfigManager();
