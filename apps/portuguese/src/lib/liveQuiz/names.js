// Default nicknames for the live quiz: an animal and a friendly Spanish adjective
// ("Zorro valiente", "Búho feliz", "Abeja amable") — a player learns a phrase just by joining.
// Only adjectives with one form for el and la, so *zorro* and *abeja* both agree, and only
// adjectives nobody minds being called, and only combinations that fit the 16 characters
// cleanName() allows, so a name is never cut off mid-word.
//
// The animal is also the player's picture (avatar): in the lobby, on the ranking and on
// the podium. Only animals with an OpenMoji face, so name and picture always match
// (public/img/openmoji/, fetched by scripts/fetch-openmoji.mjs).

const ADJECTIVES = [
  "valiente", "fuerte", "feliz", "alegre", "amable", "genial", "veloz", "capaz",
  "libre", "audaz", "tenaz", "noble", "elegante", "brillante", "sonriente",
];

/** [noun, emoji] */
const ANIMALS = [
  ["Zorro", "🦊"], ["Oso", "🐻"], ["Lobo", "🐺"], ["Águila", "🦅"], ["León", "🦁"],
  ["Tigre", "🐯"], ["Delfín", "🐬"], ["Nutria", "🦦"], ["Erizo", "🦔"], ["Perro", "🐕"],
  ["Hámster", "🐹"], ["Pingüino", "🐧"], ["Panda", "🐼"], ["Castor", "🦫"], ["Koala", "🐨"],
  ["Rana", "🐸"], ["Conejo", "🐰"], ["Mono", "🐵"], ["Loro", "🦜"],
  ["Búho", "🦉"], ["Gato", "🐱"], ["Abeja", "🐝"], ["Jirafa", "🦒"], ["Foca", "🦭"],
  ["Ratón", "🐭"], ["Pato", "🦆"],
  ["Caballo", "🐴"], ["Unicornio", "🦄"], ["Ciervo", "🦌"], ["Cebra", "🦓"], ["Canguro", "🦘"],
  ["Oveja", "🐑"], ["Pollito", "🐥"],
];

import { withBase } from "../paths.js";

/** Animal → emoji, for the icon fetch script and for avatarSrc(). */
export const ANIMAL_EMOJI = Object.fromEntries(ANIMALS);

const NAMES = ADJECTIVES.flatMap((adj) =>
  ANIMALS.map(([noun]) => ({ name: `${noun} ${adj}`, animal: noun }))
).filter(({ name }) => name.length <= 16);

const ANIMAL_NAMES = Object.keys(ANIMAL_EMOJI);

/** A random name with its animal, never the name passed in (so the dice always changes something). */
export function drawAnimal(not) {
  let pick;
  do pick = NAMES[Math.floor(Math.random() * NAMES.length)];
  while (pick.name === not && NAMES.length > 1);
  return pick;
}

/** A random name, never the one passed in. */
export const animalName = (not) => drawAnimal(not).name;

/** The animal a name starts with ("Búho feliz" → "Búho"), or null for an own name. */
export function animalOf(name) {
  const head = String(name ?? "").trim().split(/\s+/)[0];
  return ANIMAL_NAMES.find((a) => a.toLowerCase() === head?.toLowerCase()) ?? null;
}

/** A random animal, for bots and for players whose phone sent none. */
export const randomAnimal = () => ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];

/** `/img/openmoji/<code>.svg` for an animal, or null for one this list does not know. */
export function avatarSrc(animal) {
  const emoji = ANIMAL_EMOJI[animal];
  if (!emoji) return null;
  const code = [...emoji].map((c) => c.codePointAt(0)).filter((cp) => cp !== 0xfe0f).map((cp) => cp.toString(16).toUpperCase()).join("-");
  return withBase(`/img/openmoji/${code}.svg`);
}
