// Regis Satzregen: the game itself, without any DOM. A fixed-step simulation (60 steps a
// second) that is the same on every device for the same seed, so a Tagesrunde or a Duell
// link plays the same sentences with the same falling order for everyone, and a scripted
// test game runs in Node.
//
// The board is a stack of sentence lines. At the bottom lie the Steinzeilen (wrong lines);
// right above them is the active line with one empty slot per chunk of the current sentence.
// Above that is the open sky the chunks fall through. Each chunk falls in the lane of one
// empty slot; the player moves it between empty slots, drops it, or holds it. When every
// slot is full the line is checked (check.js): right → it clears, wrong → it turns to stone
// and the stack grows by one line. No room left above the stack → game over.
//
// game.js draws the state and feeds input; everything that should make a sound or an
// animation is pushed to `g.events` and taken from there by game.js each frame.
import { seeded } from "../artikelSprint/rng.js";
import { acceptedOrders, isCorrect, wrongMarks } from "./check.js";

export const STEP = 1 / 60;

/** All tuning in one place (Tier 6 sets the final numbers). */
export const K = {
  rows: 8, // lines on the board, the active line included; stones ≥ rows - 1 → game over
  fall0: 0.9, // rows per second at speed level 1
  fallUp: 1.13, // × per speed level
  fallMax: 6, // rows per second, the fastest it gets
  linesPerLevel: 5, // speed level rises every 5 cleared lines
  soft: 9, // soft drop: rows per second (at least)
  tapDrop: 30, // tap-to-slot and hard drop slide: rows per second
  showOk: 1.5, // seconds the cleared sentence stays on screen
  showStone: 2, // seconds the right order shows under a new Steinzeile
  pointsChunk: 25, // per chunk of a cleared line, × speed level × combo
  comboMax: 5,
  softPoint: 1, // per row of soft drop
  hardPoint: 2, // per row of hard drop
  pRadier: 0.1, // Radiergummi before a new sentence: base chance (only with stones) …
  pRadierStone: 0.05, // … plus this per stone in the stack
  pLupe: 0.035, // chance that a chunk carries the Lupe
};

/** The speed level's fall speed in rows per second. */
export const fallSpeed = (level) => Math.min(K.fallMax, K.fall0 * K.fallUp ** (level - 1));

/** How many chunks the next sentence may have: short ones first. */
function maxChunks(lines) {
  if (lines < 3) return 4;
  if (lines < 8) return 5;
  return 6;
}

function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A new game. `sentences`: the pool for this mode (saetze.json entries). `seed`: uint32.
 * Two random streams, so specials never shift which sentence comes next.
 */
export function createGame({ sentences, seed, mode = "v2", stufe = "A1" }) {
  const deckRnd = seeded(seed);
  const fxRnd = seeded((seed ^ 0x5bd1e995) >>> 0);
  const g = {
    seed,
    mode,
    stufe,
    deckRnd,
    fxRnd,
    deck: shuffle(sentences, deckRnd),
    deckPos: 0,
    stones: [], // { s, order, wrong, best } — bottom first
    line: null, // { s, slots: (string|null)[] }
    queue: [], // chunk indices still to fall for this line
    falling: null, // { kind: "chunk"|"radier", chunk, lane, y, lupe, drop: null|"soft"|"hard"|"tap", from }
    hold: null,
    holdUsed: false,
    phase: "play", // play | show | over
    showT: 0,
    showing: null, // { ok, s, order, wrong?, best? }
    score: 0,
    lines: 0,
    stonesTotal: 0,
    combo: 0,
    bestCombo: 0,
    level: 1,
    steps: 0,
    history: [], // "ok" | "stone", one per checked line
    tricky: [], // { s, order, best } of every Steinzeile
    events: [],
    soft: false,
  };
  nextSentence(g);
  return g;
}

/** Row index (0 = top) of the active line. */
export const activeRow = (g) => K.rows - 1 - g.stones.length;

