// Spaced repetition for the Wortschatz trainer (PREMIUM-FEATURES Tier 3): a Leitner
// scheduler, for everyone, on this device.
//
// localStorage["da_srs_v1"] = {
//   cards: { <cardId>: { box, due: "YYYY-MM-DD", last: <ms>, streak } },
//   meta:  { day: "YYYY-MM-DD", reviews: <graded cards today> },
//   dirty: [<cardId>, …]   changed since the last push (Premium sync, src/lib/srsSync.js)
// }
// The `da_` prefix puts it into the Android app's mirror like the rest of the learning state.
//
// Card id: the lexicon's stable id (toCard in src/lib/lexicon.js), never an array index;
// decks without one (Berufe, Führerschein) fall back to the German word.

// Days until a card in box n is due again. Box 0 = "again today"; a right answer moves a
// card one box up, a wrong one back to 0.
export const INTERVALS = [0, 1, 3, 7, 16];
// New cards are introduced at most this many per session, after the due ones.
export const NEW_PER_SESSION = 10;

const KEY = "da_srs_v1";

/** Today in Europe/Berlin, "YYYY-MM-DD" — the same day boundary as the server meter. */
export const today = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const cardId = (card) => String(card?.id ?? card?.front ?? "");

export function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v === "object" && v.cards) return { cards: v.cards, meta: v.meta ?? {}, dirty: v.dirty ?? [] };
  } catch {}
  return { cards: {}, meta: {}, dirty: [] };
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** Graded cards today on this device (the free meter counts these). */
export function reviewsToday(s = load()) {
  return s.meta.day === today() ? s.meta.reviews ?? 0 : 0;
}

/**
 * Record one graded card.
 * @param {string} id
 * @param {boolean} ok
 */
export function grade(id, ok) {
  if (!id) return;
  const s = load();
  const prev = s.cards[id];
  // Right: one box up (a new card starts in box 1, due tomorrow). Wrong: back to box 0, today.
  const box = ok ? Math.min((prev?.box ?? 0) + 1, INTERVALS.length - 1) : 0;
  s.cards[id] = { box, due: addDays(today(), INTERVALS[box]), last: Date.now(), streak: ok ? (prev?.streak ?? 0) + 1 : 0 };
  const day = today();
  s.meta = { day, reviews: (s.meta.day === day ? s.meta.reviews ?? 0 : 0) + 1 };
  if (!s.dirty.includes(id)) s.dirty.push(id);
  save(s);
}

/** How many of these cards are due today (seen before, due date reached). */
export function dueCount(ids, s = load()) {
  const t = today();
  return ids.filter((id) => s.cards[id] && s.cards[id].due <= t).length;
}

/**
 * The order to present a deck in: due cards (most overdue, lowest box first), then up to
 * NEW_PER_SESSION new ones in their original order, then the rest — learned cards by due
 * date, then the remaining new ones. Every card stays in the deck; only the order changes.
 * A deck nobody has graded yet keeps its own order.
 * @param {string[]} ids
 * @returns {number[]} indexes into `ids`
 */
export function nextDue(ids, s = load()) {
  const idx = ids.map((id, i) => ({ id, i, c: s.cards[id] }));
  if (!idx.some((x) => x.c)) return idx.map((x) => x.i);
  const t = today();
  const due = idx.filter((x) => x.c && x.c.due <= t).sort((a, b) => a.c.due.localeCompare(b.c.due) || a.c.box - b.c.box);
  const fresh = idx.filter((x) => !x.c);
  const later = idx.filter((x) => x.c && x.c.due > t).sort((a, b) => a.c.due.localeCompare(b.c.due));
  return [...due, ...fresh.slice(0, NEW_PER_SESSION), ...later, ...fresh.slice(NEW_PER_SESSION)].map((x) => x.i);
}

/** Rows changed since the last push, in the server's shape (srs_state). */
export function dirtyRows(s = load()) {
  return s.dirty
    .filter((id) => s.cards[id])
    .map((id) => ({ card_id: id, box: s.cards[id].box, due: s.cards[id].due, last_seen: new Date(s.cards[id].last).toISOString(), streak: s.cards[id].streak ?? 0 }));
}

/** After a push: these ids are on the server. */
export function markClean(ids) {
  const s = load();
  s.dirty = s.dirty.filter((id) => !ids.includes(id));
  save(s);
}

/** Merge rows pulled from the server: last write wins per card. */
export function mergeRows(rows) {
  const s = load();
  let changed = 0;
  for (const r of rows ?? []) {
    const last = new Date(r.last_seen).getTime();
    const mine = s.cards[r.card_id];
    if (!mine || mine.last < last) {
      s.cards[r.card_id] = { box: r.box, due: r.due, last, streak: r.streak ?? 0 };
      s.dirty = s.dirty.filter((id) => id !== r.card_id);
      changed++;
    } else if (mine.last > last && !s.dirty.includes(r.card_id)) {
      s.dirty.push(r.card_id);
    }
  }
  save(s);
  return changed;
}
