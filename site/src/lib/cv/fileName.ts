/** Kept apart from model.ts so the eager download script does not pull the site data into the page bundle. */
export function cvFileName(m: { name: string }): string {
  return `${(m.name || 'CV').trim().replace(/\s+/g, '_')}_CV`
}