function pickSentence(g) {
  const max = maxChunks(g.lines);
  const n = g.deck.length;
  for (let k = 0; k < n; k++) {
    const s = g.deck[(g.deckPos + k) % n];
    if (s.c.length <= max) {
      // bring it to the front of what's left, keep the rest in order
      const idx = (g.deckPos + k) % n;
      [g.deck[g.deckPos % n], g.deck[idx]] = [g.deck[idx], g.deck[g.deckPos % n]];
      break;
    }
  }
  const s = g.deck[g.deckPos % n];
  g.deckPos++;
  if (g.deckPos % n === 0) g.deck = shuffle(g.deck, g.deckRnd); // every sentence once, then a new round
  return s;
}

function nextSentence(g) {
  const s = pickSentence(g);
  g.line = { s, slots: s.c.map(() => null) };
  // Scrambled, never the canonical order (that would be no puzzle).
  let q = shuffle(s.c.map((_, i) => i), g.deckRnd);
  if (q.every((x, i) => x === i)) q = [...q.slice(1), q[0]];
  g.queue = q;
  g.hold = null;
  g.holdUsed = false;
  g.events.push({ t: "line", s });
  // Radiergummi first, sometimes, when there is stone to rub out.
  if (g.stones.length && g.fxRnd() < K.pRadier + K.pRadierStone * g.stones.length) {
    spawn(g, { kind: "radier" });
  } else spawnNext(g);
}

/** The lane a new piece starts in: the empty slot nearest the middle. */
function startLane(g) {
  const n = g.line.slots.length;
  const mid = (n - 1) / 2;
  let best = -1;
  for (let i = 0; i < n; i++) {
    if (g.line.slots[i] !== null) continue;
    if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
  }
  return best < 0 ? 0 : best;
}

function spawn(g, piece) {
  g.falling = { lane: startLane(g), y: 0, drop: null, from: 0, lupe: false, ...piece };
  if (piece.kind === "chunk" && g.fxRnd() < K.pLupe) g.falling.lupe = true;
  g.events.push({ t: "spawn", piece: g.falling });
}

function spawnNext(g) {
  if (g.queue.length) spawn(g, { kind: "chunk", chunk: g.queue.shift() });
  else if (g.hold !== null) {
    const c = g.hold;
    g.hold = null;
    spawn(g, { kind: "chunk", chunk: c });
  } else {
    g.falling = null;
    checkLine(g);
  }
}

/** The chunk that falls next (for the Vorschau): null when the line's last chunk is falling. */
export function preview(g) {
  if (g.queue.length) return g.line.s.c[g.queue[0]];
  if (g.hold !== null && g.falling?.kind === "chunk") return g.line.s.c[g.hold];
  return null;
}

/** For the Lupe: the slot this chunk belongs in, given what is already placed. */
export function lupeSlot(g) {
  const f = g.falling;
  if (!f || f.kind !== "chunk") return -1;
  const text = g.line.s.c[f.chunk];
  const slots = g.line.slots;
  for (const order of acceptedOrders(g.line.s)) {
    if (!slots.every((t, i) => t === null || t === order[i])) continue;
    for (let i = 0; i < order.length; i++) if (slots[i] === null && order[i] === text) return i;
  }
  return -1;
}

function emptyLanes(g) {
  return g.line.slots.map((t, i) => (t === null ? i : -1)).filter((i) => i >= 0);
}

/** Move the falling piece to the next empty lane on the left (-1) or right (+1). */
export function move(g, dir) {
  const f = g.falling;
  if (g.phase !== "play" || !f || f.drop === "tap" || f.drop === "hard") return false;
  const lanes = f.kind === "radier" ? g.line.slots.map((_, i) => i) : emptyLanes(g);
  const next = dir < 0 ? lanes.filter((i) => i < f.lane).pop() : lanes.find((i) => i > f.lane);
  if (next === undefined) return false;
  f.lane = next;
  g.events.push({ t: "move" });
  return true;
}

/** Drop now (Space / swipe down). */
export function hardDrop(g) {
  const f = g.falling;
  if (g.phase !== "play" || !f || f.drop === "hard" || f.drop === "tap") return false;
  f.drop = "hard";
  f.from = f.y;
  return true;
}

