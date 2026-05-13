import { apiRequest } from "@/api/http";
import type { RolePolicy } from "@/types/api";

export function getRolePolicies() {
  return apiRequest<RolePolicy[]>("/role-policies");
}
