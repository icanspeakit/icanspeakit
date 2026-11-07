// Hör-Safari records on this device: per board (level × card mode) the best score, best
// streak, most hits, and the last 5 rounds. One localStorage key. Every access is wrapped:
// private mode or blocked storage must never stop the game.

const KEY = "hoerSafari.records";
const OLD_PREFIX = "hoerSafari.best."; // v1 kept one number per board under hoerSafari.best.<A1>.<bild>

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && typeof data === "object" && data.boards) return data;
  } catch {
    /* fall through */
  }
  return { v: 1, boards: {} };
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage blocked: records just are not kept */
  }
}

/** Once: carry the v1 best scores over, then drop the old keys. */
export function migrate() {
  try {
    if (localStorage.getItem(KEY)) return;
    const data = { v: 1, boards: {} };
    const old = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(OLD_PREFIX)) old.push(k);
    }
    for (const k of old) {
      const [level, mode] = k.slice(OLD_PREFIX.length).split(".");
      const best = Number(localStorage.getItem(k)) || 0;
      if (level && mode && best) data.boards[`${level}:${mode}`] = { best, bestStreak: 0, mostHits: 0, runs: [] };
    }
    localStorage.setItem(KEY, JSON.stringify(data));
    old.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing to migrate without storage */
  }
}

const empty = () => ({ best: 0, bestStreak: 0, mostHits: 0, runs: [] });

export function boardRecords(level, mode) {
  return { ...empty(), ...(read().boards[`${level}:${mode}`] || {}) };
}

/** Saves a finished round. Returns which records it beat: { best, bestStreak, mostHits }. */
export function saveRound(level, mode, { score, streak, hits }) {
  const data = read();
  const key = `${level}:${mode}`;
  const b = { ...empty(), ...(data.boards[key] || {}) };
  const beat = {
    best: score > b.best && score > 0,
    bestStreak: streak > b.bestStreak && streak > 0,
    mostHits: hits > b.mostHits && hits > 0,
  };
  const before = { best: b.best, bestStreak: b.bestStreak, mostHits: b.mostHits };
  if (beat.best) b.best = score;
  if (beat.bestStreak) b.bestStreak = streak;
  if (beat.mostHits) b.mostHits = hits;
  b.runs = [{ d: new Date().toISOString(), score, hits }, ...(b.runs || [])].slice(0, 5);
  data.boards[key] = b;
  write(data);
  return { beat, before, now: b };
}