/** Touch: send the falling piece to slot i; it slides there and drops. */
export function sendTo(g, i) {
  const f = g.falling;
  if (g.phase !== "play" || !f || f.drop === "tap" || f.drop === "hard") return false;
  if (f.kind === "chunk" && g.line.slots[i] !== null) return false;
  if (i < 0 || i >= g.line.slots.length) return false;
  if (f.lane !== i) g.events.push({ t: "move" });
  f.lane = i;
  f.drop = "tap";
  f.from = f.y;
  return true;
}

/** Hold: put the falling chunk aside and take the held one (or the next) instead. Once per chunk. */
export function holdSwap(g) {
  const f = g.falling;
  if (g.phase !== "play" || !f || f.kind !== "chunk" || g.holdUsed || f.drop === "tap" || f.drop === "hard") {
    g.events.push({ t: "holdNo" });
    return false;
  }
  if (g.hold === null && !g.queue.length) {
    g.events.push({ t: "holdNo" });
    return false;
  }
  const put = f.chunk;
  const take = g.hold !== null ? g.hold : g.queue.shift();
  g.hold = put;
  g.holdUsed = true;
  spawn(g, { kind: "chunk", chunk: take });
  g.events.push({ t: "hold" });
  return true;
}

function land(g) {
  const f = g.falling;
  const rows = activeRow(g);
  if (f.drop === "hard" || f.drop === "tap") g.score += Math.round((rows - f.from) * K.hardPoint);
  if (f.kind === "radier") {
    const gone = g.stones.pop();
    g.falling = null;
    g.events.push({ t: "radier", gone });
    spawnNext(g);
    return;
  }
  g.line.slots[f.lane] = g.line.s.c[f.chunk];
  g.events.push({ t: "land", lane: f.lane, text: g.line.slots[f.lane] });
  g.falling = null;
  g.holdUsed = false;
  spawnNext(g);
}

function checkLine(g) {
  const s = g.line.s;
  const order = g.line.slots;
  if (isCorrect(s, order)) {
    g.combo++;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    g.lines++;
    const pts = K.pointsChunk * s.c.length * g.level * Math.min(g.combo, K.comboMax);
    g.score += pts;
    g.history.push("ok");
    g.showing = { ok: true, s, order: [...order], pts, combo: g.combo };
    g.showT = K.showOk;
    const lv = 1 + Math.floor(g.lines / K.linesPerLevel);
    if (lv > g.level) {
      g.level = lv;
      g.events.push({ t: "level", level: lv });
    }
    g.events.push({ t: "clear", ...g.showing });
  } else {
    const { wrong, best } = wrongMarks(s, order);
    g.combo = 0;
    g.stonesTotal++;
    g.history.push("stone");
    const stone = { s, order: [...order], wrong, best };
    g.stones.push(stone);
    g.tricky.push(stone);
    g.showing = { ok: false, ...stone };
    g.showT = K.showStone;
    g.events.push({ t: "stone", ...stone });
  }
  g.line = null;
  g.phase = "show";
}

/** One fixed step. */
export function step(g) {
  if (g.phase === "over") return;
  g.steps++;
  if (g.phase === "show") {
    g.showT -= STEP;
    if (g.showT > 0) return;
    g.showing = null;
    if (activeRow(g) < 1) {
      g.phase = "over";
      g.events.push({ t: "over" });
      return;
    }
    g.phase = "play";
    nextSentence(g);
    return;
  }
  const f = g.falling;
  if (!f) return;
  let v = fallSpeed(g.level);
  if (f.drop === "hard" || f.drop === "tap") v = K.tapDrop;
  else if (g.soft) v = Math.max(v, K.soft); // soft-drop points are counted on landing, per row
  const before = f.y;
  f.y += v * STEP;
  if (g.soft && !f.drop) g.softRows = (g.softRows || 0) + (f.y - before);
  const bottom = activeRow(g);
  if (f.y >= bottom) {
    f.y = bottom;
    if (g.softRows) g.score += Math.round(g.softRows * K.softPoint);
    g.softRows = 0;
    land(g);
  }
}

/** Seconds played. */
export const seconds = (g) => Math.round(g.steps * STEP);

/** Accuracy in percent: cleared lines of all checked lines. */
export const accuracy = (g) => (g.history.length ? Math.round((100 * g.lines) / g.history.length) : 0);
