import { useState, useCallback, useEffect } from "react";
import client from "~/config/client";
import { useIndexedDB } from "~/hooks/useIndexedDB";
import { DB_SCHEMA, DB_VERSION } from "~/Constants/schemas";

const STORE = "activities";

// Construction index can come back as null from the server; use a stable
// sentinel so it can still be used as part of the IndexedDB key.
export const NULL_INDEX_KEY = "__general__";

const useFetchActivitiesPerPhase = (params) => {
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
      const response = await client.get("/Synching/activities", {
        params: { phase: params?.phaseCode },
      });

      const groups = response.data?.data ?? response.data ?? [];

      await clear();
      await Promise.all(
        groups.map((group) =>
          put({
            ...group,
            id: `${group.phase ?? ""}::${group.constructionIndex ?? NULL_INDEX_KEY}`,
          })
        )
      );
      await refresh();
    } catch (err) {
      setSyncError(err);
    } finally {
      setSyncing(false);
    }
  }, [params?.phaseCode, clear, put, refresh]);

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

export default useFetchActivitiesPerPhase;
