import { apiAssetUrl } from '../../../services/api.js';

export function normalizeSeriesTitle(t) {
  return String(t || '').trim().toLowerCase();
}

export function resolveStoredImageUrl(asset) {
  if (!asset || typeof asset !== 'object') return '';
  const url = asset.url;
  if (url) return apiAssetUrl(url);
  const key = asset.r2Key || asset.key;
  if (key) return apiAssetUrl(`/api/v1/storage/${String(key).replace(/^\//, '')}`);
  const dataUrl = asset.dataUrl;
  if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) return dataUrl;
  return '';
}

export function submissionSquareThumb(payload) {
  const thumbs = payload?.thumbnails;
  if (!thumbs) return '';
  return resolveStoredImageUrl(thumbs.square);
}

export function submissionVerticalThumb(payload) {
  const thumbs = payload?.thumbnails;
  if (!thumbs) return '';
  return resolveStoredImageUrl(thumbs.vertical);
}

export function episodePageUrls(images) {
  if (!Array.isArray(images)) return [];
  return images.map((img) => resolveStoredImageUrl(img)).filter(Boolean);
}

export function episodesForSeriesTitle(episodes, seriesTitle) {
  const want = normalizeSeriesTitle(seriesTitle);
  if (!want) return [];
  return episodes.filter((ep) => normalizeSeriesTitle(ep.seriesTitle) === want);
}
