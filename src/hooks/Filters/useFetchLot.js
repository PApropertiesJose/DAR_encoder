import { useQuery } from "@tanstack/react-query";
import client from "~/config/client"
import QueryKeys from "~/Constants/QueryKeys";
import { cacheRecords, getAllCached } from "~/db/helpers";

const useFetchLot = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_LOT, params],
    queryFn: async () => {
      try {
        const response = await client.post(
          `/TaskAssignment/NewTaskAssignment/${params.username}/blocks/NOAH_PAAPDC/${params.phaseCode}/${params.block}/lot/only`
        );
        const data = response.data;
        // Persist for offline use
        if (Array.isArray(data) && data.length > 0) {
          await cacheRecords('lots', data);
        }
        return data;
      } catch (err) {
        // Network unavailable — serve from IndexedDB cache
        if (!navigator.onLine) {
          const cached = await getAllCached('lots');
          if (cached.length > 0) return cached;
        }
        throw err;
      }
    },
    enabled: !!params.block,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export default useFetchLot;
