import { useQuery  } from "@tanstack/react-query";
import client from "~/config/client";
import QueryKeys from "~/Constants/QueryKeys";

const useFetchAdmins = (params) => {
  return useQuery({
    queryKey: [QueryKeys.BADGE_ADMINS, params],
    queryFn: async () => {
      const response = await client.get(`/Badge/${params.username}/${params.phaseCode}`);
      return response.data;
    }
  })

}

export default useFetchAdmins;
