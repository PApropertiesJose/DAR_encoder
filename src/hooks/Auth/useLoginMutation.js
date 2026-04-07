import { useMutation } from "@tanstack/react-query";
import client from "~/config/client";

const useLoginMutation = () => {
  return useMutation({
    mutationFn: async (params) => {
      return client.post('/ldap/authenticate', params);
    },
    onSuccess: () => {},
  })

}

export default useLoginMutation;
