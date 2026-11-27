// Default nicknames for the live quiz: an animal and a friendly French adjective
// ("Renard rapide", "Hibou sage", "Abeille aimable") — a player learns a phrase just by joining.
// Only adjectives with one form for masculine and feminine (content-plan §5.10), so *renard*
// and *abeille* both agree, and only adjectives nobody minds being called, and only
// combinations that fit the 16 characters cleanName() allows, so a name is never cut off mid-word.
//
// The animal is also the player's picture (avatar): in the lobby, on the ranking and on
// the podium. Only animals with an OpenMoji face, so name and picture always match
// (public/img/openmoji/, fetched by scripts/fetch-openmoji.mjs).

const ADJECTIVES = [
  "rapide", "calme", "drôle", "sage", "brave", "aimable", "agile", "habile",
  "libre", "magique", "sympa", "fidèle", "tranquille", "solide", "célèbre",
];

/** [noun, emoji] */
const ANIMALS = [
  ["Renard", "🦊"], ["Ours", "🐻"], ["Loup", "🐺"], ["Aigle", "🦅"], ["Lion", "🦁"],
  ["Tigre", "🐯"], ["Dauphin", "🐬"], ["Loutre", "🦦"], ["Hérisson", "🦔"], ["Chien", "🐕"],
  ["Hamster", "🐹"], ["Pingouin", "🐧"], ["Panda", "🐼"], ["Castor", "🦫"], ["Koala", "🐨"],
  ["Grenouille", "🐸"], ["Lapin", "🐰"], ["Singe", "🐵"], ["Perroquet", "🦜"],
  ["Hibou", "🦉"], ["Chat", "🐱"], ["Abeille", "🐝"], ["Girafe", "🦒"], ["Phoque", "🦭"],
  ["Souris", "🐭"], ["Canard", "🦆"],
  ["Cheval", "🐴"], ["Licorne", "🦄"], ["Cerf", "🦌"], ["Zèbre", "🦓"], ["Kangourou", "🦘"],
  ["Mouton", "🐑"], ["Poussin", "🐥"],
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

/** A random name nobody in the room has yet (`taken`: lower-case names), with its animal:
 *  a second "Brave Fox" becomes another animal, not "Brave Fox 2". */
export function freshAnimal(taken) {
  const free = NAMES.filter(({ name }) => !taken.has(name.toLowerCase()));
  const pool = free.length ? free : NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** A random name, never the one passed in. */
export const animalName = (not) => drawAnimal(not).name;

/** The animal a name starts with ("Hibou sage" → "Hibou"), or null for an own name. */
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
