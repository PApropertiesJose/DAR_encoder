import { openDB } from "idb";

/**
 * Service to manage IndexedDB operations cleanly with promises.
 */
export class IndexedDBService {
  /**
   * @param {string} dbName - Name of the database
   * @param {number} version - Version of the database (increment to trigger schema upgrades)
   * @param {Object} schema - Schema definition of the database
   * @param {Object.<string, Object>} schema.stores - Map of store names to options
   * @param {string} [schema.stores[].keyPath] - Primary key path
   * @param {boolean} [schema.stores[].autoIncrement] - Auto-increment primary keys
   * @param {Array.<Object>} [schema.stores[].indexes] - Array of index definitions
   * @param {string} schema.stores[].indexes[].name - Index name
   * @param {string|string[]} schema.stores[].indexes[].keyPath - Key path(s) for index
   * @param {Object} [schema.stores[].indexes[].options] - Index options (e.g., { unique: boolean })
   */
  constructor(dbName, version = 1, schema = null) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema;
    this.db = null;
    this.initPromise = null;
  }

  /**
   * Initializes and opens the database.
   * Caches the database instance for future calls.
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) return this.db;

    // Prevent concurrent initialization calls
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const schema = this.schema;
        const self = this;
        this.db = await openDB(this.dbName, this.version, {
          upgrade(db, oldVersion, newVersion, transaction) {
            console.log(`Upgrading DB "${db.name}" from v${oldVersion} to v${newVersion}`);

            if (!schema || !schema.stores) return;

            for (const [storeName, storeConfig] of Object.entries(schema.stores)) {
              let store;

              if (!db.objectStoreNames.contains(storeName)) {
                const { indexes, ...storeOptions } = storeConfig;
                store = db.createObjectStore(storeName, storeOptions);
                console.log(`Created store "${storeName}" with options:`, storeOptions);
              } else {
                store = transaction.objectStore(storeName);
              }

              if (storeConfig.indexes && Array.isArray(storeConfig.indexes)) {
                for (const indexDef of storeConfig.indexes) {
                  if (!store.indexNames.contains(indexDef.name)) {
                    store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options);
                    console.log(`Created index "${indexDef.name}" on store "${storeName}"`);
                  }
                }
              }
            }
          },
          // Close this connection if a newer version needs to upgrade
          blocking() {
            console.warn(`DB "${self.dbName}" v${self.version} is blocking an upgrade — closing.`);
            self.db?.close();
            self.db = null;
            self.initPromise = null;
          },
          blocked() {
            console.warn(`DB "${self.dbName}" v${self.version} upgrade is blocked by an older connection.`);
          },
        });
        return this.db;
      } catch (error) {
        console.error(`Failed to initialize IndexedDB: ${this.dbName}`, error);
        this.initPromise = null; // Reset promise so we can retry on next request
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Gets the active database instance.
   * @returns {Promise<IDBDatabase>}
   */
  async getDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  /**
   * Retrieves a single record by key.
   * @param {string} storeName 
   * @param {any} key 
   * @returns {Promise<any>}
   */
  async get(storeName, key) {
    const db = await this.getDB();
    try {
      return await db.get(storeName, key);
    } catch (err) {
      console.error(`[IndexedDBService] Error getting key "${key}" from "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Retrieves all records from a store.
   * @param {string} storeName 
   * @param {any} [query] - Optional range query
   * @param {number} [count] - Optional max count
   * @returns {Promise<any[]>}
   */
  async getAll(storeName, query, count) {
    const db = await this.getDB();
    try {
      return await db.getAll(storeName, query, count);
    } catch (err) {
      console.error(`[IndexedDBService] Error getting all records from "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Inserts or updates a record.
   * @param {string} storeName 
   * @param {any} value 
   * @param {any} [key] - Key is required only if store doesn't have keyPath
   * @returns {Promise<any>} Resolves to the key of the inserted/updated record
   */
  async put(storeName, value, key) {
    const db = await this.getDB();
    try {
      return await db.put(storeName, value, key);
    } catch (err) {
      console.error(`[IndexedDBService] Error putting record in "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Inserts a record. Fails if the key already exists.
   * @param {string} storeName 
   * @param {any} value 
   * @param {any} [key] 
   * @returns {Promise<any>} Resolves to the key of the added record
   */
  async add(storeName, value, key) {
    const db = await this.getDB();
    try {
      return await db.add(storeName, value, key);
    } catch (err) {
      console.error(`[IndexedDBService] Error adding record in "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Deletes a record by key.
   * @param {string} storeName 
   * @param {any} key 
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    const db = await this.getDB();
    try {
      await db.delete(storeName, key);
    } catch (err) {
      console.error(`[IndexedDBService] Error deleting key "${key}" from "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Clears all records from a store.
   * @param {string} storeName 
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    const db = await this.getDB();
    try {
      await db.clear(storeName);
    } catch (err) {
      console.error(`[IndexedDBService] Error clearing store "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Counts the number of records in a store.
   * @param {string} storeName 
   * @param {any} [query] 
   * @returns {Promise<number>}
   */
  async count(storeName, query) {
    const db = await this.getDB();
    try {
      return await db.count(storeName, query);
    } catch (err) {
      console.error(`[IndexedDBService] Error counting records in "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Gets all keys from a store.
   * @param {string} storeName 
   * @param {any} [query] 
   * @param {number} [count] 
   * @returns {Promise<any[]>}
   */
  async getAllKeys(storeName, query, count) {
    const db = await this.getDB();
    try {
      return await db.getAllKeys(storeName, query, count);
    } catch (err) {
      console.error(`[IndexedDBService] Error getting all keys from "${storeName}":`, err);
      throw err;
    }
  }

  /**
   * Gets all records matching a specific index.
   * @param {string} storeName 
   * @param {string} indexName 
   * @param {any} [query] 
   * @param {number} [count] 
   * @returns {Promise<any[]>}
   */
  async getAllFromIndex(storeName, indexName, query, count) {
    const db = await this.getDB();
    try {
      return await db.getAllFromIndex(storeName, indexName, query, count);
    } catch (err) {
      console.error(`[IndexedDBService] Error querying index "${indexName}" on "${storeName}":`, err);
      throw err;
    }
  }
}

// Memory cache of DB service instances to act as a singleton registry
const dbRegistry = {};

/**
 * Helper to fetch/create a DB service instance singleton.
 * @param {string} dbName 
 * @param {number} version 
 * @param {Object} schema 
 * @returns {IndexedDBService}
 */
export function getDBService(dbName = "AppOfflineDB", version = 2, schema = null) {
  const cacheKey = `${dbName}_v${version}`;
  if (!dbRegistry[cacheKey]) {
    dbRegistry[cacheKey] = new IndexedDBService(dbName, version, schema);
  }
  return dbRegistry[cacheKey];
}
