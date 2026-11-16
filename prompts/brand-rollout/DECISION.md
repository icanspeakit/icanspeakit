> **SUPERSEDED on 2026-11-10 by `prompts/site-launch/` and `brand/kit/`. Do not run this batch.**

# Brand rollout: the decision

Fill this in, then change the status line to `status: decided`. The launcher refuses to start
while it says `open`. Every lane reads this file first and builds exactly what it says.
Background and all options: `brand-design.md` (repo root).

status: open

## 1. Umbrella logo
umbrella: canspeak
<!-- canspeak  = ¡canspeak!: Fraunces 900, ¡ and ! in the accent colour, "canspeak" in ink (brand-design.md §3 A)
     bauhaus   = round 3 Bauhaus: circle + slab whose foot is the speech tail, Fraunces 900 wordmark
     keep      = keep "icanspeak ıt" as it is (then the kit lane only does colours) -->

## 2. Course logos and icons
course_icons: inverted
<!-- inverted = ¡en ¡es ¡fr ¡pt ¡it, course wordmarks "¡canspeak english" etc. (only with umbrella: canspeak)
     dot      = keep today's "icanspeak english" wordmarks and "en/es/fr/pt/it" marks with the amber dot -->

## 3. Palette (pages, not mascots)
palette: bright
<!-- warm    = today's linguistics palette (table W)
     bright  = round 4 palette (table R); derive ink/text/muted/borders from it and check WCAG AA
     A, B, C = the three directions on the canvas "icanspeak English – new colours & logo" (tables A–C) -->

## 4. Scope
apps: hub, linguistics, english, spanish, french, portuguese, italian
<!-- remove an app from this line to leave it untouched -->

## Notes for the lanes
English homepage: build it like `design/english-landing/D-canspeak-tiles.dc.html` (canvas board
"D · ¡canspeak! tiles"): tile ribbon, 3×3 hero tiles with the mascots, one practice card per
mascot (Regi grammar, Bruno everyday English, Quaki speaking, Hamsti vocabulary & exams), glass
band for the five languages, yellow placement-test band. The mascot card colours come from the set
chosen in `design/english-landing/Mascot-colour-sets.dc.html`:
mascot_colours: strong + soft (decided 2026-11-09, see brand-design.md §0)   <!-- now | 1 soft pastel | 2 jewel | 3 sunset & lilac | 4 retro schoolbook | 5 neon pop -->
Logo sources: `design/umbrella/icanspeak-tiles.svg` (the ¡canspeak! wordmark is in there, outlined).

---

## Palette tables

The mascots (Bruno, Regi, Hamsti, Quaki in `src/lib/mascots.js`) keep their own colours in every option.

**W · warm (today)** — paper `#fbf7ef`, bg-soft `#f2ead9`, border `#e3d6bd`, ink `#24201b`,
text `#3c352c`, muted `#7a6f60`, primary navy `#2b4162` / dark `#1a2940` / soft `#e5eaf1`,
accent amber `#b3812e` / dark `#8a621f` / soft `#f0e2bf`. Logo ink `#1F1B16`, logo dot `#B7752B`.

**R · bright (round 4)** — white `#ffffff`, dark blue `#172A6E`, sun yellow `#FFC21A`,
coral `#FF6F5E`, sky `#6FD6FF`, plus green `#4CD98B` (Hamsti's colour, added 2026-11-09).

**A · Paper & Teal** — paper `#fbf7ef`, soft `#f2ead9`, border `#e3d6bd`, ink `#24201b`,
text `#3c352c`, muted `#6f6556`, primary teal `#0f5e59` / dark `#0a4642` / soft `#dcebe8`,
accent orange `#e8772e` (fills, the dot) / text `#b4501f`, amber soft `#fbecc4`.

**B · Navy & Coral** — paper `#f8f5ef`, ink `#1a2438`, text `#3a3f4b`, muted `#5f6676`,
navy `#1f3050` (header, hero) / light `#2b4162` / soft `#e5eaf1`, coral `#f2774a` (fills) /
text `#b6431b` / soft `#ffe4d8`.

**C · Bright Classroom** — white `#ffffff`, cream `#fff7e0`, ink `#1a2230`, text `#3b4556`,
muted `#566173`, teal `#0f766e` / soft `#ccfbf1`, amber `#f2a900`, orange `#f97316` / soft `#ffedd5`.
Headings in Fredoka (self-host it, no Google request).
