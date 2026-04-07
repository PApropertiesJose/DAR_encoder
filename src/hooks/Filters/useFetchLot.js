import { useQuery } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useFetchLot = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_LOT, params],
    queryFn: async () => {
      const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/blocks/NOAH_PAAPDC/${params.phaseCode}/${params.block}/lot/only`)
      return response.data;
    },
    enabled: !!params.block,
  });
}

export default useFetchLot;
