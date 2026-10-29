# Run report: `grammar-structure`

Run date: 2026-10-29. Branch `content`. Follows `docs/content-plan.md` §1.4, §3 (side files), §7, §9.
Build: `pnpm build` passes (2438 pages, postbuild leak checks OK).

## What was done (commits)

| Commit | What |
|---|---|
| `8ce5882` | **Syllabus** `grammatik-lehrplan.json`: English teaching order per level (A1 19, A2 18, B1 27, B2 13, C1 11 topics). The old `id:A2` split entries are gone (no English topic teaches two levels on one page). `src/lib/grammatikOrder.js` (PDF book chapter order, `/wissen`) is now the same order flattened. **Related topics** `grammatik-verwandt.json` recomputed for the English topics: every topic id has 3–4 related topics; all ids checked against existing pages. |
| `505ce60` | **Reference lists** `nachschlagen/*`: regular and irregular verbs (schwach = regular, stark = irregular with past ≠ participle in pattern groups, gemischt = irregular with past = participle), phrasal verbs (trennbar = separable, untrennbar = inseparable, beides = no object, new section `three-part`), verbs + prepositions (sections about … with, column “what follows”). The reference page `/grammatik/[ref]`, the worksheet builder (`lib/arbeitsblatt/nachschlagen.js`) and the search kinds (`lib/nachschlagenIndex.js`) lost their German labels. |
| `b391db5` | **Verb tables** `verbtabellen.json` + `lib/verbtabellen.js`: be/have/do, modals (can, must, have to, would like), 22 irregular, 10 regular, 6 phrasal verbs. English rules for regular forms (‑s/‑es/‑ies, ‑ed/‑d/‑ied, doubling, British ‑ll‑); highlighting of irregular forms works as before. `/grammatik/verben` page, live quiz (`lib/liveQuiz/chapters.js`: verb tables + reference lists) and worksheet now ask English forms. `en.json` `verben.*` / `nav.wissen.*` keys updated. |
| `3374058` | **Parts of speech** `wortarten.json` (10 classes, English tips, hand-set English examples, help-language lines kept where the meaning did not change; article line re-translated) and the German labels on `/grammatik/wortarten`. |
| `1ce222c` | **Course plan** `kursinhalte.json`: A1.1–C1 as an English course (same 9 levels, same block counts, can-do goals, grammar, vocabulary, exam lines from B1). Lesson planner `lib/stundenplan.js`: grammar-line → topic rules rewritten in English (every line but one links a topic; “be going to” at A1.2 has none because the future topic is B1), video search and exam links (Trinity → `/telc`, Cambridge → `/goethe`, IELTS → `/testdaf`, as in plan §2). |
| `613c12d` | **Prepositions trainer** `praepositionen-trainer.json`: the 14 German case packs became 14 English packs (12 questions each, 168 total): time at/on/in; place in/on/at; before/after/from…to/until; going places; position; movement; place vs movement; by bus/on foot; verbs + prepositions (2 packs); for/since/during/by/until; adjectives + prepositions; formal prepositions; nouns + prepositions. Page labels and `praep.*` keys in `en.json`. |
| `bf2961d` | **Translations** `uebersetzungen/grammatik.json` (91 topic-rule entries, glossary) and `grammatik-themen.json` (78 topic names) emptied, shapes kept. |
| `443c829` | `docs/content-plan.md` notes; new queue item `grammar-start-book`. |

## Decisions

1. **Syllabus = topic level.** Every topic is listed under its own `level` (the sort code in `lib/lehrplan.js` looks a topic up in its own level). Left out of the run on purpose: `wortarten`, `komposita`, `wortbildung-nomen` (reference/word-formation topics, as in the German plan). Draft topics are listed too; the run skips them until they are reviewed (existing rule).
2. **Verb tables keep the person × tense shape** instead of plan §1.4's “principal parts”: English conjugates in exactly that shape (I am / he has / she went / has gone), the page, live quiz, worksheet and search need no new shape, and the past participle is still shown in the perfect column. Plan §1.4 updated.
3. **Modals without forms**: `can` → past *could*, perfect *have been able to*; `must` → *had to*; `would like` → *wanted*, each with a note (like German *möchten → wollte*). Verbs with a note are left out of the worksheet's past-tense tasks (existing rule).
4. **Phrasal-verb examples** in the separable list use a pronoun object where the sentence is short (≤ 9 tokens), because the worksheet builds sentences from them and a noun object would allow two correct orders.
5. **Verbs + prepositions examples** use the section's preposition once, before any other use: the worksheet and live quiz blank its first occurrence (checked with the same regex).
6. **Prepositions trainer pack ids kept** (`a1-dativ` etc.) as slots: they are progress keys and i18n keys. 12 questions per pack, not 25: each item was checked so only one option is right (BrE/AmE splits like *at/on the weekend*, *in/at school*, *excited about/for* avoided).
7. **No coursebooks named** in the course plan: `lehrwerke.grundstufe/oberstufe` are empty, so the “fits these coursebooks” box is hidden. Naming commercial English coursebook series is Edgar's call.
8. **Translations emptied, not rewritten**: every help-language entry explained the German topic of its slot (e.g. German adjective endings under “Order of adjectives”); plan §1.4 forbids stale German-based translations next to English content, and translating ~90 topic rules into 4–10 languages reliably was not possible in this run. Pages render without the language switch (the code's documented fallback). `grammatik-ui.json` (keyed by German UI strings) is left alone.
9. **Starter grammar book split off** (`grammatik-start/*`) into the new queue item `grammar-start-book`: it is a 10-chapter PDF book whose base content is German and whose generator treats German as the subject; doing it properly needs code changes plus the book and 17 translation files. Plan §3/§7/§9 updated in the same commit. `content/program.json` titles stay with the `vocab-*` runs (§7).

## For Edgar to review

- **Syllabus order** (`grammatik-lehrplan.json`): A1 starts with *be* and pronouns, then nouns/articles, then the present simple; A2 with frequency adverbs and present continuous, then past simple. Reorder freely; `lib/grammatikOrder.js` must be kept in step by hand (comment there).
- **Course plan exam lines** (B1–C1): parts named from the current Cambridge (B1 Preliminary, B2 First, C1 Advanced), Trinity ISE and IELTS formats from memory, not checked against the official sites in this run; word limits used: B1 PET writing ~100, B2 First 140–190, C1 Advanced 220–260, IELTS Task 2 ≥ 250. The `exams` run should verify them.
- **Coursebooks**: name English series in `kursinhalte.json` `lehrwerke` or leave the box hidden.
- **Help-language rules** on topic pages are gone for now; decide whether a later run should refill `uebersetzungen/grammatik.json` from the English topics.
- `wortarten.json` `fehler` links are empty until `/grammatik/typische-fehler` has English pairs (`idioms-mistakes`).

## Left / uncertain

- Still German UI fallbacks behind i18n keys on `/praepositionen` and `/grammatik/verben` (rendered English by the build); the lesson planner's phase texts in `lib/stundenplan.js` are German (`teachers`).
- `src/data/arbeitsblatt/*`, typische-fehler: other items.
- Other UI languages' `verben.group.*` / `praep.pack.*` keys in `public/i18n/<lang>.json` still describe the German content (UI-language files were not part of this item).
