// Short tips for the Aussprache-Check: one rule per Spanish sound that learners most often get
// wrong. No API: the tip is picked from the spelling of the word the learner scored worst on.
// Spanish spelling is regular, so the tests are reliable: z and ce/ci are /θ/, rr is the trill.
//
// Each sound has a `test` on the lower-cased word and a `tip` written in English for A1–B1
// readers: short main clauses, the mouth position first, one example they already know.
// Castilian Spanish (the site's standard, docs/content-plan.md §1.1), with distinción.

/** @typedef {{ id: string, label: string, test: (w: string) => boolean, tip: (w: string, shown: string) => string }} Sound */

const V = "aeiouáéíóúü";
const STRONG_R = /rr|^r|[nls]r/;

/** @type {Sound[]} */
export const SOUNDS = [
  {
    id: "enye",
    label: "ñ",
    test: (w) => w.includes("ñ"),
    tip: () => "ñ is one sound, like ny in “canyon”. Press the middle of your tongue against the roof of your mouth. Like “año”, “mañana”.",
  },
  {
    id: "ce-zi",
    label: "c · z",
    test: (w) => /z|c[eiéí]/.test(w),
    tip: (w, shown) => `In “${shown}”, z or c before e, i is /θ/ in Spain, like th in “think”: tongue tip between your teeth, only air. Not ts, not ch. (Southern Spain and Latin America say s here, and that is fine too.)`,
  },
  {
    id: "j-g",
    label: "j · g",
    test: (w) => /j|g[eiéí]/.test(w),
    tip: (w, shown) => `In “${shown}”, j or g before e, i is a rasp at the back of your mouth, like ch in Scottish “loch”. Not the j in “jam”. Like “trabajo”, “gente”.`,
  },
  {
    id: "r",
    label: "r · rr",
    test: (w) => w.includes("r"),
    tip: (w, shown) =>
      STRONG_R.test(w)
        ? `“${shown}” has a strong r: several quick taps of the tongue tip behind your top teeth. Not in the throat. Like “perro”, “rojo”.`
        : `The r in “${shown}” is one quick tap of the tongue tip behind your top teeth. Don't curl your tongue back. Like “pero”, “caro”.`,
  },
  {
    id: "ll-y",
    label: "ll · y",
    test: (w) => new RegExp(`ll|y[${V}]`).test(w),
    tip: () => "In most of Spain, ll and y are the same sound: y in “yes”, a little stronger. It is never an l. Like “calle”, “yo”.",
  },
  {
    id: "ch",
    label: "ch",
    test: (w) => w.includes("ch"),
    tip: () => "ch is one sound, as in “church”: first the tongue touches the roof of your mouth, then lets go. Not sh, not k. Like “ocho”, “noche”.",
  },
  {
    id: "qu-gu",
    label: "qu · gu",
    test: (w) => /qu|gu[eiéí]|gü/.test(w),
    tip: (w, shown) =>
      w.includes("gü")
        ? `In “${shown}” you say the u: the two dots tell you to. Like “pingüino”, “vergüenza”.`
        : `In “${shown}” the u is silent: que sounds like “ke”, gue like “ge” with the g of “go”.`,
  },
  {
    id: "h",
    label: "h",
    test: (w) => /(^|[^c])h/.test(w),
    tip: (w, shown) => `The h in “${shown}” is silent. Don't breathe out first: start straight on the next vowel. hola sounds just like ola.`,
  },
  {
    id: "b-v",
    label: "b · v",
    test: (w) => /[bv]/.test(w),
    tip: (w) =>
      new RegExp(`[${V}][bv][${V}]`).test(w)
        ? "b and v are the same sound. Between vowels it is soft: your lips almost touch, and your teeth stay away from your lip. Like “abuela”, “nuevo”."
        : "b and v are the same sound: close both lips. Your top teeth never touch your lip. Like “vino”, “bien”.",
  },
  {
    id: "d",
    label: "d",
    test: (w) => /[^nl]d/.test(w),
    tip: (w, shown) => `The d in “${shown}” is soft, like th in “this”: the tongue only just touches your teeth, and the air keeps flowing. Like “nada”, “Madrid”.`,
  },
  {
    id: "acento",
    label: "stress",
    test: (w) => /[áéíóú]/.test(w),
    tip: (w, shown) => `The written accent shows the strong syllable of “${shown}”. Keep the stress there, because moving it can change the word: hablo (I speak), habló (she spoke).`,
  },
  {
    id: "vocal",
    label: "vowels",
    test: (w) => new RegExp(`[${V}][^${V}]+[${V}]`).test(w),
    tip: (w, shown) => `Keep every vowel of “${shown}” short and clear, stressed or not. Spanish vowels don't glide and don't get weak.`,
  },
];

const GENERIC = "Listen to the word again and repeat it slowly, one syllable at a time. Then say the whole sentence at normal speed.";

/**
 * The tip for one word. Sounds the sentence was chosen to practise come first, so a
 * learner on the r sentence hears about r even if the word also has a b. Without a focus the
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
