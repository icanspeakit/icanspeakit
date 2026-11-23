// Short tips for the Aussprache-Check: one rule per Portuguese sound that learners most often get
// wrong. No API: the tip is picked from the spelling of the word the learner scored worst on.
// Portuguese spelling is fairly regular, so the tests are reliable for the sounds below. They
// cannot see stress, so the tip for weak vowels talks about "an unstressed vowel" in general.
//
// Each sound has a `test` on the lower-cased word and a `tip` written in English for A1–B1
// readers: short main clauses, the mouth position first, one example they already know.
// European Portuguese (the site's standard, docs/content-plan.md §1.1). What Brazil does
// differently is noted in the data files (`ptBR`), not here.

/** @typedef {{ id: string, label: string, test: (w: string) => boolean, tip: (w: string, shown: string) => string }} Sound */

const V = "aeiouáàâãéêíóôõú";
const STRONG_R = /rr|^r|[nls]r/;

/** @type {Sound[]} */
export const SOUNDS = [
  {
    id: "ao",
    label: "ão · ãe · õe",
    test: (w) => /ão|ãe|õe/.test(w),
    tip: (w, shown) => `In “${shown}” the nasal vowel glides into a short w or y. Start with the vowel, let the air go through your nose, and don't close it with a clear n. Like “pão”, “mãe”.`,
  },
  {
    id: "nasal",
    label: "nasal",
    test: (w) => new RegExp(`ã|õ|[${V}][nm]($|[^${V}])`).test(w),
    tip: (w, shown) => `In “${shown}” the vowel is nasal: air goes through your nose and the n or m is not said as a separate sound. Like “bem”, “um”, “muito”.`,
  },
  {
    id: "lh-nh",
    label: "lh · nh",
    test: (w) => /lh|nh/.test(w),
    tip: (w, shown) => `In “${shown}”, lh and nh are one sound each: the middle of your tongue presses against the roof of your mouth. lh is like “million”, nh like “canyon”. Like “filho”, “vinho”.`,
  },
  {
    id: "ch",
    label: "ch",
    test: (w) => w.includes("ch"),
    tip: () => "ch is sh, as in “shop”. It is not the ch of “church”, and not a k. Like “chave”, “chá”.",
  },
  {
    id: "j-g",
    label: "j · g",
    test: (w) => /j|g[eiéíê]/.test(w),
    tip: (w, shown) => `In “${shown}”, j or g before e, i is like the s in “measure”: a soft, buzzing sh. Not the j of “jam”, and not a rasp. Like “já”, “gente”.`,
  },
  {
    id: "s-sh",
    label: "s · z = sh",
    test: (w) => new RegExp(`s($|[^${V}s])|z$`).test(w),
    tip: (w, shown) => `In “${shown}”, s before a consonant or at the end of a word sounds like sh (like the s in “measure” before b, d, g, m, n, l, r, v). Like “mas”, “português”, “luz”.`,
  },
  {
    id: "s-z",
    label: "s · ss · ç",
    test: (w) => new RegExp(`[${V}]s[${V}]|ss|ç|c[eiéíê]|^s|^z|z[${V}]`).test(w),
    tip: (w, shown) =>
      new RegExp(`[${V}]s[${V}]|^z|z[${V}]`).test(w)
        ? `In “${shown}”, s between vowels and z buzz, like z in “zoo”. Keep ss, ç and c before e, i sharp, like s in “sun”: casa is not caça.`
        : `In “${shown}”, ss, ç, c before e, i and s at the start of a word are a sharp s, like s in “sun”. Between vowels a single s buzzes: casa is not caça.`,
  },
  {
    id: "x",
    label: "x",
    test: (w) => w.includes("x"),
    tip: (w, shown) => `The x in “${shown}” can be sh (caixa, xadrez), ks (táxi), z (exame, exemplo) or s (próximo). It is not always the same: learn it word by word.`,
  },
  {
    id: "r",
    label: "r · rr",
    test: (w) => w.includes("r"),
    tip: (w, shown) =>
      STRONG_R.test(w)
        ? `“${shown}” has a strong r: made at the back of your mouth, close to French r. Not the English r, not a tap. Like “carro”, “rua”.`
        : `The r in “${shown}” is one quick tap of the tongue tip behind your top teeth. Don't curl your tongue back. Like “caro”, “para”.`,
  },
  {
    id: "l-final",
    label: "l",
    test: (w) => new RegExp(`l($|[^${V}h])`).test(w),
    tip: (w, shown) => `The l at the end of a syllable in “${shown}” is dark: the back of your tongue is raised, and it sounds almost like a short “w”, as in “full”. Like “azul”, “alto”.`,
  },
  {
    id: "qu-gu",
    label: "qu · gu",
    test: (w) => /qu|gu/.test(w),
    tip: (w, shown) => `In “${shown}”, qu and gu before e, i have a silent u (que is “ke”, guitarra has g as in “go”). Before a, o the u is said: quando, água.`,
  },
  {
    id: "h",
    label: "h",
    test: (w) => /(^|[^cnl])h/.test(w),
    tip: (w, shown) => `The h in “${shown}” is silent. Don't breathe out first: start straight on the next vowel. hoje starts with the vowel o.`,
  },
  {
    id: "aberta",
    label: "é · ê · ó · ô",
    test: (w) => /[éêóô]/.test(w),
    tip: (w, shown) => `In “${shown}” the accent shows how open the vowel is. é and ó are open (the mouth is wide), ê and ô are closed (lips rounder, tongue higher). It can change the word: avó (grandmother), avô (grandfather).`,
  },
  {
    id: "acento",
    label: "stress",
    test: (w) => /[áéíóúâêô]/.test(w),
    tip: (w, shown) => `The written accent shows the strong syllable of “${shown}”. Keep the stress there, because moving it can change the word: falamos (we speak), falámos (we spoke).`,
  },
  {
    id: "ditongo",
    label: "ei · ou · ai",
    test: (w) => /ei|ou|ai|oi|eu|ui|au/.test(w),
    tip: (w, shown) => `In “${shown}” the two vowels are one syllable. ei is like “ay” with a short, central start, ou is just o (pouco is “poco”), and the second vowel is short. Don't say two syllables.`,
  },
  {
    id: "reducao",
    label: "weak vowels",
    test: (w) => w.length >= 4 && /[eao]/.test(w) && new RegExp(`[${V}][^${V}]+[${V}]`).test(w),
    tip: (w, shown) => `In “${shown}”, unstressed vowels are weak and short. An unstressed e is nearly gone (pequeno ≈ “p'keno”), a final e is hardly heard, and a final o sounds like u. Put the stress on one syllable and let the others fall away.`,
  },
];

const GENERIC = "Listen to the word again and repeat it slowly, one syllable at a time. Then say the whole sentence at normal speed.";

/**
 * The tip for one word. Sounds the sentence was chosen to practise come first, so a
 * learner on the r sentence hears about r even if the word also has an s. Without a focus the
 * order of SOUNDS decides: the narrowest and most-often-wrong sounds come first.
 * @param {string} word as shown in the sentence (punctuation is ignored)
 * @param {string[]} [focus] the sentence's focus sound ids
 * @returns {{ sound: string | null, label: string | null, text: string }}
 */
export function tipFor(word, focus = []) {
  const shown = word.replace(/[^\p{L}'-]/gu, "");
  const w = shown.toLowerCase();
  const ordered = [
    ...SOUNDS.filter((s) => focus.includes(s.id)),
    ...SOUNDS.filter((s) => !focus.includes(s.id)),
  ];
  const hit = ordered.find((s) => s.test(w));
  return hit ? { sound: hit.id, label: hit.label, text: hit.tip(w, shown) } : { sound: null, label: null, text: GENERIC };
}

/** The label for a focus id, for the chips above the sentence. */
export function soundLabel(id) {
  return SOUNDS.find((s) => s.id === id)?.label ?? id;
}
