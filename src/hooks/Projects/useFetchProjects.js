import { useQuery } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useFetchProject = (username) => {
  return useQuery({
    queryKey: [QueryKeys.PROJECT_SELECTION],
    queryFn: async () => {
      const response = await client.post(`/TaskAssignment/${username}/phases/NOAH_PAAPDC`)
      return response.data;
    }
  });
}

export default useFetchProject;
