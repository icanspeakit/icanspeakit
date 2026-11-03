// Default nicknames for the live quiz: a friendly English adjective and an animal
// ("Brave Fox", "Clever Owl", "Busy Bee") — a player learns a phrase just by joining. Only
// adjectives nobody minds being called, and only combinations that fit the 16 characters
// cleanName() allows, so a name is never cut off mid-word.
//
// The animal is also the player's picture (avatar): in the lobby, on the ranking and on
// the podium. Only animals with an OpenMoji face, so name and picture always match
// (public/img/openmoji/, fetched by scripts/fetch-openmoji.mjs).

const ADJECTIVES = [
  "brave", "clever", "smart", "quick", "strong", "happy", "wise", "bold",
  "funny", "proud", "gentle", "noble", "cool", "lucky", "kind", "busy", "jolly",
];

/** [noun, emoji] */
const ANIMALS = [
  ["Fox", "🦊"], ["Bear", "🐻"], ["Wolf", "🐺"], ["Eagle", "🦅"], ["Lion", "🦁"],
  ["Tiger", "🐯"], ["Dolphin", "🐬"], ["Otter", "🦦"], ["Hedgehog", "🦔"], ["Dog", "🐕"],
  ["Hamster", "🐹"], ["Penguin", "🐧"], ["Panda", "🐼"], ["Beaver", "🦫"], ["Koala", "🐨"],
  ["Frog", "🐸"], ["Rabbit", "🐰"], ["Monkey", "🐵"], ["Parrot", "🦜"],
  ["Owl", "🦉"], ["Cat", "🐱"], ["Bee", "🐝"], ["Giraffe", "🦒"], ["Seal", "🦭"],
  ["Mouse", "🐭"], ["Duck", "🦆"],
  ["Horse", "🐴"], ["Unicorn", "🦄"], ["Deer", "🦌"], ["Zebra", "🦓"], ["Kangaroo", "🦘"],
  ["Sheep", "🐑"], ["Chick", "🐥"],
];

import { withBase } from "../paths.js";

/** Animal → emoji, for the icon fetch script and for avatarSrc(). */
export const ANIMAL_EMOJI = Object.fromEntries(ANIMALS);

const cap = (s) => s[0].toUpperCase() + s.slice(1);

const NAMES = ADJECTIVES.flatMap((adj) =>
  ANIMALS.map(([noun]) => ({ name: `${cap(adj)} ${noun}`, animal: noun }))
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

/** The animal a name ends in ("Clever Owl" → "Owl"), or null for an own name. */
export function animalOf(name) {
  const last = String(name ?? "").trim().split(/\s+/).pop();
  return ANIMAL_NAMES.find((a) => a.toLowerCase() === last?.toLowerCase()) ?? null;
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
