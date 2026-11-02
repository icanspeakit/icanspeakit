# games-dialogue: run report (2026-10-30)

Item: the front desk sim (`buergeramt`), the manners simulator (`knigge`) and the Lindenau RPG as
Brambleford, per content-plan §5.9. One run, finished. Build is green.

## What was done

| Area | Files | Commit |
|---|---|---|
| **Bruno's Front Desk** (`/spiele/buergeramt`) | `src/lib/buergeramt/{regeln,faelle,daten,spiel,tisch,kunde,ton}.js`, `src/data/buergeramt/kunden.json`, `src/pages/spiele/buergeramt.astro` | 157ae13 |
| **Manners Simulator** (`/spiele/knigge`) + en-GB voice for the dialogue games | `src/lib/knigge/scenes.js`, `src/lib/knigge/game.js`, `src/lib/spielKit.js` | 4bd7d1a |
| **The Legend of Brambleford** (`/spiele/lindenau`) | `src/lib/lindenau/{quests,action,game,coins,gloss}.js`, `src/data/uebersetzungen/lindenau.json`, `src/pages/spiele/lindenau.astro`, `src/lib/catalog.js`, `src/data/suche-seiten.json`, 5 values in `public/i18n/en.json` (`ld.item*`) | 5103d01 |
| Content plan status, this report | `docs/content-plan.md`, `automation/reports/games-dialogue.md` | (report commit) |

### Front desk
- The German game was about residence registration (Anmeldung). The UK has no such
  registration, so the desk now handles **resident parking permits**, as the plan suggested.
  The paper kinds keep their ids: `ausweis` is now the photocard driving licence, `pass` the
  passport, `meldeschein`/`abmeldung` the permit application (boxes *New permit / Change of
  address / Cancel permit*), and `wgb` the tenancy agreement used as proof of address.
- There are 9 rules. Five are `art: "echt"`, meaning usual UK council practice, with GOV.UK
  sources: name and date of birth match the photo ID, the ID is in date, proof of address, the
  right box, a signature. The source URLs (`gov.uk/parking-permit`, `gov.uk/renew-driving-licence`)
  were checked on 2026-10-30. The texts say "many councils" because every council sets its own
  permit rules.
- The other four are marked Brambleford rules (`art: "lindenau"`, value kept): apply within
  2 weeks of moving in, every letter of the name counts, black pen only, and a desk that only
  does permits. The joke customer is a dog who wants a library card (room 12).
- 15 mistakes, each with three English questions (one fits), a customer answer that fixes the
  case and one that doesn't, at A2–B1. Customer lines are in `kunden.json`.
- Dates show as DD/MM/YYYY and weekdays in English. The stamps are APPROVED and REJECTED. The
  keys moved from G/A to **A (approve) / R (reject)**, because "A" used to mean *abgelehnt*.
  The default signature ink is now black, so it matches the black-pen rule.
- Only the 3 hand-written day-1 cases are playable, as before. The prototype has no case
  generator.

### Manners simulator
- All 19 scenes are rewritten for the UK, with the same scene ids, people ids, backdrops and
  delta bands. A validation script confirmed every turn has an option of +10 or more and no
  tied top delta.
- The UK etiquette points are queue jumping, carrier bag charges, giving up a seat, short lift
  greetings, office cake, first names with your manager ("mate" is too much), "interesting idea"
  as British understatement, softened feedback, pub rounds, noise after 11 pm, white lies at
  dinner, splitting the bill, tipping about 10% when service isn't included, Mr + surname vs
  first names, and parents' evening.
- The German du/Sie scene is now about **Mr + surname vs first name**, with the common
  learner slip "Mr Martin".
- The after-work pub scene got one extra turn about buying rounds. It is the only structural
  addition.
- `de` holds the English line (key kept), and `en` a plainer paraphrase for the 💡 help. In
  wheel topics, `sie`/`du` now mean polite/casual phrasing.
- `more` links go to the existing UK culture topics (queuing, personal space, saying hello,
  small talk, time, understatement, rounds, dating, tipping, Mr/Ms, school system).
- All German fallback strings in `game.js` are now English. The 13 existing `kn.*` keys in
  en.json were already English.

### Brambleford RPG
A subagent did this part under my brief. I reviewed and committed it. `node scripts/check-lindenau.mjs`
passes (2 areas, 6 errands, 25 answers).
- **Morning errands:** bakery (two sausage rolls, *a coffee*, £6.40), station (an off-peak
  return to London, platform 3), GP surgery (*an appointment*, "Are you registered here?", date
  of birth).
- **Afternoon errands:** supermarket, new neighbour Mrs Linden, café (tea and carrot cake).
- Story and action texts are in English (Count Grubby, Baron Dusty, Yuck!/Splash!), and so are
  the UI fallbacks, the menu and search entries, and the power-up texts in en.json.
- **Small code change:** the monster-word picker used to grab capitalised German nouns. Quests
  now carry an optional `words` list, and the regex is English.

## Decisions
- **Shared voice:** `src/lib/spielKit.js` speaks **en-GB** now, with an en-GB voice first and
  any English voice as fallback. Neither game has English clips. `public/audio/lindenau` never
  existed, and Knigge always uses the browser voice. `VOICES` in `quests.js` names en-GB Azure
  voices for a future clip script, which doesn't exist yet.
- **The ar/uk/tr glosses for Lindenau were emptied** (`lines: {}`). They were keyed by the
  German lines, so they no longer matched anything. The help now falls back to the English
  paraphrase.
- I kept code ids, file names and routes (`buergeramt`, `knigge`, `lindenau`, `de` keys,
  `art: "lindenau"`) so nothing else breaks. Comments say where a German name was kept.

## For Edgar to review
- **Front desk "real" rules:** these are general UK council practice, not the law of one
  council. The signature rule's source is only "common practice", with no specific page.
- **Saved progress no longer matches:** Lindenau review ids are `<quest>:<turn>`, and the GP
  quest now has 5 turns instead of 4. Knigge stores the topics a person likes by person id. Old
  localStorage from German test plays may point at different sentences.
- **Help lines:** all the plain-English paraphrases (`en`) are my own drafts and have not been
  checked by a teacher.
- **Tube level:** one Brambleford action level is still the "Tube" level, which is odd for a
  market town. It is a fantasy level, so it stayed.
- **Outside this item:** German still appears in `catalog.js` (other games' titles), in
  `unterricht-wortschatz.json` and in `suche-seiten.json` ("Im Bürgeramt – Sprechen B1"). These
  belong to other items or `cleanup`.

## Build
`timeout 1500 pnpm build`: green, 1,637 pages, postbuild checks ok.
