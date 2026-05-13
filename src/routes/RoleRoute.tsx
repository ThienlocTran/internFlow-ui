import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/api";

type RoleRouteProps = {
  allow: UserRole[];
};

export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
