import { existsSync, readFileSync, writeFileSync } from 'fs';

export class Config {
  private configPath: string;
  private config: Record<string, any>;

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
      this.config = JSON.parse(content);
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

  get(key: string): any {
    const parts = key.split('.');
    let value = this.config;

    for (const part of parts) {
      if (value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  set(key: string, value: any): void {
    const parts = key.split('.');
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    this.saveConfig();
  }

  delete(key: string): void {
    const parts = key.split('.');
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) return;
      current = current[part];
    }

    delete current[parts[parts.length - 1]];
    this.saveConfig();
  }
}
