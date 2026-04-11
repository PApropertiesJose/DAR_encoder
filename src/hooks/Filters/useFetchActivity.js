import { useQuery } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useFetchActivity = ({
  params
}) => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_ACTIVITIES, params],
    queryFn: async () => {
      const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/tasks/${params.constructionIndex}`, params);
      return response.data;
    },
    enabled: false,
  });

}

export default useFetchActivity;
