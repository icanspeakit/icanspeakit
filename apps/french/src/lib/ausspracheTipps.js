// Short tips for the Aussprache-Check: one rule per French sound that learners most often get
// wrong. No API: the tip is picked from the spelling of the word the learner scored worst on.
// French spelling is less regular than Spanish, so the tests are tests of letters that
// usually give the sound (nasal vowels, u/ou, eu, silent endings); the tips say "usually".
//
// Each sound has a `test` on the lower-cased word and a `tip` written in English for A1–B1
// readers: short main clauses, the mouth position first, one example they already know.
// Standard French of France (the site's standard, docs/content-plan.md §1.1).

/** @typedef {{ id: string, label: string, test: (w: string) => boolean, tip: (w: string, shown: string) => string }} Sound */

const V = "aeiouyéèêëàâîïôûù";
// Words that usually make a liaison with a following vowel: determiners, subject pronouns, short adverbs.
const LIAISON_WORDS = /^(les|des|ces|mes|tes|ses|nous|vous|ils|elles|un|mon|ton|son|très|dans|en|chez|plus|bien|trois|deux|aux|quels|quelles)$/;

/** @type {Sound[]} */
export const SOUNDS = [
  {
    id: "nasal",
    label: "nasal vowels",
    test: (w) => /(an|am|en|em|on|om|in|im|un|um)($|[^aeiouyéèêàâîïôûhnm])/.test(w),
    tip: (w, shown) => `In “${shown}” the n or m is not a consonant here. It tells you to send the air through your nose: an/en (vent), on (bon), in/ain (vin). Don't add an n or a “g” at the end.`,
  },
  {
    id: "u-ou",
    label: "u · ou",
    test: (w) => /ou|où|[ûù]|(^|[^aeoqg])u/.test(w),
    tip: (w, shown) =>
      /ou|où/.test(w)
        ? `“${shown}” has ou: as in “you”, lips round, tongue back. It is not the French u: tout is not tu.`
        : `“${shown}” has French u: say “ee”, then round your lips and keep your tongue forward. It is not “oo”: tu is not tout, rue is not roue.`,
  },
  {
    id: "eu",
    label: "eu",
    test: (w) => /eu|œu/.test(w),
    tip: (w, shown) => `In “${shown}” say eu: start from é and round your lips. It is the vowel of “fur” without the r, never ou. Like “deux”, “peur”.`,
  },
  {
    id: "r",
    label: "r",
    test: (w) => w.includes("r"),
    tip: (w, shown) => `The r in “${shown}” is made at the back of the mouth, with a little friction, like a soft gargle. The tip of your tongue stays down behind your bottom teeth. Not the English r, not a trill. Like “rue”, “merci”.`,
  },
  {
    id: "e-muet",
    label: "e muet",
    test: (w) => /e$|es$|[^aeiou]ent$|^[bcdjlmnpqrstv]e[^aeiouyéèêr]/.test(w),
    tip: (w, shown) => `A final e, as in “${shown}”, is not said, and a short e in the middle of a phrase is weak and often dropped. Say the consonant before it: table sounds like “tabl”, demain like “d'main”.`,
  },
  {
    id: "liaison",
    label: "liaison",
    test: (w) => LIAISON_WORDS.test(w),
    tip: (w, shown) => `“${shown}” usually links to a vowel after it: its last letter is said (as z or n). Like les amis (lé-z-ami), un ami (u-n-ami). After et there is never a liaison.`,
  },
  {
    id: "silent",
    label: "silent letters",
    test: (w) => /(t|s|d|x|p|z|g)$|[^aeiouyéèêàâîïôû]ent$|er$|ez$/.test(w),
    tip: (w, shown) => `The last letter of “${shown}” is usually silent. Don't say it: petit sounds like “peti”, parler like “parlé”, ils parlent like “il parle”. It comes back only before a vowel, in a liaison.`,
  },
  {
    id: "e-accent",
    label: "é · è · ê",
    test: (w) => /[éèêë]|e(ll|rr|tt|ss)/.test(w),
    tip: (w, shown) => `In “${shown}” the accent shows the vowel: é is closed, without the glide of “say”; è and ê are open, as in “bed”. Keep your mouth still while you say it.`,
  },
  {
    id: "ch-j",
    label: "ch · j · g",
    test: (w) => /ch|j|g[eiéèy]/.test(w),
    tip: (w, shown) => `In “${shown}”, ch is like sh in “shop”, and j (or g before e, i) is the voiced sound in “measure”. Not the j in “jam”, not a rasp at the back of your mouth.`,
  },
  {
    id: "s-z",
    label: "s · z · ç",
    test: (w) => new RegExp(`[${V}]s[${V}]|ss|ç|c[eiéèy]`).test(w),
    tip: (w, shown) =>
      new RegExp(`[${V}]s[${V}]`).test(w)
        ? `In “${shown}” the s between two vowels is a z: maison, cuisine. A double ss is always s: poisson (fish) is not poison.`
        : `In “${shown}” the sound is a sharp s: ss, ç and c before e or i. Like “poisson”, “français”, “cinéma”.`,
  },
  {
    id: "b-v",
    label: "b · v",
    test: (w) => /[bv]/.test(w),
    tip: (w, shown) => `In “${shown}” b uses both lips, and v puts your top teeth on your bottom lip, with voice. French has both: vin is not bain.`,
  },
  {
    id: "gn",
    label: "gn · ill",
    test: (w) => /gn|ill/.test(w),
    tip: (w, shown) => `In “${shown}” gn is one sound, like ny in “canyon”, and ill is usually the y of “yes”. Like “montagne”, “fille”.`,
  },
  {
    id: "h",
    label: "h",
    test: (w) => /^h/.test(w),
    tip: (w, shown) => `The h in “${shown}” is silent. Start straight on the next vowel, and link it to the word before: l'homme, les hommes (lé-z-omme).`,
  },
  {
    id: "stress",
    label: "stress",
    test: (w) => new RegExp(`[${V}]+[^${V}]+[${V}]`).test(w),
    tip: (w, shown) => `In French no syllable of “${shown}” stands out. Keep them even, and make only the last syllable of the group a little longer and higher: cho-co-LAT.`,
  },
  {
    id: "vowels",
    label: "vowels",
    test: (w) => new RegExp(`[${V}][^${V}]+[${V}]`).test(w),
    tip: (w, shown) => `Keep every vowel of “${shown}” short and pure, stressed or not. French vowels don't glide (é is not “ay”) and don't get weak.`,
  },
];

const GENERIC = "Listen to the word again and repeat it slowly, one syllable at a time. Then say the whole sentence at normal speed.";

/**
 * The tip for one word. Sounds the sentence was chosen to practise come first, so a
 * learner on the r sentence hears about r even if the word also has a nasal vowel. Without a focus the
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
