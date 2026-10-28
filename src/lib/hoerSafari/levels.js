// Hör-Safari levels: eight steps per board (Niveau × card mode), each with a goal (so many
// right birds before the time runs out) and its own difficulty. The free 90-second round with
// the ranking stays as "Highscore" (game.js TUNING).
//
// Progress is kept on this device under "da_hoerSafari_levels". The da_ prefix is on purpose:
// appState.js mirrors da_* keys in the Android app, and a later account sync hooks in there.
// Every access is wrapped: blocked storage must never stop the game.

/**
 * speed: bird speed factor · birds: how many fly at once · dives: seconds between divers
 * (0 = none) · divers: at most at once · dive: how fast a diver comes (× the Niveau's time)
 * · hint: seconds until the word shows · news: what is new here, for the level's start card.
 */
export const LEVELS = [
  { name: "Erste Schritte", goal: 6, time: 75, speed: 0.65, birds: 4, dives: 0, divers: 0, dive: 1, hint: 6,
    news: ["Langsame Vögel, nur vier auf einmal", "Keine Sturzflieger", "Nach 6 Sekunden steht das Wort oben"] },
  { name: "Mehr Vögel", goal: 7, time: 75, speed: 0.8, birds: 5, dives: 0, divers: 0, dive: 1, hint: 7,
    news: ["Fünf Vögel auf einmal", "Etwas schneller"] },
  { name: "Achtung, von oben!", goal: 8, time: 75, speed: 0.9, birds: 5, dives: 11, divers: 1, dive: 1.15, hint: 8,
    news: ["Jetzt kommen Sturzflieger: schnell treffen, sonst ist ein Herz weg"] },
  { name: "Schneller", goal: 8, time: 75, speed: 1.05, birds: 6, dives: 9, divers: 1, dive: 1.05, hint: 8,
    news: ["Die Vögel fliegen schneller", "Sechs auf einmal"] },
  { name: "Gedränge", goal: 9, time: 75, speed: 1.15, birds: 7, dives: 8, divers: 1, dive: 1, hint: 9,
    news: ["Sieben Vögel auf einmal", "Sturzflieger öfter"] },
  { name: "Ohne Hilfe", goal: 10, time: 75, speed: 1.25, birds: 7, dives: 7, divers: 2, dive: 0.95, hint: 12,
    news: ["Das Wort kommt erst nach 12 Sekunden", "Zwei Sturzflieger auf einmal möglich"] },
  { name: "Sturm", goal: 10, time: 70, speed: 1.45, birds: 8, dives: 6, divers: 2, dive: 0.85, hint: 12,
    news: ["Sehr schnelle Vögel", "Nur 70 Sekunden"] },
  { name: "Safari-Profi", goal: 12, time: 70, speed: 1.6, birds: 8, dives: 5, divers: 2, dive: 0.8, hint: 15,
    news: ["Das letzte Level: alles auf einmal", "Das Wort kommt erst nach 15 Sekunden"] },
];

const KEY = "da_hoerSafari_levels";

function read() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (data && typeof data === "object") return data;
  } catch {
    /* fall through */
  }
  return {};
}

/** A board's progress: { open: highest playable level (1-based), stars: { [n]: 1–3 }, best: { [n]: points } }. */
export function levelProgress(board) {
  const p = read()[board] || {};
  return { open: Math.min(LEVELS.length, Math.max(1, p.open || 1)), stars: p.stars || {}, best: p.best || {} };
}

/** 3 stars without a mistake, 2 with up to two (wrong birds + hearts lost), else 1. */
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);

/** Saves a won level and opens the next. Returns what changed: { stars, better, opened }. */
export function saveLevel(board, n, { stars, score }) {
  const all = read();
  const p = levelProgress(board);
  const better = stars > (p.stars[n] || 0);
  if (better) p.stars[n] = stars;
  if (score > (p.best[n] || 0)) p.best[n] = score;
  const opened = n + 1 <= LEVELS.length && p.open < n + 1;
  if (opened) p.open = n + 1;
  all[board] = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked: progress just is not kept */
  }
  return { stars, better, opened };
}
