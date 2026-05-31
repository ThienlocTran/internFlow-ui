export const IMAGE_MAX_DIMENSION = Number(import.meta.env.VITE_IMAGE_MAX_DIMENSION ?? 1280);
export const IMAGE_COMPRESSION_QUALITY = Number(import.meta.env.VITE_IMAGE_COMPRESSION_QUALITY ?? 0.7);

const DEFAULT_OUTPUT_NAME = "attendance-image";
const WEBP_MIME_TYPE = "image/webp";
const JPEG_MIME_TYPE = "image/jpeg";

export type ImageCompressionOptions = {
  maxDimension?: number;
  quality?: number;
};

export type ImageCompressionMetadata = {
  originalSizeBytes: number;
  compressedSizeBytes: number;
  outputMimeType: string;
  width: number;
  height: number;
};

export type ImageCompressionResult = {
  file: File;
  metadata: ImageCompressionMetadata;
  compressed: boolean;
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

export async function compressImageBeforeUpload(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<ImageCompressionResult> {
  if (!file.type.startsWith("image/")) {
    return originalResult(file);
  }

  const maxDimension = normalizeMaxDimension(options.maxDimension ?? IMAGE_MAX_DIMENSION);
  const quality = normalizeQuality(options.quality ?? IMAGE_COMPRESSION_QUALITY);
  const image = await loadImage(file);

  try {
    const dimensions = resizedDimensions(image.width, image.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Browser khong ho tro xu ly anh bang canvas.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, 0, 0, dimensions.width, dimensions.height);

    const outputMimeType = await preferredOutputMimeType(canvas);
    const blob = await canvasToBlob(canvas, outputMimeType, quality);
    const compressedFile = new File([blob], outputFilename(file.name, outputMimeType), {
      type: outputMimeType,
      lastModified: Date.now(),
    });

    if (compressedFile.size >= file.size) {
      return originalResult(file, dimensions.width, dimensions.height);
    }

    return {
      file: compressedFile,
      compressed: true,
      metadata: {
        originalSizeBytes: file.size,
        compressedSizeBytes: compressedFile.size,
        outputMimeType,
        width: dimensions.width,
        height: dimensions.height,
      },
    };
  } finally {
    image.cleanup();
  }
}

async function loadImage(file: File): Promise<LoadedImage> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement below for browsers/files that createImageBitmap cannot decode.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Khong the doc file anh."));
    };
    image.src = objectUrl;
  });
}

function resizedDimensions(width: number, height: number, maxDimension: number) {
  if (width <= 0 || height <= 0) {
    throw new Error("Kich thuoc anh khong hop le.");
  }

  const largestSide = Math.max(width, height);
  if (largestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function preferredOutputMimeType(canvas: HTMLCanvasElement) {
  const webpBlob = await canvasToBlob(canvas, WEBP_MIME_TYPE, 0.72);
  return webpBlob.type === WEBP_MIME_TYPE ? WEBP_MIME_TYPE : JPEG_MIME_TYPE;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Khong the nen anh."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function outputFilename(originalName: string, mimeType: string) {
  const extension = mimeType === WEBP_MIME_TYPE ? "webp" : "jpg";
  const baseName = originalName.trim()
    ? originalName.replace(/\.[^.]+$/, "")
    : DEFAULT_OUTPUT_NAME;
  return `${baseName}.${extension}`;
}

function normalizeMaxDimension(value: number) {
  return Number.isFinite(value) && value >= 640 ? Math.round(value) : 1280;
}

function normalizeQuality(value: number) {
  if (!Number.isFinite(value)) return 0.7;
  return Math.min(0.92, Math.max(0.55, value));
}

function originalResult(file: File, width = 0, height = 0): ImageCompressionResult {
  return {
    file,
    compressed: false,
    metadata: {
      originalSizeBytes: file.size,
      compressedSizeBytes: file.size,
      outputMimeType: file.type || "application/octet-stream",
      width,
      height,
    },
  };
}
