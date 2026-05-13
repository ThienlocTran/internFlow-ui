import { apiRequest } from "@/api/http";
import type { ScheduleCapacity, ScheduleRegistration } from "@/types/api";

export type ScheduleRegistrationPayload = {
  userId: string;
  scheduleDate: string;
  shiftIds: string[];
  note?: string;
};

export function registerSchedule(payload: ScheduleRegistrationPayload) {
  return apiRequest<ScheduleRegistration[]>("/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getUserSchedule(userId: string, startDate: string, endDate: string) {
  return apiRequest<ScheduleRegistration[]>(
    `/schedules?userId=${userId}&startDate=${startDate}&endDate=${endDate}`,
  );
}

export function getScheduleCapacity(startDate: string, endDate: string) {
  return apiRequest<ScheduleCapacity[]>(`/schedules/capacity?startDate=${startDate}&endDate=${endDate}`);
}

export function cancelSchedule(registrationId: string) {
  return apiRequest<ScheduleRegistration>(`/schedules/${registrationId}`, {
    method: "DELETE",
  });
}
