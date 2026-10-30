// Short English tips for the Aussprache-Check: one rule per sound that learners of English
// most often get wrong. No API — the tip is picked from the spelling of the word the
// learner scored worst on, which is enough most of the time: th is written th, "walked"
// ends in -ed. English spelling is not regular, so the tests are deliberately narrow:
// better no tip for a word than a tip about a sound the word does not have.
//
// Each sound has a `test` on the lower-cased word and a `tip` written for A1–B1 readers:
// short main clauses, the mouth position first, one example they already know.
// British English (the site's default variety, docs/content-plan.md §1.1).

/** @typedef {{ id: string, label: string, test: (w: string) => boolean, tip: (w: string, shown: string) => string }} Sound */

// -ed after these sounds is /t/ (helped, watched, laughed); after t or d it is /ɪd/.
const ED_T = /(p|k|ck|ss|sh|ch|x|f|gh|c)ed$/;
const ED_ID = /(t|d)ed$/;
// Words that end in -ed but are not past forms.
const NOT_ED = new Set(["hundred", "naked", "wicked", "sacred", "need", "speed", "seed", "feed", "bed", "red", "shed", "fed", "led", "wed"]);
const isEd = (w) => /[^e]ed$/.test(w) && w.length > 4 && !NOT_ED.has(w);
// A short a /æ/ in one closed syllable (cat, black, hand). Not the British long a /ɑː/ of
// class, fast, bath, after, can't, dance, half, calm.
const SHORT_A = (w) => /^[^aeiou]*a[bcdfgklmnpstvxz]{1,2}$/.test(w) && !/a(ss|st|sk|sp|th|ft|nt|nce|lf|lm|ll|lk|lt)$/.test(w) && !/^(w|wh|qu|sw|squ)a/.test(w);

/** @type {Sound[]} */
export const SOUNDS = [
  {
    id: "th",
    label: "th",
    test: (w) => w.includes("th") && !/^(thomas|thames|thailand|thai)$/.test(w),
    tip: (w, shown) =>
      /^(the|this|that|these|those|they|them|their|there|then|than|though|with)$/.test(w) || /[aeiou]th(er|e)/.test(w)
        ? `th in “${shown}” is /ð/: the tip of your tongue between your teeth, and use your voice. Not d, not z. Like “this”, “mother”.`
        : `th in “${shown}” is /θ/: the tip of your tongue between your teeth, and push out only air. Not s, t or f. Like “think”, “three”.`,
  },
  {
    id: "w-v",
    label: "w · v",
    test: (w) => /^w[aeiouy]|^wh[aeiy]|v/.test(w),
    tip: (w) =>
      w.includes("v")
        ? "v: put your top teeth on your bottom lip and use your voice. Not b, not w. Like “very”, “seven”, “live”."
        : "w: make your lips small and round, as for “oo”, then open them. Your teeth don't touch your lips. Like “we”, “water”, “what”.",
  },
  {
    id: "i-ee",
    label: "i · ee",
    test: (w) => /ee|ea/.test(w) || (/i([^aeiouyr][^aeiouy]|[^aeiouyr]$)/.test(w) && !/i(gh|nd|ld|mb|gn)/.test(w)),
    tip: (w) =>
      /ee|ea/.test(w)
        ? "ee and ea are usually a long /iː/: spread your lips, as in a smile, and hold the sound. Like “sheep”, “tea”, “meet”."
        : "This i is short and relaxed /ɪ/: don't spread your lips and don't hold it. ship is not sheep, live is not leave.",
  },
  {
    id: "ae",
    label: "a",
    test: SHORT_A,
    tip: () => "a in a short word like “cat” is /æ/: open your mouth wide and keep your tongue low and forward. bad is not bed, cap is not cup.",
  },
  {
    id: "ed",
    label: "-ed",
    test: isEd,
    tip: (w, shown) =>
      ED_ID.test(w)
        ? `After t or d, -ed is a new syllable /ɪd/: “${shown}” has one syllable more than its verb. Like “wanted”, “needed”.`
        : ED_T.test(w)
          ? `-ed in “${shown}” is a short /t/, not a new syllable: “walked” = /wɔːkt/, “watched” = /wɒtʃt/.`
          : `-ed in “${shown}” is a short /d/, not a new syllable: “played” = /pleɪd/, “lived” = /lɪvd/.`,
  },
  {
    id: "s-cluster",
    label: "sp · st · sk",
    test: (w) => /^s(p|t|k|m|n|l|w|c(?![eiy]))/.test(w),
    tip: (w, shown) => `“${shown}” starts with two consonants. Start with the s straight away, with no vowel before it: “${shown}”, not “e${shown.toLowerCase()}”.`,
  },
  {
    id: "h",
    label: "h",
    test: (w) => /^h/.test(w) && !/^(hour|hours|honest|honour|heir)/.test(w),
    tip: () => "h is only a soft breath, like breathing on a cold window. Don't leave it out (hear is not ear), and don't scratch in your throat.",
  },
  {
    id: "r",
    label: "r",
    test: (w) => /r$|r[^aeiouyr]|[aeiou]re$/.test(w) || /^r|[^aeiou]r[aeiouy]/.test(w),
    tip: (w, shown) =>
      /r$|r[^aeiouyr]|[aeiou]re$/.test(w)
        ? `In British English the r in “${shown}” is silent: it comes after a vowel. Make the vowel a little longer instead, as in “car” /kɑː/, “bird” /bɜːd/.`
        : "English r: curl the tip of your tongue back a little. It doesn't touch the top of your mouth, so don't roll it and don't make it in your throat. Like “red”, “very”.",
  },
  {
    id: "ng",
    label: "ng",
    test: (w) => /ng$/.test(w),
    tip: (w, shown) => `ng at the end of “${shown}” is one sound /ŋ/, made at the back of your mouth. Don't add a g or k after it: “sing”, “morning”.`,
  },
  {
    id: "end",
    label: "last sound",
    test: (w) => /[bdgvz]e?$/.test(w) || /[ptkfsx]$/.test(w),
    tip: (w, shown) =>
      /[bdgvz]e?$/.test(w)
        ? `Keep the voice in the last sound of “${shown}”: b, d, g, v, z stay soft at the end. bad is not bat, bag is not back.`
        : `Say the last sound of “${shown}” clearly. English needs it: it can change the word (cat, cap, can) or show the tense or the plural.`,
  },
];

// Without a focus, the narrow tests go first: "walked" is about -ed before it is about w.
const ORDER = ["th", "ed", "s-cluster", "ng", "ae", "w-v", "i-ee", "h", "r", "end"];
SOUNDS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

const GENERIC ="Listen to the word again and repeat it slowly, one syllable at a time. Then say the whole sentence at normal speed.";

/**
 * The tip for one word. Sounds the sentence was chosen to practise come first, so a
 * learner on the th sentence hears about th even if the word also has an r.
 * @param {string} word as shown in the sentence (punctuation is ignored)
 * @param {string[]} [focus] the sentence's focus sound ids
 * @returns {{ sound: string | null, label: string | null, text: string }}
 */
export function tipFor(word, focus = []) {
  const shown = word.replace(/[^A-Za-z'-]/g, "");
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
