// Secure client-side storage utilities
'use client';

export interface StorageOptions {
  encrypt?: boolean;
  expiry?: number; // TTL in milliseconds
  session?: boolean; // Use sessionStorage instead of localStorage
}

export interface StoredData<T = unknown> {
  value: T;
  timestamp: number;
  expiry?: number;
  encrypted?: boolean;
}

// Simple XOR encryption for client-side data (not for sensitive data!)
function simpleEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(encrypted: string, key: string): string {
  try {
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

// Generate a session-specific encryption key
function getEncryptionKey(): string {
  const key =
    'recap-ai-' +
    (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  return key;
}

export class SecureStorage {
  private static isAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private static getStorage(session: boolean = false): Storage {
    if (!this.isAvailable()) {
      throw new Error('Storage is not available');
    }
    return session ? sessionStorage : localStorage;
  }

  /**
   * Store data securely in client-side storage
   * NOTE: This should NOT be used for sensitive data like API tokens!
   */
  static set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const storage = this.getStorage(options.session);
      const timestamp = Date.now();

      const data: StoredData<T> = {
        value,
        timestamp,
        expiry: options.expiry ? timestamp + options.expiry : undefined,
        encrypted: options.encrypt,
      };

      let serialized = JSON.stringify(data);

      if (options.encrypt) {
        const key = getEncryptionKey();
        serialized = simpleEncrypt(serialized, key);
      }

      storage.setItem(`recap_${key}`, serialized);
      return true;
    } catch (error) {
      console.warn('Failed to store data:', error);
      return false;
    }
  }

  /**
   * Retrieve data from client-side storage
   */
  static get<T>(key: string, session: boolean = false): T | null {
    try {
      const storage = this.getStorage(session);
      const stored = storage.getItem(`recap_${key}`);

      if (!stored) return null;

      let parsed: StoredData<T>;

      try {
        // Try parsing as JSON first (unencrypted)
        parsed = JSON.parse(stored) as StoredData<T>;
      } catch {
        // If JSON parsing fails, try decrypting first
        try {
          const decrypted = simpleDecrypt(stored, getEncryptionKey());
          parsed = JSON.parse(decrypted) as StoredData<T>;
        } catch {
          // If both fail, the data is corrupted
          this.remove(key, session);
          return null;
        }
      }

      // Check expiry
      if (parsed.expiry && Date.now() > parsed.expiry) {
        this.remove(key, session);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.warn('Failed to retrieve data:', error);
      return null;
    }
  }

  /**
   * Remove data from client-side storage
   */
  static remove(key: string, session: boolean = false): boolean {
    try {
      const storage = this.getStorage(session);
      storage.removeItem(`recap_${key}`);
      return true;
    } catch (error) {
      console.warn('Failed to remove data:', error);
      return false;
    }
  }

  /**
   * Clear all Recap AI data from storage
   */
  static clear(session: boolean = false): boolean {
    try {
      const storage = this.getStorage(session);
      const keysToRemove: string[] = [];

      // Find all recap_ keys
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith('recap_')) {
          keysToRemove.push(key);
        }
      }

      // Remove them
      keysToRemove.forEach((key) => storage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Failed to clear data:', error);
      return false;
    }
  }

  /**
   * Get all stored keys with their metadata
   */
  static list(session: boolean = false): Array<{
    key: string;
    timestamp: number;
    expiry?: number;
    encrypted?: boolean;
  }> {
    try {
      const storage = this.getStorage(session);
      const items: Array<{
        key: string;
        timestamp: number;
        expiry?: number;
        encrypted?: boolean;
      }> = [];

      for (let i = 0; i < storage.length; i++) {
        const fullKey = storage.key(i);
        if (!fullKey?.startsWith('recap_')) continue;

        const key = fullKey.replace('recap_', '');
        const stored = storage.getItem(fullKey);
        if (!stored) continue;

        try {
          let parsed: StoredData;
          try {
            parsed = JSON.parse(stored) as StoredData;
          } catch {
            // Try decrypting
            const decrypted = simpleDecrypt(stored, getEncryptionKey());
            parsed = JSON.parse(decrypted) as StoredData;
          }

          items.push({
            key,
            timestamp: parsed.timestamp,
            expiry: parsed.expiry,
            encrypted: parsed.encrypted,
          });
        } catch {
          // Skip corrupted entries
        }
      }

      return items;
    } catch (error) {
      console.warn('Failed to list data:', error);
      return [];
    }
  }
}

// UI Preferences storage (specific implementation for settings)
export interface UIPreferences {
  theme?: 'light' | 'dark' | 'system';
  sidebarCollapsed?: boolean;
  activeTab?: string;
  dashboardLayout?: 'grid' | 'list';
  notificationsEnabled?: boolean;
  autoSave?: boolean;
  lastSelectedSources?: ('github' | 'linear')[];
  lastTimeframe?: string;
}

export class UIPreferencesStorage {
  private static readonly KEY = 'ui_preferences';

  static get(): UIPreferences {
    return SecureStorage.get<UIPreferences>(this.KEY) ?? {};
  }

  static set(preferences: Partial<UIPreferences>): boolean {
    const current = this.get();
    const updated = { ...current, ...preferences };

    return SecureStorage.set(this.KEY, updated, {
      encrypt: false, // UI preferences don't need encryption
      expiry: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  static getTheme(): UIPreferences['theme'] {
    return this.get().theme ?? 'system';
  }

  static setTheme(theme: UIPreferences['theme']): boolean {
    return this.set({ theme });
  }

  static getLastSelectedSources(): UIPreferences['lastSelectedSources'] {
    return this.get().lastSelectedSources ?? ['github', 'linear'];
  }

  static setLastSelectedSources(
    sources: UIPreferences['lastSelectedSources']
  ): boolean {
    return this.set({ lastSelectedSources: sources });
  }

  static getActiveTab(): string {
    return this.get().activeTab ?? 'general';
  }

  static setActiveTab(tab: string): boolean {
    return this.set({ activeTab: tab });
  }

  static clear(): boolean {
    return SecureStorage.remove(this.KEY);
  }
}

// Session data storage (for temporary data)
export interface SessionData {
  lastConnectionTest?: {
    service: string;
    timestamp: number;
    success: boolean;
  };
  formDrafts?: Record<string, unknown>;
  wizardProgress?: {
    currentStep: string;
    completedSteps: string[];
  };
}

export class SessionStorage {
  private static readonly KEY = 'session_data';

  static get(): SessionData {
    return SecureStorage.get<SessionData>(this.KEY, true) ?? {};
  }

  static set(data: Partial<SessionData>): boolean {
    const current = this.get();
    const updated = { ...current, ...data };

    return SecureStorage.set(this.KEY, updated, {
      session: true, // Use sessionStorage
      encrypt: false,
      expiry: 4 * 60 * 60 * 1000, // 4 hours
    });
  }

  static setConnectionTest(service: string, success: boolean): boolean {
    return this.set({
      lastConnectionTest: {
        service,
        timestamp: Date.now(),
        success,
      },
    });
  }

  static getConnectionTest(
    service: string
  ): { timestamp: number; success: boolean } | null {
    const data = this.get().lastConnectionTest;
    if (!data || data.service !== service) return null;

    // Only return if test was within last 5 minutes
    if (Date.now() - data.timestamp > 5 * 60 * 1000) return null;

    return { timestamp: data.timestamp, success: data.success };
  }

  static setFormDraft(formId: string, draft: unknown): boolean {
    const formDrafts = this.get().formDrafts ?? {};
    formDrafts[formId] = draft;
    return this.set({ formDrafts });
  }

  static getFormDraft<T>(formId: string): T | null {
    const formDrafts = this.get().formDrafts ?? {};
    return (formDrafts[formId] as T) ?? null;
  }

  static clear(): boolean {
    return SecureStorage.remove(this.KEY, true);
  }
}
