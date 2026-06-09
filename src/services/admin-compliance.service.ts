import { apiRequest } from "@/api/http";
import type { AdminDailyCompliance, AdminShiftCompliance } from "@/types/api";

export function getAdminDailyCompliance(date: string) {
  return apiRequest<AdminDailyCompliance>(`/admin/compliance/daily?date=${encodeURIComponent(date)}`);
}

export function getAdminShiftCompliance(date: string, shiftId: string) {
  const params = new URLSearchParams({ date, shiftId });
  return apiRequest<AdminShiftCompliance>(`/admin/compliance/shift?${params.toString()}`);
}
