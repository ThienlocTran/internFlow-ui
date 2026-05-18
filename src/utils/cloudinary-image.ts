export function withCloudinaryTransform(url: string | undefined, transformation: string) {
  if (!url || !url.includes("/image/upload/")) return url;
  return url.replace("/image/upload/", `/image/upload/${transformation}/`);
}
