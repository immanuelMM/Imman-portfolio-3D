import modelManifest from '../../public/models/manifest.json'
import textureManifest from '../../public/textures/manifest.json'

export interface Credit {
  what: string
  by: string
  licence: string
  url: string
}

interface ManifestEntry {
  title: string
  author: string
  licence: string
  source: string
}

/** One credit per distinct source asset (a texture set has three maps and two sizes). */
export function creditsFrom(entries: ManifestEntry[]): Credit[] {
  const seen = new Map<string, Credit>()
  for (const e of entries) {
    if (!/^https:/.test(e.source) || seen.has(e.source)) continue
    seen.set(e.source, {
      what: `${e.title} (Poly Haven)`,
      by: e.author,
      licence: e.licence === 'CC0-1.0' ? 'CC0 1.0' : e.licence,
      url: e.source,
    })
  }
  return [...seen.values()]
}

/** Shown in the footer: the fonts plus every 3D asset, read from the build manifests so the list cannot drift. */
export const credits: Credit[] = [
  {
    what: 'Inter, Space Grotesk and JetBrains Mono fonts',
    by: 'Fontsource packages',
    licence: 'SIL OFL 1.1',
    url: 'https://fontsource.org/',
  },
  ...creditsFrom([...modelManifest.models, ...textureManifest.textures] as ManifestEntry[]),
]
