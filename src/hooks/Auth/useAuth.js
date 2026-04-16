import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { parseUserAgent } from "~/utils";

const useAuth = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      onSetClearToken: () => {
        set({ token: null, user: null });
      },
      onSetUserDetails: (data, token = null) => {
        // const agent = parseUserAgent(window.navigator.userAgent);
        set({
          token: token,
          user: {
            ...data,
            username: data?.username
          },
        })
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuth;
