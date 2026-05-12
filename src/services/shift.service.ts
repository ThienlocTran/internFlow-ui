import { apiRequest } from "@/api/http";
import type { Shift } from "@/types/api";

export function getShifts() {
  return apiRequest<Shift[]>("/shifts");
}
