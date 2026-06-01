import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/services/dashboard.service";

export function useDashboardSummary(includeUsers = false) {
  return useQuery({
    queryKey: ["dashboard-summary", includeUsers],
    queryFn: () => getDashboardSummary(includeUsers),
  });
}
