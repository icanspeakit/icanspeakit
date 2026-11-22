// Hör-Safari, build time only: the words the page hands to the game. The game asks for a noun by
// voice and the player finds its picture, so a word needs one right article (generoDrill.js) and a
// picture that really shows it. Short keys: the list is inlined in the page.
//
// `a` keeps the lexicon's clip slug for when recordings exist; until then the browser's voice
// speaks (game.js say(): a pt-PT voice, else a Brazilian one with a warning line). `m` is the
// English meaning; the other interface languages are fetched from /vocabulario/glosses/ by the game.
import { nouns } from "../lexicon.js";
import { wortBild } from "../wortBild.js";
import { isDrillNoun } from "../generoDrill.js";

const OM = (code) => `/img/openmoji/${code}.svg`;

// The game's own pictures, by Portuguese lemma. The shared table (wort-bilder.json) still keys
// many Spanish-course ids, so the safari keeps a list of nouns that have one clear, concrete
// picture: food, animals, the body, things at home, transport in Portugal (o autocarro, o comboio,
// o elétrico, a mota, o camião), clothes. One picture per word and no picture twice, or two birds
// would carry the same card. Every lemma here is an o/a drill noun in the lexicon (checked
// 2026-11-22); one the lexicon loses is simply skipped. A man for a masculine person noun, a
// woman for a feminine one, so the picture never contradicts the article (o médico, o professor,
// o avô; a mulher, a rapariga). More words can join when the lexicon has them (a banana, o
// coelho, o avião, o telefone …: not there yet).
export const PICTURE_HERE = {
  // food and drink
  pão: "1F35E", maçã: "1F34E", batata: "1F954", ovo: "1F95A", queijo: "1F9C0", leite: "1F95B",
  bolo: "1F370", vinho: "1F377", cerveja: "1F37A",
  // animals
  cão: "1F415", cavalo: "1F40E", porco: "1F416", ovelha: "1F411", rato: "1F42D",
  pássaro: "1F426", peixe: "1F41F",
  // nature and weather
  árvore: "1F333", chuva: "1F327", nuvem: "2601", montanha: "26F0", praia: "1F3D6",
  ilha: "1F3DD", neve: "2744",
  // transport
  carro: "1F697", autocarro: "1F68C", comboio: "1F686", metro: "1F687", elétrico: "1F68A",
  // at home and things
  telemóvel: "1F4F1", televisão: "1F4FA", livro: "1F4D6", caneta: "1F58A", chave: "1F511",
  porta: "1F6AA", janela: "1FA9F", cadeira: "1FA91", espelho: "1FA9E", sabonete: "1F9FC",
  chapéu: "1F3A9", casaco: "1F9E5", despertador: "23F0", lâmpada: "1F4A1", martelo: "1F528",
  escada: "1FA9C", bola: "26BD", bilhete: "1F3AB", cartão: "1F4B3", dinheiro: "1F4B5",
  // the body
  dente: "1F9B7", olho: "1F441", orelha: "1F442", mão: "270B", pé: "1F9B6", perna: "1F9B5",
  coração: "2764",
  // people and places
  criança: "1F9D2", rapariga: "1F467", mulher: "1F469", avô: "1F474",
  médico: "1F468-200D-2695", professor: "1F468-200D-1F3EB",
  escola: "1F3EB", igreja: "26EA", fábrica: "1F3ED", loja: "1F3EA", ponte: "1F309", fonte: "26F2",
};

// From the shared table, but not right for this game: o andar (a floor, a flat) shows a person
// walking; a nota (a mark, a banknote) a notepad; a bolsa (a bag, a grant, the stock exchange)
// shopping bags; a temperatura and o formulário share their picture with o termómetro and
// o contrato.
const NO_PICTURE_GAME = new Set(["andar", "nota", "bolsa", "temperatura", "formulário"]);

const picture = (n) => (PICTURE_HERE[n.lemma] ? OM(PICTURE_HERE[n.lemma]) : wortBild(n.id));

export function safariWords() {
  const seen = new Set();
  const out = [];
  for (const n of nouns()) {
    if (!isDrillNoun(n) || NO_PICTURE_GAME.has(n.lemma)) continue;
    const i = picture(n);
    // one word per lemma (a word listed at two levels comes once) and one word per picture
    if (!i || seen.has(i) || seen.has(n.lemma)) continue;
    seen.add(i);
    seen.add(n.lemma);
    out.push({ id: n.id, w: n.lemma, g: n.gender, a: n.audio, i, lv: n.level, m: n.en ? { en: n.en } : {} });
  }
  return out;
}
