import { useMutation } from "@tanstack/react-query";
import client from "~/config/client";

const useManageTaskUpdateMutation = () => {
    return useMutation({
        mutationFn: async (params) => {
            const response = await client.post(`/TaskAssignment/NewTaskAssignment/${params.username}/task-assignment/dar/update`, params.rns);
            return response.data;
        }
    })
}

export default useManageTaskUpdateMutation;
