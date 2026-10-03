import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const ARCHIVE_MAX_BYTES = 150 * 1024 * 1024;
export const PDF_MAX_BYTES = 80 * 1024 * 1024;

const IMAGE_NAME = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function isArchiveFile(file) {
  if (!file) return false;
  const n = (file.name || '').toLowerCase();
  const t = (file.type || '').toLowerCase();
  return n.endsWith('.zip') || n.endsWith('.cbz') || t === 'application/zip' || t === 'application/x-cbz';
}

export function isPdfFile(file) {
  if (!file) return false;
  const n = (file.name || '').toLowerCase();
  return n.endsWith('.pdf') || (file.type || '').toLowerCase() === 'application/pdf';
}

async function imagesFromZip(file) {
  const zip = await JSZip.loadAsync(file);
  const entries = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    if (path.includes('__MACOSX/') || path.startsWith('.')) return;
    const base = path.split('/').filter(Boolean).pop() || path;
    if (base.startsWith('.')) return;
    if (!IMAGE_NAME.test(base)) return;
    entries.push({ path, entry, base });
  });
  entries.sort((a, b) => naturalCompare(a.path, b.path));

  const files = [];
  for (const { entry, base } of entries) {
    const blob = await entry.async('blob');
    files.push(new File([blob], base, { type: blob.type || 'application/octet-stream' }));
  }
  return files;
}

async function imagesFromPdf(file) {
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const files = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) continue;
    const label = `page-${String(pageNum).padStart(3, '0')}.jpg`;
    files.push(new File([blob], label, { type: 'image/jpeg' }));
  }

  return files;
}

/**
 * Turn a FileList (images, ZIP/CBZ, PDF) into a flat list of image files + errors.
 */
export async function expandEpisodeImportFiles(fileList) {
  const list = Array.from(fileList ?? []);
  const expanded = [];

  for (const file of list) {
    if (isArchiveFile(file)) {
      if (file.size > ARCHIVE_MAX_BYTES) {
        expanded.push({ kind: 'error', name: file.name, message: 'Archive trop lourde (max 150MB).' });
        continue;
      }
      try {
        const imgs = await imagesFromZip(file);
        if (imgs.length === 0) {
          expanded.push({ kind: 'error', name: file.name, message: 'Aucune image dans l’archive.' });
        } else {
          for (const img of imgs) expanded.push({ kind: 'file', file: img, from: file.name });
        }
      } catch {
        expanded.push({ kind: 'error', name: file.name, message: 'Archive illisible.' });
      }
      continue;
    }

    if (isPdfFile(file)) {
      if (file.size > PDF_MAX_BYTES) {
        expanded.push({ kind: 'error', name: file.name, message: 'PDF trop lourd (max 80MB).' });
        continue;
      }
      try {
        const imgs = await imagesFromPdf(file);
        if (imgs.length === 0) {
          expanded.push({ kind: 'error', name: file.name, message: 'PDF sans pages exportables.' });
        } else {
          for (const img of imgs) expanded.push({ kind: 'file', file: img, from: file.name });
        }
      } catch {
        expanded.push({ kind: 'error', name: file.name, message: 'PDF illisible.' });
      }
      continue;
    }

    expanded.push({ kind: 'file', file });
  }

  return expanded;
}
