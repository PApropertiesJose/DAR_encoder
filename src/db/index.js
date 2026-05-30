import { openDB } from 'idb';

const DB_NAME = 'DAR_offline';
const DB_VERSION = 2;

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('lots', { keyPath: 'id' });
          db.createObjectStore('taskAssignments', { keyPath: 'id' });
          db.createObjectStore('blocks', { keyPath: 'id' });
          db.createObjectStore('meta');
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          // Stores task sheet cell data keyed by a sheet identifier string
          db.createObjectStore('taskSheetEntries');
        }
      },
    });
  }
  return dbPromise;
}
