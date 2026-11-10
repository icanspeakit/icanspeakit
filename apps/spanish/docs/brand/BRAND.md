<!-- Copied from brand/kit/BRAND.md on 2026-11-10. The kit is the source of truth; edit it there. -->

# icanspeak brand kit

*Decided by Edgar on 2026-11-10. Design canvas: "icanspeak English – new colours & logo"
(https://claude.ai/artifact/T2YW7oUptmMZMg117Xm9BP). Everything a session needs is in this folder;
it does not need the canvas.*

## 1. Logo

**Wordmark:** `i canspeak!` in **Fraunces Black (900)**, near-black `#111015`. The first letter is a
custom lowercase **i** (round dot, upright stem, slightly wider foot) and **stands apart** from
"canspeak", so it reads "i can speak!"; the closing **!** is the same shape turned upside down.
**Every letter** carries the **four-colour split**: green and sky shifted to the upper left, sun
yellow and coral to the lower right (like a video frame slightly out of register).

| File | Use |
|---|---|
| `logos/icanspeak-wordmark.svg` | default: header and footer on white or light backgrounds |
| `logos/icanspeak-wordmark-dark.svg` | white letters, same split: on navy, black, photos |
| `logos/icanspeak-wordmark-mono.svg` / `-mono-white.svg` | one colour: print, stamps, tiny sizes (< 120 px wide) |
| `logos/icanspeak-mark.svg` / `-mark-dark.svg` | the split i alone, transparent: avatars, loaders, inline |
| `logos/icanspeak-wordmark-1200.png` | for places that need a bitmap (email, docs) |

All SVGs are outlined paths: no font needed, never re-type the logo in HTML.

**Rules**
- Never recolour, stretch, rotate or redraw; never close the gap after the i.
- Clear space around the wordmark: the height of the i's dot on every side.
- Minimum width: 120 px for the split versions, below that use `-mono`.
- In a `<img>`: `alt="icanspeak!"` (or `alt=""` when a text name sits next to it).

**Course label (lockup):** wordmark + a pill with the course name, e.g. `english`, `español`:
pill background sun yellow `#FFC21A`, text navy `#172A6E`, Fraunces 900, 0.5 × the wordmark height,
padding 0.3em 0.75em, radius 999px, 12 px gap to the wordmark. Build it in HTML/CSS next to the
`<img>`; one pill colour for every course.

## 2. App icon and favicons

The split i on a rounded near-black tile.

| File | Use |
|---|---|
| `icons/favicon.svg` | `<link rel="icon" type="image/svg+xml">`: **one colour** (white i on near-black); the split turns to noise below 32 px |
| `icons/favicon.ico` (16/32/48), `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | fallbacks |
| `icons/apple-touch-icon.png` (180, square, iOS rounds it) | `<link rel="apple-touch-icon">` |
| `icons/icon-192.png`, `icon-512.png`, `icon-1024.png` | web manifest `icons` |
| `icons/icon-maskable-512.png` | web manifest, `"purpose": "maskable"` |
| `icons/app-icon.svg` (near-black), `app-icon-light.svg` (white), `app-icon-cream.svg` (cream), `app-icon-square.svg` (no rounding) | sources, stores, social avatars |
| `icons/og-default.png` (1200×630) | default `og:image` / JSON-LD logo when a page has none |

Manifest: `"background_color": "#111015"`, `"theme_color": "#172A6E"`.

## 3. Colours

`tokens.css` (CSS custom properties, prefix `--isk-`) and `tokens.json`.

- **Navy `#172A6E`** is the page ink: headings, primary buttons, dark bands. Body text `#38427A`,
  secondary `#566173` (both pass AA on white).
- **The four brand colours** are fills, never text on white (coral on white is 2.7:1):
  sun yellow `#FFC21A`, sky `#6FD6FF`, coral `#FF6F5E`, green `#4CD98B`.
  Navy text works on all four (coral is the tightest at 4.8:1).
- **Soft versions** for card tints and big areas: `#FFE29A`, `#BFE3FF`, `#FFC4B8`, `#BDEFD2`.
- **Near-black `#111015`**: the logo, the glass band, white-on-black footers.
- **Each mascot owns a colour:** Regi = yellow (grammar), Bruno = sky (everyday language),
  Quaki = coral (speaking), Hamsti = green (vocabulary and exams). The mascot drawings themselves
  never change colour (`src/lib/mascots.js` stays as it is).
- Functional colours (correct/wrong, levels, game palettes) stay functional; harmonise them with
  this palette only where they clash, and keep AA contrast.

## 4. Type

- Headings: **Fraunces 900** (h1–h3), letter-spacing −0.02em on big sizes, line-height 1.02–1.15.
- Body and UI: **Inter** 400/500/600/700, line-height 1.6.
- Mascot speech bubbles only: **Fredoka 600**.
- Self-hosted only: the apps already have Inter and Fraunces 400–600 in `public/fonts/icanspeak/`;
  copy `fonts/*.woff2` there and append `fonts.css`. No Google Fonts request anywhere.

## 5. The tile world (layout system)

The site's look is the round 4 **mosaic**: square tiles with circles, half circles, dot fields,
stripes, speech bubbles and ¡ ! ¿ glyphs, in navy, the four brand colours and white.
`tiles.css` builds every tile in CSS (classes `isk-tile isk-tile--half|dots|stripes|quarter|bowl|dome|dside|bubble`,
colours via `--bg --a --b`, a glyph or mascot in `.isk-tile__fill`). Reference page:
`design/english-landing/D-canspeak-tiles.dc.html` (open as text: plain HTML with inline styles). That
reference still shows the older ¡canspeak! wordmark in its header and footer: use the wordmark from
§1 instead; everything else (layout, colours, tiles, mascots) is as decided.

The page pattern, top to bottom (every course home and the hub follow it):
1. White header: wordmark + course pill, nav in navy, "Find your level" navy pill button.
2. **Ribbon** (`.isk-ribbon`, 64 px tiles, 40 px on phones).
3. **Hero:** eyebrow, Fraunces 900 h1 with a yellow highlighter under the second line, lead text,
   navy primary + outlined secondary button; on the right a **3×3 tile grid** with the four mascots
   and a "Here for you!" bubble tile (hidden below 900 px, the mascots move under the text).
4. **Navy band** "What you practise here": four white cards, each topped by its mascot on its colour.
5. Ribbon, then the exercise cards (white, 2 px navy border, a small glyph tile as icon, yellow level badge).
6. **Glass band** (black, `design/umbrella/icanspeak-glass.png`, cropped to the lower 2/3): the five languages as pills.
7. **Yellow band** "Not sure where to start?" with Quaki celebrating and the placement test button.
8. Small ribbon, navy footer with the white wordmark and "part of icanspeak.it".

Key visuals (not logos): `design/umbrella/icanspeak-tiles.svg|png` and `design/umbrella/icanspeak-glass.svg|png`.

## 6. Accessibility checklist

Text 4.5:1 (3:1 from 24 px bold); tiles and ribbons `aria-hidden="true"`; mascots keep their `alt`
where they carry meaning; touch targets ≥ 44 px; the hero grid must not push the h1 below the fold on phones.
