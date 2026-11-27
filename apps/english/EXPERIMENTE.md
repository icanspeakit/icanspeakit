# Experimente

Comparison pages and studies are listed here. Before one is removed, move it to "Archiv"
with: what it was, the decision, the commits that added and removed it, and the command to
bring it back.

## Aktiv

(none yet)

## Archiv

- `/start`: a draft of a tidied-up homepage with a slim menu (its own mock menu, no shared
  components, noindex, linked from nowhere). **Decision:** the course home replaced it
  (Edgar, 2026-11-16); `/start` and `/start-neu` 301 to the course home (astro.config.mjs). Added in the scaffold from deutschacademy `e3dffc9` (as `/start-neu`, renamed in `36a432d`), removed in `3c43343`.
  Bring back: `git checkout 3c43343~1 -- apps/english/src/pages/start.astro` (plus the redirect
  in astro.config.mjs), or `git revert 3c43343` for all five courses.

- `/nav1`–`/nav6`, `/newfont`, `/testnavbarlanguages`, `/test`: deutschacademy experiments,
  not carried into englishacademy. They live in the deutschacademy repo.
- `/games/stadtfahrt` (Stadtfahrt, a driving prototype on the German Führerschein question bank,
  never in the menu) and `/games/vorfahrt` („Quaki kreuzt“, German right-of-way rules at
  crossings). **Decision:** dropped with the Führerschein module (docs/content-plan.md §4,
  confirmed by Edgar 2026-10-28); a UK theory-test trainer would be a separate product. Both URLs
  301 to `/games` (the games hub; `/exercises` until 2026-11-27). Added in `e3dffc9` (scaffold from deutschacademy; moved to /games in
  `36a432d`), removed in db88ba4 by the `cleanup` run. Bring back (with the
  Führerschein data they need):
  `git checkout db88ba4~1 -- src/pages/games/stadtfahrt.astro src/pages/games/vorfahrt.astro src/lib/stadtfahrt.js src/lib/vorfahrt src/styles/vorfahrt.css src/data/fuehrerschein src/lib/fahrQuiz.js src/lib/fahrQuizData.js src/lib/fahrSzene.js src/lib/fuehrerscheinData.js`
  (or `git revert db88ba4` for the whole Führerschein module).
