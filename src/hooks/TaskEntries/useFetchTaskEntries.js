import { useQuery } from '@tanstack/react-query';
import client from '~/config/client';

const useFetchTaskEntries = ({ params }) => {
    return useQuery({
        queryKey: [],
        queryFn: async () => {
            const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/task-assignment/dar/load`, params)
            return response.data;
        }
    });
}

export default useFetchTaskEntries;