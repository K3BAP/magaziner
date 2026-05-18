/**
 * Client-side image processing for profile pictures.
 *
 * Two entry points:
 *   - `loadImageBitmap(file)`            — decode + EXIF orientation
 *   - `encodeProfileImage(bitmap, crop)` — square-crop + downscale + JPEG-encode
 *
 * Crop region is expressed in source-image pixel coordinates so callers
 * (auto-center, manual UI) share the same encoder.
 *
 * EXIF orientation is honored via `createImageBitmap({ imageOrientation:
 * 'from-image' })` so phone photos crop the way the user sees them.
 */

export interface ProcessImageOptions {
  /** Output edge length in pixels (square). Default: 512. */
  size?: number;
  /** Target maximum byte budget. Default: 1 MB. */
  maxBytes?: number;
  /** Initial JPEG quality. Default: 0.9. */
  startQuality?: number;
  /** Minimum JPEG quality before giving up. Default: 0.4. */
  minQuality?: number;
}

export interface CropRegion {
  /** Top-left X of the crop square, in source-image pixels. */
  sx: number;
  /** Top-left Y of the crop square, in source-image pixels. */
  sy: number;
  /** Edge length of the crop square, in source-image pixels. */
  side: number;
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Bild-Konvertierung fehlgeschlagen.'))),
      type,
      quality,
    );
  });

export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // HEIC and a few exotic formats can't be decoded by the browser. Surface a
    // user-friendly error rather than the raw DOMException text.
    throw new Error('Bildformat wird nicht unterstützt. Bitte JPG, PNG oder WebP wählen.');
  }
}

/**
 * Crop, downscale, and JPEG-encode a previously-loaded bitmap.
 * Caller is responsible for `.close()`-ing the bitmap once it no longer needs it.
 */
export async function encodeProfileImage(
  bitmap: ImageBitmap,
  crop: CropRegion,
  opts: ProcessImageOptions = {},
): Promise<File> {
  const size = opts.size ?? 512;
  const maxBytes = opts.maxBytes ?? 1024 * 1024;
  const startQuality = opts.startQuality ?? 0.9;
  const minQuality = opts.minQuality ?? 0.4;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas konnte nicht initialisiert werden.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, crop.sx, crop.sy, crop.side, crop.side, 0, 0, size, size);

  // Progressive quality reduction until we fit the byte budget.
  let quality = startQuality;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  while (blob.size > maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.1);
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  return new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}

/** Convenience helper: load + center-crop + encode in one call. */
export async function processProfileImageCentered(
  file: File,
  opts?: ProcessImageOptions,
): Promise<File> {
  const bitmap = await loadImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.round((bitmap.width - side) / 2);
    const sy = Math.round((bitmap.height - side) / 2);
    return await encodeProfileImage(bitmap, { sx, sy, side }, opts);
  } finally {
    bitmap.close();
  }
}
