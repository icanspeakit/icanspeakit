// Listening safari, build time only: the words the page hands to the game. The game asks for a noun by
// voice and the player finds its picture, so a word needs one right article (generoDrill.js) and a
// picture that really shows it. Short keys: the list is inlined in the page.
//
// `a` keeps the lexicon's clip slug for when recordings exist; until then the browser's voice
// speaks (game.js say()). `m` is the English meaning; the other interface languages are fetched
// from /vocabulary/glosses/ by the game.
import { nouns } from "../lexicon.js";
import { wortBild } from "../wortBild.js";
import { isDrillNoun } from "../generoDrill.js";

// In the shared picture table (wort-bilder.json) these are there to decorate a word card, which is
// not enough here: il padrone di casa is a key, il contratto and il modulo a memo, la domanda a
// question mark, l'ora an hourglass, il cinema popcorn, il lavoro a briefcase, la lingua a speaking
// head (tongue or language?), la febbre and il termometro the same thermometer, il raffreddore a
// frozen face, il comune a classical building, il wifi a router; l'insegnante is a woman's picture
// for a noun of either gender.
const NO_PICTURE_GAME = new Set([
  "padrone di casa", "contratto", "modulo", "domanda", "ora", "cinema", "lavoro", "lingua", "febbre",
  "raffreddore", "comune", "wifi", "insegnante",
]);

// Where the table's person contradicts the noun's gender, a picture can be set here (lemma →
// OpenMoji path). Empty for now: every person left in the game is masculine or feminine in the table
// as the noun is.
const PICTURE_HERE = {};

export function safariWords() {
  return nouns()
    .filter((n) => isDrillNoun(n) && wortBild(n.id) && !NO_PICTURE_GAME.has(n.lemma))
    .map((n) => ({
      id: n.id, w: n.lemma, g: n.gender, a: n.audio, i: PICTURE_HERE[n.lemma] ?? wortBild(n.id), lv: n.level,
      m: n.en ? { en: n.en } : {},
    }));
}
