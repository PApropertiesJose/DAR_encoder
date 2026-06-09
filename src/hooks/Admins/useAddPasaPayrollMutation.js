import { useMutation, useQueryClient } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useAddPasaPayrollMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params) => {
      const response = await client.post('/PasaPayroll', params) ;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.FILTER_PASAPAYROLL_ADMINS])
    }
  })
}

export default useAddPasaPayrollMutation; 
