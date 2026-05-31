import type { SyntheticEvent } from "react";

type ImageLike = {
  imageUrl?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
} | string | null | undefined;

const THUMBNAIL_TRANSFORMATION = "c_limit,w_400,q_auto,f_auto";

export function withCloudinaryTransform(url: string | undefined, transformation: string) {
  if (!url || !url.includes("/image/upload/")) return url;
  return url.replace("/image/upload/", `/image/upload/${transformation}/`);
}

export function getFullImageUrl(image: ImageLike) {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  return image.imageUrl ?? image.url ?? undefined;
}

export function getThumbnailUrl(image: ImageLike) {
  if (!image) return undefined;
  if (typeof image !== "string" && image.thumbnailUrl) return image.thumbnailUrl;
  const fullUrl = getFullImageUrl(image);
  return withCloudinaryTransform(fullUrl, THUMBNAIL_TRANSFORMATION) ?? fullUrl;
}

export function getImageDisplayUrl(image: ImageLike) {
  return getThumbnailUrl(image) ?? getFullImageUrl(image);
}

export function fallbackToFullImage(event: SyntheticEvent<HTMLImageElement>, fullUrl: string) {
  if (event.currentTarget.src === fullUrl) return;
  event.currentTarget.onerror = null;
  event.currentTarget.src = fullUrl;
}
