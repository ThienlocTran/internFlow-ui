import { apiRequest } from "@/api/http";
import type { User } from "@/types/api";

export function getUsers() {
  return apiRequest<User[]>("/users");
}

export function getUserById(id: string) {
  return apiRequest<User>(`/users/${id}`);
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

export function updateProfile(
  id: string,
  payload: {
    email: string;
    fullName: string;
    studentCode?: string;
    studentClass?: string;
    school?: string;
    phone?: string;
  },
) {
  return apiRequest<User>(`/users/${id}/profile`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
