import { useMutation } from "@tanstack/react-query";
import client from "~/config/client";

const useUpdatePostTaskActivityMutation = () => {
  return useMutation({
    mutationFn: async (params) => {
      const response = await client.put('/PostTaskActivities', {
        rn: params.rn?.toString(),
        blk: params.blk,
        lot: params.lot,
        phaseCode: params.phaseCode
      });

      // the endpoint answers 200 with status:false when the update is rejected
      if (response.data?.status === false) {
        throw new Error(response.data?.errorMessage ?? 'Failed to update the post task.');
      }

      return response.data;
    }
  })
}

export default useUpdatePostTaskActivityMutation;
