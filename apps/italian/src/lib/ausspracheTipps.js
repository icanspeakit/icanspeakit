// Short tips for the Aussprache-Check: one rule per Italian sound that learners most often get
// wrong. No API: the tip is picked from the spelling of the word the learner scored worst on.
// Italian spelling is regular, so the tests are reliable: gn, gli, sc + e/i, c/g + e/i, the
// double consonants.
//
// Each sound has a `test` on the lower-cased word and a `tip` written in English for A1–B1
// readers: short main clauses, the mouth position first, one example they already know.
// Standard Italian (the site's standard, docs/content-plan.md §1.1).

/** @typedef {{ id: string, label: string, test: (w: string) => boolean, tip: (w: string, shown: string) => string }} Sound */

const V = "aeiouàèéìíòóùú";
const STRONG_R = /rr|^r/;

/** @type {Sound[]} */
export const SOUNDS = [
  {
    id: "gn",
    label: "gn",
    test: (w) => w.includes("gn"),
    tip: () => "gn is one sound, like ny in “canyon”. Press the middle of your tongue against the roof of your mouth. Not g + n. Like “bagno”, “ogni”.",
  },
  {
    id: "gl",
    label: "gl",
    test: (w) => /gli/.test(w),
    tip: (w, shown) => `In “${shown}”, gli is one sound: the tongue presses against the roof of the mouth, a bit like lli in “million”, but longer. Not g + l. Like “figlio”, “famiglia”.`,
  },
  {
    id: "sc",
    label: "sc",
    test: (w) => /sc[eiéèìí]|sch/.test(w),
    tip: (w, shown) =>
      /sch/.test(w)
        ? `In “${shown}”, sch is /sk/: the h only keeps the s and c apart. Like “scheda”, “schiena”.`
        : `In “${shown}”, sc before e or i is /ʃ/, like sh in “ship”. Like “scena”, “pesce”, “sci”.`,
  },
  {
    id: "c-g",
    label: "c · g",
    test: (w) => /c[eiéèìí]|g[eiéèìí]|ch|gh|ci[aou]|gi[aou]/.test(w),
    tip: (w, shown) =>
      /ch|gh/.test(w)
        ? `In “${shown}”, ch is /k/ and gh is /g/: the h makes them hard. Not “church”. Like “che”, “chi”, “ghetto”.`
        : `In “${shown}”, c before e or i is like ch in “church”, and g before e or i is like j in “jam”. Like “cena”, “gelato”. Not th, not a rasp.`,
  },
  {
    id: "z",
    label: "z",
    test: (w) => w.includes("z"),
    tip: (w, shown) => `The z in “${shown}” is ts or dz: the tongue starts at your teeth and releases a hiss. Not a buzzing English z, not th. Like “pizza”, “grazie”, “zero”.`,
  },
  {
    id: "doppie",
    label: "double",
    test: (w) => /([bcdfglmnprstvz])\1/.test(w),
    tip: (w, shown) => {
      const d = w.match(/([bcdfglmnprstvz])\1/)?.[0] ?? "";
      return `“${shown}” has a double ${d}: hold that sound about twice as long and keep the vowel before it short. It changes the word: pala, palla; caro, carro.`;
    },
  },
  {
    id: "r",
    label: "r · rr",
    test: (w) => w.includes("r"),
    tip: (w, shown) =>
      STRONG_R.test(w)
        ? `“${shown}” has a strong r: several quick taps of the tongue tip behind your top teeth. Not in the throat. Like “carro”, “rosso”.`
        : `The r in “${shown}” is one quick tap of the tongue tip behind your top teeth. Don't curl your tongue back. Like “caro”, “sera”.`,
  },
  {
    id: "qu",
    label: "qu",
    test: (w) => w.includes("qu"),
    tip: (w, shown) => `In “${shown}”, qu is /kw/: you say the u. Like “quando”, “questo”. This is different from Spanish.`,
  },
  {
    id: "st-sp",
    label: "st · sp",
    test: (w) => /^s[ptcbdgmnlrvf]/.test(w),
    tip: (w, shown) => `“${shown}” starts with s and a consonant. Say s first, with no vowel before it: not “es-” and not “sh-”. Like “studente”, “spesa”.`,
  },
  {
    id: "h",
    label: "h",
    test: (w) => /(^|[^cg])h/.test(w),
    tip: (w, shown) => `The h in “${shown}” is silent. Don't breathe out first: start straight on the next vowel. ho sounds just like o.`,
  },
  {
    id: "acento",
    label: "stress",
    test: (w) => /[àèéìíòóùú]/.test(w),
    tip: (w, shown) => `The written accent shows the strong syllable of “${shown}”, always the last one. Keep the stress there, because moving it can change the word: papa (the Pope), papà (dad).`,
  },
  {
    id: "s",
    label: "s",
    test: (w) => /s[bdglmnrv]/.test(w),
    tip: (w, shown) => `In “${shown}”, s before b, d, g, l, m, n, r or v is voiced, like z in “zoo”. Like “sbaglio”, “smettere”, “sveglia”.`,
  },
  {
    id: "vocal",
    label: "vowels",
    test: (w) => new RegExp(`[${V}][^${V}]+[${V}]`).test(w),
    tip: (w, shown) => `Keep every vowel of “${shown}” short and clear, stressed or not, and say the last one. Italian vowels don't glide and don't get weak.`,
  },
];

const GENERIC = "Listen to the word again and repeat it slowly, one syllable at a time. Then say the whole sentence at normal speed.";

/**
 * The tip for one word. Sounds the sentence was chosen to practise come first, so a
 * learner on the r sentence hears about r even if the word also has a double letter. Without a
 * focus the order of SOUNDS decides: the narrowest and most-often-wrong sounds come first.
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
