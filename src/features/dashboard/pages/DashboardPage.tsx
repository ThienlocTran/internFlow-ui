import { useAuthStore } from "@/store/auth-store";
import { AdminDashboardPage } from "@/features/dashboard/pages/AdminDashboardPage";
import { InternDashboardPage } from "@/features/dashboard/pages/InternDashboardPage";
import { TeamLeaderDashboardPage } from "@/features/dashboard/pages/TeamLeaderDashboardPage";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === "ADMIN") {
    return <AdminDashboardPage />;
  }

  if (user?.role === "TEAM_LEADER") {
    return <TeamLeaderDashboardPage />;
  }

  return <InternDashboardPage />;
}
