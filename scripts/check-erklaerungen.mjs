// Check of the German explanations (src/content/lexicon/i18n/de.json, `deHint` in lexicon.js):
// the "Erklärung" face of the Wortschatz flashcards, tab „Auf Deutsch“.
//
//   node scripts/check-erklaerungen.mjs                 every word A1–B2
//   … --level B1                                        one level (repeatable: --level A1 --level A2)
//   … --file kandidaten.tsv                             check drafts (id<TAB>text per line) as if
//                                                       they were in de.json; only those ids are
//                                                       reported, duplicates against everything
//   … --quiet                                           summary line only
//
// The rules (i18n/README.md): every explanation is one or two whole sentences in simple
// German. Capital first letter, a finite verb, a full stop (or ? / !) at the end, 6 to 14
// words, no dash, no arrow, no „Gegenteil:“ label. The word itself must not appear, not even
// inside a longer word, because the card hides it. Within one Lernset (one unit) no two words
// share an explanation.
//
// Gap sentences („Die Wohnung ist klein, … schön.“) are solved through de-fill.json and stay
// as they are: for those only the solution is required. Deterministic, no network; exits 1 on
// any finding.
import fs from "node:fs";
import { all } from "../src/lib/lexicon.js";

const argv = process.argv.slice(2);
const opt = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const LEVELS = opt("--level").length ? opt("--level").map((l) => l.toUpperCase()) : ["A1", "A2", "B1", "B2"];
const FILE = opt("--file")[0] ?? null;
const QUIET = argv.includes("--quiet");

