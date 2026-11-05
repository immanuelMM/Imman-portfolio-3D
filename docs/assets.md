# immanuel-3d assets and measurements

This file records every asset, its licence and the measured sizes, up to S3 (polish, posters, budgets).

## Content
| Asset | Source | Licence | Use |
|---|---|---|---|
| `site/src/assets/ai/*.svg` (6) | user's own (AI_Porfolio `images/ai/`) | owned | AI project cards (HTML) |
| `site/src/assets/profile.jpg` | user's own (AI_Porfolio `profile.JPG`) | owned | hero photo (HTML only, `astro:assets` `Picture` AVIF/WebP, 2 sizes). Never on the CV. |
| `site/public/favicon.svg` | written for this project | owned | favicon |
| `site/public/og.png` | `scripts/capture-poster.mjs` (a real frame of the scene plus the name and title set in SVG) | owned | Open Graph / Twitter image, 1200x630 |
| `site/public/poster/poster-hero-{desktop,tablet,phone}.webp` | `scripts/capture-poster.mjs` (reduced-motion still of the About frame) | owned | first picture, no-WebGL fallback and context-loss picture |

## Fonts (`@fontsource-variable`, SIL OFL 1.1)
Inter Variable (body), Space Grotesk Variable (headings), JetBrains Mono Variable (chips, dates, labels). Latin subset
woff2 only.

## Bundle sizes (M2, built with `BASE_PATH=/immanuel-3d/`)
| Chunk | Raw | Gzip | Budget (plan §5) |
|---|---|---|---|
| Eager page script (gate, active section, nav menu, CV download) | 6.6 KB | 2.9 KB | <= 60 KB |
| Lazy scene chunk (React + R3F + three + drei; M0 placeholder room) | 1,116 KB | 300 KB | <= 400 KB |
| CV Word chunk (`docx` 9.15.2, loaded on the first Word click) | 212 KB | **62 KB** | <= 200 KB (R4 measured: fine, no Node polyfills needed) |

The `docx` package runs in the browser as is: the Word export is verified in Chrome by `site/e2e/cv.spec.mjs` (download
`Immanuel_Mahusay_CV.docx`, 16 KB) and in Node by `cv.privacy.test.ts`.

## 3D assets (S1)
All Poly Haven files are CC0 1.0 (no credit required; credited in the footer anyway). Raw downloads live in the git-ignored
`assets-raw/polyhaven/<id>/` (MD5 verified by `scripts/fetch-polyhaven.mjs`, `assets-raw/lock.json`). Shipped files are built by
`scripts/build-models.mjs` and `scripts/build-textures.mjs` and listed in `public/models/manifest.json` and
`public/textures/manifest.json`; the footer credits and `assets.manifest.test.ts` read those manifests.

