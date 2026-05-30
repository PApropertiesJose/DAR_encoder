import { getDB } from './index';

/**
 * Put one or many records into a store.
 * Uses a single transaction for bulk writes — more efficient than individual puts.
 */
export async function cacheRecords(storeName, records) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const items = Array.isArray(records) ? records : [records];
  await Promise.all([...items.map(r => tx.store.put(r)), tx.done]);
}

/** Get all records from a store */
export async function getAllCached(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

/** Get one record by its key */
export async function getCached(storeName, key) {
  const db = await getDB();
  return db.get(storeName, key);
}

/** Delete one record by its key */
export async function deleteCached(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

/**
 * Clear an entire store.
 * Call this on logout or when the user switches phases/projects
 * to prevent stale data from bleeding across sessions.
 */
export async function clearStore(storeName) {
  const db = await getDB();
  return db.clear(storeName);
}

/** Persist a single meta value (e.g. last sync timestamp) */
export async function setMeta(key, value) {
  const db = await getDB();
  return db.put('meta', value, key);
}

/** Read a single meta value */
export async function getMeta(key) {
  const db = await getDB();
  return db.get('meta', key);
}
