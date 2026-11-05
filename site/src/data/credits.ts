export interface Credit {
  what: string
  by: string
  licence: string
  url: string
}

/** Shown in the footer. The 3D asset credits (Poly Haven, CC0) are added in S1 from the asset manifests. */
export const credits: Credit[] = [
  {
    what: 'Inter, Space Grotesk and JetBrains Mono fonts',
    by: 'Fontsource packages',
    licence: 'SIL OFL 1.1',
    url: 'https://fontsource.org/',
  },
]
