import { create } from "zustand";
import type { User } from "@/types/api";

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (user: User, token?: string) => void;
  logout: () => void;
};

const storedUser = localStorage.getItem("internflow.user");
const storedToken = localStorage.getItem("internflow.token");

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  token: storedToken,
  isAuthenticated: Boolean(storedUser && storedToken),
  setSession: (user, token = "local-session") => {
    localStorage.setItem("internflow.user", JSON.stringify(user));
    localStorage.setItem("internflow.token", token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("internflow.user");
    localStorage.removeItem("internflow.token");
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
