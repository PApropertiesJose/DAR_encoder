---
name: indexeddb-offline
description: >
  Use this skill whenever the user wants to store, cache, or persist data offline using IndexedDB
  in the DAR_encoder project. Trigger for any of these: offline storage, caching API responses,
  offline-first patterns, service workers with data sync, persisting lots/tasks/assignments locally,
  "work without internet", "save data offline", "cache API data", "sync when online", idb setup,
  IndexedDB schema, adding a new store, reading/writing from IndexedDB, clearing cached data,
  background sync, or TanStack Query persistence. Always use this skill when the user is working
  with the `idb` library or mentions offline capability — even if the request sounds simple.
---

# IndexedDB Offline Data — DAR Encoder

## Project Context

- **Stack**: React 19, Vite, TanStack Query v5, Zustand v5, Mantine v9, Axios
- **IDB library**: `idb` v8 is already installed — always use it (never raw `window.indexedDB`)
- **API client**: `~/config/client` (Axios instance with `VITE_BASE_URL`)
- **Path alias**: `~` maps to `src/`

The app encodes DAR (Document Assessment Record) data for PA Properties, working with phases, blocks, lots, and task assignments. Offline storage matters because field workers often have spotty internet.

---

## Database Setup

Create a single `db.js` file that owns the entire IndexedDB schema. All stores live in one database.

```js
// src/db/index.js
import { openDB } from 'idb';

const DB_NAME = 'DAR_offline';
const DB_VERSION = 1; // increment when adding/changing stores

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Adjust keyPath to match what your API actually returns
          db.createObjectStore('lots', { keyPath: 'id' });
          db.createObjectStore('taskAssignments', { keyPath: 'id' });
          db.createObjectStore('blocks', { keyPath: 'id' });
          // Generic meta store for sync timestamps, flags, etc.
          db.createObjectStore('meta');
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        // if (oldVersion < 2) { db.createObjectStore('newStore', ...); }
      },
    });
  }
  return dbPromise;
}
```

**Key decisions:**
- One `getDB()` singleton — the connection is reused, not reopened on every call.
- Increment `DB_VERSION` and add a new `if (oldVersion < N)` block for schema changes — never mutate existing stores in place.
- Verify the `keyPath` matches what the API actually returns before finalizing.

---

## Core Read/Write Helpers

Wrap common operations so the rest of the app doesn't import `idb` directly.

```js
// src/db/helpers.js
import { getDB } from './index';

/** Put one or many records into a store */
export async function cacheRecords(storeName, records) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const puts = Array.isArray(records)
    ? records.map(r => tx.store.put(r))
    : [tx.store.put(records)];
  await Promise.all([...puts, tx.done]);
}

/** Get all records from a store */
export async function getAllCached(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

/** Get one record by key */
export async function getCached(storeName, key) {
  const db = await getDB();
  return db.get(storeName, key);
}

/** Delete one record */
export async function deleteCached(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

/** Clear an entire store (e.g., on logout or phase switch) */
export async function clearStore(storeName) {
  const db = await getDB();
  return db.clear(storeName);
}

/** Save/read a single meta value */
export async function setMeta(key, value) {
  const db = await getDB();
  return db.put('meta', value, key);
}
export async function getMeta(key) {
  const db = await getDB();
  return db.get('meta', key);
}
```

---

## Integrating with TanStack Query

Check IndexedDB in `queryFn` as a fallback when the network is unavailable, and write to IndexedDB on every successful fetch.

```js
// Example: src/hooks/Filters/useFetchLot.js
import { useQuery } from '@tanstack/react-query';
import client from '~/config/client';
import QueryKeys from '~/Constants/QueryKeys';
import { cacheRecords, getAllCached } from '~/db/helpers';

const useFetchLot = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_LOT, params],
    queryFn: async () => {
      try {
        const response = await client.post(
          `/TaskAssignment/NewTaskAssignment/${params.username}/blocks/NOAH_PAAPDC/${params.phaseCode}/${params.block}/lot/only`
        );
        const data = response.data;
        await cacheRecords('lots', data); // cache on success
        return data;
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getAllCached('lots');
          if (cached.length > 0) return cached; // serve from cache
        }
        throw err;
      }
    },
    enabled: !!params.block,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export default useFetchLot;
```

The UI sees no difference — TanStack Query handles loading/error states as usual.

---

## Offline Status Hook

```js
// src/hooks/useOnlineStatus.js
import { useSyncExternalStore } from 'react';

function subscribe(cb) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
```

Use it anywhere to show an offline banner or disable submit buttons:

```jsx
const isOnline = useOnlineStatus();
// <Badge color={isOnline ? 'green' : 'red'}>{isOnline ? 'Online' : 'Offline'}</Badge>
```

---

## Queuing Offline Writes & Syncing on Reconnect

When the user mutates data offline, queue it locally and flush automatically on reconnect.

```js
// src/db/syncQueue.js
import { getDB } from './index';

export async function enqueueSync({ type, payload }) {
  const db = await getDB();
  await db.add('syncQueue', {
    id: `${Date.now()}-${Math.random()}`,
    type,     // e.g. 'UPDATE_LOT_STATUS'
    payload,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingSync() {
  const db = await getDB();
  return db.getAll('syncQueue');
}

export async function dequeueSync(id) {
  const db = await getDB();
  return db.delete('syncQueue', id);
}
```

```js
// src/hooks/useSyncOnReconnect.js
import { useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { getPendingSync, dequeueSync } from '~/db/syncQueue';
import client from '~/config/client';

export function useSyncOnReconnect() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) return;
    (async () => {
      const queue = await getPendingSync();
      for (const item of queue) {
        try {
          if (item.type === 'UPDATE_LOT_STATUS') {
            await client.post('/your/endpoint', item.payload);
          }
          // Add more type handlers as needed
          await dequeueSync(item.id);
        } catch {
          // Leave in queue — retries on next reconnect
        }
      }
    })();
  }, [isOnline]);
}
```

Mount `useSyncOnReconnect()` once at the app root (e.g., in `DashboardLayout`).

---

## Common Patterns & Gotchas

**Schema versioning**: Always use `oldVersion` guards in `upgrade()`. Calling `createObjectStore` unconditionally throws if the store already exists.

**Large payloads**: IndexedDB handles large datasets well. GeoJSON, bounding boxes, WKT strings — store as-is.

**Clearing stale data**: Call `clearStore('lots')` on logout or when the user switches phases/projects so stale data doesn't bleed across sessions.

**Private browsing**: Some browsers restrict IndexedDB in private mode. Wrap `getDB()` calls in try/catch and degrade gracefully.

**Bulk transactions**: `idb` v8 auto-commits transactions. For bulk writes, batch all `put()` calls inside one transaction as shown in `cacheRecords`.

**Out-of-line keys**: If records have no natural ID field, use `{ autoIncrement: true }` or pass a key as the second arg to `put(value, key)`.

---

## Recommended File Structure

```
src/
  db/
    index.js            ← openDB, schema, migrations
    helpers.js          ← CRUD helpers
    syncQueue.js        ← offline write queue
  hooks/
    useOnlineStatus.js
    useSyncOnReconnect.js
```
