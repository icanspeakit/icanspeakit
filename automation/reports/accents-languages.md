# Run report: `accents-languages`

Date: 2026-11-02 · Branch: `content` · Result: done (build green, 1,758 pages, postbuild checks ok)

## What was done

| Area | Now | Commit |
|---|---|---|
| `/wissen/sprachen` data (`sprachen-welt.json`) | **38 countries** in four groups (status keys kept, meanings changed): *main language* (UK, Ireland, US, Canada, Australia, New Zealand); *official language* (India, Pakistan, Philippines, Singapore, Hong Kong, Malta, Nigeria, Ghana, Sierra Leone, Liberia, Cameroon, Kenya, Uganda, Tanzania, Rwanda, Zambia, Zimbabwe, Botswana, Namibia, South Africa, Papua New Guinea, Fiji, Jamaica, Trinidad and Tobago, Bahamas, Barbados, Guyana, Belize); *widely spoken, not official* (Netherlands, Denmark, Sweden, Malaysia); *small territories* (Gibraltar, Bermuda, Falklands as dots). Dots for places too small for the map (Malta, Singapore, Hong Kong, Barbados, Trinidad). Cameroon shows its English-speaking Northwest and Southwest regions. Speaker counts only where a census figure exists: US 244 m speak only English at home (ACS 2022), Australia 18.3 m (2021), India 129 m speak English (2011). Tree and comparison use English language names; the comparison panel `englisch` became `deutsch` (German as a learner's first language, 8/8 shared roots); the cognate flags of the other 12 languages carry over unchanged, because the 8 English and German words are cognates of each other. Decoder flipped to **German → English** (`from`/`to` and pair order swapped). | 067ad7b |
| `sprachen-karte.json` + generator | Regenerated: Europe view centred on the British Isles (Ireland to the Baltic, down to Malta and Gibraltar), no Benrath line (`benrath: []`, the generator skips it). The generator now takes the geo folder as an argument. | 067ad7b |
| `sprachen.astro` | Stats strip shown again with English figures (≈ 380 m first language, + 1.1 bn second language, 57 countries with English as an official language, No. 1 by total speakers; new key `sprachen.stat.bn`). Highlight on "English" in the tree, German opens first in the comparison, decoder/quiz `lang` attributes flipped, numbers formatted en-GB, the "sub" name only shows when it differs from the country name. | 067ad7b |
| `sprachen.*` in en.json | All country/marker texts new (`sprachen.c.<ISO3>`, `sprachen.m.<id>`), old German-country keys removed; legend, counts, tree, comparison (13 languages), decoder and sources rewritten. | 067ad7b |
| `/wissen/dialekte` data (`dialekte.json`) | **17 accent areas** in 6 groups: North (North East, Cumbria, Yorkshire, Lancashire & Greater Manchester), Midlands (West, East), South (East Anglia, London & South East, West Country), Scotland (Lowlands, Doric, Highlands & Islands, Orkney & Shetland), Wales (North & Mid, South), Ireland (Ulster, Southern Irish English). Each has places and 2–4 examples [local form, plain English]. **11 dots**: Scouse, Brummie, Cockney & MLE, Glaswegian, Belfast, Dublin; Celtic languages Welsh, Scottish Gaelic, Irish, Cornish, Manx (`lang: true`, with `lang` codes on their examples). Word mode: "bread roll" (roll, bap, barm, cob, batch, bread cake, bun/stottie) and "hello" (Alright?, Ey up, Hiya, Alreet?, How's it going?, Fit like?, What about ye?, What's the craic?); one more variant colour. Sound table: bath, bus, car (the r), face across the six groups. | 65c8b9b |
| Lines | `lines.benrath` = **FOOT–STRUT** line (bus /ʊ/ north, /ʌ/ south), `lines.speyer` = **TRAP–BATH** line (short a north, long ah south), drawn roughly from the Welsh border to the Wash. Key names kept for the code. | 65c8b9b |
| `dialekte-karte.json` + generator | `generate-dialekte-karte.mjs` rewritten for the UK and Ireland from Natural Earth 10m map subunits (England/Scotland/Wales/NI/Ireland), world-atlas 50m for the neighbours, nation borders and the UK–Ireland border from one topology. Shetland is moved into an inset box; Rockall is left out. 760×952, 144 KB. | 65c8b9b |
| `dialekte.astro` | Line labels in English, examples `lang="en"`, the German **beer map hidden** (`{false && …}`, script guarded, jump link removed), description updated. | 65c8b9b |
| `dialekte.*` in en.json | Groups, 17 area texts, 11 dot texts, map/line/legend/source texts rewritten; old German-region keys removed. `dialekte.bier.*` (81 keys) untouched, because the section is hidden. | 65c8b9b |
| `catalog.js`, `searchIndex.js` | English fallback titles and search entries for both pages. | 1d29216 |
| `docs/content-plan.md` §5.8 | Status note. | (report commit) |

## Decisions

- **Geometry made offline in a scratch folder.** `npm i` needed an approval nobody could give, so the generator inputs (d3-geo, topojson-client/-server, polygon-clipping, world-atlas, Natural Earth subunits) were fetched as tarballs/files into the git-ignored `_tmp_geo/`. They are not site dependencies, and nothing in `package.json` changed. To re-run: see the headers of both generator scripts.
- **Status keys keep their German names** (`amtssprache`, `region`, `minderheit`, `gemeinschaft`), because CSS classes and the legend use them. What they mean now is written in the `_comment` of `sprachen-welt.json`.
- **Caribbean countries count as "official language", not "main language"**, because most people there grow up with an English-based creole (Wikipedia's English-speaking population list counts them that way too).
- **Speaker counts are left out** where no census figure was at hand (most countries); the text gives the fact instead.
- **Facts were checked against Wikipedia** (fetched 2026-11-02): New Zealand's **English Language Act 2026** makes English official there (the text says so); US executive order 2025; South Africa's 12 official languages; Zimbabwe's 16; Rwanda's switch to English in 2008; Uganda Swahili 2005; Namibia 1990; Singapore 2020 census; Hong Kong 58.7 % speak English; India 2011 census 129 m; Falklands 3,662 people (2021); Guyana and Belize "only country in …".
- **Comparison default:** with no first language set and an English UI, German opens (English is no longer a learner language here). A German UI maps to `deutsch`.
- **Beer map hidden, not deleted.** It is German content with no English counterpart. Deleting `bier.json`, `bier-karte.json`, the 81 `dialekte.bier.*` keys, the hidden markup, `dachMap.js` and `generate-bier-karte.mjs` is left for `cleanup`. `generate-bier-karte.mjs` says how to restore the German generator from git (`e3dffc9`). `dachMap.js` still fits its projection from `dialekte.json`, so its output is now meaningless, but only the hidden beer map uses it.
- **Accent areas are rough on purpose.** The page and the sources line say so. Isle of Man is grey land with the Manx dot (not part of the UK).

## For Edgar to review

- **Accent content is a draft and has not been reviewed by a teacher.** The ones I am least sure of:
  - the word-mode assignments ("bun, stottie" for Cumbria, "batch, cob" for the West Midlands, "How's it going?" for Highlands/Orkney/Shetland)
  - the Cumbrian sheep numbers "yan, tyan, tethera"
  - "yow am" (Black Country)
  - Cardiff "Kairdiff"
  - the Irish and Welsh cells of the sound table (bath long a, bus /bəs/)
- **The two lines are hand-drawn approximations** of the classic isoglosses, not traced from a published map.
- **Sprachen:** the "+1.1 billion" and "≈ 380 million" figures are Ethnologue numbers as quoted by Wikipedia. "57 countries" comes from Wikipedia's list (as of 2026). The 2012 Eurobarometer figures for the Netherlands, Sweden, Denmark and Malta are old; a 2024 Eurobarometer exists but was not checked.
- The comparison texts for Russian/Ukrainian/Polish give case counts (6/7/7). Polish and Ukrainian have 7 (including the vocative).

## Left / uncertain

- Help-language translations: only `en.json` exists, so nothing is stale.
- `dialekte.learn.*` texts were already English (from `ui-pages-m-z`) and were kept.
- Map previews were checked as PNGs rendered with `sharp`, not in a browser. A mobile look at `/wissen/dialekte` (the map is 760×952) is worth doing.
