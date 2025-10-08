'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SecureStorage,
  UIPreferencesStorage,
  UIPreferences,
} from '@/lib/utils/secure-storage';

/**
 * Hook for using secure client-side storage
 * NOTE: Should NOT be used for sensitive data like API tokens
 */
export function useSecureStorage<T>(
  key: string,
  defaultValue: T,
  options: {
    encrypt?: boolean;
    expiry?: number;
    session?: boolean;
  } = {}
) {
  // Capture the initial default value to avoid dependency issues
  const defaultValueRef = useRef(defaultValue);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    return SecureStorage.get<T>(key, options.session) ?? defaultValue;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Destructure options to avoid dependency issues
  const { encrypt, expiry, session } = options;

  useEffect(() => {
    // Only run on mount or when key/session changes
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const storedValue = SecureStorage.get<T>(key, session);
    if (storedValue !== null && storedValue !== undefined) {
      setValue(storedValue);
    }
    setIsLoading(false);
  }, [key, session]); // Removed defaultValue and options to prevent infinite loops

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((currentValue) => {
        const valueToStore =
          typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(currentValue)
            : newValue;

        SecureStorage.set(key, valueToStore, { encrypt, expiry, session });
        return valueToStore;
      });
    },
    [key, encrypt, expiry, session] // Remove value dependency to avoid stale closures
  );

  const removeValue = useCallback(() => {
    setValue(defaultValueRef.current);
    SecureStorage.remove(key, session);
  }, [key, session]);

  return [value, setStoredValue, removeValue, isLoading] as const;
}

/**
 * Hook for managing UI preferences
 */
export function useUIPreferences() {
  const [preferences, setPreferences] = useState<UIPreferences>(() => {
    if (typeof window === 'undefined') return {};
    return UIPreferencesStorage.get();
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load preferences on mount
    const prefs = UIPreferencesStorage.get();
    setPreferences(prefs);
    setIsLoading(false);
  }, []);

  const updatePreferences = useCallback(
    (updates: Partial<UIPreferences>) => {
      setPreferences((current) => {
        const newPreferences = { ...current, ...updates };
        UIPreferencesStorage.set(updates);
        return newPreferences;
      });
    },
    [] // Remove preferences dependency to avoid stale closures
  );

  const setTheme = useCallback(
    (theme: UIPreferences['theme']) => {
      updatePreferences({ theme });
    },
    [updatePreferences]
  );

  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      updatePreferences({ sidebarCollapsed: collapsed });
    },
    [updatePreferences]
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      updatePreferences({ activeTab: tab });
    },
    [updatePreferences]
  );

  const setLastSelectedSources = useCallback(
    (sources: ('github' | 'linear')[]) => {
      updatePreferences({ lastSelectedSources: sources });
    },
    [updatePreferences]
  );

  const setDashboardLayout = useCallback(
    (layout: 'grid' | 'list') => {
      updatePreferences({ dashboardLayout: layout });
    },
    [updatePreferences]
  );

  const clearPreferences = useCallback(() => {
    setPreferences({});
    UIPreferencesStorage.clear();
  }, []);

  return {
    preferences,
    updatePreferences,
    setTheme,
    setSidebarCollapsed,
    setActiveTab,
    setLastSelectedSources,
    setDashboardLayout,
    clearPreferences,
    isLoading,

    // Getters for common preferences
    theme: preferences.theme ?? 'system',
    sidebarCollapsed: preferences.sidebarCollapsed ?? false,
    activeTab: preferences.activeTab ?? 'data-sources',
    lastSelectedSources: preferences.lastSelectedSources ?? [
      'github',
      'linear',
    ],
    dashboardLayout: preferences.dashboardLayout ?? 'grid',
    notificationsEnabled: preferences.notificationsEnabled ?? true,
    autoSave: preferences.autoSave ?? true,
  };
}

/**
 * Hook for managing local storage with automatic JSON serialization
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  return useSecureStorage(key, defaultValue, { encrypt: false });
}

/**
 * Hook for managing session storage with automatic JSON serialization
 */
export function useSessionStorage<T>(key: string, defaultValue: T) {
  return useSecureStorage(key, defaultValue, { session: true, encrypt: false });
}

/**
 * Hook for managing encrypted local storage (for non-sensitive data that benefits from obfuscation)
 */
export function useEncryptedStorage<T>(
  key: string,
  defaultValue: T,
  expiryMs?: number
) {
  return useSecureStorage(key, defaultValue, {
    encrypt: true,
    expiry: expiryMs,
  });
}
