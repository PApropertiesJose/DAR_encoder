import { useQuery } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useFetchBlock = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_BLOCK, params],
    queryFn: async () => {
      const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/blocks/NOAH_PAAPDC/${params.phaseCode}/only`)
      return response.data;
    }
  });
}

export default useFetchBlock;
