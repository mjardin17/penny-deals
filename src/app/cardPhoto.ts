/** Prepares a card photo: a small JPEG to send for reading, and a raster to measure centering on this device. */

import { Raster } from "../../shared/cards/centering";

const SEND_MAX_SIDE = 1280;
const MEASURE_MAX_SIDE = 720;
/** The server accepts up to about 1.2M base64 characters; stay comfortably under it. */
const MAX_BASE64_CHARS = 900_000;

/** Largest size that fits inside max x max and keeps the shape. Never scales up. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface PreparedPhoto {
  previewUrl: string;
  base64: string;
  mimeType: "image/jpeg";
  raster: Raster;
}

function draw(bitmap: ImageBitmap, max: number): HTMLCanvasElement {
  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't process photos.");
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return canvas;
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (an image file).");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const sendCanvas = draw(bitmap, SEND_MAX_SIDE);
    let quality = 0.85;
    let dataUrl = sendCanvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_BASE64_CHARS && quality > 0.4) {
      quality -= 0.15;
      dataUrl = sendCanvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length > MAX_BASE64_CHARS) throw new Error("That photo is too large even after shrinking it. Try a closer, simpler shot.");

    const measure = draw(bitmap, MEASURE_MAX_SIDE);
    const ctx = measure.getContext("2d")!;
    const pixels = ctx.getImageData(0, 0, measure.width, measure.height);
    return {
      previewUrl: dataUrl,
      base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
      mimeType: "image/jpeg",
      raster: { width: pixels.width, height: pixels.height, data: pixels.data },
    };
  } finally {
    bitmap.close();
  }
}
