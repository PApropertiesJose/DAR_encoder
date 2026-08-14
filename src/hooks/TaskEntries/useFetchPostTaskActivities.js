import { useQuery } from '@tanstack/react-query';
import client from '~/config/client';
import QueryKeys from '~/Constants/QueryKeys';

const useFetchPostTaskActivities = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.POST_TASK_ACTIVITIES, params],
    queryFn: async () => {
      const response = await client.get('/PostTaskActivities', { params });
      return response.data;
    },
    staleTime: 0,
    cacheTime: 0,
    enabled: !!params?.phaseCode
  });
}

export default useFetchPostTaskActivities;
