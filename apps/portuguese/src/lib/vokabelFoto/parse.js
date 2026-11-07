// „Vokabeln vom Foto“, step 2 of 3: OCR lines → word entries (VOKABEL-FOTO-TIERED-PROMPT.md, Tier 1).
//
// Step 1 (azureRead.js) returns the page's text lines with their position; step 3 (match.js)
// looks each entry up in our lexicon. This file only understands how a course book writes a
// vocab entry — no model involved, so the same photo always gives the same list:
//
//   der Tisch, -e            → noun, der, plural Tische
//   Dorf, das, ¨-er          → noun, das, plural Dörfer (article after the word)
//   der Apfel, ¨-            → noun, der, plural Äpfel
//   die Eltern (Pl.)         → noun, plural only
//   an|rufen, er ruft an     → verb anrufen, separable
//   sich freuen (auf + A.)   → verb freuen, reflexive
//   Wie geht's?              → phrase
//
// What it drops: page numbers, headings („Lektion 3“), example sentences, and anything with
// a book or chapter name. Only the words leave this file; the teacher checks them all anyway.

const ARTICLE = /^(der|die|das)\s+/i;
// ¨ is often read as " or ” or a combining diaeresis by the OCR.
const UMLAUT_MARK = /[¨"”“̈]/;
const HEADING = /^(lektion|kapitel|seite|einheit|modul|teil|lernwortschatz|wortschatz|wortliste|vokabeln|wörter|glossar|übung|aufgabe|station|plateau|weitere (wichtige )?wörter)\b/i;
// A topic heading inside the list: „Natur und Umwelt“, „Essen & Trinken“ – two nouns without
// articles. As a vocab entry such a pair would come with its articles.
const TOPIC = /^[A-ZÄÖÜ]\p{L}+ (und|&) [A-ZÄÖÜ]\p{L}+$/u;
const NOISE = /(©|www\.|https?:|isbn|verlag|\bS\.\s*\d)/i;
const VERB_END = /(en|ern|eln|n)$/;
// A verb's other forms in their own cell or column: „hat angeboten“, „ist gefahren“, „er bietet an“.
// Not „es gibt“, which is a word of its own.
const VERB_FORMS = /^((hat|ist)\s+\p{L}+|(er|sie)\s+\p{L}+(\s+\p{L}+)?|es\s+\p{L}+\s+\p{L}+)$/u;

/** Ä/Ö/Ü on the last a/o/u (or au) of the stem: Apfel → Äpfel, Haus → Häus(er). */
export function umlaut(stem) {
  const m = stem.match(/^(.*?)(au|Au|a|o|u|A|O|U)([^aouAOU]*)$/);
  if (!m) return stem;
  const map = { au: "äu", Au: "Äu", a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };
  return m[1] + map[m[2]] + m[3];
}

/** The plural from a book's short form: "-e", "¨-er", "-", "-s", or a full "Äpfel". */
export function pluralFrom(lemma, marker) {
  const raw = String(marker || "").trim().replace(/^die\s+/i, "");
  if (!raw) return null;
  if (/^[A-ZÄÖÜ]/.test(raw)) return raw.split(/\s/)[0];
  const umlauted = UMLAUT_MARK.test(raw);
  const suffix = raw.replace(UMLAUT_MARK, "").replace(/^[-–‑]+/, "").trim();
  if (!/^[a-zäöüß]*$/.test(suffix)) return null;
  return (umlauted ? umlaut(lemma) : lemma) + suffix;
}

const clean = (s) => String(s || "")
  .replace(/\s+/g, " ")
  .replace(/^[\s•·▪●○◦\-–*>]+/, "")      // bullets
  .replace(/^\(?\d{1,3}[.)]?\s+/, "")       // "12 " / "3) " numbering
  .trim();

const isSentence = (s) => /[.!?]$/.test(s) && s.split(" ").length >= 4;

/**
 * One OCR line (or one column cell) → an entry, or null if it isn't a headword.
 * @returns {{ lemma: string, pos?: string, article?: string, plural?: string|null,
 *             pluralOnly?: boolean, separable?: boolean, reflexive?: boolean, raw: string } | null}
 */
export function parseEntry(text) {
  const raw = clean(text);
  if (raw.length < 2 || raw.length > 80) return null;
  if (!/\p{L}{2}/u.test(raw) || HEADING.test(raw) || TOPIC.test(raw) || NOISE.test(raw) || isSentence(raw)) return null;

  // Grammar notes in brackets are not part of the word: "(Pl.)", "(auf + A.)", "(ist)".
  const notes = [...raw.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  const body = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  let [head, ...rest] = body.split(/\s*[,;]\s*/);
  if (!head) return null;
  // „Dorf, das, ¨-er“ / „Dorf das“: the article after the word goes in front.
  const after = head.match(/^([A-ZÄÖÜ][\p{L}-]*)\s+(der|die|das)$/u);
  if (after) head = `${after[2]} ${after[1]}`;
  else if (/^[A-ZÄÖÜ][\p{L}-]*$/u.test(head) && /^(der|die|das)$/i.test(rest[0] ?? "")) head = `${rest.shift().toLowerCase()} ${head}`;
  const pluralOnly = notes.some((n) => /^\s*(nur\s+)?pl\.?\s*$/i.test(n));
  const noPlural = notes.some((n) => /(nur\s+)?sg\.?|kein\s+pl/i.test(n));

  // Noun with article.
  const art = head.match(ARTICLE);
  if (art) {
    const lemma = head.slice(art[0].length).trim();
    if (!/^[A-ZÄÖÜ][\p{L}-]*$/u.test(lemma)) return null;
    const article = art[1].toLowerCase();
    if (pluralOnly) return { lemma, pos: "noun", pluralOnly: true, raw };
    const plural = noPlural ? null : pluralFrom(lemma, rest[0]);
    return { lemma, pos: "noun", article, plural, raw };
  }

  // Verb: "sich freuen", "an|rufen", "an·kommen".
  const words = head.split(" ");
  const reflexive = words[0].toLowerCase() === "sich" && words.length > 1;
  const core = reflexive ? words.slice(1).join(" ") : head;
  if (/^[a-zäöüß]+([|·•/][a-zäöüß]+)?$/.test(core) && VERB_END.test(core) && (reflexive || /[|·•]/.test(core) || rest.length > 0 || core.length > 4)) {
    const separable = /[|·•]/.test(core);
    const lemma = core.replace(/[|·•/]/g, "");
    // A lowercase word ending in -en is usually a verb, but "modern", "golden" are adjectives;
    // the lexicon match corrects the part of speech when it knows the word.
    return { lemma, pos: "verb", ...(separable ? { separable: true } : {}), ...(reflexive ? { reflexive: true } : {}), raw };
  }

  // A capitalised single word without article: still a noun most of the time ("Entschuldigung").
  if (words.length === 1 && /^[A-ZÄÖÜ][\p{L}-]+$/u.test(head)) return { lemma: head, pos: "noun", raw };
  // A single lowercase word: adjective, adverb, preposition … the lexicon decides.
  if (words.length === 1 && /^[a-zäöüß-]+$/.test(head)) return { lemma: head, raw };
  // Short phrases / Redemittel ("Wie geht's?", "Guten Tag!"), at most four words.
  if (words.length <= 4 && /^[\p{L}'’ -]+[?!.]?$/u.test(head)) return { lemma: head.replace(/[.]$/, ""), pos: "phrase", raw };
  return null;
}

/**
 * Lines with positions → rows. Two segments on the same row are usually headword + translation;
 * two German entries side by side (a two-column list) stay two entries.
 * @param {{ text: string, box?: { x: number, y: number, h: number } }[]} lines
 * @param {(entry: object) => boolean} [isKnown]  true when the lexicon knows the entry (keeps a
 *   right-hand German column from being taken for a translation)
 */
export function parseLines(lines, isKnown = () => false) {
  const withBox = lines.filter((l) => l?.text?.trim());
  const rows = [];
  if (withBox.every((l) => l.box)) {
    const sorted = [...withBox].sort((a, b) => a.box.y - b.box.y);
    for (const line of sorted) {
      const row = rows.find((r) => Math.abs(r.y - line.box.y) < Math.max(r.h, line.box.h) * 0.5);
      if (row) row.cells.push(line); else rows.push({ y: line.box.y, h: line.box.h, cells: [line] });
    }
    for (const r of rows) r.cells.sort((a, b) => a.box.x - b.box.x);
  } else {
    for (const line of withBox) rows.push({ cells: [line] });
  }

  const out = [];
  for (const row of rows) {
    let last = null;
    for (const cell of row.cells) {
      // "Tisch = table" on one line.
      // A plural column next to a noun ("Brot | -e | bread" in a table).
      const marker = cell.text.trim();
      if (VERB_FORMS.test(clean(marker))) continue;
      if (last?.pos === "noun" && !last.plural && /^(["¨]?\s*[-–][a-zäöüß]*|["¨][a-zäöüß]*)$/.test(marker)) {
        const plural = pluralFrom(last.lemma, marker);
        if (plural) last.plural = plural;
        continue;
      }
      const [left, right] = cell.text.split(/\s+=\s+|\t+|\s{3,}/);
      const entry = parseEntry(left);
      const strong = entry && (entry.article || entry.separable || entry.reflexive || isKnown(entry));
      if (entry && (strong || !last)) {
        if (right && !isSentence(right.trim())) entry.translation = right.trim();
        out.push(entry);
        last = entry;
      } else if (last && !last.translation && !isSentence(clean(cell.text))) {
        last.translation = clean(cell.text);
      }
    }
  }
  return out;
}
