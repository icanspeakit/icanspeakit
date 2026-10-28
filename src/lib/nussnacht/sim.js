// Hamstis Nussnacht: the simulation. Pure and deterministic: a seed, the word pools and one
// input per tick in, the same run out – on every device. That is what makes the Tagesrunde and
// the Duell fair, and what the replay test checks (scripts/nussnacht-sim-test.mjs).
//
// Rules for this file:
//   - Fixed tick (60 Hz). Time is the tick count, never the clock.
//   - Randomness only from the two seeded streams: `rs` (spawns, words, positions) and `ro`
//     (upgrade offers, drops), so walking a different way never changes which upgrades come.
//   - No Math.sin/cos/atan2/exp/pow: they may differ in the last bit between browsers, and a
//     ten-minute run would drift apart. Directions come from vectors and Math.sqrt (exact).
//   - No allocations in the hot loop: fixed pools, flags for "alive", typed arrays for the
//     spatial hash.
//
// The renderer reads the pools directly (x/y and px/py for interpolation) and the events
// (`ev`, `evN`) after each step.
import { seeded, deckSeed } from "../artikelSprint/rng.js";
import { welleAt } from "./wellen.js";
import { UPGRADES, MAX_LV, SNACK } from "./upgrades.js";

export const DT = 1 / 60;

export const TUNING = {
  SPAWN_R: 640,         // world units from Hamsti where creatures appear (just off screen)
  DESPAWN_R: 1000,      // farther than this: moved back in front of Hamsti
  HAMSTI_SPEED: 150,
  HAMSTI_R: 16,
  HP: 100,
  IFRAMES: 0.6,
  FIRE_EVERY: 0.6,      // seconds between volleys
  SHOT_SPEED: 430,
  SHOT_R: 6,
  RANGE: 300,           // auto-aim radius
  SHOT_DMG: 10,
  CRE_SPEED: 36,
  CRE_HP: 10,
  CRE_R: 20,
  CONTACT_DMG: 8,
  WRONG_GROW: 1.15,     // a wrong article: the word grows 15 %
  WRONG_SPEED: 1.08,    // … and gets a bit faster
  MAX_SCALE: 2.4,
  MAGNET: 70,
  NUT_PULL: 360,
  PICK_R: 18,
  XP_BASE: 4,           // nuts for the first level-up; each next one needs XP_STEP more
  XP_STEP: 3,
  ACORN_CHANCE: 0.012,  // a healing acorn instead of a nut
  ACORN_HEAL: 25,
  BOSS_HP: 120,
  BOSS_R: 46,
  BOSS_DMG: 20,
  SKILL_CHARGE: 30,     // seconds
  SKILL_R: 140,
  ORBIT_R: 70,
  LIGHT_R: 120,
  WIN_AT: 630,          // 10:30
  MAX_CRE: 300,
};
const T = TUNING;

// Event types, read by the page after each step (sound, sparks, words flashing, DOM cards).
export const EV = {
  SHOT: 0, HIT_OK: 1, HIT_WRONG: 2, KILL: 3, HURT: 4, NUT: 5, LEVELUP: 6, BOSS: 7,
  BOSS_DOWN: 8, SKILL: 9, HEAL: 10, MINUTE: 11, WIN: 12, DIE: 13, SPLIT: 14, BURST: 15, ORBIT: 16,
};

// Endungs-Radar: ending → article index, by radar level. A word glows only when its ending
// predicts its article *and* it has that article (der Kuchen does not glow), so the radar
// never teaches anything wrong.
const RADAR = [
  [["ung", 1], ["heit", 1], ["keit", 1]],
  [["chen", 2], ["ment", 2], ["um", 2]],
  [["schaft", 1], ["tät", 1], ["ion", 1], ["ling", 0]],
];

// Rotation of the orbiting acorns per tick (2.4 rad/s), as literal numbers: cos and sin of
// 0.04 rad, so no trig runs during the game.
const ROT_C = 0.9992001066609779;
const ROT_S = 0.03998933418663416;

const NB = 4096; // spatial hash buckets
const CELL = 64;

/**
 * @param {object} o
 * @param {number} o.seed
 * @param {Array} o.words   the level's words { id, w, g, a, pl, h }
 * @param {Array} o.low     the level below (a third of the weight)
 * @param {Array} o.bosse   { w, g, regel, id, a }
 * @param {string} o.level  "A1" | "A2" | "B1"
 * @param {boolean} [o.stress]
 */
