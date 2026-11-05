# immanuel-3d design

Source of truth for tokens: `site/src/styles/tokens.css`. Concept and chapter table: plan §1
(`docs/plan/immanuel-3d-plan.md`).

## Concept
A dark, photoreal server/control room at night. Seven holographic glass panels (one per AI agent) stand in an arc
behind an operator console. Rack aisles, blinking LEDs, cold haze. Native scroll moves the camera through six chapters.
All content is HTML on translucent scrim panels over the fixed scene.

## Tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | `#07090d` | room, page background |
| `--surface` / `--surface-2` | `#0d1218` / `#121922` | cards, nav sheet, buttons |
| `--line` | `#26323f` | borders |
| `--text` | `#e6edf3` | body text |
| `--muted` | `#9fb1c2` | secondary text |
| `--cyan` | `#5ee7ff` | holo accent: links, chips, primary CTA |
| `--amber` | `#ffb547` | status LEDs, focus ring |
| `--on-cyan` / `--on-amber` | `#031318` / `#1c1100` | text on the accents |
| `--panel` | surface at 88% | scrim behind every card |

Fonts (all OFL, `@fontsource-variable`): Space Grotesk (headings), Inter (body), JetBrains Mono (chips, dates, labels).
Touch sizes: control 56 px, primary 64 px, never below 48 px; gaps 12 px; gutters 16 / 32 / 56 px.

## Contrast (computed WCAG ratios, all >= 4.5:1)
text on surface 15.9 · muted on surface 8.5 · muted on surface-2 8.0 · cyan on surface 12.9 · on-cyan on cyan 12.9 ·
on-amber on amber 10.6.

## Chapters
| `section#id` | Content | Camera / scene |
|---|---|---|
| `#about` | name, title, availability, photo, about, skills, AI skills, languages, CTAs | wide establishing shot, Lead panel brightest |
| `#experience` | 4 roles as a timeline | dolly left along the rack aisle |
| `#ai` | 6 AI cards + 7-agent workflow strip | push in to the agent arc, panels light in workflow order |
| `#web` | 4 web systems + 5 static sites | pan right into the second aisle |
| `#education` | 3 education entries, 3 certifications | crane up to the archive display |
| `#contact` | emails, phone, GitHub, city, Download CV | pull back to an overview, panels dim, haze thickens |

## Layout per device
- Desktop and landscape (>= 1024 wide): inline nav, content column on the left (~40%) on a blurred scrim, scene subject right.
- Tablet portrait and phone: top bar (name + menu button, sheet with the six links); cards from mid-screen down with a
  >= 40 vh gap between chapters so the room shows; document scroll is kept.

## Scene tiers
`high` (desktop, landscape tablet: MSAA, shadows, reflector floor, bloom), `touch` (portrait tablet: no bloom/reflector,
DPR <= 1.5), `low` (phone < 640: no shadows, fewer LEDs, smaller maps). See `site/src/lib/quality.ts`.

## States
`#scene[data-scene-state]` is `loading | ready | still | poster | lost`; `#scene[data-chapter]` is the current chapter;
`#scene[data-faded]` is true past the contact section. M0's scene is a temporary placeholder room; the real room is S1.
