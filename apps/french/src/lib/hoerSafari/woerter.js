// Hör-Safari, build time only: the words the page hands to the game. The game asks for a noun by
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
// not enough here: el casero is a key, el padrón a clipboard, el estrés and la diversión a face;
// el DNI and el NIE are the same card, and spoken as letters.
const NO_PICTURE_GAME = new Set(["casero", "padrón", "estrés", "diversión", "DNI", "NIE"]);

// The table's person is a woman, which contradicts the masculine noun in a gender game.
const PICTURE_HERE = {
  médico: "/img/openmoji/1F468-200D-2695.svg",
  profesor: "/img/openmoji/1F468-200D-1F3EB.svg",
};

export function safariWords() {
  return nouns()
    .filter((n) => isDrillNoun(n) && wortBild(n.id) && !NO_PICTURE_GAME.has(n.lemma))
    .map((n) => ({
      id: n.id, w: n.lemma, g: n.gender, a: n.audio, i: PICTURE_HERE[n.lemma] ?? wortBild(n.id), lv: n.level,
      m: n.en ? { en: n.en } : {},
    }));
}
