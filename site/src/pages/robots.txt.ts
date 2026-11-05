import type { APIRoute } from 'astro'
import { robotsTxt } from '../lib/seo'

/** Generated so the sitemap URL follows SITE_URL and BASE_PATH instead of a hard-coded host. */
export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(site ?? new URL('http://localhost'), import.meta.env.BASE_URL), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
