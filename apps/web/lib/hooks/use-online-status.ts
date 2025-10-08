'use client';

import { useState, useEffect, useCallback } from 'react';

export function useOnlineStatus() {
  // Initialize with the current online status
  const [isOnline, setIsOnline] = useState(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Default to online during SSR
  });

  const updateOnlineStatus = useCallback(() => {
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // Update the online status
    updateOnlineStatus();

    // Add event listeners for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Also check periodically in case the events don't fire
    const intervalId = setInterval(updateOnlineStatus, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(intervalId);
    };
  }, [updateOnlineStatus]);

  return isOnline;
}
