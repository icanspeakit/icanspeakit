// de.wiktionary.org fetch, cache and parse — shared by scripts/fetch-wiktionary.mjs (the lexicon)
// and scripts/berufe-morph.mjs (the Berufe decks), so both source morphology by the same rules.
// Every parsing rule is explained where it is defined; rationale: docs/lexicon-enrichment-v1.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API = "https://de.wiktionary.org/w/api.php";
const UA = "englishacademy-lexicon/0.1 (https://icanspeak.it/english; build script)";
const BATCH = 50; // API maximum for titles=A|B|C — 8k lemmas becomes ~160 calls
const PAUSE_MS = 400;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CACHE_DIR = path.join(ROOT, "node_modules", ".cache", "wiktionary");

const safe = (title) => encodeURIComponent(title).replace(/[%*?:<>|"\\/]/g, "_");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cached(title) {
  const f = path.join(CACHE_DIR, `${safe(title)}.wiki`);
  return existsSync(f) ? readFileSync(f, "utf8") : null;
}

function cache(title, text) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path.join(CACHE_DIR, `${safe(title)}.wiki`), text, "utf8");
}

/** Fetches wikitext for up to BATCH titles. Returns Map<title, wikitext|"">. */
async function fetchBatch(titles) {
  const url =
    `${API}?action=query&prop=revisions&rvprop=content&rvslots=main` +
    `&format=json&formatversion=2&redirects=1&titles=${titles.map(encodeURIComponent).join("%7C")}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Wiktionary API ${res.status} ${res.statusText}`);
  const data = await res.json();

  const out = new Map();
  // `redirects` and `normalized` mean a returned page title may differ from what we asked for;
  // map it back so the caller can look up by its own lemma.
  const back = new Map();
  for (const n of data.query?.normalized ?? []) back.set(n.to, n.from);
  for (const r of data.query?.redirects ?? []) back.set(r.to, back.get(r.from) ?? r.from);

  for (const page of data.query?.pages ?? []) {
    const asked = back.get(page.title) ?? page.title;
    out.set(asked, page.missing ? "" : page.revisions?.[0]?.slots?.main?.content ?? "");
  }
  for (const t of titles) if (!out.has(t)) out.set(t, "");
  return out;
}

/** Single title, cache-first — used by the compound-head fallback, which needs a few extra pages. */
async function onePage(title) {
  const hit = cached(title);
  if (hit !== null) return hit;
  const got = await fetchBatch([title]);
  const text = got.get(title) ?? "";
  cache(title, text);
  await sleep(PAUSE_MS);
  return text;
}

/**
 * Walks the compound's head candidates and returns the first that is a German noun with a
 * {{Deutsch Substantiv Übersicht}} block. Caps the number of lookups — a long compound has many
 * candidate suffixes and most are nonsense.
 */
async function resolveViaHead(lemma) {
  let tries = 0;
  for (const head of headCandidates(lemma)) {
    if (tries++ >= 24) break;
    const sec = germanSection(await onePage(head));
    if (!sec) continue;
    const block = uebersicht(sec, "Substantiv");
    if (!block) continue;
    const gender = toGender(param(block, "Genus") ?? param(block, "Genus 1"));
    if (!gender) continue;
    const pl = plurals(block);
    return { head, gender, plural: pluralFromHead(lemma, head, pl[0] ?? null) };
  }
  return null;
}

async function wikitextFor(titles) {
  const result = new Map();
  const todo = [];
  for (const t of titles) {
    const hit = cached(t);
    if (hit === null) todo.push(t);
    else result.set(t, hit);
  }
  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    process.stdout.write(`  fetching ${i + 1}–${i + slice.length} of ${todo.length}…\r`);
    const got = await fetchBatch(slice);
    for (const [t, text] of got) {
      cache(t, text);
      result.set(t, text);
    }
    if (i + BATCH < todo.length) await sleep(PAUSE_MS);
  }
  if (todo.length) process.stdout.write("\n");
  return result;
}

// ---------------------------------------------------------------------------
// Parsing — every rule here corresponds to a wrong result from the naive version.
// See docs/lexicon-enrichment-v1.md §4.
// ---------------------------------------------------------------------------

/**
 * RULE 1 — isolate the German section before extracting anything.
 * `alt` carries Deutsch, Italienisch, Katalanisch and Polnisch sections; parsing the whole page
 * returns the Polish plural "alty" for a German adjective.
 */
