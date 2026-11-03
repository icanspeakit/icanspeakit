# Brand: icanspeak.it family

This course is part of **icanspeak.it**. The look comes from the umbrella site (repo
`icanspeakit`, `src/styles/global.css` and `design/design-system/`); copies are here so this repo
stays independent. Don't invent a separate visual identity.

## Logos (`public/logos/`)

| File | Use |
|---|---|
| `icanspeak-english-wordmark(-dark).svg` | header, footer of this course |
| `icanspeak-english-mark(-dark).svg`, `-mark-1024.png` | small logo, OG/JSON-LD logo |
| `icanspeak-english-app.svg`, `-app-512/1024.png`, `-apple-touch-icon.png`, `favicon.svg/.ico` | favicons, web manifest |
| `icanspeakit-wordmark(-dark).svg`, `icanspeakit-mark(-dark).svg` | the umbrella brand: "part of icanspeak.it" link in the footer |

The signature: Literata, ink `#1F1B16`, and the amber dot `#B7752B` over a dotless "ı"
("icanspeak ıt", "icanspeak engl·ish", "icanspeak span·ish"). All SVGs are outlined paths
(no font needed). Never redraw or recolour them; dark variants exist for dark backgrounds.

## Colours (from icanspeakit `global.css`)

```css
--color-ink: #24201b;        /* headings */
--color-text: #3c352c;       /* body */
--color-muted: #7a6f60;
--color-bg: #fbf7ef;         /* warm paper */
--color-bg-soft: #f2ead9;
--color-border: #e3d6bd;
--color-primary: #2b4162;    /* navy: links, primary buttons */
--color-primary-dark: #1a2940;
--color-primary-soft: #e5eaf1;
--color-accent: #b3812e;     /* amber: highlights, the dot */
--color-accent-dark: #8a621f;
--color-accent-soft: #f0e2bf;
--radius: 14px;
--shadow-sm: 0 1px 2px rgba(36, 32, 27, 0.08);
--shadow-md: 0 10px 28px rgba(36, 32, 27, 0.1);
```

Body background: `--color-bg` with two faint radial glows (amber top-left, navy top-right).

## Type

- Headings: **Fraunces** (500 for h1/h2, 600 for h3/h4), letter-spacing -0.01em, line-height 1.15
- Body and UI: **Inter** 400/500/600/700, line-height 1.6
- Logo only: **Literata** (already outlined in the SVGs)
- Self-hosted in `public/fonts/icanspeak/` (`fonts.css`, relative URLs, works under the base path).
  No Google Fonts request.

## Design system

`docs/brand/design-system/icanspeakit-design-system.html` (open in a browser) plus the
component, pattern and typography sheets. Use them for buttons, cards, eyebrows and spacing.
Exercise colours (correct/wrong, levels, game palettes) stay functional, but harmonise them
with the palette above; check contrast (WCAG AA) for every text colour.
