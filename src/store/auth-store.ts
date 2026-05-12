import { create } from "zustand";
import type { User, UserRole } from "@/types/api";

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithGoogle: () => void;
  loginWithEmail: (email: string) => void;
  loginAsDemo: (role?: UserRole) => void;
  logout: () => void;
};

const ADMIN_EMAIL = "tranthienloc21102005@gmail.com";

const demoUsers: Record<UserRole, User> = {
  INTERN: {
    id: "demo-intern",
    email: "intern@internflow.app",
    fullName: "Nguyen Minh Anh",
    studentCode: "SV001",
    school: "FPT Polytechnic",
    role: "INTERN",
    active: true,
  },
  TEAM_LEADER: {
    id: "demo-leader",
    email: "leader@internflow.app",
    fullName: "Tran Nhat Khang",
    studentCode: "SV009",
    school: "FPT Polytechnic",
    role: "TEAM_LEADER",
    active: true,
  },
  ADMIN: {
    id: "demo-admin",
    email: ADMIN_EMAIL,
    fullName: "Tran Thien Loc",
    role: "ADMIN",
    active: true,
  },
  MANAGER: {
    id: "demo-manager",
    email: "manager@internflow.app",
    fullName: "Company Manager",
    role: "MANAGER",
    active: true,
  },
};

const storedUser = localStorage.getItem("internflow.user");
const storedToken = localStorage.getItem("internflow.token");

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  token: storedToken,
  isAuthenticated: Boolean(storedUser && storedToken),
  loginWithGoogle: () => {
    const user = demoUsers.ADMIN;
    localStorage.setItem("internflow.user", JSON.stringify(user));
    localStorage.setItem("internflow.token", "demo-google-token");
    set({ user, token: "demo-google-token", isAuthenticated: true });
  },
  loginWithEmail: (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user =
      normalizedEmail === ADMIN_EMAIL
        ? demoUsers.ADMIN
        : { ...demoUsers.INTERN, email: normalizedEmail };
    localStorage.setItem("internflow.user", JSON.stringify(user));
    localStorage.setItem("internflow.token", `demo-${user.role.toLowerCase()}-token`);
    set({ user, token: `demo-${user.role.toLowerCase()}-token`, isAuthenticated: true });
  },
  loginAsDemo: (role = "INTERN") => {
    const user = demoUsers[role];
    localStorage.setItem("internflow.user", JSON.stringify(user));
    localStorage.setItem("internflow.token", `demo-${role.toLowerCase()}-token`);
    set({ user, token: `demo-${role.toLowerCase()}-token`, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("internflow.user");
    localStorage.removeItem("internflow.token");
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
