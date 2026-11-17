# Traction, Spanish and French: rules for every lane

The `traction` batch (2026-11-15) made the English course the page ChatGPT and Bing can recommend
for free practice material: free PDFs on `/english/knowledge`, download pages per UI language,
printable worksheets with search titles. This batch copies that recipe to the Spanish course
(https://icanspeak.it/espanol/, `apps/spanish`) and the French course
(https://icanspeak.it/francais/, `apps/french`).

**Read first, in this order:**
1. `prompts/traction/SHARED.md`: why (the deutschacademy numbers) and all rules on content, git,
   builds, servers and checks. They apply here unchanged, with `traction-es-fr` in place of
   `traction` in paths (`_tmp_screens/traction-es-fr-<lane>/`, done file in
   `prompts/traction-es-fr/done/<lane>.md`).
2. `prompts/traction/done/downloads.md` and `prompts/traction/done/worksheets.md`: what was built
   for English and their "For Spanish / French" sections. `apps/english` is your reference
   implementation: read its files, copy and adapt, never edit them.
3. The CLAUDE.md / ARCHITECTURE.md of the app you touch.

## What differs from the English batch
- One lane per course does both downloads and worksheets, so no two lanes share an app.
- URLs, slugs and #fragments are in the language being learned (`/espanol/conocimientos`,
  `/francais/savoirs`, `/espanol/profesores/fichas/…`, `/francais/enseignants/fiches/…`). Keep the
  existing paths; a renamed path needs a redirect from the old one. PDF file names in the course
  language too (e.g. `gramatica-espanola-a1.pdf`, `grammaire-francaise-a1.pdf`), not `grammatik-*`.
- The text a learner or teacher reads on the paper and in titles is in the course language, correct
  and natural (Spanish: follow the app's convention on es-ES vs es-419 notes; French: France
  French). Flag anything you are unsure of in the done file instead of guessing.
- Official free sample papers are linked, never re-hosted: DELE and SIELE (Instituto Cervantes) for
  Spanish; DELF, DALF, TCF (France Éducation international) and TEF (CCI Paris) for French. Check
  each URL answers 200.
- Other sessions have uncommitted changes in this folder right now (`apps/*/src/lib/analytics.js`,
  `apps/rel/`, `DEPLOY.md`, `package.json`, `pnpm-lock.yaml`). They are not yours: never stage them.
- No push, no merge, no deploy. The session that started you releases after both course lanes are done.

## Lanes
`spanish` (port 4541), `french` (port 4542), `outreach` (no server). All in parallel.
