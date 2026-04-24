import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useUpdateBadgeNumberAdminMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params) => {
      const response = await client.post(`/Badge/${params.username}`, params.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.BADGE_ADMINS]);
    }
  });
}

export default useUpdateBadgeNumberAdminMutation;
