import { useMutation } from "@tanstack/react-query";
import client from "~/config/client";

const useValidateTaskEntriesMutation = () => {
  return useMutation({
    mutationFn: async (params) => {
      const response = await client.post('/TaskSynching', params);
      return response.data;
    }
  });
}

export default useValidateTaskEntriesMutation;
