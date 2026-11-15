// Hamstis Nussnacht: the upgrades. A full cheek pouch is a level-up, the run pauses and the
// learner picks one of three. Each goes up to level 5; `b1` ones only come at level B1 (they
// bring plural and compound creatures, which A1/A2 do not have yet).
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
  { id: "radar", icon: "📡", name: "Ending radar", text: [
    "Words in -o that take il and words in -a that take la glow in the colour of their article.",
    "Also the other endings with a clear rule glow: -zione, -sione, -gione, -tà, -tù (la) and -ore, -ale (il).",
    "Also the traps glow in their right colour: il problema, il cinema, la mano, la radio.",
    "Glowing words take more damage.",
    "Glowing words take even more damage.",
  ] },
  { id: "plural", icon: "👯", name: "Plural popper", b1: true, text: ["Plural words join in, and with them the i, gli and le shots. The first sound and the gender decide: i libri, gli zaini, gli amici, le amiche. They pop and hit everything around them.", "Bigger pop."] },
  { id: "kompositum", icon: "🧩", name: "Compound cracker", b1: true, text: ["Compound nouns join in (il cavatappi, l'apriscatole, lo schiaccianoci). They crack in two: a verb + a noun, the article follows the first sound, and the plural stays the same (i cavatappi).", "More nuts from compound nouns."] },
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
