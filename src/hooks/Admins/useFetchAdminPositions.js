import { useQuery } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";


const useFetchAdminPosition = () => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_ADMIN_POSITIONS],
    queryFn: async () => {
      const response = await client.get('/PasaPayroll/Positions');
      return response.data;
    },
  });
}

export default useFetchAdminPosition;

