// Artikel-Flitzer: best scores per mode + level + difficulty, the last chosen mode/level/difficulty, the mute
// switch and the name used in race rooms and challenge links. localStorage can throw (private windows, blocked site data), so every access is
// wrapped and the game simply runs without memory then.

const KEY = "da.artikelSprint.v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// „Normal" keeps the key from before there was a difficulty, so old records stay where they were.
const boardKey = (mode, level, diff = "normal") => (diff === "normal" ? `${mode}:${level}` : `${mode}:${level}:${diff}`);

function write(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* no storage: nothing to keep */
  }
}

export function getBest(mode, level, diff) {
  return Number(read().best?.[boardKey(mode, level, diff)]) || 0;
}

/** Saves `score` when it beats the stored best. Returns true for a new record. */
export function saveBest(mode, level, diff, score) {
  const s = read();
  s.best = s.best || {};
  const k = boardKey(mode, level, diff);
  if (score <= (Number(s.best[k]) || 0)) return false;
  s.best[k] = score;
  write(s);
  return true;
}

export function getPrefs() {
  const s = read();
  return { mode: s.mode, level: s.level, diff: s.diff, muted: !!s.muted, name: typeof s.name === "string" ? s.name : "" };
}

export function savePrefs(p) {
  write({ ...read(), ...p });
}

/** Longest run in seconds per mode + level + difficulty. */
export function getBestTime(mode, level, diff) {
  return Number(read().time?.[boardKey(mode, level, diff)]) || 0;
}

/** Saves `seconds` when the run lasted longer than the stored best. Returns true for a new record. */
export function saveBestTime(mode, level, diff, seconds) {
  const s = read();
  s.time = s.time || {};
  const k = boardKey(mode, level, diff);
  if (seconds <= (Number(s.time[k]) || 0)) return false;
  s.time[k] = Math.round(seconds * 10) / 10;
  write(s);
  return true;
}

// ---- Tagesrunde ------------------------------------------------------------------------
// Today's best per mode + level + difficulty, under the date: a new day starts empty, so
// nothing needs cleaning up. Kept locally only.
const boardOf = (mode, level, diff) => boardKey(mode, level, diff);

/** Today's date as the player's calendar says, YYYY-MM-DD. */
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDaily(mode, level, diff) {
  const d = read().daily;
  return d && d.date === todayStr() ? Number(d.best?.[boardOf(mode, level, diff)]) || 0 : 0;
}

/** Saves `score` as today's best when it beats it. Returns true for a new best of the day. */
export function saveDaily(mode, level, diff, score) {
  const s = read();
  const today = todayStr();
  const d = s.daily && s.daily.date === today ? s.daily : { date: today, best: {} };
  const k = boardOf(mode, level, diff);
  if (score <= (Number(d.best[k]) || 0)) return false;
  d.best[k] = score;
  s.daily = d;
  write(s);
  return true;
}
