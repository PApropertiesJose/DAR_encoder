import { useMutation } from "@tanstack/react-query";
import client from "~/config/client";

const useUpdateStatusPasaPayrollMutation = () => {
  return useMutation({
    mutationFn: async (params) => {
      const response = await client.put("/PasaPayroll", null, {
        params: {
          EmpseriesId: params.empseriesId,
          username: params.username,
        },
      });
      return response.data;
    }

  });
}

export default useUpdateStatusPasaPayrollMutation;
