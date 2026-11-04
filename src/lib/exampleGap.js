// The flashcard's example sentence with the word blanked out: „Wir haben die ganze Nacht
// ________.“ under the unflipped „Erklärung“ or translation — a clue, not the answer. Shared
// by the trainer (wortschatz-app.js) and the check (scripts/check-karten.mjs), so the check
// sees exactly the sentences the page would have to hide.
//
// A token is the word when it is the lemma, the plural, a synonym, one of the verb's forms
// from the lexicon („getanzt“, „fährt“, „zog“), a short ending on one of their stems
// („trennen“ → „trennt“, „zog“ → „zogen“, „wechseln“ → „wechsle“), or — for a noun — a
// compound holding it („Goethestraße“, „WLAN-Passwort“). Umlauts and ß count as their plain
// letters („Gruß“ → „Grüßen“, „arm“ → „ärmer“). A separable verb's prefix („zieht an“) is
// not blanked: it would blank every „an“; its stem is found without it („sehe … fern“).

const ACCENTS = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };
const clean = (x) => String(x).toLowerCase().replace(/[^a-záéíóúñäöüß]/g, "")
  .replace(/[áéíóú]/g, (c) => ACCENTS[c])
  .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

// Spanish: the object pronoun in a form (me llamo, se llamó) is not the word.
const PRONOUN = new Set(["me", "te", "se", "nos", "os"]);
const SPANISH_VERB = /(ar|er|ir)(se)?$/;

// The few words whose forms share nothing with the lemma.
const IRREGULAR = {
  sein: ["bin", "bist", "ist", "sind", "seid", "war", "warst", "waren", "wart", "gewesen", "sei"],
  haben: ["habe", "hast", "hat", "habt", "hatte", "hattest", "hatten", "hattet", "gehabt", "hab"],
  werden: ["werde", "wirst", "wird", "werdet", "wurde", "wurdest", "wurden", "geworden"],
  zu: ["zum", "zur"],
  ser: ["soy", "eres", "es", "somos", "sois", "son", "era", "eras", "eramos", "eran", "fui", "fue", "fuimos", "fueron"],
  estar: ["estoy", "estas", "esta", "estamos", "estais", "estan"],
  ir: ["voy", "vas", "va", "vamos", "vais", "van", "fui", "fue", "fuimos", "fueron"],
};

const STEM_ENDINGS = /(est|et|st|te|t|en|e|n)$/;

function matcher(card) {
  const words = (x) => String(x).split(/\s+/).map(clean).filter((w) => w.length > 1);
  const lemma = clean(card.front);
  // A separable verb shows itself in its forms („nimmt teil“, the second word the start of
  // the lemma) or, where the lexicon has no forms, at the end of the sentence („… heran.“).
  const last = card.pos === "verb" ? words(card.example ?? "").slice(-1) : [];
  const prefixes = new Set([...(card.forms ?? []).flatMap((f) => words(f).slice(1)), ...last]
    .filter((w) => w.length >= 2 && w.length < lemma.length - 2 && lemma.startsWith(w)));
  const prefix = [...prefixes].sort((a, b) => b.length - a.length)[0] ?? "";
  const base = prefix ? lemma.slice(prefix.length) : lemma;
  const forms = (card.forms ?? []).flatMap(words).filter((w) => !prefixes.has(w) && !PRONOUN.has(w));
  const nouns = card.pos === "noun" || /^\d|tausend|hundert/.test(lemma)
    ? [card.front, card.plural].filter(Boolean).map(clean).filter((w) => w.length >= 4)
    : [];
  const targets = new Set([
    ...[card.front, card.plural, ...(card.syn ?? []).map((x) => x.replace(/^(der|die|das) /, ""))]
      .filter(Boolean).flatMap(words),
    ...forms,
    ...(IRREGULAR[lemma] ?? []),
  ].filter((w) => !prefixes.has(w)));
  // Stems only for verbs and adjectives: a noun's would blank „ein“ for „Ei“, „fährt“ for
  // „Fähre“.
  const stems = new Set();
  if (card.pos !== "noun") for (const w of [lemma, base, ...forms]) {
    stems.add(w.replace(STEM_ENDINGS, ""));
    for (const end of ["est", "st", "t", "te", "en", "e", "n"]) if (w.endsWith(end)) stems.add(w.slice(0, -end.length));
    // wechseln → wechsl(e), bügeln → bügl(e), ändern → ändr(e)
    const m = w.match(/^(.*)e([lr])n$/);
    if (m) stems.add(m[1] + m[2]);
  }
  // Spanish: hablar and hablo give habl-, so hablas and hablamos are found too; alto gives alt-.
  if (card.pos === "verb" && SPANISH_VERB.test(lemma) && card.forms?.length) {
    stems.add(lemma.replace(SPANISH_VERB, ""));
    if (forms[0]) stems.add(forms[0].replace(/[aeo]$/, ""));
  }
  if (card.pos === "adj" && /[oe]$/.test(lemma)) stems.add(lemma.slice(0, -1));
  const room = (s) => (s.length >= 4 ? 3 : s.length === 3 ? 2 : s.length === 2 ? 1 : -1);
  return (tok) => {
    const c = clean(tok);
    if (!c) return false;
    if (targets.has(c)) return true;
    if (nouns.some((n) => c.includes(n))) return true;
    for (const s of stems) if (c.startsWith(s) && c.length - s.length <= room(s)) return true;
    return false;
  };
}

/** The example split into tokens (whitespace kept), each marked whether it is the word.
 *  `hit` is false when the word is nowhere in the sentence — then it cannot be shown before
 *  the flip, and the check reports it. */
export function gapTokens(card) {
  if (!card.example) return { hit: false, tokens: [] };
  const isWord = matcher(card);
  const tokens = card.example.split(/(\s+)/).map((text) => ({ text, gap: /\S/.test(text) && isWord(text) }));
  return { hit: tokens.some((t) => t.gap), tokens };
}
