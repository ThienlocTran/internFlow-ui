import { apiRequest } from "@/api/http";
import type { AdminDailyCompliance } from "@/types/api";

export function getAdminDailyCompliance(date: string) {
  return apiRequest<AdminDailyCompliance>(`/admin/compliance/daily?date=${encodeURIComponent(date)}`);
}