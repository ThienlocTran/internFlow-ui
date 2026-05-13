import { apiRequest } from "@/api/http";
import type { ImageUpload } from "@/types/api";

export function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<ImageUpload>("/uploads/images", {
    method: "POST",
    body: formData,
  });
}
