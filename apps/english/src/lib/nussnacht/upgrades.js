// Hamstis Nussnacht: the upgrades. A full cheek pouch is a level-up, the run pauses and the
// learner picks one of three. Each goes up to level 5; `b1` ones only come at level B1 (they
// bring plural and two-word creatures, which A1/A2 do not have yet).
//
// The numbers are not here: sim.js turns the levels into the run's stats (`stats()`), so the
// whole balance sits in one place (TUNING in sim.js). This file is what the card shows.

export const MAX_LV = 5;

export const UPGRADES = [
  { id: "schleuder", icon: "🥜", name: "Nut slingshot", text: ["One more shot at a time."] },
  { id: "backentaschen", icon: "🐹", name: "Cheek pouches", text: ["Nuts fly to you from further away."] },
  { id: "kreisel", icon: "🌰", name: "Acorn spinner", text: ["Acorns circle Hamsti and hit every word, whatever its article (low damage).", "One more acorn, a bit more damage."] },
  { id: "salve", icon: "🌻", name: "Sunflower seed volley", text: ["Shots fly through one more word."] },
  { id: "laterne", icon: "🏮", name: "Lantern", text: ["Words in the light slow down.", "More light, even slower."] },
  { id: "radar", icon: "📡", name: "First-sound radar", text: [
    "Words that start with a, e, i or o and take an glow in the colour of an.",
    "Also words that start with a consonant (not h) and take a glow in the colour of a.",
    "Also the tricky ones with h and u glow in their right colour: an hour, a hotel, an uncle, a university.",
    "Glowing words take more damage.",
    "Glowing words take even more damage.",
  ] },
  { id: "plural", icon: "👯", name: "Plural popper", b1: true, text: ["Plural words join in – a plural never takes a or an: some apples. They pop and hit everything around them.", "Bigger pop."] },
  { id: "kompositum", icon: "🧩", name: "Two-word cracker", b1: true, text: ["Two-word nouns join in (a bus stop, an email address). They crack in two: the first word’s sound decides between a and an.", "More nuts from two-word nouns."] },
  { id: "pfoten", icon: "🐾", name: "Quick paws", text: ["Hamsti runs faster."] },
  { id: "vorrat", icon: "🍎", name: "Winter store", text: ["More health, and you heal a little."] },
  { id: "kauen", icon: "⚡", name: "Fast chewing", text: ["Hamsti shoots more often."] },
  { id: "schale", icon: "🥥", name: "Hard shell", text: ["More damage per hit."] },
  { id: "fernrohr", icon: "🔭", name: "Telescope", text: ["Hamsti aims further."] },
];

// When everything offered is at level 5: a snack instead.
export const SNACK = { id: "snack", icon: "🍪", name: "Nut biscuit", text: ["Heals you a bit."] };

export const upgradeById = (id) => UPGRADES.find((u) => u.id === id) ?? (id === SNACK.id ? SNACK : null);

/** What the card says for the step from `lv` to `lv + 1`. */
export function upgradeText(u, lv) {
  return u.text[Math.min(lv, u.text.length - 1)];
}
