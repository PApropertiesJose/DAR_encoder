import { useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { getPendingSync, dequeueSync } from '~/db/syncQueue';
import client from '~/config/client';

/**
 * Flushes the offline sync queue whenever the app comes back online.
 * Mount this hook once at the app root (e.g. inside DashboardLayout).
 *
 * To add a new sync type, extend the switch statement below and map it
 * to the appropriate API call.
 */
export function useSyncOnReconnect() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) return;

    (async () => {
      const queue = await getPendingSync();
      if (queue.length === 0) return;

      console.log(`[sync] Flushing ${queue.length} pending item(s)...`);

      for (const item of queue) {
        try {
          switch (item.type) {
            case 'UPDATE_LOT_STATUS':
              await client.post('/TaskAssignment/UpdateLotStatus', item.payload);
              break;
            // Add more cases here as you add offline-capable mutations:
            // case 'SUBMIT_DAR':
            //   await client.post('/DAR/Submit', item.payload);
            //   break;
            default:
              console.warn(`[sync] Unknown queue type: ${item.type}`);
          }
          await dequeueSync(item.id);
          console.log(`[sync] Synced: ${item.type} (${item.id})`);
        } catch (err) {
          // Leave in queue — will retry on next reconnect
          console.warn(`[sync] Failed to sync ${item.id}:`, err.message);
        }
      }
    })();
  }, [isOnline]);
}