const rows = all().filter((e) => ["A1", "A2", "B1", "B2"].includes(e.level));
const hint = new Map(rows.map((e) => [e.id, e.deHint ?? null]));
let only = null;
if (FILE) {
  only = new Set();
  for (const line of fs.readFileSync(FILE, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [id, text] = line.split("\t");
    if (!hint.has(id)) { console.log(`unbekannte id: ${id}`); continue; }
    hint.set(id, (text ?? "").trim());
    only.add(id);
  }
}

/* ------------------------------------------------------------ helpers --- */

const fold = (s) =>
  s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
const tokens = (s) => s.split(/[^A-Za-zÄÖÜäöüß]+/).filter(Boolean);

// Finite verb forms: every lexicon verb's forms, the regular present and past endings on its
// stem, and the auxiliaries and modals. A token counts only where it is written lower case
// (or opens the sentence): "das Essen" is a noun, "wir essen" a verb.
const VERB = new Set(
  `ist sind bin bist seid war waren warst wart wäre wären sei hat haben habe hast habt hatte hatten
   hätte hätten wird werden wirst werdet wurde wurden würde würden kann können kannst könnt konnte
   konnten könnte könnten muss müssen musst müsst musste mussten müsste darf dürfen darfst durfte
   dürfte soll sollen sollst sollte sollten will wollen willst wollte wollten mag mögen magst
   möchte möchten möchtest gibt gab gibts weiß wissen wusste tue tut tun tat`.split(/\s+/)
);
const EXTRA_VERBS =
  `bekommt benutzt braucht bringt denkt fährt fällt findet fliegt fragt freut füllt geht gehört
   hilft hört kauft kommt kostet lacht läuft lebt legt leiht liegt macht meint nennt nimmt passt
   redet sagt schläft schreibt sieht singt sitzt spielt spricht steht stellt sucht trägt trinkt
   trifft wäscht wartet wohnt zahlt zeigt zieht isst liest schickt öffnet schließt bezahlt
   arbeitet verdient wechselt bleibt heißt kennt lernt merkt mischt putzt regnet scheint schneit
   schmeckt riecht fühlt glaubt hofft dauert beginnt endet entsteht besteht erklärt bedeutet
   beschreibt enthält verlässt verliert vergisst erinnert ersetzt prüft regelt schützt sorgt
   unterstützt verbindet vergleicht verhindert verlangt verbietet erlaubt entscheidet passiert
   gehören kosten heißen bedeuten bleiben gelten gilt dient dienen reicht reichen fehlt fehlen
   lässt lassen tragen treffen beeinflussen regeln unterscheiden verwenden verfolgen schätzen
   transportieren verändern leben schaffen betreffen klingen treiben besitzen erzählen verlaufen
   verlief verliefen klang trieb besaß reden bilden stimmen fallen fressen werben verlassen
   ziehen informieren kämpfen lösen beruhen zwingen ergeben bieten beantworten bereiten beenden
   bestrafen verlangen beschreiben testen stauen staut folgen schauen traut trauen übernehmen
   überlegen`.split(/\s+/);
for (const v of EXTRA_VERBS) VERB.add(v);
for (const e of all()) {
  if (e.pos !== "verb") continue;
  const lemma = e.lemma.replace(/^sich\s+/, "").toLowerCase();
  const words = lemma.split(/\s+/);
  const inf = words[words.length - 1];
  VERB.add(inf);
  const stem = inf.replace(/(e?n)$/, "");
  for (const end of ["t", "et", "st", "e", "te", "ten", "en", "n"]) VERB.add(stem + end);
  // Only the finite part of a form: "fährt ab" adds "fährt", not the particle "ab" (which
  // would let "mit", "auf", "an" pass for a verb).
  for (const f of e.forms ?? []) { const t = tokens(f.toLowerCase())[0]; if (t) VERB.add(t); }
  // Strong past plural: "fuhr" → "fuhren".
  if (e.forms?.[1]) { const p = tokens(e.forms[1].toLowerCase())[0]; if (p) { VERB.add(p + "en"); VERB.add(p + "n"); } }
}

// Beyond the list: a lower-case word ending in -t or -st is almost always a verb form
// ("beeinflusst", "verlief" is not, "schafft" is), once the handful of adverbs and adjectives
// with that ending are set aside. Infinitive and plural forms on -en stay list-only, since
// "kleinen" and "einen" end the same way.
const NOT_VERB_T = new Set(
  `nicht jetzt oft mit seit selbst sonst meist fast erst zuerst zuletzt bereit weit breit leicht
   recht schlecht echt laut kalt alt gut rot bunt hart zart sanft fest nett dicht schlicht gerecht
   direkt korrekt perfekt exakt konkret privat spät statt anstatt samt gesamt insgesamt zunächst
   höchst zumindest damit somit womit bist nachdem dort sofort fort mindest best erst jetzt halt
   welt stadt nacht gast lust last kunst brust durst frist post wurst angst haut zeit fett satt glatt matt platt stumpf`.split(/\s+/)
);
function hasVerb(text) {
  return tokens(text).some((t, i) => {
    const low = t.toLowerCase();
    if (i > 0 && t !== low) return false;
    if (VERB.has(low)) return true;
    return i > 0 && low.length >= 4 && /[^aeiouäöü]t$|st$|et$/.test(low) && !NOT_VERB_T.has(low);
  });
}

// What the explanation must not contain: the lemma, its stem and its forms. Stems of four
// letters or more are looked for anywhere (so "Fahrrad" gives "fahren" away); three letters
// at the start or the end of a word ("Tagebuch", "Geburtstag" and "davor" give "Tag" and
// "vor" away, "Vortrag" does not); one or two letters only as a whole word ("es", "an").
// Phrases are judged by their content words: "Einen Moment, bitte." may be explained with
// "bitten", "Ich melde mich bei Ihnen." with "Ihnen".
const PHRASE_STOP = new Set(
  `ich sie mir mich ihnen einen eine etwas bitte gern gerne leider damit dass noch einmal kein keine
   wäre könnten können sollen darf habe hätte bin wir den die das mit bei`.split(/\s+/)
);
function stemsOf(e) {
  const lemma = e.lemma.replace(/^sich\s+/, "").replace(/[!?.,']/g, "");
  const parts = lemma.split(/\s+/).filter(Boolean);
  const out = new Set();
  const addStem = (w) => { const f = fold(w); if (f) out.add(f); };
  if (parts.length > 1) {
    // A phrase ("zu Hause", "Guten Tag"): its long words, each.
    for (const p of parts) if (p.length >= 4 && !PHRASE_STOP.has(p.toLowerCase())) addStem(p.replace(/e$/, "").length >= 4 ? p.replace(/e$/, "") : p);
    if (!out.size) addStem(lemma);
    return [...out];
  }
  let w = fold(lemma);
  if (e.pos === "verb") {
    const s = w.replace(/ern$/, "er").replace(/eln$/, "el").replace(/en$/, "").replace(/n$/, "");
    addStem(s.length >= 3 ? s : w);
  } else if (e.pos === "noun") {
    let s = w;
    if (e.gender === "die" && /in$/.test(s) && s.length >= 6) s = s.replace(/in$/, "");
    if (/e$/.test(s) && s.length >= 5) s = s.replace(/e$/, "");
    addStem(s);
  } else if (e.pos === "adj") {
    addStem(/e$/.test(w) && w.length >= 5 ? w.replace(/e$/, "") : w);
  } else addStem(w);
  return [...out];
}
function formsOf(e) {
  const out = [];
  if (e.plural) out.push(e.plural);
  for (const f of e.forms ?? []) out.push(f);
  if (e.comparative) out.push(e.comparative);
  if (e.superlative) out.push(e.superlative);
  return out.map(fold);
}

function leaks(e, text) {
  const ftext = fold(text);
  const words = tokens(ftext);
  const found = [];
  for (const s of stemsOf(e)) {
    if (s.length >= 4 ? ftext.includes(s) : s.length === 3 ? words.some((w) => w.startsWith(s) || w.endsWith(s)) : words.includes(s)) found.push(s);
  }
  for (const f of formsOf(e)) {
    // Whole forms, also two-part ones ("fährt ab").
    const re = new RegExp(`(^|[^a-z])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`);
    if (f && re.test(ftext)) found.push(f);
  }
  return [...new Set(found)];
}

/* ------------------------------------------------------------- checks --- */

const findings = [];
const add = (e, check, detail) => findings.push({ id: e.id, level: e.level, unit: e.unit, lemma: e.lemma, check, detail, text: hint.get(e.id) });

const scope = rows.filter((e) => LEVELS.includes(e.level));
for (const e of scope) {
  if (only && !only.has(e.id)) continue;
  const text = hint.get(e.id);
  if (!text) { add(e, "fehlt", "keine Erklärung"); continue; }
  if (text.includes("…")) {
    if (!e.deFill) add(e, "lücke", "Lückensatz ohne Lösung in de-fill.json");
    continue;
  }
  if (!/^[A-ZÄÖÜ0-9„]/.test(text)) add(e, "satzform", "fängt nicht groß an");
  if (!/[.!?]["“]?$/.test(text)) add(e, "satzform", "kein Punkt am Ende");
  if (/[–—→⇒]|\s-\s/.test(text)) add(e, "satzform", "Gedankenstrich oder Pfeil");
  if (/^(Gegenteil|Synonym|auch|oder)\b\s*:?/i.test(text) || /\bGegenteil:/.test(text)) add(e, "satzform", "Etikett statt Satz");
  if (/[;()]/.test(text)) add(e, "satzform", "Klammer oder Semikolon");
  if (!hasVerb(text)) add(e, "satzform", "kein Verb erkannt");
  else {
    // A label in front of a colon ("Ein Gerät: Es macht …") or a noun with only a relative
    // clause ("Eine Person, die …"): there is a verb, but no main clause around it.
    const m = text.match(/^([^,:]+)([,:])\s*(.*)$/);
    if (m && !hasVerb(m[1])) {
      if (m[2] === ":" && m[1].split(/\s+/).length <= 4) add(e, "satzform", "Etikett vor dem Doppelpunkt");
      // "…, die ein Toter hinterlässt, nennt man so." has its main verb after the clause.
      const relative = /^((der|die|das|dem|den|denen|deren|dessen|was|wo|wann)\b|(in|an|bei|mit|auf|für|von|zu|aus) (der|dem|den|denen)\b)/;
      const verbAfter = m[3].split(",").slice(1).some((part) => VERB.has(tokens(part)[0]?.toLowerCase()));
      if (m[2] === "," && relative.test(m[3]) && !verbAfter) add(e, "satzform", "nur Nebensatz, kein Hauptsatz");
      // "Ein Mann, er arbeitet …": a bare noun phrase glued onto a sentence.
      if (m[2] === "," && /^(sie|er|es|man)\s/.test(m[3])) add(e, "satzform", "Bruchstück vor dem Komma");
    }
  }
  // Two sentences ("Unser Planet. Auch: …"): each needs its own verb.
  const parts = text.replace(/\bz\. B\./g, "zB").replace(/\b(\d+)\./g, "$1").split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/);
  if (parts.length > 1 && parts.some((p) => !hasVerb(p))) add(e, "satzform", "ein Teilsatz ohne Verb");
  const n = text.split(/\s+/).filter(Boolean).length;
  if (n < 6) add(e, "länge", `${n} Wörter (mindestens 6)`);
  if (n > 14) add(e, "länge", `${n} Wörter (höchstens 14)`);
  const l = leaks(e, text);
  if (l.length) add(e, "wort", `enthält ${l.map((s) => `„${s}“`).join(", ")}`);
}

// The same explanation twice in one Lernset (unit): two cards the learner cannot tell apart.
const byUnit = new Map();
for (const e of scope) {
  const t = hint.get(e.id);
  if (!t) continue;
  const key = `${e.unit}|${t.toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim()}`;
  if (!byUnit.has(key)) byUnit.set(key, []);
  byUnit.get(key).push(e);
}
for (const list of byUnit.values()) {
  if (list.length < 2) continue;
  for (const e of list) if (!only || only.has(e.id)) add(e, "doppelt", `gleich wie ${list.filter((o) => o !== e).map((o) => o.id).join(", ")}`);
}

/* ------------------------------------------------------------- report --- */

const checked = only ? scope.filter((e) => only.has(e.id)).length : scope.length;
const bad = new Set(findings.map((f) => f.id));
if (!QUIET) {
  for (const f of findings) console.log(`${f.level} ${f.unit} ${f.id} [${f.check}] ${f.detail}\n    ${f.text ?? ""}`);
}
const perCheck = {};
for (const f of findings) perCheck[f.check] = (perCheck[f.check] ?? 0) + 1;
console.log(
  `Erklärungen ${LEVELS.join("/")}: ${checked} Wörter geprüft, ${checked - bad.size} ohne Befund, ${bad.size} mit Befund` +
    (findings.length ? ` (${Object.entries(perCheck).map(([k, v]) => `${k} ${v}`).join(", ")})` : "")
);
process.exit(findings.length ? 1 : 0);
