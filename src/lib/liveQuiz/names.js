// Default nicknames for the live quiz: a flattering German adjective and an animal,
// declined the way German declines them without an article ("Mutiger Fuchs",
// "Kluge Eule", "Flinkes Pferd") — a player learns a phrase just by joining. Only
// adjectives nobody minds being called, and only combinations that fit the 16
// characters cleanName() allows, so a name is never cut off mid-word.
//
// The animal is also the player's picture (avatar): in the lobby, on the ranking and on
// the podium. Only animals with an OpenMoji face, so name and picture always match
// (public/img/openmoji/, fetched by scripts/fetch-openmoji.mjs).

const ADJECTIVES = [
  "mutig", "schlau", "klug", "flink", "stark", "fröhlich", "clever", "weise",
  "tapfer", "witzig", "stolz", "edel", "sanft", "kühn", "elegant", "lustig", "fleißig",
];

/** [noun, gender, emoji] — m/f/n picks the ending: -er, -e, -es. */
const ANIMALS = [
  ["Fuchs", "m", "🦊"], ["Bär", "m", "🐻"], ["Wolf", "m", "🐺"], ["Adler", "m", "🦅"], ["Löwe", "m", "🦁"],
  ["Tiger", "m", "🐯"], ["Delfin", "m", "🐬"], ["Otter", "m", "🦦"], ["Igel", "m", "🦔"], ["Dackel", "m", "🐕"],
  ["Hamster", "m", "🐹"], ["Pinguin", "m", "🐧"], ["Panda", "m", "🐼"], ["Biber", "m", "🦫"], ["Koala", "m", "🐨"],
  ["Frosch", "m", "🐸"], ["Hase", "m", "🐰"], ["Affe", "m", "🐵"], ["Papagei", "m", "🦜"],
  ["Eule", "f", "🦉"], ["Katze", "f", "🐱"], ["Biene", "f", "🐝"], ["Giraffe", "f", "🦒"], ["Robbe", "f", "🦭"],
  ["Maus", "f", "🐭"], ["Ente", "f", "🦆"],
  ["Pferd", "n", "🐴"], ["Einhorn", "n", "🦄"], ["Reh", "n", "🦌"], ["Zebra", "n", "🦓"], ["Känguru", "n", "🦘"],
  ["Schaf", "n", "🐑"], ["Küken", "n", "🐥"],
];

/** Animal → emoji, for the icon fetch script and for avatarSrc(). */
export const ANIMAL_EMOJI = Object.fromEntries(ANIMALS.map(([noun, , emoji]) => [noun, emoji]));

const ENDING = { m: "er", f: "e", n: "es" };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// "edel" drops its e before an ending (Edler, Edle, Edles), and so does a final e
// ("weise": Weiser, not Weiseer).
const stem = (adj) => (adj.endsWith("el") ? adj.slice(0, -2) + "l" : adj.endsWith("e") ? adj.slice(0, -1) : adj);

const NAMES = ADJECTIVES.flatMap((adj) =>
  ANIMALS.map(([noun, g]) => ({ name: `${cap(stem(adj))}${ENDING[g]} ${noun}`, animal: noun }))
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

/** The animal a name ends in ("Kluge Eule" → "Eule"), or null for an own name. */
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
  return `/img/openmoji/${code}.svg`;
}
