import { apiRequest } from "@/api/http";
import type { ImageUpload } from "@/types/api";
import { compressImageBeforeUpload } from "@/utils/imageCompression";

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function validateImageFile(file: File) {
  if (!file) throw new Error("File ảnh là bắt buộc.");
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error("Ảnh upload không được vượt quá 8MB.");
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
  const filename = file.name.toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.some((extension) => filename.endsWith(extension))) {
    throw new Error("Tên file ảnh phải có đuôi .jpg, .jpeg, .png hoặc .webp.");
  }
}

export async function uploadImage(file: File) {
  validateImageFile(file);
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

  validateImageFile(uploadFile);

  formData.append("file", uploadFile);

  return apiRequest<ImageUpload>("/uploads/images", {
    method: "POST",
    body: formData,
  });
}
