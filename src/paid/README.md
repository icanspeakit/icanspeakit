# src/paid/ — paid content, kept out of every page

Nothing in this folder may be imported by a page, component or `src/lib/` module. Files
in `src/data/` are inlined into the static HTML of the pages that use them, and that HTML is
public and indexed. Files here are not: `scripts/build-paid-manifest.mjs` (prebuild) copies
them to `public/inhalt/` and writes an outline (title, modules, counts) to
`src/data/pruefungen/paid-manifest.json`. A page shows the outline and a `PremiumLock`, and
fetches `/inhalt/…json` only when `can(feature)` from `src/lib/access.js` allows it.

| Folder | What | Unlocked by |
|---|---|---|
| `pruefungen/saetze/` | C1 Übungssätze (generic exam engine) | `premium` |
| `pruefungen/dtz/` | DTZ Übungssätze 2–4 | `pack_dtz` or `premium` |
| `grammatik/` | the exercises of every C1 grammar topic (`src/data/grammatik/<id>.json` keeps only titles, hints and counts) | `premium` |

This is a soft lock by decision (2026-10-02): someone who opens `/inhalt/…` directly gets
the file. What it guarantees is that search engines do not index paid questions and answers
— `Disallow: /inhalt/`, `X-Robots-Tag: noindex` (vercel.json), no links to the files — and
`scripts/check-paid-leak.mjs` (postbuild) fails the build if a passage from here appears in
any page's HTML.

New C1 grammar topic: write it in `src/data/grammatik/` as usual, then
`node scripts/build-paid-manifest.mjs --split-grammar` moves its exercises here. The prebuild
fails until you do.
