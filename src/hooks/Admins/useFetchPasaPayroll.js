import { useQuery  } from "@tanstack/react-query"
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useFetchPasaPayroll = () => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_PASAPAYROLL_ADMINS],
    queryFn: async () => {
      const response = await client.get('/PasaPayroll');
      return response.data;
    }
  }) 

} 

export default useFetchPasaPayroll;
