import { apiRequest } from "@/api/http";
import type { User } from "@/types/api";

export function loginWithGoogle(idToken: string) {
  return apiRequest<User>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
    skipAuth: true,
  });
}
