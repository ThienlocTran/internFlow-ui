import { apiRequest } from "@/api/http";
import type { ImageUpload } from "@/types/api";
import { compressImageBeforeUpload } from "@/utils/imageCompression";

export async function uploadImage(file: File) {
  const formData = new FormData();
  let uploadFile = file;

  try {
    const result = await compressImageBeforeUpload(file);
    uploadFile = result.file;

    if (import.meta.env.DEV) {
      console.debug("[InternFlow] image upload compression", {
        compressed: result.compressed,
        ...result.metadata,
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[InternFlow] image compression skipped, uploading original file", error);
    }
  }

  formData.append("file", uploadFile);

  return apiRequest<ImageUpload>("/uploads/images", {
    method: "POST",
    body: formData,
  });
}
