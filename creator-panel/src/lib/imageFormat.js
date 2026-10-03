/** MangAfric creator upload targets (reader + catalog). */

export const EP_PAGE_SPEC = {
  width: 800,
  height: 1280,
  maxBytes: 2 * 1024 * 1024,
};

export const THUMB_SQUARE_SPEC = {
  width: 1080,
  height: 1080,
  maxBytes: 800 * 1024,
};

export const THUMB_VERTICAL_SPEC = {
  width: 1080,
  height: 1920,
  maxBytes: 800 * 1024,
};

/** Max size of a single source file before browser conversion. */
export const SOURCE_IMAGE_MAX_BYTES = 30 * 1024 * 1024;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;

const IMAGE_MIME_PREFIXES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/pjpeg', 'image/x-png'];

export function formatBytes(n) {
  if (typeof n !== 'number') return '';
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

export function isSupportedSourceImage(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase().trim();
  if (!type || type === 'application/octet-stream') {
    return IMAGE_EXT.test(file.name || '');
  }
  return IMAGE_MIME_PREFIXES.includes(type) || type.startsWith('image/');
}

function isHeicFile(file) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();
  return /\.(heic|heif)$/.test(name) || type === 'image/heic' || type === 'image/heif';
}

/** iPhone HEIC → JPEG when the browser cannot decode HEIC natively. */
export async function ensureBrowserDecodableFile(file) {
  if (!isHeicFile(file)) return file;
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const base = (file.name || 'photo').replace(/\.(heic|heif)$/i, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

export async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Center-crop to aspect ratio, resize, encode as JPEG under maxBytes.
 */
export async function resizeForUpload({ file, targetWidth, targetHeight, maxBytes }) {
  const decodable = await ensureBrowserDecodableFile(file);
  const img = await loadImageFromFile(decodable);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  if (!sw || !sh) throw new Error('invalid_dimensions');

  const targetAspect = targetWidth / targetHeight;
  const srcAspect = sw / sh;

  let sx = 0;
  let sy = 0;
  let sWidth = sw;
  let sHeight = sh;
  if (srcAspect > targetAspect) {
    sWidth = Math.round(sh * targetAspect);
    sx = Math.round((sw - sWidth) / 2);
  } else if (srcAspect < targetAspect) {
    sHeight = Math.round(sw / targetAspect);
    sy = Math.round((sh - sHeight) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('no_canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

  let quality = 0.9;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('toBlob_failed');

  while (blob.size > maxBytes && quality > 0.5) {
    quality = Math.max(0.5, quality - 0.08);
    // eslint-disable-next-line no-await-in-loop
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('toBlob_failed');
  }

  if (blob.size > maxBytes) {
    throw new Error('output_too_large');
  }

  const baseName = (file.name || 'page').replace(/\.[^.]+$/, '');
  const safeName = `${baseName.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 48) || 'image'}.jpg`;
  const outFile = new File([blob], safeName, { type: 'image/jpeg' });
  return { file: outFile, blob, quality, dims: { width: targetWidth, height: targetHeight } };
}

export async function normalizeEpisodePage(file) {
  return resizeForUpload({
    file,
    targetWidth: EP_PAGE_SPEC.width,
    targetHeight: EP_PAGE_SPEC.height,
    maxBytes: EP_PAGE_SPEC.maxBytes,
  });
}

export async function normalizeSeriesThumbnail(file, kind) {
  const spec = kind === 'square' ? THUMB_SQUARE_SPEC : THUMB_VERTICAL_SPEC;
  return resizeForUpload({
    file,
    targetWidth: spec.width,
    targetHeight: spec.height,
    maxBytes: spec.maxBytes,
  });
}
