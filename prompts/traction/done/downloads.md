# Lane downloads: done

*2026-11-15. Free English PDFs and the official sample papers on https://icanspeak.it/english/knowledge,
plus one copy of that page per UI language at `/english/<lang>/downloads`.*

## What was there (Tier 1)

- `/knowledge` listed 25 catalogue entries; only the 6 Life in the UK PDFs existed on disk, the
  rest (grammar, word lists, the ten "English for work" booklets, Grammar Start) were dead
  entries that `downloads.js` silently dropped.
- The 6 existing PDFs (`leben-in-deutschland-*.pdf`) had English facts inside a **German** shell:
  "DEUTSCHACADEMY · PRÜFUNGSVORBEREITUNG", "Leben in Deutschland (Einbürgerungstest)",
  "16 Bundesländer", German test rules.
- The generators were the German course's: German book copy ("Jetzt üben Sie", "Merke",
  a page of "the 30 most frequent **German** words"), teal colours, levels A1–B2 only, German
  editions logic. Grammar Start was already English but linked to German routes
  (`/grammatik`, `/wortschatz`, `/einstufungstest`, `/pruefungen`) and to topic **ids**
  (`/personalpronomen`) instead of slugs (404s), and carried the old "für Dich" logo.
- Official links pointed to Cambridge "exam format" pages, not to the sample papers.
- Language copies existed as `/english/<lang>/knowledge` (entry-pages integration), with an
  English FAQ-less page and English JSON-LD.
- deutschacademy builds `/es/downloads` etc. the same way: its entry-pages integration copies
  `/wissen` to slug `downloads` per language (`src/data/entry-pages.json`).

## What changed

PLACEHOLDER
