const MAX_DIMENSION = 1920;
const QUALITY = 0.85;

// Downscales oversized photos (phone cameras routinely shoot 4000px+) and
// re-encodes as JPEG at a high-but-lossy quality. Keeps the original file if
// compression doesn't actually help (already small) or the browser can't
// decode it (e.g. some HEIC files) — never blocks the upload on this step.
export async function compressImage(file) {
  if (!file.type?.startsWith("image/") || file.type === "image/gif") return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } finally {
    bitmap.close?.();
  }
}

export function compressImages(files) {
  return Promise.all(files.map(compressImage));
}
