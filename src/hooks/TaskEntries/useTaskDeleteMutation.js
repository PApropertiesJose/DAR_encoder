
import { useMutation } from "@tanstack/react-query";
import client from "~/config/client";

const useTaskDeleteMutation = () => {
    return useMutation({
        mutationFn: async (params) => {
            const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/task-assignment/dar/delete/${params.rn}`);
            return response.data;
        },
    });
}

export default useTaskDeleteMutation;