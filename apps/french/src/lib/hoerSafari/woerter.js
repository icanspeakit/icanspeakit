// Hör-Safari, build time only: the words the page hands to the game. The game asks for a noun by
// voice and the player finds its picture, so a word needs one right article (generoDrill.js) and a
// picture that really shows it. Short keys: the list is inlined in the page.
//
// `a` keeps the lexicon's clip slug for when recordings exist; until then the browser's French
// voice speaks (game.js say()). `m` is the English meaning; the other interface languages are
// fetched from /vocabulary/glosses/ by the game.
import { nouns } from "../lexicon.js";
import { wortBild } from "../wortBild.js";
// le / la only: hearing l'école can't tell the gender (content-plan §5.9).
import { isDefiniteDrillNoun as isDrillNoun } from "../generoDrill.js";

// In the shared picture table (wort-bilder.json) these are there to decorate a word card, which is
// not enough here, where the picture alone has to name the word:
//   - abstract, a face or a symbol: la joie, le stress, la langue (a speaking head), le sport
//     (a medal), le travail (a briefcase), le temps, la météo (a cloud), le printemps (a tulip,
//     next to la fleur);
//   - one card for two words, so a round could have two right birds: la mairie / le musée (a
//     columned building), la fièvre / la température (a thermometer: le thermomètre stays),
//     la nuit (the moon: la lune stays), le rendez-vous (le calendrier stays), la salle de bains
//     (la baignoire stays), la carte de crédit (la carte bancaire stays), le contrat / le
//     formulaire (a memo), le supermarché (a trolley: le chariot stays), le médicament (a pill:
//     le comprimé stays), le masque (theatre masks: le théâtre stays);
//   - the wrong thing: la chemise is a tie (la cravate stays), la montre an alarm clock.
const NO_PICTURE_GAME = new Set([
  "joie", "stress", "langue", "sport", "travail", "temps", "météo", "printemps",
  "mairie", "musée", "fièvre", "température", "nuit", "rendez-vous", "salle de bains",
  "carte de crédit", "contrat", "formulaire", "supermarché", "médicament", "masque",
  "chemise", "montre",
]);

// The table's person is a woman, which contradicts the masculine noun in a gender game.
const PICTURE_HERE = {
  médecin: "/img/openmoji/1F468-200D-2695.svg",
  professeur: "/img/openmoji/1F468-200D-1F3EB.svg",
};

export function safariWords() {
  return nouns()
    .filter((n) => isDrillNoun(n) && wortBild(n.id) && !NO_PICTURE_GAME.has(n.lemma))
    .map((n) => ({
      id: n.id, w: n.lemma, g: n.gender, a: n.audio, i: PICTURE_HERE[n.lemma] ?? wortBild(n.id), lv: n.level,
      m: n.en ? { en: n.en } : {},
    }));
}