export function createSim({ seed, words, low = [], bosse = [], level = "A1", stress = false }) {
  const rs = seeded(seed);
  const ro = seeded(deckSeed(seed));
  const W = words.concat(low);
  const byArt = (from, to) => {
    const out = [[], [], []];
    for (let i = from; i < to; i++) out[W[i].g].push(i);
    return out;
  };
  const lvlIdx = byArt(0, words.length);
  const lowIdx = byArt(words.length, W.length);
  const compIdx = [];
  for (let i = 0; i < words.length; i++) if (W[i].h) compIdx.push(i);
  const plIdx = [];
  for (let i = 0; i < words.length; i++) if (W[i].pl) plIdx.push(i);
  // Radar: per word, the radar level that makes it glow (0 = never).
  const radarLv = new Uint8Array(W.length);
  for (let i = 0; i < W.length; i++) {
    const lw = W[i].w.toLowerCase();
    for (let l = 0; l < RADAR.length && !radarLv[i]; l++) {
      for (const [end, art] of RADAR[l]) if (lw.endsWith(end) && W[i].g === art) { radarLv[i] = l + 1; break; }
    }
  }
  // The bosses of this run, in an order from the seed.
  const bossOrder = bosse.map((_, i) => i);
  for (let i = bossOrder.length - 1; i > 0; i--) {
    const j = Math.floor(ro() * (i + 1));
    const t = bossOrder[i]; bossOrder[i] = bossOrder[j]; bossOrder[j] = t;
  }

  // ---- pools ---------------------------------------------------------------------------
  const cre = [];
  for (let i = 0; i < 400; i++) cre.push({
    alive: false, gen: 0, x: 0, y: 0, px: 0, py: 0, r: T.CRE_R, w: 0, art: 0, text: "", kind: 0,
    hp: 0, maxHp: 0, speed: 0, scale: 1, angry: 0, boss: -1, hop: 0, flashT: 0, flashOk: false,
    hitT: 0, orbitCd: 0, glow: 0, born: 0,
  });
  const shots = [];
  for (let i = 0; i < 320; i++) shots.push({ alive: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, art: 0, life: 0, pierce: 0, dmg: 0, tgt: -1, tgen: 0, last: -1 });
  const nuts = [];
  for (let i = 0; i < 500; i++) nuts.push({ alive: false, x: 0, y: 0, px: 0, py: 0, v: 1, acorn: false, pulled: false });
  const ev = [];
  for (let i = 0; i < 512; i++) ev.push({ type: 0, x: 0, y: 0, a: 0, b: 0, c: -1 });

  const S = {
    tick: 0, t: 0, state: "play", level, stress,
    words: W, bosse, bossOrder,
    cre, shots, nuts, ev, evN: 0,
    hx: 0, hy: 0, hpx: 0, hpy: 0, hvx: 0, hvy: 0, art: 0, hp: T.HP, maxHp: T.HP, iframes: 0,
    xp: 0, plv: 1, need: T.XP_BASE, pendingLv: 0, offers: [],
    up: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    stats: null,
    fireT: 0.5, skill: 0, spawnT: 1.0, minute: 0, bossAlive: 0, endgegner: false,
    orbX: 1, orbY: 0,
    kills: 0, right: 0, wrong: 0, streak: 0, bestStreak: 0, hurtN: 0,
    okMin: new Array(11).fill(0), wrongMin: new Array(11).fill(0),
    per: new Map(), // word index → { wrong, hurt, ok }
    creN: 0, shotN: 0, maxR: T.CRE_R,
    lastBoss: -1,
  };
  S.stats = stats(S);

  // ---- events ----------------------------------------------------------------------------
  function emit(type, x, y, a = 0, b = 0, c = -1) {
    if (S.evN >= ev.length) return;
    const e = ev[S.evN++];
    e.type = type; e.x = x; e.y = y; e.a = a; e.b = b; e.c = c;
  }
  function perWord(i) {
    let p = S.per.get(i);
    if (!p) S.per.set(i, (p = { wrong: 0, hurt: 0, ok: 0 }));
    return p;
  }

  // ---- spatial hash ------------------------------------------------------------------------
  const hCount = new Int32Array(NB + 1);
  const hItems = new Int32Array(cre.length);
  const hKey = new Int32Array(cre.length);
  const seen = new Int32Array(cre.length);
  const qbuf = new Int32Array(cre.length);
  let stamp = 0;
  const bucket = (cx, cy) => (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) & (NB - 1);
  function buildHash() {
    hCount.fill(0);
    let maxR = T.CRE_R;
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      if (!c.alive) { hKey[i] = -1; continue; }
      const k = bucket(Math.floor(c.x / CELL), Math.floor(c.y / CELL));
      hKey[i] = k;
      hCount[k + 1]++;
      if (c.r > maxR) maxR = c.r;
    }
    S.maxR = maxR;
    for (let k = 0; k < NB; k++) hCount[k + 1] += hCount[k];
    // second pass with a cursor per bucket: hCount[k] is where bucket k starts
    cursor.set(hCount.subarray(0, NB));
    for (let i = 0; i < cre.length; i++) {
      const k = hKey[i];
      if (k >= 0) hItems[cursor[k]++] = i;
    }
  }
  const cursor = new Int32Array(NB);
  /** Candidate creatures near (x, y) within `rad` (+ the largest creature's radius). */
  function query(x, y, rad) {
    stamp++;
    let n = 0;
    const R = rad + S.maxR;
    const x0 = Math.floor((x - R) / CELL), x1 = Math.floor((x + R) / CELL);
    const y0 = Math.floor((y - R) / CELL), y1 = Math.floor((y + R) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = bucket(cx, cy);
        for (let j = hCount[k], e = hCount[k + 1]; j < e; j++) {
          const i = hItems[j];
          if (seen[i] === stamp) continue;
          seen[i] = stamp;
          qbuf[n++] = i;
        }
      }
    }
    return n;
  }

  // ---- spawning ------------------------------------------------------------------------------
  function freeCre() {
    for (let i = 0; i < cre.length; i++) if (!cre[i].alive) return i;
    return -1;
  }
  function unit() {
    // a random direction without trig: rejection sampling in the unit square
    for (;;) {
      const x = rs() * 2 - 1, y = rs() * 2 - 1;
      const d = x * x + y * y;
      if (d > 0.04 && d <= 1) { const l = Math.sqrt(d); return [x / l, y / l]; }
    }
  }
  function pickWord() {
    const art = Math.floor(rs() * 3);
    const useLow = lowIdx[art].length > 0 && rs() < 0.25;
    const list = useLow ? lowIdx[art] : lvlIdx[art];
    if (!list.length) return lvlIdx[0][0] ?? 0;
    return list[Math.floor(rs() * list.length)];
  }
  function spawnAt(x, y, wi, kind, hpMul, spMul) {
    const i = freeCre();
    if (i < 0) return -1;
    const c = cre[i];
    const w = W[wi];
    c.alive = true; c.gen++;
    c.x = c.px = x; c.y = c.py = y;
    c.w = wi; c.kind = kind; c.boss = -1; c.scale = 1; c.angry = 0;
    c.art = kind === 1 ? 1 : w.g;
    c.text = kind === 1 ? w.pl : w.w;
    c.r = T.CRE_R;
    c.maxHp = c.hp = T.CRE_HP * hpMul * (kind === 2 ? 1.5 : 1);
    c.speed = T.CRE_SPEED * spMul * (0.85 + rs() * 0.3);
    c.hop = rs();
    c.flashT = 0; c.hitT = 0; c.orbitCd = 0; c.born = S.t;
    c.glow = radarLv[wi];
    if (kind === 1) c.glow = 0;
    S.creN++;
    return i;
  }
  function spawnGroup() {
    const wave = welleAt(S.minute);
    const [ux, uy] = unit();
    const flank = rs() < wave.flank;
    const n = stress ? 1 : wave.group;
    for (let k = 0; k < n; k++) {
      if (S.creN >= T.MAX_CRE) return;
      let dx = ux, dy = uy;
      if (!flank && k > 0) [dx, dy] = unit();
      // a flank bunch: side by side across the direction, a little staggered
      const side = flank ? (k - (n - 1) / 2) * 34 : 0;
      const back = flank ? rs() * 40 : rs() * 60;
      const x = S.hx + dx * (T.SPAWN_R + back) - dy * side;
      const y = S.hy + dy * (T.SPAWN_R + back) + dx * side;
      let kind = 0;
      let wi;
      if (S.up.plural > 0 && plIdx.length && rs() < 0.1 + 0.03 * S.up.plural) {
        kind = 1; wi = plIdx[Math.floor(rs() * plIdx.length)];
      } else if (S.up.kompositum > 0 && compIdx.length && rs() < 0.12 + 0.03 * S.up.kompositum) {
        kind = 2; wi = compIdx[Math.floor(rs() * compIdx.length)];
      } else wi = pickWord();
      spawnAt(x, y, wi, kind, wave.hp, wave.speed);
    }
  }
  function spawnBoss(slot) {
    if (!bosse.length) return;
    const bi = bossOrder[slot % bossOrder.length];
    const b = bosse[bi];
    const [ux, uy] = unit();
    const i = freeCre();
    if (i < 0) return;
    const c = cre[i];
    c.alive = true; c.gen++;
    c.x = c.px = S.hx + ux * T.SPAWN_R; c.y = c.py = S.hy + uy * T.SPAWN_R;
    c.w = -1; c.kind = 3; c.boss = bi; c.scale = 1; c.angry = 0;
    c.art = b.g; c.text = b.w; c.r = T.BOSS_R;
    c.maxHp = c.hp = T.BOSS_HP * (1 + 0.45 * S.minute);
    c.speed = T.CRE_SPEED * 0.8 * welleAt(S.minute).speed;
    c.hop = rs(); c.flashT = 0; c.hitT = 0; c.orbitCd = 0; c.born = S.t; c.glow = 0;
    S.creN++;
    S.bossAlive++;
    emit(EV.BOSS, c.x, c.y, bi, 0, i);
  }

  // ---- combat -----------------------------------------------------------------------------------
  function nearest(art, range) {
    let best = -1, bd = range * range;
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      if (!c.alive || (art >= 0 && c.art !== art)) continue;
      const dx = c.x - S.hx, dy = c.y - S.hy;
      const d = dx * dx + dy * dy - c.r * c.r;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // The volley's other shots take the next-nearest creatures of the article.
  const taken = new Int32Array(8);
  function nearestExcept(art, range, nTaken) {
    let best = -1, bd = range * range;
    outer: for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      if (!c.alive || c.art !== art) continue;
      for (let k = 0; k < nTaken; k++) if (taken[k] === i) continue outer;
      const dx = c.x - S.hx, dy = c.y - S.hy;
      const d = dx * dx + dy * dy - c.r * c.r;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function fireAt(i) {
    const c = cre[i];
    let k = -1;
    for (let j = 0; j < shots.length; j++) if (!shots[j].alive) { k = j; break; }
    if (k < 0) return;
    const s = shots[k];
    // aim where the creature will be when the shot arrives (one step of lead is plenty)
    let dx = c.x - S.hx, dy = c.y - S.hy;
    let d = Math.sqrt(dx * dx + dy * dy) || 1;
    const tt = d / T.SHOT_SPEED;
    const cdx = S.hx - c.x, cdy = S.hy - c.y;
    const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
    dx += (cdx / cd) * c.speed * tt;
    dy += (cdy / cd) * c.speed * tt;
    d = Math.sqrt(dx * dx + dy * dy) || 1;
    s.alive = true;
    s.x = s.px = S.hx; s.y = s.py = S.hy;
    s.vx = (dx / d) * T.SHOT_SPEED; s.vy = (dy / d) * T.SHOT_SPEED;
    s.art = S.art;
    s.life = (S.stats.range + 60) / T.SHOT_SPEED;
    s.pierce = S.stats.pierce;
    s.dmg = S.stats.dmg;
    s.tgt = i; s.tgen = c.gen; s.last = -1;
    S.shotN++;
  }
  function fire() {
    const range = S.stats.range;
    let first = nearest(S.art, range);
    if (first < 0) {
      // nothing of this article in range: the nearest creature at all (a wrong-article hit)
      first = nearest(-1, range);
      if (first < 0) return false;
      fireAt(first);
      emit(EV.SHOT, S.hx, S.hy, S.art, 0);
      return true;
    }
    taken[0] = first;
    fireAt(first);
    let n = 1;
    for (let k = 1; k < S.stats.shots && k < taken.length; k++) {
      const i = nearestExcept(S.art, range, n);
      if (i < 0) { fireAt(first); continue; }
      taken[n++] = i;
      fireAt(i);
    }
    emit(EV.SHOT, S.hx, S.hy, S.art, S.stats.shots);
    return true;
  }
  function stressFire() {
    // stress mode: keep ~200 shots in the air, fired in all directions
    while (S.shotN < 200) {
      let k = -1;
      for (let j = 0; j < shots.length; j++) if (!shots[j].alive) { k = j; break; }
      if (k < 0) return;
      const [ux, uy] = unit();
      const s = shots[k];
      s.alive = true; s.x = s.px = S.hx; s.y = s.py = S.hy;
      s.vx = ux * T.SHOT_SPEED; s.vy = uy * T.SHOT_SPEED;
      s.art = Math.floor(rs() * 3); s.life = 1.4; s.pierce = 99; s.dmg = 0; s.tgt = -1; s.tgen = 0; s.last = -1;
      S.shotN++;
    }
  }

  function damage(i, dmg, viaRight) {
    const c = cre[i];
    c.hp -= dmg;
    c.hitT = 0.12;
    if (viaRight) { c.flashT = 0.7; c.flashOk = true; }
    if (c.hp <= 0) kill(i);
  }
  function kill(i) {
    const c = cre[i];
    c.alive = false;
    S.creN--;
    S.kills++;
    emit(EV.KILL, c.x, c.y, c.art, c.kind, i);
    if (c.kind === 3) {
      S.bossAlive--;
      emit(EV.BOSS_DOWN, c.x, c.y, c.boss, 0, i);
      dropNut(c.x, c.y, 10, false);
      for (let k = 0; k < 6; k++) dropNut(c.x + (rs() - 0.5) * 60, c.y + (rs() - 0.5) * 60, 2, false);
      return;
    }
    if (c.kind === 1 && S.up.plural > 0 && burstN < burstX.length) {
      // Plural-Platzer: bursts at the end of the tick (bursts())
      burstX[burstN] = c.x; burstY[burstN] = c.y; burstN++;
    }
    if (c.kind === 2) emit(EV.SPLIT, c.x, c.y, c.w, c.art, i);
    const v = 1 + (c.angry > 0 ? 1 : 0) + (c.kind === 1 ? 1 : 0) + (c.kind === 2 ? S.up.kompositum : 0);
    const acorn = ro() < T.ACORN_CHANCE;
    dropNut(c.x, c.y, v, acorn);
  }
  // Plural bursts wait until the tick's other loops are done: a burst queries the hash, and
  // that would overwrite the candidate list a shot or the skill is still walking through.
  const burstX = new Float64Array(64), burstY = new Float64Array(64);
  let burstN = 0;
  function bursts() {
    for (let b = 0; b < burstN; b++) {
      const x = burstX[b], y = burstY[b];
      const R = 70 + 18 * S.up.plural;
      emit(EV.BURST, x, y, R, 0);
      const n = query(x, y, R);
      for (let q = 0; q < n; q++) {
        const o = cre[qbuf[q]];
        if (!o.alive) continue;
        const dx = o.x - x, dy = o.y - y;
        if (dx * dx + dy * dy < (R + o.r) * (R + o.r)) {
          o.hp -= S.stats.dmg * 0.8;
          o.hitT = 0.12;
          if (o.hp <= 0) kill(qbuf[q]);
        }
      }
    }
    burstN = 0;
  }
  function dropNut(x, y, v, acorn) {
    for (let k = 0; k < nuts.length; k++) {
      const n = nuts[k];
      if (n.alive) continue;
      n.alive = true; n.x = n.px = x; n.y = n.py = y; n.v = v; n.acorn = acorn; n.pulled = false;
      return;
    }
  }
  function wrongHit(i, s) {
    const c = cre[i];
    c.flashT = 0.9; c.flashOk = false;
    if (stress) return;
    if (c.kind !== 3) {
      c.scale = Math.min(T.MAX_SCALE, c.scale * T.WRONG_GROW);
      c.r = T.CRE_R * c.scale;
      c.speed *= T.WRONG_SPEED;
    }
    c.angry++;
    S.wrong++;
    S.wrongMin[Math.min(10, S.minute)]++;
    S.streak = 0;
    if (c.w >= 0) perWord(c.w).wrong++;
    emit(EV.HIT_WRONG, c.x, c.y, s.art, c.art, i);
  }
  function rightHit(i, s) {
    const c = cre[i];
    let dmg = s.dmg;
    if (c.glow && c.glow <= S.up.radar && S.up.radar >= 4) dmg *= S.up.radar >= 5 ? 1.5 : 1.25;
    if (!stress) {
      S.right++;
      S.okMin[Math.min(10, S.minute)]++;
      S.streak++;
      if (S.streak > S.bestStreak) S.bestStreak = S.streak;
      if (c.w >= 0) perWord(c.w).ok++;
    }
    emit(EV.HIT_OK, c.x, c.y, c.art, 0, i);
    damage(i, dmg, true);
  }

  function levelUp() {
    S.pendingLv++;
    if (S.state === "play") openChoice();
  }
  function openChoice() {
    S.state = "choice";
    S.pendingLv--;
    const pool = UPGRADES.filter((u) => S.up[u.id] < MAX_LV && (!u.b1 || S.level === "B1"));
    const offers = [];
    while (offers.length < 3 && pool.length) {
      const j = Math.floor(ro() * pool.length);
      offers.push(pool[j].id);
      pool.splice(j, 1);
    }
    while (offers.length < 3) offers.push(SNACK.id);
    S.offers = offers;
    emit(EV.LEVELUP, S.hx, S.hy, S.plv, 0);
  }
  function choose(k) {
    const id = S.offers[k];
    if (id === SNACK.id) heal(30);
    else {
      S.up[id] = Math.min(MAX_LV, S.up[id] + 1);
      if (id === "vorrat") heal(20);
    }
    S.stats = stats(S);
    if (S.hp > S.stats.maxHp) S.hp = S.stats.maxHp;
    S.offers = [];
    S.state = "play";
    if (S.pendingLv > 0) openChoice();
  }
  function heal(n) {
    S.hp = Math.min(S.stats ? S.stats.maxHp : T.HP, S.hp + n);
    emit(EV.HEAL, S.hx, S.hy, n, 0);
  }

  function skill() {
    S.skill = 0;
    emit(EV.SKILL, S.hx, S.hy, T.SKILL_R, 0);
    const n = query(S.hx, S.hy, T.SKILL_R * 1.9);
    for (let q = 0; q < n; q++) {
      const i = qbuf[q];
      const c = cre[i];
      if (!c.alive) continue;
      const dx = c.x - S.hx, dy = c.y - S.hy;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2) || 1;
      if (d < T.SKILL_R + c.r) {
        if (c.kind === 3) { c.hp -= c.maxHp * 0.35; c.hitT = 0.2; if (c.hp <= 0) kill(i); }
        else kill(i);
        if (c.alive) { c.x += (dx / d) * 120; c.y += (dy / d) * 120; }
      } else if (d < T.SKILL_R * 1.9 + c.r) {
        c.x += (dx / d) * 90; c.y += (dy / d) * 90;
      }
    }
  }

  const orb = [0, 0];

  // ---- one tick ---------------------------------------------------------------------------------
  /** input: { mx, my, art, skill, pick } – mx/my in [-1, 1], art 0..2, skill true on press,
   *  pick 0..2 to choose a level-up card (−1 none). */
  function step(input) {
    S.evN = 0;
    if (S.state === "choice") {
      if (input.pick >= 0 && input.pick < S.offers.length) choose(input.pick);
      return;
    }
    if (S.state !== "play") return;
    const dt = DT;
    S.tick++;
    S.t = S.tick * dt;
    const st = S.stats;

    // minutes: a boss at 1..9, the Endgegner wave at 10
    const minute = Math.floor(S.t / 60);
    if (minute !== S.minute && !stress) {
      S.minute = minute;
      emit(EV.MINUTE, S.hx, S.hy, minute, 0);
      if (minute >= 1 && minute <= 9) spawnBoss(minute - 1);
      if (minute === 10) {
        S.endgegner = true;
        for (let k = 0; k < 3; k++) spawnBoss(9 + k);
      }
    }
    if (S.t >= T.WIN_AT && !stress) {
      S.state = "won";
      emit(EV.WIN, S.hx, S.hy, 0, 0);
      return;
    }

    // Hamsti
    S.art = input.art;
    let mx = input.mx, my = input.my;
    const ml = mx * mx + my * my;
    if (ml > 1) { const l = Math.sqrt(ml); mx /= l; my /= l; }
    S.hpx = S.hx; S.hpy = S.hy;
    S.hvx = mx * st.speed; S.hvy = my * st.speed;
    S.hx += S.hvx * dt; S.hy += S.hvy * dt;
    if (S.iframes > 0) S.iframes -= dt;
    if (S.skill < T.SKILL_CHARGE) S.skill = Math.min(T.SKILL_CHARGE, S.skill + dt);
    if (input.skill && S.skill >= T.SKILL_CHARGE) skill();

    // spawning
    if (stress) {
      while (S.creN < T.MAX_CRE) {
        const [ux, uy] = unit();
        const dist = 90 + rs() * 420;
        const i = spawnAt(S.hx + ux * dist, S.hy + uy * dist, pickWord(), 0, 1e6, 0.4);
        if (i < 0) break;
      }
    } else {
      S.spawnT -= dt;
      if (S.spawnT <= 0) {
        const wave = welleAt(S.minute);
        S.spawnT += wave.every;
        spawnGroup();
      }
    }

    // creatures move toward Hamsti
    const lightR = st.lightR, slow = st.slow;
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      if (!c.alive) continue;
      c.px = c.x; c.py = c.y;
      let dx = S.hx - c.x, dy = S.hy - c.y;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2) || 1;
      if (d > T.DESPAWN_R) {
        // left far behind: back in, in front of Hamsti
        c.x = c.px = S.hx + (dx / d) * T.SPAWN_R;
        c.y = c.py = S.hy + (dy / d) * T.SPAWN_R;
        continue;
      }
      let sp = c.speed;
      if (slow > 0 && d < lightR) sp *= 1 - slow;
      c.x += (dx / d) * sp * dt;
      c.y += (dy / d) * sp * dt;
      if (c.flashT > 0) c.flashT -= dt;
      if (c.hitT > 0) c.hitT -= dt;
      if (c.orbitCd > 0) c.orbitCd -= dt;
    }

    buildHash();

    // creatures push each other apart (lightly), so a crowd spreads instead of stacking
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      if (!c.alive) continue;
      const n = query(c.x, c.y, c.r);
      for (let q = 0; q < n; q++) {
        const j = qbuf[q];
        if (j <= i) continue;
        const o = cre[j];
        if (!o.alive) continue;
        const dx = o.x - c.x, dy = o.y - c.y;
        const min = (c.r + o.r) * 0.85;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.25 / d;
        // bosses barely move for small ones
        const wc = c.kind === 3 ? 0.1 : 1, wo = o.kind === 3 ? 0.1 : 1;
        c.x -= dx * push * wc; c.y -= dy * push * wc;
        o.x += dx * push * wo; o.y += dy * push * wo;
      }
    }

    // touching Hamsti
    if (S.iframes <= 0) {
      const n = query(S.hx, S.hy, T.HAMSTI_R);
      for (let q = 0; q < n; q++) {
        const i = qbuf[q];
        const c = cre[i];
        if (!c.alive) continue;
        const dx = c.x - S.hx, dy = c.y - S.hy;
        const rr = (c.r * 0.8 + T.HAMSTI_R);
        if (dx * dx + dy * dy < rr * rr) {
          if (!stress) {
            const dmg = c.kind === 3 ? T.BOSS_DMG : T.CONTACT_DMG * (c.scale > 1.3 ? 1.5 : 1);
            S.hp -= dmg;
            S.hurtN++;
            if (c.w >= 0) perWord(c.w).hurt++;
          }
          S.iframes = T.IFRAMES;
          emit(EV.HURT, S.hx, S.hy, c.art, 0, i);
          // a small shove back
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          c.x += (dx / d) * 26; c.y += (dy / d) * 26;
          if (S.hp <= 0) {
            S.hp = 0;
            S.state = "over";
            emit(EV.DIE, S.hx, S.hy, 0, 0, i);
            return;
          }
          break;
        }
      }
    }

    // firing
    if (stress) stressFire();
    else {
      S.fireT -= dt;
      if (S.fireT <= 0) {
        if (fire()) S.fireT += st.fireEvery;
        else S.fireT = 0;
      }
    }

    // shots fly and hit
    for (let k = 0; k < shots.length; k++) {
      const s = shots[k];
      if (!s.alive) continue;
      s.px = s.x; s.py = s.y;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) { s.alive = false; S.shotN--; continue; }
      const n = query(s.x, s.y, T.SHOT_R);
      for (let q = 0; q < n; q++) {
        const i = qbuf[q];
        if (i === s.last) continue;
        const c = cre[i];
        if (!c.alive) continue;
        const isTarget = i === s.tgt && c.gen === s.tgen;
        // a shot only meets words of its article – and the one it was aimed at
        if (c.art !== s.art && !isTarget) continue;
        const dx = c.x - s.x, dy = c.y - s.y;
        const rr = c.r + T.SHOT_R;
        if (dx * dx + dy * dy > rr * rr) continue;
        s.last = i;
        if (c.art === s.art) rightHit(i, s);
        else wrongHit(i, s);
        if (s.pierce > 0 && c.art === s.art) { s.pierce--; continue; }
        s.alive = false; S.shotN--;
        break;
      }
    }

    // orbiting acorns (Eichel-Kreisel): any article, low damage, no wrong-article effect
    if (st.orbit > 0) {
      const ox = S.orbX * ROT_C - S.orbY * ROT_S;
      const oy = S.orbX * ROT_S + S.orbY * ROT_C;
      const l = Math.sqrt(ox * ox + oy * oy);
      S.orbX = ox / l; S.orbY = oy / l;
      for (let a = 0; a < st.orbit; a++) {
        orbitPos(S, a, st.orbit, orb);
        const ax = orb[0], ay = orb[1];
        const n = query(ax, ay, 12);
        for (let q = 0; q < n; q++) {
          const i = qbuf[q];
          const c = cre[i];
          if (!c.alive || c.orbitCd > 0) continue;
          const dx = c.x - ax, dy = c.y - ay;
          const rr = c.r + 12;
          if (dx * dx + dy * dy > rr * rr) continue;
          c.orbitCd = 0.45;
          emit(EV.ORBIT, ax, ay, 0, 0, i);
          damage(i, st.orbitDmg, false);
        }
      }
    }

    bursts();

    // nuts: magnet and pick-up
    const mag = st.magnet;
    for (let k = 0; k < nuts.length; k++) {
      const n = nuts[k];
      if (!n.alive) continue;
      n.px = n.x; n.py = n.y;
      const dx = S.hx - n.x, dy = S.hy - n.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < mag * mag) n.pulled = true;
      if (!n.pulled) {
        if (d2 > T.DESPAWN_R * T.DESPAWN_R) n.alive = false;
        continue;
      }
      const d = Math.sqrt(d2) || 1;
      if (d < T.PICK_R) {
        n.alive = false;
        if (n.acorn) heal(T.ACORN_HEAL);
        else {
          S.xp += n.v;
          emit(EV.NUT, n.x, n.y, n.v, 0);
          while (S.xp >= S.need) {
            S.xp -= S.need;
            S.plv++;
            S.need = T.XP_BASE + T.XP_STEP * (S.plv - 1);
            levelUp();
          }
        }
        continue;
      }
      const sp = Math.min(d / dt, T.NUT_PULL + st.speed);
      n.x += (dx / d) * sp * dt;
      n.y += (dy / d) * sp * dt;
    }
  }

  return { S, step, T };
}