function germanSection(wikitext) {
  if (!wikitext) return null;
  const lines = wikitext.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^==[^=]/.test(l) && /\{\{Sprache\|Deutsch\}\}/.test(l)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^==[^=]/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/**
 * RULES 3, 4, 5 — multiple {{Lautschrift}} on the IPA line are pronunciation variants, not
 * duplicates (Mädchen: ˈmɛːtçən, ˈmeːtçən). Anything after {{Pl.}} is the plural's pronunciation,
 * not a variant of the singular. Empty {{Lautschrift||spr=xx}} must be skipped, not stored as "".
 */
function extractIpa(section) {
  if (!section) return [];
  const line = section.split("\n").find((l) => l.includes("{{IPA}}") && l.includes("{{Lautschrift"));
  if (!line) return [];
  const singular = line.split("{{Pl.}}")[0];
  const out = [];
  for (const m of singular.matchAll(/\{\{Lautschrift\|([^}|]*)/g)) {
    const v = m[1].trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * COMPOUND HEAD FALLBACK.
 *
 * German Wiktionary has thin coverage of long administrative compounds — measured at 18 of 125
 * generated B1 lemmas, all of them real words (Niederlassungserlaubnis, Wohnberechtigungsschein,
 * Mietspiegel, Prüfungsordnung, Lebensmittelverschwendung). A missing page there is a coverage
 * gap, not evidence the word was invented, and treating the two the same made the quality gate
 * useless.
 *
 * A German compound takes its gender and its plural pattern from its LAST element:
 * die Erlaubnis → die Niederlassungserlaubnis; Erlaubnis/Erlaubnisse → …erlaubnis/…erlaubnisse.
 * So when the whole compound misses, look up progressively shorter suffixes and inherit from the
 * head. Anything sourced this way is stamped `wiktionary-compound-head` — it is an inference from
 * a sourced fact, not the same thing as a sourced fact, and the audit report must say so.
 *
 * Returns candidate heads longest-first, capitalised as a noun.
 */
function headCandidates(lemma) {
  const out = [];
  for (let i = 1; i <= lemma.length - 4; i++) {
    const tail = lemma.slice(i);
    out.push(tail[0].toUpperCase() + tail.slice(1));
  }
  return out;
  // LONGEST FIRST, deliberately. A short suffix can be a real word without being the head —
  // Lebensmittelverschwendung ends in "…endung", and die Endung would give the right gender but
  // build the plural as "Lebensmittelverschendungen". Finding the true head first avoids that.
  // Two earlier bugs, both measured: skipping heads that start with s/n threw away …schein, and
  // a 6-try cap never reached Erlaubnis in Niederlassungserlaubnis (14 suffixes down).
}

/** Applies the head's plural pattern to the compound: Erlaubnis→Erlaubnisse ⇒ …erlaubnis→…erlaubnisse. */
function pluralFromHead(lemma, head, headPlural) {
  if (!headPlural) return null;
  const idx = lemma.toLowerCase().lastIndexOf(head.toLowerCase());
  if (idx < 0) return null;
  const prefix = lemma.slice(0, idx);
  return prefix + headPlural[0].toLowerCase() + headPlural.slice(1);
}

/** First {{Deutsch <kind> Übersicht}} block in the German section. */
function uebersicht(section, kind) {
  if (!section) return null;
  const m = section.match(new RegExp(`\\{\\{Deutsch ${kind} Übersicht([\\s\\S]*?)\\n\\}\\}`));
  return m ? m[1] : null;
}

// A dash is Wiktionary's way of saying "this form does not exist" (verheiratet has no
// comparative). That is data, not a value — returning it as a string makes every uninflectable
// word look like a disagreement.
const NONE = new Set(["—", "–", "-", "", "?"]);

function param(block, name) {
  if (!block) return null;
  const m = block.match(new RegExp(`\\|\\s*${name.replace(/[.*+?^${}()[\]\\]/g, "\\$&")}\\s*=\\s*([^\\n|}]*)`));
  const v = m?.[1]?.trim();
  return v && !NONE.has(v) ? v : null;
}

/** RULE 2 — plural params are numbered (Mädchen: "Nominativ Plural 1", "… 2"). */
function plurals(block) {
  if (!block) return [];
  const out = [];
  for (const m of block.matchAll(/\|\s*Nominativ Plural(?:\s+\d+)?\s*=\s*([^\n|}]*)/g)) {
    const v = m[1].trim();
    if (v && v !== "—" && v !== "-" && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * RULE 7 — Wiktionary uses m/f/n, this repo uses der/die/das.
 * Only those three map. A template can carry `Genus=0` or other junk in the slot, and passing it
 * through produced `bad gender "0"` on Heizkosten — caught by validate-lexicon.mjs, which is the
 * argument for the validator running after every fill rather than at the end of the project.
 */
const GENUS = { m: "der", f: "die", n: "das" };
const toGender = (g) => (g && GENUS[g]) || null;

/** RULE 6 — normalise for comparison only; the repo stores "am ältesten" and keeps it. */
const bare = (s) => (s == null ? null : String(s).replace(/^am\s+/, "").trim());

export { API, UA, BATCH, PAUSE_MS, CACHE_DIR, safe, sleep, cached, cache, fetchBatch, onePage, resolveViaHead, wikitextFor, germanSection, extractIpa, headCandidates, pluralFromHead, uebersicht, NONE, param, plurals, GENUS, toGender, bare };
