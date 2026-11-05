/**
 * Prefixes an internal path with the site's base path (`BASE_PATH`), so every runtime asset URL works under a
 * GitHub Pages project path. Absolute URLs (`https://`, `mailto:`, `//host`) are returned unchanged.
 */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path
  const prefix = base.endsWith('/') ? base : `${base}/`
  return prefix + path.replace(/^\/+/, '')
}
