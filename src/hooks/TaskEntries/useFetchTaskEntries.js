import { useQuery } from '@tanstack/react-query';
import client from '~/config/client';
import QueryKeys from '~/Constants/QueryKeys';

const useFetchTaskEntries = ({ params }) => {
  return useQuery({
    queryKey: [QueryKeys.TASK_ENTRIES, params],
    queryFn: async () => {
      const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/task-assignment/dar/load`, params)
      return response.data;
    },
    staleTime: 0,
    cacheTime: 0,
    enabled: !!params?.schedDate
  });
}

export default useFetchTaskEntries;
