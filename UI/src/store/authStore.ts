import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role, User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    token: string,
    id: string,
    name: string,
    role: string,
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (
        email: string,
        token: string,
        id: string,
        name: string,
        role: string,
      ) => {
        return set({
          isAuthenticated: true,
          user: {
            id,
            email,
            name,
            token,
            role: role as Role,
          },
        });
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
