export function formatBytes(n) {
  if (typeof n !== 'number') return '';
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

export function isValidAlphaNumFilename(fileName) {
  return /^[A-Za-z0-9]+\.(jpg|jpeg|png)$/i.test(fileName);
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

export async function resizeForUpload({ file, targetWidth, targetHeight, maxBytes }) {
  const img = await loadImageFromFile(file);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
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

  const outFile = new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '.jpg'), { type: 'image/jpeg' });
  return { file: outFile, blob, quality, dims: { width: targetWidth, height: targetHeight } };
}

