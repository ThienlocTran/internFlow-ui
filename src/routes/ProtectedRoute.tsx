import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { getUserById } from "@/services/user.service";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const location = useLocation();

  const meQuery = useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => getUserById(user!.id),
    enabled: Boolean(isAuthenticated && user?.id),
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      updateUser(meQuery.data);
    }
  }, [meQuery.data, updateUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
