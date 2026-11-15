# Lane: linguistics (icanspeak.it/linguistics/)

You own `apps/linguistics/**`. Keep its editorial look (warm paper, Fraunces/Inter) for now; this lane
only brings it into the family.

- Logos, favicons (svg, 16, 32, ico), apple-touch-icon, OG default per MANIFEST, through `u()` (base-aware).
  The old `icanspeakit-*` logos load Literata from Google inside `<img>`; replace every use.
- Header: the new wordmark + course-style pill "linguistics" (same yellow pill).
- Footer: "part of icanspeak.it" with links to the hub and /english/.
- Import `tokens.css` and switch the primary/accent tokens to navy `#172A6E` and the brand yellow for
  highlights, keeping the paper background; check AA.
- Build, `check:base`, browser check (home, a word story, an exercise, the dashboard), done file, commit.
