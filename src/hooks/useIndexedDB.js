import { useState, useEffect, useCallback, useRef } from "react";
import { getDBService } from "~/services/indexedDB";

/**
 * A custom React hook to interact with an IndexedDB store reactively.
 * Handles loading states, error states, and syncs local state after mutations.
 * 
 * @param {string} storeName - The name of the object store
 * @param {Object} [options] - Options configuration
 * @param {string} [options.dbName="AppOfflineDB"] - Name of the IndexedDB database
 * @param {number} [options.version=1] - Version of the database
 * @param {Object} [options.schema] - Optional schema configuration for DB upgrades
 * @param {boolean} [options.autoInit=true] - If true, automatically fetch all store records on mount
 * 
 * @returns {Object} Hook payload including state and operations:
 * - data {Array} The records in the store
 * - loading {boolean} True if a database operation is pending
 * - error {Error|null} Database error if any
 * - get {Function} (key) => Promise<any> Get a single record by key
 * - add {Function} (value, key?) => Promise<any> Add a record (fails if key exists)
 * - put {Function} (value, key?) => Promise<any> Insert or update a record
 * - remove {Function} (key) => Promise<void> Delete a record by key
 * - clear {Function} () => Promise<void> Clear the store
 * - refresh {Function} () => Promise<void> Manually reload records from DB
 */
export function useIndexedDB(storeName, options = {}) {
  const {
    dbName = "AppOfflineDB",
    version = 1,
    schema = null,
    autoInit = true,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(autoInit);
  const [error, setError] = useState(null);

  // Use useRef to maintain a stable reference to the DB service instance
  const dbServiceRef = useRef(null);
  if (!dbServiceRef.current) {
    dbServiceRef.current = getDBService(dbName, version, schema);
  }
  const dbService = dbServiceRef.current;

  /**
   * Refreshes the local component state with the latest records from the store.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await dbService.getAll(storeName);
      setData(records);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [dbService, storeName]);

  // Load data on mount if autoInit is enabled
  useEffect(() => {
    if (autoInit) {
      refresh();
    }
  }, [refresh, autoInit]);

  /**
   * Adds a record to the store and updates local state.
   */
  const add = useCallback(async (value, key) => {
    setError(null);
    try {
      const resultKey = await dbService.add(storeName, value, key);
      
      // Update local state reactively
      setData((prev) => {
        const itemWithKey = (typeof value === "object" && value !== null && !Array.isArray(value))
          ? { ...value }
          : value;

        if (typeof itemWithKey === "object" && itemWithKey !== null) {
          const keyPath = schema?.stores?.[storeName]?.keyPath;
          if (keyPath && resultKey !== undefined) {
            itemWithKey[keyPath] = resultKey;
          } else if (key !== undefined) {
            itemWithKey._key = key;
          }
        }
        
        return [...prev, itemWithKey];
      });

      return resultKey;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [dbService, storeName, schema]);

  /**
   * Puts/upserts a record into the store and updates local state.
   */
  const put = useCallback(async (value, key) => {
    setError(null);
    try {
      const resultKey = await dbService.put(storeName, value, key);
      
      // Update local state reactively
      setData((prev) => {
        const keyPath = schema?.stores?.[storeName]?.keyPath;
        const itemKey = key !== undefined ? key : (keyPath ? value[keyPath] : resultKey);

        const itemWithKey = (typeof value === "object" && value !== null && !Array.isArray(value))
          ? { ...value }
          : value;

        if (typeof itemWithKey === "object" && itemWithKey !== null) {
          if (keyPath && resultKey !== undefined) {
            itemWithKey[keyPath] = resultKey;
          } else if (key !== undefined) {
            itemWithKey._key = key;
          }
        }

        // Check if the item already exists in local state to decide whether to update or append
        const exists = prev.some((item) => {
          if (keyPath && typeof item === "object" && item !== null) {
            return item[keyPath] === itemKey;
          }
          if (typeof item === "object" && item !== null && item._key !== undefined) {
            return item._key === itemKey;
          }
          return false;
        });

        if (exists) {
          return prev.map((item) => {
            if (keyPath && typeof item === "object" && item !== null && item[keyPath] === itemKey) {
              return itemWithKey;
            }
            if (typeof item === "object" && item !== null && item._key === itemKey) {
              return itemWithKey;
            }
            return item;
          });
        } else {
          return [...prev, itemWithKey];
        }
      });

      return resultKey;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [dbService, storeName, schema]);

  /**
   * Deletes a record by key and updates local state.
   */
  const remove = useCallback(async (key) => {
    setError(null);
    try {
      await dbService.delete(storeName, key);
      
      // Update local state reactively
      setData((prev) => {
        const keyPath = schema?.stores?.[storeName]?.keyPath;
        return prev.filter((item) => {
          if (keyPath && typeof item === "object" && item !== null) {
            return item[keyPath] !== key;
          }
          if (typeof item === "object" && item !== null && item._key !== undefined) {
            return item._key !== key;
          }
          return item !== key;
        });
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [dbService, storeName, schema]);

  /**
   * Clears the store and empties local state.
   */
  const clear = useCallback(async () => {
    setError(null);
    try {
      await dbService.clear(storeName);
      setData([]);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [dbService, storeName]);

  /**
   * Gets a record on-demand without affecting the component's listed data state.
   */
  const get = useCallback(async (key) => {
    try {
      return await dbService.get(storeName, key);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [dbService, storeName]);

  return {
    data,
    loading,
    error,
    get,
    add,
    put,
    remove,
    clear,
    refresh,
  };
}
