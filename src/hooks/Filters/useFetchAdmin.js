import { useQuery } from '@tanstack/react-query';
import client from '~/config/client';
import QueryKeys from '~/Constants/QueryKeys';

const useFetchAdmin = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.FILTER_ADMIN, params],
    queryFn: async () => {
      const response = await client.post(`/TaskAssignment/${params.username}/workers/NOAH_PAAPDC/${params.phaseCode}`);
      return response.data;
    }
  });

}

export default useFetchAdmin;
