import { apiRequest } from "@/api/http";
import type { ShiftPeer, TeamMemberFullDetail } from "@/types/api";

export function getLeaderShiftPeers(leaderId: string, date: string) {
  const params = new URLSearchParams({ leaderId });
  if (date) params.set("date", date);
  return apiRequest<ShiftPeer[]>(`/teams/leader-shift-peers?${params.toString()}`);
}

export function getTeamMemberFullDetail(leaderId: string, memberId: string, date: string) {
  const params = new URLSearchParams({ leaderId, memberId });
  if (date) params.set("date", date);
  return apiRequest<TeamMemberFullDetail>(`/teams/member-full-detail?${params.toString()}`);
}
