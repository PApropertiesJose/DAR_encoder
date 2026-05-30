import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/**
 * Returns true when the browser has network access, false when offline.
 * Updates reactively — components re-render automatically on status change.
 *
 * Usage:
 *   const isOnline = useOnlineStatus();
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,  // client snapshot
    () => true,              // server/SSR snapshot
  );
}
