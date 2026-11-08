# icanspeak.it: brand and design
*As of November 8, 2026. Design canvas: "icanspeak logos" (claude.ai artifact
https://claude.ai/artifact/VDZ3oSnX8VGsCAxc1heBjA, private until shared).*

Everything about how icanspeak.it and its courses look: what is decided and in use, what was
explored, and what is still open.

## 1. The brand

- **Name:** icanspeak, always lowercase. **Domain:** icanspeak.it (kept despite Google's slight
  Italy bias for `.it`).
- **Structure:** one umbrella and five courses, each its own app in this monorepo
  (`apps/<lang>`, branch `monorepo`), each served on a path:
  - `/` hub (language picker)
  - `/linguistics/` the original magazine and speech exercises
  - `/english/`, `/spanish/`, `/french/`, `/portuguese/` and `/italian/` the courses
- **Every course footer** carries "part of icanspeak.it" with the umbrella wordmark.

## 2. In use today

### Colours (tokens, from `apps/linguistics/src/styles/global.css`)

| Token | Hex | Use |
|---|---|---|
| ink | `#24201b` | headings |
| text | `#3c352c` | body |
| muted | `#7a6f60` | secondary text |
| paper (bg) | `#fbf7ef` | page background, with faint amber and navy glows |
| bg-soft | `#f2ead9` | surfaces |
| border | `#e3d6bd` | lines |
| navy (primary) | `#2b4162` / dark `#1a2940` / soft `#e5eaf1` | links, primary buttons, footer |
| amber (accent) | `#b3812e` / dark `#8a621f` / soft `#f0e2bf` | highlights |
| logo ink | `#1F1B16` (dark mode `#F4EDE2`) | logos only |
| logo amber | `#B7752B` (dark mode `#D99A52`) | the dot in the logos |

Radius 14px. Shadows `0 1px 2px rgba(36,32,27,.08)` and `0 10px 28px rgba(36,32,27,.1)`.

### Type

- **Fraunces** for headings (500 for h1/h2, 600 for h3/h4, letter-spacing −0.01em, line-height 1.15)
- **Inter** for body and UI (400/500/600/700, line-height 1.6)
- **Literata** for the logos only (outlined in the SVGs, so no font is loaded for them)
- All self-hosted in each course: `public/fonts/icanspeak/fonts.css` (relative URLs, works under
  any base path). No Google Fonts request.

### Logos

**The signature:** Literata 500, ink, and an amber dot sitting over an "i".

- **Umbrella (current):** wordmark "icanspeak ıt" and mark "ıt", with the amber dot over the
  dotless ı. Outlined SVGs are in each course's `public/logos/icanspeakit-*.svg`. The originals in
  `apps/linguistics/public/logos/` load their font from Google, so inside an `<img>` they render
  in Georgia. Swap in the outlined versions.
- **Courses:** a wordmark reading "icanspeak <course>" in lowercase.
  - The dot sits over the i of the course name where it has one: engl**i**sh, span**i**sh,
    ital**i**an.
  - "french" and "portuguese" have no i, so there the dot goes over the i of **i**canspeak.
- **Course marks:** "en", "es", "fr", "pt" and "it", with the amber dot top-right.
  - Italian keeps the black tittle on its i, so it doesn't read as the umbrella's "ıt".
- **Files per course** (`apps/<lang>/public/logos/`):
  - `icanspeak-<lang>-wordmark.svg` and `-wordmark-dark.svg`
  - `-mark.svg`, `-mark-dark.svg` and `-mark-1024.png`
  - `-app.svg` (cream tile `#F4EDE2`), `-app-512.png`, `-app-1024.png` and `-apple-touch-icon.png`
  - `favicon.svg` and `favicon.ico`
- **Rules:** never redraw or recolour the logos. Use the dark variants on dark backgrounds. The
  app icon must stay legible at 16px.

Docs in each course: `docs/brand/BRAND.md`, plus a copy of the design system
(`docs/brand/design-system/`, from `design/design-system/` at the old repo root).

## 3. Umbrella logo: exploration (open decision)

**Why a new umbrella logo:** "icanspeak ıt" and the mark "ıt" now clash with the Italian
course, because "it" reads as Italian and ".it" as an Italian site.

| Round | What | Verdict |
|---|---|---|
| 1 | Four soft variations on the dot (many dots, speech dot, monogram with waves, "icanspeak ___") | Edgar: "lame, cheap, AI-looking". Rejected. |
| 2 | Heavy type, real ideas: **A ¡canspeak!**, B "I CAN SPEAK." stacked block, C “icanspeak” in quotation marks, D sticker or balloon | **A is the favourite** (Claude's recommendation) |
| 3 | Per a strict brief (one symbol + clean wordmark, 2–3 flat colours, 16px and one-colour proof, on white): Swiss, Geometric, Bauhaus, Monoline | Bauhaus recommended for that brief |
| 4 | Brand worlds for ¡canspeak!: **geometric tiles** and **glass** | Revised twice: colours brighter and fewer, glass stronger |

### Direction A: ¡canspeak! (leading)

- **The idea:** the inverted Spanish exclamation mark "¡" reads as an "i". So language is
  literally inside the logo, and the closing "!" is the attitude.
- **Wordmark:** Fraunces 900, with ¡ and ! in amber and "canspeak" in ink. The dark version is
  cream with a lighter amber.
- **Mark:** a single amber ¡ on a dark tile. It works at 16px.
- **System:** course icons ¡en, ¡es, ¡fr, ¡pt and ¡it. This also solves the Italian clash.
- **Risk:** at first glance it looks Spanish. That is the joke, and the name stays "icanspeak".

### Round 3 seeds (symbol + wordmark)

- **Swiss:** a geometric ¡ with Inter Bold.
- **Geometric:** a speech bubble with the i cut out (navy `#22365A` and amber). In one colour the
  dot is a hole.
- **Bauhaus:** a circle plus a slab whose foot becomes the speech tail ("an i that speaks"), with
  Fraunces 900.
- **Monoline:** a one-stroke bubble with an i inside. Too thin at 16px.

### Round 4 brand worlds (key visuals, not logos)

These take only the *principles* of two award winners: Paris 2024 by W Conran Design (a modular
geometric grid) and the Apple TV rebrand by TBWA\Media Arts Lab (in-camera glass). No rings, no
emblem, no apple shape, and none of their fonts or exact palettes.

- **Geometric tiles:** a 200px grid of circles, half circles, quarter circles, dot fields,
  stripes, speech bubbles and ¡ ! ¿ glyphs. The wordmark sits in a white centre band, with the
  five language names underneath.
  - Palette, current, 4 colours on white: dark blue `#172A6E`, sun yellow `#FFC21A`, coral
    `#FF6F5E` and sky `#6FD6FF`.
  - Use it for the home page, posters, social media and course covers. Each course could get its
    own tile palette.
- **Glass:** on black (`#000`), a big ¡ and "canspeak!" built from four stacked, saturated,
  translucent layers, each with a light edge and a soft glow.
  - Layer colours: blue `#3D5BFF`, red `#FF2E63`, orange `#FF6A00` and cyan `#00C8FF`.
  - Use it for video intros, the app splash screen and dark hero sections. It doesn't work at
    16px, where the flat ¡ stays the icon.

## 4. What the award winners teach (research, Nov 2026)

Juries checked:
- Brand Impact Awards 2025/2026:
  - Best of Show: Centersquare (JKR) and V&A East Storehouse (Fieldwork Facility)
  - Runner-up: Rail Clock (Design Bridge and Partners)
  - Gold: Lloyds (Wolff Olins), Mozilla (JKR) and others
- Cannes Lions Design Grand Prix: Apple TV (2026) and "Caption with Intention", FCB (2025)
- D&AD:
  - Black Pencil: Paris 2024 by W Conran Design (2025)
  - Yellow Pencil: Sigma by Stockholm Design Lab (2026)

**Patterns:**
1. **One idea, no decoration** (Lloyds is just the horse).
2. **A system beats a single logo** (MO Museum, Southbank and ATP each work as a family).
3. **Type carries the brand.** Hardly any illustrated icons.
4. **Type that shows speech.** "Caption with Intention" is the closest relative of ¡canspeak!.

## 5. Open decisions

1. **The umbrella logo:** A ¡canspeak!, round 3 Bauhaus, or a mix. Then finalise spacing,
   light/dark versions and favicons.
2. **Course icons:** keep "en"/"es"/… with the dot, or switch to the ¡en ¡es … system (only if A
   wins).
3. **The palette going forward:** stay with the warm paper/ink/amber, or move to the brighter
   round 4 palette (dark blue, yellow, coral, sky) for the umbrella and hub.
4. **Rollout once decided:**
   - `apps/hub`
   - the "part of icanspeak.it" footer in every course
   - `apps/linguistics`
   - favicons, and `BRAND.md` in each app

Files of round 4 (SVG + PNG at 2x): `design/umbrella/icanspeak-tiles.svg|.png` and `design/umbrella/icanspeak-glass.svg|.png`.

Nothing from rounds 1–4 is in any app yet. The logos in use are the ones in section 2.
