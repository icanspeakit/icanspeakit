// Hamstis Nussnacht: the upgrades. A full cheek pouch is a level-up, the run pauses and the
// learner picks one of three. Each goes up to level 5; `b1` ones only come at level B1 (they
// bring plural and compound creatures, which A1/A2 do not have yet).
//
// The numbers are not here: sim.js turns the levels into the run's stats (`stats()`), so the
// whole balance sits in one place (TUNING in sim.js). This file is what the card shows.

export const MAX_LV = 5;

export const UPGRADES = [
  { id: "schleuder", icon: "🥜", name: "Nuss-Schleuder", text: ["Ein Schuss mehr auf einmal."] },
  { id: "backentaschen", icon: "🐹", name: "Backentaschen", text: ["Nüsse fliegen von weiter her zu dir."] },
  { id: "kreisel", icon: "🌰", name: "Eichel-Kreisel", text: ["Eicheln kreisen um Hamsti und treffen jeden Artikel (wenig Schaden).", "Noch eine Eichel, etwas mehr Schaden."] },
  { id: "salve", icon: "🌻", name: "Sonnenblumenkern-Salve", text: ["Schüsse fliegen durch ein Wort mehr hindurch."] },
  { id: "laterne", icon: "🏮", name: "Laterne", text: ["Wörter im Licht werden langsamer.", "Mehr Licht, noch langsamer."] },
  { id: "radar", icon: "📡", name: "Endungs-Radar", text: [
    "-ung, -heit, -keit: Diese Wörter leuchten in ihrer Artikelfarbe.",
    "Dazu -chen, -ment, -um (das).",
    "Dazu -schaft, -tät, -ion (die) und -ling (der).",
    "Leuchtende Wörter bekommen mehr Schaden.",
    "Leuchtende Wörter bekommen noch mehr Schaden.",
  ] },
  { id: "plural", icon: "👯", name: "Plural-Platzer", b1: true, text: ["Plural-Wörter kommen dazu – Plural ist immer die. Sie platzen und treffen alles um sich herum.", "Größerer Platzer."] },
  { id: "kompositum", icon: "🧩", name: "Kompositum-Kracher", b1: true, text: ["Zusammengesetzte Wörter kommen dazu. Sie zerfallen – das letzte Wort bestimmt den Artikel.", "Mehr Nüsse aus Komposita."] },
  { id: "pfoten", icon: "🐾", name: "Flinke Pfoten", text: ["Hamsti läuft schneller."] },
  { id: "vorrat", icon: "🍎", name: "Wintervorrat", text: ["Mehr Lebenspunkte, und du wirst etwas geheilt."] },
  { id: "kauen", icon: "⚡", name: "Schnell-Kauen", text: ["Hamsti schießt öfter."] },
  { id: "schale", icon: "🥥", name: "Harte Schale", text: ["Mehr Schaden pro Treffer."] },
  { id: "fernrohr", icon: "🔭", name: "Fernrohr", text: ["Hamsti zielt weiter."] },
];

// When everything offered is at level 5: a snack instead.
export const SNACK = { id: "snack", icon: "🍪", name: "Nusskeks", text: ["Heilt dich ein Stück."] };

export const upgradeById = (id) => UPGRADES.find((u) => u.id === id) ?? (id === SNACK.id ? SNACK : null);

/** What the card says for the step from `lv` to `lv + 1`. */
export function upgradeText(u, lv) {
  return u.text[Math.min(lv, u.text.length - 1)];
}
