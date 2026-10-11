export function gesture(dx, dy, threshold = 45) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy) * 1.2) return dx < 0 ? 'nextPage' : 'prevPage';
  if (Math.abs(dy) > Math.abs(dx) * 1.2) return dy < 0 ? 'nextChapter' : 'prevChapter';
  return null;
}
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function serverUrl(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an HTTP or HTTPS server URL without credentials.');
  url.search = ''; url.hash = '';
  return url.href.replace(/\/+$/, '').replace(/\/api\/graphql$/, '');
}
export function imageUrl(value, base) {
  if (typeof value !== 'string' || !value) return '';
  try { const url = new URL(value, base + '/'); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function orderChapters(chapters) {
  return [...chapters].sort((a, b) => b.sourceOrder - a.sourceOrder);
}
export function publicImageUrl(value) {
  if (!value) return null;
  try {const url = new URL(value);url.searchParams.delete('token');return url.href;} catch {return null;}
}
