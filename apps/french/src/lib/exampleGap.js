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

// French (content-plan §1.2): accents fold for matching (é → e, ç → c, œ → oe), and an elided
// word before an apostrophe is not part of the token: l'école, d'eau, j'ai, m'appelle, qu'il,
// jusqu'à are found as école, eau, ai, appelle, il, à. The Spanish and German letters stay for the
// levels not converted yet.
const ACCENTS = { á: "a", é: "e", í: "i", ó: "o", ú: "u", à: "a", â: "a", è: "e", ê: "e", ë: "e", î: "i", ï: "i", ô: "o", ù: "u", û: "u", ÿ: "y", ç: "c" };
const ELISION = /^(?:[ldjmtsnc]|qu|jusqu|lorsqu|puisqu)['’]/i;
const clean = (x) => String(x).toLowerCase().replace(ELISION, "").replace(/œ/g, "oe").replace(/æ/g, "ae")
  .replace(/[^a-záéíóúñäöüßàâèêëîïôùûÿç]/g, "")
  .replace(/[áéíóúàâèêëîïôùûÿç]/g, (c) => ACCENTS[c])
  .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

// The pronoun in a form (je me lève, se llamó) is not the word; nor is the auxiliary of a passé
// composé (a parlé, est allé, s'est levé): it would blank every « a » and « est ».
const PRONOUN = new Set(["me", "te", "se", "nos", "os", "nous", "vous"]);
const AUXILIARY = new Set(["ai", "as", "a", "avons", "avez", "ont", "suis", "es", "est", "sommes", "etes", "sont"]);
const SPANISH_VERB = /(ar|er|ir)(se)?$/;
// French: parler, finir, vendre, recevoir (pronoun stripped: se lever, s'appeler).
const FRENCH_VERB = /(er|ir|re|oir)$/;
// What may follow a French verb or adjective stem (accents folded): present, imparfait, futur and
// conditionnel endings, participles, feminine and plural.
const FR_ENDINGS = new Set(["", "e", "es", "ent", "ons", "ez", "s", "t", "x", "eons", "ais", "ait", "aient", "ions", "iez",
  "eais", "eait", "rai", "ras", "ra", "rons", "rez", "ront", "rais", "rait", "er", "ir", "re", "ee", "ees", "is", "it", "ie", "ies",
  "u", "ue", "us", "ues", "se", "ses", "le", "les", "ne", "nes", "he", "hes", "ve", "ves", "que", "ques", "issons", "issez", "issent"]);

// The few words whose forms share nothing with the lemma.
const IRREGULAR = {
  sein: ["bin", "bist", "ist", "sind", "seid", "war", "warst", "waren", "wart", "gewesen", "sei"],
  haben: ["habe", "hast", "hat", "habt", "hatte", "hattest", "hatten", "hattet", "gehabt", "hab"],
  werden: ["werde", "wirst", "wird", "werdet", "wurde", "wurdest", "wurden", "geworden"],
  zu: ["zum", "zur"],
  ser: ["soy", "eres", "es", "somos", "sois", "son", "era", "eras", "eramos", "eran", "fui", "fue", "fuimos", "fueron"],
  estar: ["estoy", "estas", "esta", "estamos", "estais", "estan"],
  ir: ["voy", "vas", "va", "vamos", "vais", "van", "fui", "fue", "fuimos", "fueron"],
  // French: the forms that share nothing with the lemma (accents folded, as clean() leaves them).
  etre: ["suis", "es", "est", "sommes", "etes", "sont", "etait", "etais", "ete", "sera", "serai", "soit"],
  avoir: ["ai", "as", "a", "avons", "avez", "ont", "avait", "avais", "eu", "aura", "aurai", "ait"],
  aller: ["vais", "vas", "va", "allons", "allez", "vont", "ira", "irai", "allait"],
  faire: ["fais", "fait", "faisons", "faites", "font", "fera", "ferai", "faisait"],
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
  const forms = (card.forms ?? []).flatMap(words).filter((w) => !prefixes.has(w) && !PRONOUN.has(w) && !AUXILIARY.has(w));
  const nouns = card.pos === "noun" || /^\d|tausend|hundert/.test(lemma)
    ? [card.front, card.plural].filter(Boolean).map(clean).filter((w) => w.length >= 4)
    : [];
  // A word of several (salle de bains, en face de): its short links (de, à, en) would blank every
  // de in the sentence, so they only count when nothing longer is left (il y a).
  const own = [card.front, card.plural, ...(card.syn ?? []).map((x) => x.replace(/^(der|die|das) /, ""))]
    .filter(Boolean).flatMap(words);
  const long = /\s/.test(String(card.front).trim()) ? own.filter((w) => w.length > 2) : own;
  const targets = new Set([
    ...(long.length ? long : own),
    ...forms,
    ...(IRREGULAR[lemma] ?? []),
  ].filter((w) => !prefixes.has(w) && !(card.pos === "verb" && PRONOUN.has(w))));
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
  // French verbs: a stem plus a listed ending, so louer and loue find louons, jouent, déménageons
  // (pronoun gone: se lever → lever, s'appeler → appeler). French adjectives: grand → grande,
  // grands, grandes; heureux → heureuse; actif → active.
  const frStems = new Set();
  if (card.pos === "verb" && card.forms?.length) {
    const bare = clean(String(card.front).replace(/^(se |s['’])/i, ""));
    if (FRENCH_VERB.test(bare)) frStems.add(bare.replace(FRENCH_VERB, ""));
    for (const f of forms) frStems.add(f.replace(/(ent|es|s|t|e)$/, ""));
  }
  if (card.pos === "adj") {
    frStems.add(lemma);
    if (/(x|f)$/.test(lemma)) frStems.add(lemma.slice(0, -1));
  }
  if (card.pos === "adj" && /[oe]$/.test(lemma)) stems.add(lemma.slice(0, -1));
  const room = (s) => (s.length >= 4 ? 3 : s.length === 3 ? 2 : s.length === 2 ? 1 : -1);
  const compounds = ["der", "die", "das"].includes(card.gender);
  // The word as written, for the short ones clean() can't tell apart: à (not a), où (not ou),
  // jusqu'à (not à).
  const exact = String(card.front).toLowerCase().replace(/’/g, "'");
  const one = (c) => {
    if (!c) return false;
    if (targets.has(c)) return true;
    // German compounds hold the noun anywhere (Goethestraße); French and Spanish ones don't fuse,
    // and « lait » must not blank « plaît ».
    if (nouns.some((n) => (compounds ? c.includes(n) : c.startsWith(n)))) return true;
    for (const s of stems) if (c.startsWith(s) && c.length - s.length <= room(s)) return true;
    for (const s of frStems) if (s.length >= 2 && c.startsWith(s) && FR_ENDINGS.has(c.slice(s.length))) return true;
    return false;
  };
  return (tok) => {
    const raw = String(tok).toLowerCase().replace(/’/g, "'").replace(/^[«"(¿¡]+|[.,;:!?»")]+$/g, "");
    if (raw === exact) return true;
    if (lemma.length <= 1) return false; // à, y: only the word as written
    // Raconte-moi, Allongez-vous: the verb is the part before the hyphen.
    return one(clean(tok)) || (/-/.test(raw) && one(clean(raw.split("-")[0])));
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
