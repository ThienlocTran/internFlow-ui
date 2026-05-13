import { apiRequest } from "@/api/http";
import type { User } from "@/types/api";

export function getUsers() {
  return apiRequest<User[]>("/users");
}

export function createProfile(payload: {
  email: string;
  fullName: string;
  studentCode?: string;
  studentClass?: string;
  school?: string;
  phone?: string;
}) {
  return apiRequest<User>("/users/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
