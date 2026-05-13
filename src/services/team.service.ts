import { apiRequest } from "@/api/http";
import type { ShiftPeer } from "@/types/api";

export function getLeaderShiftPeers(leaderId: string, date: string) {
  return apiRequest<ShiftPeer[]>(`/teams/leader-shift-peers?leaderId=${leaderId}&date=${date}`);
}
