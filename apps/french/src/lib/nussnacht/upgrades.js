// Hamstis Nussnacht: the upgrades. A full cheek pouch is a level-up, the run pauses and the
// learner picks one of three. Each goes up to level 5; `b1` ones only come at level B1 (the
// compound creatures, which A1/A2 do not have yet). The L' popper comes at every level: l' nouns
// are A1 words (l'école, l'eau).
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
    "Words in -tion and -sion that take la and words in -age and -ment that take le glow in the colour of their article.",
    "Also the other endings with a clear rule glow: -té, -ette, -ure, -ence, -ance, -ée, -ie (la) and -eau, -isme, -oir, -ier, -et (le).",
    "Also the traps glow in their right colour: la plage, le musée, la peau, le silence, le camion.",
    "Glowing words take more damage.",
    "Glowing words take even more damage.",
  ] },
  // id "plural" stays (sim.js, replays): in French it brings the words that elide to l'.
  { id: "plural", icon: "💥", name: "L’ popper", text: ["Words with l’ join in (l’école, l’hôtel), and with them the un and une shots: l’ hides the gender, un or une shows it. une école, un hôtel. They pop and hit everything around them.", "Bigger pop."] },
  { id: "kompositum", icon: "🧩", name: "Compound cracker", b1: true, text: ["Compound nouns join in (le tire-bouchon, le lave-vaisselle). They crack in two: a verb + a noun, and always le, even when the noun is feminine (la vaisselle).", "More nuts from compound nouns."] },
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
