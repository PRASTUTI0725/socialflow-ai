// Central content utility for hashtag normalization
export function normalizeHashtags(raw: string | string[]): string[] {
  const source = Array.isArray(raw) ? raw.join(' ') : (raw || '');
  return source
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .map(t => (t.startsWith('#') ? t : `#${t}`))
    .filter((v, i, a) => a.indexOf(v) === i);
}
