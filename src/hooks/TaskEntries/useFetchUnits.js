import { useState, useCallback, useEffect } from "react";
import client from "~/config/client";
import { useIndexedDB } from "~/hooks/useIndexedDB";
import { DB_SCHEMA, DB_VERSION } from "~/Constants/schemas";

const STORE = "units";

const useFetchUnits = (params) => {
  const { data, loading, error, put, clear, refresh } = useIndexedDB(STORE, {
    schema: DB_SCHEMA,
    version: DB_VERSION,
  });

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const syncFromServer = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const response = await client.get("/Synching/units", {
        params: { phase: params?.phaseCode },
      });

      const units = response.data?.data ?? response.data ?? [];

      await clear();
      await Promise.all(units.map((unit) => put(unit)));
      await refresh();
    } catch (err) {
      setSyncError(err);
    } finally {
      setSyncing(false);
    }
  }, [params?.phase, clear, put, refresh]);

  // Only auto-seed once IDB has finished loading and the store is confirmed empty
  useEffect(() => {
    if (!loading && data.length === 0 && !syncing) {
      syncFromServer();
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading: loading || syncing,
    error: error ?? syncError,
    resync: syncFromServer,
    syncing,
  };
};

export default useFetchUnits;