/** Position of orbiting acorn `a` of `n` around Hamsti: the first one's direction (orbX, orbY)
 *  turned by a/n of a circle, with turns built from the halving formulas (no trig). */
const TURNS = (() => {
  // unit vectors for k/n of a circle, n = 1..6, from literal cos/sin of 60°, 72°, 90°, 120°, 180°
  const c = (deg) => {
    const t = {
      0: [1, 0], 60: [0.5, 0.8660254037844386], 72: [0.30901699437494745, 0.9510565162951535],
      90: [0, 1], 120: [-0.5, 0.8660254037844387], 144: [-0.8090169943749473, 0.5877852522924732],
      180: [-1, 0], 216: [-0.8090169943749476, -0.587785252292473], 240: [-0.5, -0.8660254037844385],
      270: [0, -1], 288: [0.30901699437494723, -0.9510565162951536], 300: [0.5, -0.8660254037844386],
    };
    return t[deg];
  };
  const out = [];
  for (let n = 1; n <= 6; n++) {
    const row = [];
    for (let a = 0; a < n; a++) row.push(c((360 / n) * a));
    out.push(row);
  }
  return out;
})();
export function orbitPos(S, a, n, out = [0, 0]) {
  const t = TURNS[Math.min(6, n) - 1][a];
  const x = S.orbX * t[0] - S.orbY * t[1], y = S.orbX * t[1] + S.orbY * t[0];
  out[0] = S.hx + x * TUNING.ORBIT_R;
  out[1] = S.hy + y * TUNING.ORBIT_R;
  return out;
}

/** The run's stats from the upgrade levels: the one place the upgrade numbers live. */
export function stats(S) {
  const u = S.up;
  return {
    shots: 1 + u.schleuder,
    magnet: TUNING.MAGNET * (1 + 0.45 * u.backentaschen),
    orbit: u.kreisel ? u.kreisel + 1 : 0,
    orbitDmg: 4 + 2 * u.kreisel,
    pierce: u.salve,
    lightR: TUNING.LIGHT_R + 22 * u.laterne,
    slow: 0.1 * u.laterne,
    speed: TUNING.HAMSTI_SPEED * (1 + 0.08 * u.pfoten),
    maxHp: TUNING.HP + 20 * u.vorrat,
    fireEvery: TUNING.FIRE_EVERY * (1 - 0.1 * u.kauen),
    dmg: TUNING.SHOT_DMG * (1 + 0.25 * u.schale),
    range: TUNING.RANGE * (1 + 0.12 * u.fernrohr),
  };
}
