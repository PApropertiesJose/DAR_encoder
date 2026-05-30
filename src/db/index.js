import { openDB } from 'idb';

const DB_NAME = 'DAR_offline';
const DB_VERSION = 1;

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // keyPath must match the ID field returned by the API.
          // If the API returns a different field name (e.g. 'lotId'), update accordingly.
          db.createObjectStore('lots', { keyPath: 'id' });
          db.createObjectStore('taskAssignments', { keyPath: 'id' });
          db.createObjectStore('blocks', { keyPath: 'id' });
          // meta: generic key-value store for sync timestamps, flags, etc.
          db.createObjectStore('meta');
          // syncQueue: holds mutations made while offline, flushed on reconnect
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        // Future schema changes:
        // if (oldVersion < 2) { db.createObjectStore('newStore', { keyPath: 'id' }); }
      },
    });
  }
  return dbPromise;
}