### Textures (`public/textures/`, WebP; desktop base 1024/512, phone one step down; normal and ORM maps half the base size)
| Name | Poly Haven asset | Author | Used for | Desktop KB | Phone KB |
|---|---|---|---|---|---|
| `floor-*` | [metal_plate_02](https://polyhaven.com/a/metal_plate_02) | Rob Tuytel | raised-floor tiles (its panel seams read as tiles) | 77 | 22 |
| `wall-*` | [factory_wall](https://polyhaven.com/a/factory_wall) | Rob Tuytel | back and side walls (corrugated panels) | 8 | 3 |
| `plate-*` | [metal_plate](https://polyhaven.com/a/metal_plate) | Rob Tuytel | rack bodies, console, panel bases, ceiling steel | 34 | 10 |

Build-time grading: the raw scans are rusty and saturated, so each diffuse map is desaturated to 0.1-0.12 and multiplied by a
blue-grey tint (`build-textures.mjs`). Total 119 KB desktop / 35 KB phone. `concrete_floor_painted` was downloaded and
rejected (grimy, brown); its raw files are not shipped.

### Models (`public/models/{desktop,phone}/`, Meshopt + WebP)
| File | Poly Haven asset | Author | Raw tris | Desktop (KB / tris) | Phone (KB / tris) | Where |
|---|---|---|---|---|---|---|
| `camera.glb` | [security_camera_01](https://polyhaven.com/a/security_camera_01) | Alexander Otterbeck, Yann Kervran | 13,571 | 64 / 3,001 | 38 / 1,501 | back wall, high right |
| `powerbox.glb` | [power_box_01](https://polyhaven.com/a/power_box_01) | Rico Cilliers, Yann Kervran | 21,272 | 98 / 4,019 | 94 / 3,941 | back wall, left |
| `extinguisher.glb` | [korean_fire_extinguisher_01](https://polyhaven.com/a/korean_fire_extinguisher_01) | UM JOORIN | 9,913 | 73 / 2,997 | 44 / 1,496 | back wall, right |
| `firealarm.glb` | [fire_alarm](https://polyhaven.com/a/fire_alarm) | Slinc | 2,705 | 43 / 1,999 | 32 / 1,015 | back wall, right |
| `utilitybox.glb` | [utility_box_01](https://polyhaven.com/a/utility_box_01) | James Ray Cock | 4,404 | 51 / 3,000 | 31 / 1,500 | back corners (2 instances) |

Dropped: `modular_airduct_rectangular_01` (a loose kit of duct segments: simplified to 6.8k tris it read as floating
junk under the ceiling, 212 KB). Not fetched (not needed in the hero): `utility_box_02`,
`metal_office_desk`, `modular_electric_cables` (S2 can pull them for the education corner).

### Written for this project (0 KB, drawn or built at runtime)
Rack bodies, rack front texture and its derived normal map (`rackTexture.ts`), status LEDs (`leds.ts`, shader blink), the seven
agent panels (glass slab, hologram shader `holoMaterial.ts`, face canvas `panelCanvas.ts`), console and monitors
(`consoleTextures.ts`), ceiling beams, cable-tray rungs and light strips, light shafts (`Haze.tsx`), the procedural
reflection environment (`Environment.tsx`, no HDRI). The agent glyphs are drawn strokes, not third-party icons.

## First-frame budget (S1, measured)
| | Desktop (high) | Touch (portrait tablet) | Phone (low) | Budget |
|---|---|---|---|---|
| Models + textures shipped for the first frame | 447 KB (328 + 119) | 447 KB | 274 KB (239 + 35) | 1.5 MB / 800 KB |
| Draw calls per frame (`gl.info`, incl. shadow and mirror passes) | 120 | 51 | 52 | 120 / 70 |
| Triangles per frame | 53,026 | 27,078 | 9,927 | 100k / 60k |
| Lazy scene chunk (gzip) | 338.9 KB | same | same | 400 KB |
| Bloom chunk (gzip, high only) | 23.8 KB | not loaded | not loaded | 30 KB |
| Eager JS (gzip) | 2.8 KB | same | same | 60 KB |

How draw calls were read: `gl.info.autoReset = false`, `reset()` on one rAF, read on the next. The high-tier figure includes the
reflector floor's mirror pass, the shadow pass and the bloom passes; the touch and phone tiers have no mirror or bloom. Triangle
counts are for the same frame. (A dev-only handle on `window` was used for the measurement and removed before commit.)
Time to `ready` with software WebGL (swiftshader, 1280x800): 33 s, mostly shader compilation; a real GPU is far faster.

## S3: posters, budgets, polish (measured)
- **Posters** (`npm run poster`, built site served by `npm run preview`): desktop 1920x1080 (high tier, 117 KB), tablet 820x1180
  (touch tier, 87 KB), phone 750x1334 (low tier, 60 KB); each at the highest WebP quality under 120 KB. The tier is pinned with
  `?tier=` and the page UI, the poster layer and the CSS vignette are hidden for the capture. Poster against the canvas it fades
  into (`node scripts/poster-diff.mjs`, mean absolute difference, 0-255): 1440x900 2.8, 1280x720 2.8, 820x1180 1.4, 390x844 1.9,
  375x667 2.0 (plan limit 4). That needed the landscape camera shift to be a fraction of the viewport height
  (`SHIFT_REF_ASPECT`), not of the width.
- **Budgets** (`npm run budget`; `-- --static` skips the browser): eager JS 4.3 KB, scene chunks 356 KB (400), bloom 24.3 KB (30),
  docx 63.9 KB (200) gzip; first frame 458 KB desktop / 280 KB phone; detail groups 19.7 / 7.5 KB; posters as above. One frame per
  chapter in software WebGL, draw calls (limit 120 desktop / 70 phone) and triangles (100k / 60k), counted by wrapping the
  WebGL draw methods (no hook in the app):

  | Chapter | Desktop calls | Desktop tris | Phone calls | Phone tris |
  |---|---|---|---|---|
  | About (hero) | 107 | 36,650 | 46 | 12,943 |
  | Experience | 71 | 20,152 | 30 | 13,735 |
  | AI | 100 | 31,475 | 45 | 12,859 |
  | Web | 97 | 28,037 | 35 | 9,876 |
  | Education | 96 | 25,613 | 42 | 15,367 |
  | Contact (overview) | 115 | 36,726 | 56 | 20,937 |

  Before S3 the hero was 122 and the Contact overview 131 calls on the high tier. Small wall props, ceiling steel (not the light
  strips) and the light shafts moved to a layer the mirror floor's camera does not draw (`layers.ts`): about 17 calls fewer.
  The console's new hardware (trim, cable tray, keyboard, mouse, panel seams, vents) is one merged geometry plus one cable
  InstancedMesh, so it costs 2 calls. `?tier=high|touch|low` pins a tier (QA, budgets, posters).
