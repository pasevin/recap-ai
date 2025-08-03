import { existsSync, readFileSync, writeFileSync } from 'fs';

export class Config {
  private configPath: string;
  private config: Record<string, unknown>;

  constructor() {
    this.configPath = '.recap-ai.config.json';
    this.config = {};
    this.loadConfig();
  }

  private loadConfig(): void {
    if (!existsSync(this.configPath)) {
      this.saveConfig();
      return;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = {};
      this.saveConfig();
    }
  }

  private saveConfig(): void {
    try {
      writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  get(key: string): unknown {
    const parts = key.split('.');
    let value: unknown = this.config;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  set(key: string, value: unknown): void {
    const parts = key.split('.');
    let current: Record<string, unknown> = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
    this.saveConfig();
  }

  delete(key: string): void {
    const parts = key.split('.');
    let current: Record<string, unknown> = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) return;
      current = current[part] as Record<string, unknown>;
    }

    delete current[parts[parts.length - 1]];
    this.saveConfig();
  }
}
