import { getDB } from './index';

/**
 * Add a pending mutation to the sync queue.
 *
 * @param {object} options
 * @param {string} options.type   - Action identifier, e.g. 'UPDATE_LOT_STATUS'
 * @param {object} options.payload - Data to send to the API when syncing
 *
 * Usage:
 *   await enqueueSync({ type: 'UPDATE_LOT_STATUS', payload: { lotId: 1, status: 'done' } });
 */
export async function enqueueSync({ type, payload }) {
  const db = await getDB();
  await db.add('syncQueue', {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  });
}

/** Return all pending sync items */
export async function getPendingSync() {
  const db = await getDB();
  return db.getAll('syncQueue');
}

/** Remove an item after it has been successfully synced */
export async function dequeueSync(id) {
  const db = await getDB();
  return db.delete('syncQueue', id);
}

/** How many items are waiting to sync */
export async function getPendingSyncCount() {
  const db = await getDB();
  return db.count('syncQueue');
}
