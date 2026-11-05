# immanuel-3d — AI Agent Command Center: Implementation Plan

> **For agentic workers:** execute milestone by milestone (one agent run each), task by task. Steps use checkbox
> (`- [ ]`) syntax. Workspace rules (`full-stack-agent/CLAUDE.md`) win over this file: stage and commit only your own
> paths (`git add site && git commit -m "…" -- site`), never push.

- **App name:** immanuel-3d
- **Type:** static website — 3D landing page (`web-3d-landing` skill)
- **Folder:** `C:\Users\merin\AI\Agentic-fullstack-web-dev\immanuel-3d\` → `site/` (Astro), `docs/`
- **Planned:** 2026-11-05 by research-planner. Wiki: [apps/immanuel-3d](../../../full-stack-agent/.claude/wiki/apps/immanuel-3d.md)

**Goal:** Rebuild the AI_Porfolio CV site as a photoreal 3D "AI agent command center". All content is HTML. Native
scroll moves the camera through six chapters. The site keeps the clean Download CV (PDF and Word).

**Architecture:** Astro static site with all content from typed TS data files. A tiny eager vanilla gate picks
`poster | still | ready` and `import()`s one lazy R3F scene that mounts React itself. This is copied from
vibes-portfolio, the newest version of the [3D landing page](../../../full-stack-agent/.claude/wiki/features/3d-landing-page.md)
recipe. The CV is rendered **at build time** into a hidden print-only container. PDF = `window.print()`. Word =
lazy-loaded `docx` package.

**Tech stack:** see §6. **Spec:** this file (design in §1–§5; the user's answers are in the lead's brief of 2026-11-05).

---

## Global Constraints
- Content comes only from `ori-portfolio/AI_Porfolio/app.js` `DEFAULT_DATA` (and the `images/ai/*.svg`, `profile.JPG`
  files). Do not copy `AUTH`, `projects` (legacy list), `link-linkedin` or `link-twitter`, `moduleVisibility` or the
  admin, import/export or chat features.
- The CV never contains: the photo, the street address (`P2-B2-L35 Highview`), the birth date (`Dec 24, 1991`) or the
  nationality line (`Filipino  •  …`). "Filipino (Native)" under Languages is allowed.
- The site itself also omits the birth date, nationality line and street address (city only: "Apalit, Philippines").
  This is a default; see Q4.
- Realistic look: PBR props and textures, physically based light, procedural environment reflections, bloom on the
  high tier only. No flat low-poly primitives, wireframes or toy colours. The user rejects "Roblox" looks.
- Budgets (§5) are enforced by `npm run budget` from M3 on.
- Text, CTAs and nav are HTML. The canvas is `aria-hidden="true"`; screen labels drawn inside it are decorative.
- Hosting base path `/immanuel-3d/`. Every runtime asset URL in scene code goes through `withBase()`. Build in Git Bash
  with `MSYS_NO_PATHCONV=1 BASE_PATH=/immanuel-3d/`.
- Dev port 4360, preview 4361 (4340/4341 are vibes-portfolio). Check the port first and stop only servers you started
  ([windows-dev-machine](../../../full-stack-agent/.claude/wiki/platforms/windows-dev-machine.md)).
- Run Vitest with `--maxWorkers=2 --testTimeout=30000`. Run Playwright one project at a time, one worker.

## Review Focus
1. **Download CV on a phone:** `window.print()` opens the print sheet; iOS has no direct "download PDF". The button
   label and helper text must say "Print / Save as PDF". The Word file must download on Android Chrome and iOS Safari
   (`<a download>` from a Blob URL). Covered in M2 Task 2.3 and Q1.
2. **Base-path build:** every image, GLB, texture, poster and CV portfolio link works under `/immanuel-3d/`. Covered by
   the base-path e2e in Q1 and `withBase` unit tests in M0.
3. **Fallback pages are complete:** with WebGL off, reduced motion on or after context loss, every chapter's content and
   both CV buttons still work. Covered in Q1.
4. **Portrait phones:** cards must not hide the 3D subject for a whole chapter; the subject sits in the top ~45%.
   Covered by screenshots in S2 and Q1 (5 viewports).
5. **Leaked personal data:** the print CV, the docx and the page HTML contain none of the banned strings above. Covered
   by `cv.privacy.test.ts` (M2) and a built-HTML grep in Q1.

---

## 1. Design direction

**Concept (user's choice):** a dark, photoreal server/control room at night. Seven tall holographic glass panels (one
per AI agent) stand in a shallow arc behind an operator console. Server rack aisles run off to both sides with
blinking status LEDs. Cold haze sits under the ceiling ducts. The Lead panel is in the centre. Scroll moves a physical
camera (dolly + pan, no cuts) to a different part of the room per chapter.

| Chapter (`section#id`) | Content (HTML) | Camera / scene |
|---|---|---|
| Hero + About `#about` | name, title, availability chip, photo, about text, skill categories, AI skills, languages, CTAs "Download CV" + "Contact" | wide establishing shot from the doorway, slightly low; all 7 agent panels idle-glow; Lead panel brightest |
| Experience `#experience` | 4 roles (role, org, period, bullets) as a timeline | dolly left along the rack aisle; the rack-door display panels show the years (2013 → Present) |
| AI & Automation `#ai` | 6 `aiTools` cards (3 featured wide, with SVG image, highlights, Live/Code links) + 7-agent workflow strip | push in to the agent arc; panels light up in workflow order Lead → Planner → Backend ∥ Frontend → QA → Docs → DevOps (repeats every ~6 s), project screens show the `images/ai` art |
| Web projects `#web` | 4 web systems (ws1–ws4; `ws_agent` is shown once, in `#ai`) + 5 static sites | pan right into the second aisle; rack-mounted screens show project title glyphs |
| Education + Certifications `#education` | 3 education entries, 3 certifications (credential links, no TESDA homepage link) | crane up to a wall-mounted "archive" display beside the console |
| Contact + Download CV `#contact` | emails, phone, GitHub, location (city), Download CV (PDF / Word) | pull back and up to an overview; panels dim except one "contact" panel; haze thickens |

- **Pointer:** ≤ 1.5° camera parallax on fine pointers only. **Load:** the panels flicker on one by one over ~1.2 s
  after the first frame.
- **Reduced motion:** the hero pose is pinned. No flicker-in, no workflow pulses, no parallax. `frameloop="demand"`
  gives one still frame (`data-scene-state="still"`).
- **Visual style:** near-black blue-grey room (`#07090d` to `#11161d`) with cyan holo light (`#5ee7ff`), one warm accent
  (amber `#ffb547`) for status LEDs and the CTA focus ring, and text `#e6edf3` on scrim panels (contrast ≥ 4.5:1).
  Fonts: Inter Variable (body), Space Grotesk or Inter Tight (headings; the frontend agent picks per `frontend-design`),
  JetBrains Mono (chips, dates, panel labels). All are OFL via `@fontsource-variable`.
- **What sells realism** (vibes-portfolio V1–V4 lessons, [3D landing page](../../../full-stack-agent/.claude/wiki/features/3d-landing-page.md)):
  framing and light, not prop count; a glossy dark floor reflecting the panels; haze; a CSS vignette; desaturated scans;
  a procedural environment (no mismatched HDRI room).

### Responsive (three versions of every chapter)
| | Desktop / landscape tablet (≥ 1024 wide, landscape) | Tablet portrait (≥ 640, portrait) | Phone (< 640) |
|---|---|---|---|
| Layout | content column left ~40% on a blurred scrim; scene subject shifted right with `camera.setViewOffset` (x = a fraction of viewport **height**) | subject in the top ~45% below the nav; translucent cards from mid-screen down, with a ≥ 40vh gap between chapters so the room shows | same as tablet portrait, single column, cards full width with 16 px gutters |
| Nav | top bar: 6 chapter links + "Download CV" button | top bar: name + "Download CV" + menu button (sheet with 6 links) | same as tablet; sticky bottom CV bar hidden while `#contact` is in view |
| Touch | — | big-button touch style from [Touch UI shell](../../../full-stack-agent/.claude/wiki/features/touch-ui-shell.md): ≥ 48 px targets, 12 px gaps, tokens and layers reused, **document scroll kept** (not the "only main scrolls" shell) | same; `touch-action: pan-y` on `#scene`; no pinch or zoom handlers |
| Scene tier | `high` (MSAA, shadows, reflector floor, bloom) | `touch` (no bloom, no reflector, DPR ≤ 1.5) | `low` (no shadows, fewer LEDs, 256–512 px maps) |

## 2. Features and priority

| Priority | Feature |
|---|---|
| MVP | Typed content files; six chapters of HTML; nav; SEO (title, description, OG image, sitemap, JSON-LD `Person`) |
| MVP | Download CV: PDF via print of the build-rendered CV; Word via lazy `docx`; Ctrl+P anywhere prints the CV |
| MVP | Eager gate, poster fallback, reduced-motion still, context-loss → poster, scene defer (first input or 9 s) |
| MVP | Photoreal command-center room, 7 agent panels, chapter camera rig, rack LEDs, bloom (high tier) |
| MVP | GitHub Pages deploy via Actions; CI build/lint/test/budget |
| Later | Server-room hum behind a sound toggle (CC0 loop, vibes `SoundToggle` recipe) |
| Later | Prebuilt `cv.pdf` rendered at build time with Playwright `page.pdf()`: a true one-tap download on iOS (Q3) |
| Later | Clicking an agent panel focuses its HTML card (keyboard path via the HTML card buttons) |

## 3. Page and content structure

```
site/
  src/data/        types.ts, profile.ts, skills.ts, experience.ts, education.ts, projects.ts (aiTools, webSystems,
                   staticProjects), certifications.ts, languages.ts, agents.ts, site.ts (url, base), credits.ts
  src/lib/         withBase.ts, sceneGate.ts, quality.ts, sceneDefer.ts, chapterProgress.ts (copied), cv/model.ts, cv/docx.ts
  src/scripts/     sceneBoot.ts, activeSection.ts (copied), cvDownload.ts
  src/components/  Nav.astro, Hero.astro, ChapterSection.astro, TimelineEntry.astro, ProjectCard.astro, AgentStrip.astro,
                   CertCard.astro, ContactBlock.astro, CvButtons.astro, ScenePoster.astro, Footer.astro (credits),
                   cv/CvDocument.astro
  src/islands/     SceneRoot.tsx (copied)
  src/scene/       CommandCenter.tsx, Room.tsx, Racks.tsx, AgentPanels.tsx, ProjectScreens.tsx, Console.tsx, Haze.tsx,
                   CameraRig.tsx, Bloom.tsx, Environment.tsx, chapters.ts, layout.ts, holoMaterial.ts, panelCanvas.ts, leds.ts
  src/styles/      tokens.css, layers.css, features.css, print.css (unlayered, from AI_Porfolio §13)
  public/          models/{desktop,phone}/, textures/, screens/ (WebP from images/ai/*.svg), poster/, og.png, favicon.svg
  scripts/         fetch-polyhaven.mjs, build-models.mjs, build-textures.mjs, build-screens.mjs, capture-poster.mjs,
                   check-budget.mjs, budget-lib.mjs (copy from vibes-portfolio/site/scripts and adapt)
docs/  plan/, assets.md, design.md (M0), README sections (D1)
```

**Agents copy** (`agents.ts`; proposed wording, editable, taken from the workspace workflow in `full-stack-agent/CLAUDE.md`):
Lead (orchestrates, verifies every report, runs reviews) · Planner (researches and writes the milestone plan) · .NET
Backend (ASP.NET Core API, EF Core, OpenAPI contract) · React Frontend (React + TypeScript UI from the contract) · QA
(Playwright and unit tests, accessibility) · Docs (documents verified behaviour) · DevOps (Docker, GitHub Actions,
deployment).

## 4. 3D concept details

**Scenes:** one room, one canvas, one camera. No room switching (simpler than vibes-portfolio V3). Lazy *detail
groups* only: the `#web` aisle screens and the `#education` archive display mount when their chapter is current or
next. **All lights live in the first-frame group** (skill §4).

**Room build:**
- **Shell:** walls are concrete or painted metal panels; ceiling has procedural cable trays plus Poly Haven ducts. The
  floor is dark raised-floor tiles: high tier = drei `MeshReflectorMaterial` (blur, low mix, roughness map); other
  tiers = standard roughness + environment.
- **Server racks (procedural, 0 KB geometry):** about 12 rack shells as one `InstancedMesh`. Perforated doors use a
  canvas-generated normal and alpha pattern, with `metal_plate` PBR maps. Status LEDs are one `InstancedMesh` of small
  emissive quads (≤ 600 high / 200 low) with per-instance phase; pattern from the city-windows recipe (vibes V3b).
- **Agent panels (procedural):** a thin glass slab (`MeshPhysicalMaterial`, transmission off; roughness 0.15) plus an
  inner additive plane using `holoMaterial.ts`. That material is a small ShaderMaterial: canvas texture (agent glyph,
  name, role, mono status lines), scanlines, fresnel edge, a low-frequency flicker uniform and an `uActive` 0..1 pulse.
  Emissive > 1 with `toneMapped:false` so bloom catches it. Each panel stands on a small brushed-metal base with a cyan
  floor spill (a point light per 2–3 panels; max 6 lights in total).
- **Project screens:** `images/ai/*.svg` → WebP 512/256 (`build-screens.mjs`) on the same holo material.
- **Console:** procedural desk (rounded box, `metal_plate_02` + black satin top). Thin parts are flat planes with
  `polygonOffset` (vibes V2 phone-tier lesson).
- **Haze:** `FogExp2` plus 2–3 soft additive light-shaft cards under the ceiling spots. CSS radial vignette over the canvas.
- **Environment:** procedural PMREM from emissive rectangles where the panels and ceiling lights are (vibes `Environment.tsx`). No HDRI.

**Motion:** native scroll → `useChapter` (passive listener + rAF → ref, −0.5·innerHeight offset). `CameraRig` damps
toward `CHAPTER_POSES[chapter]`, blended by progress. Pause off screen (`#scene[data-faded]`, `visibilitychange`).

**Fallbacks:** `poster` (no WebGL, saveData, deviceMemory ≤ 2), `still` (reduced motion), `lost` (context loss → poster
fades in). Posters are captured from the real scene (`capture-poster.mjs`): 3 crops (desktop 1920×1080, tablet 820×1180,
phone 375×667@2x) ≤ 120 KB each, plus `og.png` 1200×630.

### Asset sourcing (all must be listed in `docs/assets.md`, manifests and footer credits)
Poly Haven models are **candidates**: S1 fetches them, checks the look and simplifies them, and drops any that read
wrong (as vibes did). Poly Haven has **no server racks, monitors or office chairs** (checked on 2026-11-05 via
`api.polyhaven.com/assets?t=models&c=electronics|office|seating|industrial`), so those are procedural.

| Asset | Source | Licence | Raw tris → target | Use |
|---|---|---|---|---|
| `modular_airduct_rectangular_01` | Poly Haven | CC0 | 45,090 → ≤ 6k | ceiling ducts (instanced) |
| `security_camera_01` | Poly Haven | CC0 | 13,571 → ≤ 3k | corner camera, slow pan |
| `power_box_01` | Poly Haven | CC0 | 21,272 → ≤ 4k | wall electrical panel |
| `fire_alarm` | Poly Haven | CC0 | 2,705 | wall detail |
| `korean_fire_extinguisher_01` | Poly Haven | CC0 | 9,913 → ≤ 3k | by the door (blur Korean label text if legible) |
| `utility_box_01` / `_02` | Poly Haven | CC0 | 4,404 / 6,268 | wall junction boxes |
| `metal_office_desk` (optional) | Poly Haven | CC0 | 6,898 | side desk in the `#education` corner |
| `modular_electric_cables` (optional) | Poly Haven | CC0 | 42,078 → ≤ 5k | cable runs (else procedural tube) |
| Textures `metal_plate`, `metal_plate_02` | Poly Haven | CC0 | — | racks, console, panel bases (1024/512 desktop, 512/256 phone, WebP) |
| Texture `concrete_floor_painted` or `concrete_tiles` | Poly Haven | CC0 | — | floor (pick on look in S1) |
| Texture `factory_wall` or `brushed_concrete` | Poly Haven | CC0 | — | walls |
| Racks, LEDs, panels, console, cable trays, haze, perforation pattern, agent glyphs | written for this project | owned | — | 0 KB, drawn at runtime |
| `images/ai/*.svg` (6) | user's own (AI_Porfolio) | owned | — | project screens + HTML cards |
| `profile.JPG` | user's own | owned | — | HTML only (`astro:assets` → WebP ≤ 60 KB, 2 sizes) |
| Office chair (optional, later) | Sketchfab CC BY, **downloaded by the user** (needs login) | CC BY 4.0 | ≤ 8k | operator chair; credit required |
| Fonts | `@fontsource-variable/*` | SIL OFL 1.1 | — | — |

Pipeline: copy `vibes-portfolio/site/scripts/fetch-polyhaven.mjs` (API `api.polyhaven.com/files/<id>`, unique
User-Agent, MD5 lock in `assets-raw/lock.json`, git-ignored), `build-models.mjs` (meshoptimizer simplify, Meshopt,
WebP, normal/ORM a size step below base colour, `sharp.modulate({saturation:0.5–0.6})`) and `build-textures.mjs`.
Encode WebP with `fs.writeFile(await sharp(..).webp({quality}).toBuffer())` (wiki gotcha).

## 5. Budgets (checked by `npm run budget`, copied from vibes `check-budget.mjs`)
| | Desktop (high) | Phone (low) |
|---|---|---|
| Eager JS (gzip) | ≤ 60 KB (expect ~3 KB) | same |
| Lazy scene chunk (gzip; React + R3F + three + drei) | ≤ 400 KB | same |
| Bloom chunk (gzip, high only) | ≤ 30 KB | not loaded |
| CV Word chunk (`docx`, gzip, on click) | ≤ 200 KB (**unmeasured**; M2 measures it, see Risk R4) | same |
| First-frame 3D assets (models + textures + screens) | ≤ 1.5 MB | ≤ 800 KB |
| Detail groups (`#web`, `#education`) | ≤ 800 KB | ≤ 400 KB |
| Triangles drawn | ≤ 100k | ≤ 60k |
| Draw calls (log once via `gl.info`) | ≤ 120 | ≤ 70 |
| Posters | ≤ 120 KB each | — |
| Lighthouse (mobile + desktop, built site, swiftshader flags) | ≥ 90 in all four | ≥ 90 |

## 6. Tech stack
Start from the versions vibes-portfolio installed on 2026-11-03. Run `npm view <pkg> version` in M0 and take the
newest matching set (R3F major = React major).

| Area | Package | Version (2026-11) |
|---|---|---|
| Site | `astro` (Node ≥ 22.23.4; local Node 26.13.0) | ^7.4.5 |
| 3D | `three` / `@types/three` | ^0.187.0 |
| 3D | `@react-three/fiber` / `@react-three/drei` | ^9.8.2 / ^10.7.9 |
| 3D | `@react-three/postprocessing` + `postprocessing` (direct dep) | ^3.2.2 / ^6.39.6 |
| UI runtime (lazy only) | `react`, `react-dom` | ^19.3.1 |
| CV | `docx` (MIT, ESM, `Packer.toBlob`) — replaces the 1.1 MB vendored `docx.js` and FileSaver | 9.15.2 ([npm](https://registry.npmjs.org/docx/latest)) |
| Assets | `sharp`, `meshoptimizer`, `@gltf-transform/{core,extensions,functions}` | ^0.35.5, ^1.3.0, ^4.5.1 |
| Quality | `typescript` ~6.0.3, `vitest` ^5.0.5, `playwright` ^1.64.1, `eslint` ^10 + `eslint-plugin-astro`, `prettier` ^3.9 + astro plugin, `@astrojs/check`, `@astrojs/sitemap` | as vibes |

Deployment / CI sketch (devops): `.github/workflows/ci.yml` runs on push/PR in `site/`: `npm ci`, `npm run check`,
`lint`, `test`, `build` with `BASE_PATH=/immanuel-3d/`, `budget`. `deploy.yml` runs on main: `withastro/action`
(path `site`) → `actions/deploy-pages`. Look up action versions with `curl -s
https://api.github.com/repos/<owner>/<repo>/releases/latest` (no `gh`). Repo `immanuelMM/immanuel-3d` serves at
`https://immanuelmm.github.io/immanuel-3d/`. `immanuelMM.github.io` (root) belongs to immanuel-portfolio
([github](../../../full-stack-agent/.claude/wiki/platforms/github.md), [static-hosting](../../../full-stack-agent/.claude/wiki/platforms/static-hosting.md)).
`github.io` is on the Public Suffix List; that does not matter here (no cookies, no server). GitHub Pages cannot send
custom headers, so there is no CSP header (a `<meta>` CSP is optional). The user pushes and enables Pages
(Settings → Pages → Source: GitHub Actions).

---

## 7. Milestones (one agent run each)

Order: **M0 → M1 → M2 → S1 (user screenshot gate) → S2 → S3 → Q1 → D1 → P1.** M1/M2 can't run in parallel with S1 on
this low-RAM machine. Name these wiki pages in every prompt: `features/3d-landing-page.md`, `apps/vibes-portfolio.md`,
`apps/immanuel-3d.md`, `platforms/windows-dev-machine.md`, plus the skill `web-3d-landing`.

### M0 — Scaffold, gate, shell (frontend-react-dev)
**Reuse:** copy from `vibes-portfolio/site/` (newest gate): `src/scripts/sceneBoot.ts`, `src/lib/{sceneGate,quality,sceneDefer,chapterProgress}.ts`
+ tests, `src/islands/SceneRoot.tsx`, `src/scripts/activeSection.ts`, `src/styles/features.css` (`#scene`
container), `eslint.config.js`, `prettier` config (`endOfLine: auto`), `tsconfig.json`, `.npmrc` only if installs need it.

**Files:** `site/package.json`, `astro.config.mjs` (`site: 'https://immanuelmm.github.io'`, `base: process.env.BASE_PATH ?? '/'`),
`src/lib/withBase.ts`, `src/layouts/Base.astro`, `src/pages/index.astro` (six empty `section[data-chapter]`),
`src/components/Nav.astro`, `src/styles/{tokens,layers}.css`, `src/scene/CommandCenter.tsx` (temporary: dark room box +
1 light, sets `ready`), `.gitignore` (`node_modules`, `dist`, `.astro`, `assets-raw`), `docs/design.md` (tokens + §1 table).

**Interfaces produced:** `withBase(path: string): string` (prefixes `import.meta.env.BASE_URL`, no double slash);
`#scene[data-scene-state]` ∈ `ready|still|poster|lost`; `CHAPTER_IDS = ['about','experience','ai','web','education','contact'] as const`
and `type ChapterId` in `src/scene/chapters.ts`.

- [ ] Write `withBase.test.ts`: `withBase('/models/a.glb')` → `/immanuel-3d/models/a.glb` when BASE_URL is `/immanuel-3d/`;
  `/models/a.glb` when `/`; an absolute `https://` URL is returned unchanged. Run it: FAIL.
- [ ] Implement, plus the copied gate/quality/defer tests. `npx vitest run --maxWorkers=2` → all PASS.
- [ ] `npm run check && npm run lint && MSYS_NO_PATHCONV=1 BASE_PATH=/immanuel-3d/ npm run build` → 0 errors;
  `grep -c '/immanuel-3d/' dist/index.html` ≥ 1 and no `Program Files` in it.
- [ ] Manual: `npx astro preview --port 4361`. With swiftshader Chrome the state reaches `ready` after a scroll; with
  `--disable-webgl` it is `poster` and no scene chunk is requested.
- [ ] Commit `feat(site): scaffold Astro site with 3D gate` (`-- site docs/design.md`).

### M1 — Typed content and the six chapters (frontend-react-dev)
**Files:** `src/data/*.ts` (§3), the components in §3 except `cv/`, `src/pages/index.astro`, `public/screens/` source SVGs
copied to `src/assets/ai/`, `profile.JPG` → `src/assets/profile.jpg` (rendered via `astro:assets` `<Picture>` WebP/AVIF).

**Interfaces produced** (`src/data/types.ts`):
`Profile {name; title; availability; emails: string[]; phone; city; github; about}` ·
`SkillCategory {name; skills: string[]}` · `Entry {id; role; org; period; bullets: string[]}` (experience and education) ·
`Project {id; title; desc; tags: string[]; live?; code?; highlights?: string[]; image?; badge?; featured?: boolean}` ·
`Certification {id; name; issuer; year; link?}` · `Language {name; level}` · `Agent {id; name; role}` ·
`SiteData {profile; skillCategories; aiSkills; languages; experience; education; aiTools; webSystems; staticProjects; certifications}`
exported as `siteData` from `src/data/index.ts`.

Data rules: `emails` = split of the source `email` on `|`. `city` = "Apalit, Philippines". `aiTools` keep their order
(featured first). `webSystems` drop `ws_agent` (shown in `#ai`). Certification `cert2` has no `link`. Typo
"Business Analyzt Reviewer" stays (it is the repo name). Render.com links get a "may take ~1 min to wake" note
(`live.includes('onrender.com')`).

- [ ] Write `data.test.ts`: 4 experience entries in source order; 3 education; 6 aiTools with ids `ai6,ai4,ai5,ai1,ai2,ai3`;
  4 webSystems (no `ws_agent`); 5 staticProjects; 3 certifications; every `image` file exists; no string in `siteData`
  matches `/linkedin\.com\/in\/?$|twitter\.com\/?$|Highview|P2-B2|Dec 24, 1991/`; every URL is `https:`. Run: FAIL.
- [ ] Create the data files from `DEFAULT_DATA` (copy text verbatim). Tests PASS.
- [ ] Build the chapter components to the §1 responsive table: cards on a scrim, ≥ 48 px touch targets, external links with
  `rel="noopener"`, chapter headings h2, one h1. Add SEO in `Base.astro`: title "Immanuel Mahusay — Software Engineer",
  description from `about`, OG/Twitter tags, canonical, JSON-LD `Person` (name, jobTitle, url, sameAs GitHub), `@astrojs/sitemap`.
- [ ] Screenshots at 1440×900, 1024×1366, 820×1180, 390×844 and 360×740 (poster mode is fine). Look at them: no clipped
  text, no horizontal scroll.
- [ ] `npm run check && npm run lint && npx vitest run --maxWorkers=2 && npm run build` → green. Commit `feat(site): content chapters from AI_Porfolio data`.

### M2 — Download CV: PDF and Word (frontend-react-dev)
**Reuse:** `ori-portfolio/AI_Porfolio/cv.js` (model + docx layout) and `style.css` §13 `.cv*` print CSS (lines 1036–1107);
[Printing](../../../full-stack-agent/.claude/wiki/features/printing.md) (print CSS unlayered, stub `window.print` in tests).

**Files:** `src/lib/cv/model.ts`, `src/lib/cv/docx.ts`, `src/components/cv/CvDocument.astro`, `src/components/CvButtons.astro`,
`src/scripts/cvDownload.ts`, `src/styles/print.css`.

**Interfaces produced:**
- `buildCvModel(data: SiteData, siteUrl: string | null): CvModel`. Same order and labels as `cv.js`: skills with "AI &
  Automation" inserted before "Professional Skills"; project groups AI → Web Systems → Websites, titles de-duplicated
  case-insensitively; `links` = Portfolio (`siteUrl`, from `Astro.site` + base at build; `null` in dev) + GitHub.
- `cvShortUrl(url: string): string`, `cvFileName(m: CvModel): string` → `Immanuel_Mahusay_CV`.
- `buildCvDocx(m: CvModel): Promise<Blob>` (A4, Calibri, layout ported from `downloadCvWord`); `downloadCvDocx(m)` saves via
  Blob URL + `<a download>` (no FileSaver).
- `CvDocument.astro` renders the model at **build time** into `<div id="cv-print" class="cv-print" aria-hidden="true">`. The
  model is also embedded as `<script type="application/json" id="cv-model">` for the Word export.
- `cvDownload.ts` (eager, tiny): `[data-cv="pdf"]` sets `document.title` to the file name, calls `window.print()` and
  restores the title on `afterprint`. `[data-cv="word"]` `import()`s `cv/docx.ts`, then shows a busy state and an error toast.

Tasks:
- [ ] **2.1** Write `cv.model.test.ts`: skills labels are `['Frontend','Backend & DB','Tools & Others','AI & Automation','Professional Skills']`;
  project groups are `AI & Automation` (6), `Web Systems` (4), `Websites` (5); "Full Stack AI Agent – Multi-Agent Software Team" appears
  once; `cvShortUrl('https://www.github.com/me/')` = `github.com/me`; contact has 2 mailto entries, a `tel:+639760360023` entry and
  `Apalit, Philippines`; `siteUrl=null` → no Portfolio link. FAIL → implement → PASS.
- [ ] **2.2** Write `cv.privacy.test.ts`: `JSON.stringify(buildCvModel(...))` contains none of `Highview`, `P2-B2`, `Dec 24`, `1991`,
  `profile`, `Filipino  •`; `buildCvDocx` → unzip with `fflate` (dev dep) → `word/document.xml` contains `Immanuel Mahusay` and
  `Professional Summary` and none of the banned strings. FAIL → implement `docx.ts` → PASS.
- [ ] **2.3** Buttons + print CSS: the `#contact` section and the nav both carry `CvButtons` labelled "Print / Save as PDF" and "Word (.docx)".
  Under `@media print` everything except `#cv-print` is hidden, `@page { size: A4; margin: 14mm 16mm }`. Playwright check (in
  `site/e2e/cv.spec.ts`, used again in Q1): stub `window.print` via `addInitScript`; one click → 1 call; `emulateMedia({media:'print'})`
  → `#scene` and `main` hidden, `#cv-print` visible; `page.pdf()` gives ≥ 2 pages; Word click → a download named
  `Immanuel_Mahusay_CV.docx` larger than 5 KB.
- [ ] **2.4** Measure the Word chunk (gzip) from the build manifest or sourcemap and record it in `docs/assets.md`. If it is over 200 KB
  or needs Node polyfills (`Buffer`), stop and report: the fallback is lazy-loading the vendored `docx.js` from `public/vendor/`
  with a `<script>` tag on click.
- [ ] Green check/lint/test/build. Commit `feat(cv): build-time print CV and lazy Word export`.

### S1 — Hero command-center room (frontend-react-dev) → **user screenshot gate**
**Reuse:** vibes `fetch-polyhaven.mjs`, `build-models.mjs`, `build-textures.mjs`, `Environment.tsx`, `freeGpu.ts`, the
InstancedMesh and Points recipes (vibes V3b), `capture-poster.mjs` (used in S3).

**Files:** `src/scene/{CommandCenter,Room,Racks,AgentPanels,Console,Haze,Environment}.tsx`, `layout.ts`, `holoMaterial.ts`,
`panelCanvas.ts`, `leds.ts`, `src/data/props.json`, `scripts/*` (copied), `docs/assets.md`.

**Interfaces produced:** `AGENT_PANELS: {agentId: Agent['id']; position: [number,number,number]; rotationY: number; size: [number,number]}[]`
(7, Lead centre, arc radius ~4 m); `createHoloMaterial(map: Texture, opts?: {tint?: Color; intensity?: number}): ShaderMaterial`
with uniforms `uTime`, `uActive`, `uFlicker`; `drawAgentPanel(ctx: CanvasRenderingContext2D, agent: Agent): void`;
`buildLedInstances(count: number, seed: number): {matrices: Float32Array; phases: Float32Array}`.

- [ ] Unit tests first: `layout.test.ts` (7 panels, unique ids matching `agents.ts`, all facing the hero camera within ±35°, none
  overlapping); `leds.test.ts` (deterministic for a seed, count respected, every LED inside a rack bounding box); `quality.test.ts`
  additions (tier flags: `reflector`, `bloom`, `shadows`, `ledCount`). FAIL → implement → PASS.
- [ ] Fetch the candidates in §4, build models and textures, and record tris and KB per tier in `docs/assets.md`. Drop props that
  read wrong and say why.
- [ ] Build the room to §4 with the hero pose only (no chapter motion yet). Tune with a dev-only pose global and a multi-pose
  screenshot script (vibes V2 lesson); remove the global before committing.
- [ ] Screenshots: 1440×900 high, 820×1180 touch, 390×844 low (swiftshader). **Look at them** against "photoreal, not toy". Then
  **stop and hand the screenshots to the lead for the user's approval** before S2.
- [ ] Budget check by hand (S3 automates it): first-frame ≤ 1.5 MB / 800 KB, tris ≤ 100k / 60k. Commit `feat(scene): photoreal command-center hero room`.

### S2 — Chapter camera, agent workflow, project screens (frontend-react-dev)
**Files:** `CameraRig.tsx`, `chapters.ts` (`CHAPTER_POSES: Record<ChapterId, {position; target; fov}>` + portrait variants),
`ProjectScreens.tsx`, `AgentPanels.tsx` (workflow pulse), `scripts/build-screens.mjs`, `#scene[data-chapter]` signal.

- [ ] Tests: `chapters.test.ts`: every `ChapterId` has a landscape and a portrait pose; `poseAt(progress)` is continuous
  (max jump < 0.05 m between progress steps of 0.001); reduced motion → always the `about` pose. `workflow.test.ts`:
  `activeAgents(t)` cycles in the order Lead → Planner → {Backend, Frontend} → QA → Docs → DevOps with period 6 s. FAIL →
  implement → PASS.
- [ ] `build-screens.mjs`: `images/ai/*.svg` → WebP 512 (desktop) / 256 (phone) in `public/screens/` plus manifest.
- [ ] Detail groups for `#web` and `#education` mount when their chapter is current or next (per-group `<Suspense>`); lights
  stay in the first-frame group.
- [ ] Portrait: subject in the top ~45%, look target drifts up as cards rise; check at 820×1180, 390×844 and 360×740.
- [ ] Scripted scroll screenshots per chapter (scroll, then wait for `data-chapter` + two rAFs). Look at all 18. Commit
  `feat(scene): scroll chapters, agent workflow, project screens`.

### S3 — Realism polish, bloom, posters, budgets (frontend-react-dev)
- [ ] Bloom: `React.lazy(() => import('./Bloom'))`, high tier only, `<EffectComposer multisampling={4}>` + `<ToneMapping mode={ACES_FILMIC}/>`,
  `luminanceThreshold` ~0.92 (wiki recipe).
- [ ] Reflector floor (high), haze cards, CSS vignette, LED flicker, load flicker-in. Pointer parallax on `(pointer: fine)` only.
- [ ] Copy and adapt `check-budget.mjs` + `budget-lib.mjs` with §5 limits; `npm run budget` → all within budget.
- [ ] `capture-poster.mjs`: 3 hero crops + `og.png` from the reduced-motion still (vignette and poster hidden during
  capture); test `posters.test.ts` (each ≤ 120 KB, referenced by CSS); measured poster→canvas diff ≤ 4/255.
- [ ] Credits footer from manifests; `manifest.test.ts` (every shipped file has a manifest entry with an allowed licence
  `CC0|CC BY 4.0|owned`). Commit `feat(scene): bloom, posters, budgets`.

### Q1 — QA (qa-automation)
Recipe: [3D landing page § Testing](../../../full-stack-agent/.claude/wiki/features/3d-landing-page.md) and
[E2E harness](../../../full-stack-agent/.claude/wiki/features/e2e-playwright-harness.md) (5 viewports, axe, screenshots).
- Projects: `webgl` (swiftshader args), `no-webgl` (`--disable-webgl --disable-3d-apis`), `reduced-motion`, `base-path`
  (build with `BASE_PATH=/immanuel-3d/`, serve under that path, zero 404s).
- Checks: state reaches `ready` (scroll first, or allow ~12 s for the defer); the canvas is non-blank; every chapter heading
  and CTA is visible and clickable over the scene; no console errors (filter the THREE.Clock deprecation); context loss →
  `lost` → poster; reduced motion → `still` and camera unchanged after scrolling; axe 0 serious/critical; CV spec from
  M2 2.3 in all three modes; built HTML grep for the banned strings; external links report (non-blocking; Render links sleep).
- Lighthouse mobile + desktop on the built site with swiftshader `chromeFlags` → ≥ 90 × 4.
- One project at a time, one worker. Commit `test(e2e): ...` under `site/e2e/` only.

### D1 — Docs (docs-writer)
`README.md` (what it is, run/build/test/budget commands, `MSYS_NO_PATHCONV` note, how to update content in `src/data/`,
how to re-fetch assets), `docs/assets.md` final, `docs/design.md` final. Commit `-- README.md docs`.

### P1 — Deploy (devops-engineer)
`.github/workflows/ci.yml` + `deploy.yml` (§6). Then the lead asks the user to create `immanuelMM/immanuel-3d`, add the remote,
push, and set Pages → Source: GitHub Actions. Verify the live URL loads `ready` and that CV PDF and Word work there. Commit
`ci: build, test and deploy to GitHub Pages` (`-- .github`).

---

## 8. Risks
| # | Risk | Mitigation |
|---|---|---|
| R1 | The room reads as "sci-fi game" or toy because Poly Haven has no racks, monitors or chairs and the hero props are procedural | Real PBR maps on every procedural surface, reflector floor, haze, desaturation, user screenshot gate at the end of S1 before more work |
| R2 | Holo panels bloom into unreadable blobs or white hot spots | Emissive only on glyph strokes; thresholded bloom; no lightformer mirroring the panels (vibes desk lesson) |
| R3 | Mobile performance / Lighthouse TBT | Scene defer (first input or 9 s), tiers, `freeGpu` on low, budgets in CI |
| R4 | `docx` lazy chunk size or Node polyfills unknown ([npm-compare](https://npm-compare.com/docx,html-docx-js,html-to-docx) says no polyfills; unverified) | Measure in M2 2.4; fallback to the vendored `docx.js` loaded on click |
| R5 | "Download PDF" on phones opens the print sheet, not a file | Honest label "Print / Save as PDF"; Q3 offers a build-time `cv.pdf` |
| R6 | Base-path 404s on GitHub Pages | `withBase()` everywhere, `base-path` e2e project, MSYS env-var gotcha |
| R7 | Dead or login-walled demo links (Render free services sleep; the n8n link points at an n8n **executions** page that probably needs an n8n login) | Wake-up note; Q5 |
| R8 | **Security (outside this app):** `ori-portfolio/AI_Porfolio/app.js` line 8 has a plaintext admin password (`AUTH`) and is pushed to `immanuelMM/AI_Porfolio` | Never copy it; tell the user (Q6) |

## 9. Open questions (defaults are planned)
1. **Hosting:** GitHub Pages as a project repo `immanuelMM/immanuel-3d` → `https://immanuelmm.github.io/immanuel-3d/`?
   *Default: yes* (free, same as the other portfolios; the root `immanuelMM.github.io` is taken by immanuel-portfolio).
   Alternative: Cloudflare Pages (custom headers, needs an account).
2. **Repo name:** `immanuel-3d`? *Default: yes* (the URL path follows it; renaming later changes `BASE_PATH`).
3. **CV PDF:** keep print-to-PDF only (as AI_Porfolio does), or also ship a prebuilt `cv.pdf` for one-tap download on
   phones? *Default: print only for MVP; prebuilt PDF later.*
4. **Personal details on the site:** show city only (no street address, birth date or nationality line), as on the CV?
   *Default: yes.* Phone and both emails (incl. the work address `immanuel@qstrike.com`) shown as in the source?
   *Default: yes, both.*
5. **n8n card:** keep its Live link (it likely shows an n8n login page to visitors) or show the card without a link?
   *Default: keep the card, drop the link.*
6. **Exposed password:** `AI_Porfolio/app.js` contains the admin password in a public repo. Do you want to change that
   password anywhere you reuse it and remove it from the old repo? *Default: tell the user; this plan changes nothing there.*
7. **Agent panel copy:** use the one-line roles in §3? *Default: yes.*
8. **Optional office chair:** a Sketchfab CC BY chair you download by hand, or no chair? *Default: no chair (console only).*
9. **Ambient server hum** (sound toggle) after MVP? *Default: later, off by default.*

## Decisions
_Lead records the user's answers here (date, question #, answer)._

-
