import { useState, useEffect, useRef } from 'react';
import { flushOfflineQueue } from '../lib/offlineQueue.js';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const prev = useRef(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush queue whenever we come back online
  useEffect(() => {
    if (isOnline && !prev.current) flushOfflineQueue();
    prev.current = isOnline;
  }, [isOnline]);

  return { isOnline };
}
