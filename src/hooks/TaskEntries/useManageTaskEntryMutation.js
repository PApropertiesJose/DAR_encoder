import { useMutation } from "@tanstack/react-query"
import client from "~/config/client";

const useManageTaskEntryMutation = () => {
  return useMutation({
    mutationFn: async (params) => {
      const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/task-assignment/dar/entry`, params) ;
      return response.data;
    }
  });
}

export default useManageTaskEntryMutation
