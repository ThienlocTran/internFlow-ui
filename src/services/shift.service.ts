import { apiRequest } from "@/api/http";
import type { Shift, ShiftPayload } from "@/types/api";

export function getShifts() {
  return apiRequest<Shift[]>("/shifts");
}

export function getAdminShifts() {
  return apiRequest<Shift[]>("/shifts?includeInactive=true");
}

export function createShift(payload: ShiftPayload) {
  return apiRequest<Shift>("/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateShift(shiftId: string, payload: ShiftPayload) {
  return apiRequest<Shift>(`/shifts/${shiftId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function updateShiftActive(shiftId: string, active: boolean) {
  return apiRequest<Shift>(`/shifts/${shiftId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}
