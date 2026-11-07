// Artikel-Flitzer: the game state and the loop. World units: lanes sit at x = -1, 0, 1 times
// LANE_W (or -2 … 2 on the five-lane road of a race room: `lanes`); `pos` is the distance along the track, and an object's depth in front of the
// player is z = pos - dist. Everything moves by delta time, so the game runs the same at
// 30, 60 or 120 fps. Drawing is renderer.js; this file never touches the canvas.
//
// The track comes from a seed (rng.js) and depends on the position along it only, never on
// the player's clock, lane or warp: the same seed is the same track for everyone who runs it
// (challenge links, race rooms). Particles and sounds stay on Math.random.

import { sfx } from "./sound.js";
import { seeded, newSeed } from "./rng.js";

export const LANE_W = 2.4;
export const Z_FAR = 100;

/* Schwierigkeit: how fast the run starts and how fast it gets (units/s, gain per second of
   play), lives, and how often a row blocks two lanes (slow track, fast track) or the whole
   width. „Normal" is the game as it always was. The word level (A1–B1) is separate. */
export const DIFFICULTIES = {
  leicht: { start: 12, max: 26, gain: 0.1, lives: 5, two: [0.2, 0.3], wide: 0.08 },
  normal: { start: 15, max: 34, gain: 0.14, lives: 3, two: [0.3, 0.45], wide: 0.16 },
  schwer: { start: 18, max: 40, gain: 0.18, lives: 1, two: [0.4, 0.55], wide: 0.22 },
};
const LANE_SPEED = 15; // how fast the board slides between lanes
const JUMP_V = 9.2;
const SUPER_JUMP_V = 12;
const GRAVITY = 26;
const DUCK_TIME = 0.75;
const INVULN = 1.4;

// Heights the player must clear: a crate or a hurdle is jumped, a barrier or a beam is ducked
// under, a cart is not passable at all.
const CRATE_H = 0.95;
const HURDLE_H = 0.6;
// The answer boxes hang above head height: only a jump reaches them. Riding underneath
// answers nothing.
const GATE_HIT_Y = 0.4;

const WARP_TIME = 3;
const WARP_MULT = 2;
/** Power-ups: seconds they last (heart is instant). */
export const POWERS = { shield: 6, magnet: 8, jump: 8, double: 8, heart: 0 };
// What a mystery crate holds, by weight.
const BOX_TABLE = [["shield", 3], ["magnet", 3], ["jump", 2], ["double", 2], ["heart", 1]];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function pickWeighted(table, rnd) {
  let r = rnd() * table.reduce((n, [, w]) => n + w, 0);
  for (const [v, w] of table) if ((r -= w) < 0) return v;
  return table[0][0];
}

/**
 * `lanes`: 3, or 5 in a race room (wider road, five answer boxes per gate; the deck must deal
 * questions with that many options, questions.js createDeck(…, n)).
 * @param {{ deck: { next(): any, miss?(q): void }, mode: string, difficulty?: string, seed?: number, lanes?: number, events: {
 *   hud?(s): void, prompt?(q, s): void, result?(r): void, power?(p): void, over?(summary): void } }} opts
 */
export function createGame({ deck, mode, difficulty = "normal", seed = newSeed(), lanes: laneCount = 3, events }) {
  const D = DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal;
  const N = laneCount === 5 ? 5 : 3;
  const HALF = (N - 1) / 2; // the outermost lane's offset: 1, or 2 on the wide road
  const LANES = Array.from({ length: N }, (_, i) => i - HALF);
  /**
   * The speed a run without warps has reached at track position `pos` (v² = v0² + 2as). The
   * layout reads this instead of the live speed, so a warp does not change what comes next.
   */
  const trackBase = (pos) => Math.min(D.max, Math.sqrt(D.start ** 2 + 2 * D.gain * pos));
  // Where that run is after 6 s: no full-width hurdles or beams before it.
  const WIDE_FROM = D.start * 6 + D.gain * 18;
  // From here on the track counts as fast (22 of 15–34 on „Normal").
  const FAST = D.start + (D.max - D.start) * 0.37;
  // The track's own stream: only generate() and spawnRow() draw from it.
  const tr = seeded(seed);
  const trand = (a, b) => a + tr() * (b - a);
  const tpick = (arr) => arr[Math.floor(tr() * arr.length)];
  const s = {
    mode,
    lanes: N,
    difficulty: DIFFICULTIES[difficulty] ? difficulty : "normal",
    speedStart: D.start,
    speedMax: D.max,
    maxLives: D.lives,
    t: 0,
    dist: 0,
    base: D.start, // speed from the clock; `speed` adds the warp on top
    speed: D.start,
    lane: 0,
    x: 0,
    y: 0,
    vy: 0,
    duck: 0,
    lives: D.lives,
    invuln: 0,
    score: 0,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    missed: [],
    objects: [],
    particles: [],
    seed,
    spawnPos: 40,
    lastWarpPos: -1e9,
    nextGatePos: 70,
    gate: null,
    flash: null,
    shake: 0,
    over: false,
    overT: 0,
    mult: 1,
    warp: 0,
    power: { shield: 0, magnet: 0, jump: 0, double: 0 },
  };

  // Gates come first in the deck so the first question is close: the learner is here for them.
  // Spacing grows with speed so there are 6-7 s between two gates. Never closer than the draw
  // distance: the next gate appears only after the last one is answered, and far away.
  const gateGap = (pos) => Math.max(Z_FAR + 5, trackBase(pos) * 6);
  const laneIndex = () => Math.max(-HALF, Math.min(HALF, Math.round(s.x / LANE_W))) + HALF;
  const syncMult = () => { s.mult = (s.streak >= 5 ? 2 : 1) * (s.power.double > 0 ? 2 : 1); };

  function spawnGate(pos) {
    const q = deck.next();
    const g = { type: "gate", pos, q, done: false, picked: -1, ok: null };
    s.objects.push(g);
    s.gate = g;
    events.prompt?.(q, s);
  }

  function coinLine(lane, pos, n, y = 0.9) {
    for (let i = 0; i < n; i++) s.objects.push({ type: "coin", lane, pos: pos + i * 2.4, y, got: false });
  }

  function spawnRow(pos) {
    const nearGate = pos > s.nextGatePos - 22 && pos < s.nextGatePos + 14;
    const lanes = LANES;
    if (nearGate) {
      if (tr() < 0.5) coinLine(tpick(lanes), pos, 4);
      return;
    }

    // A full-width hurdle or low beam: no lane is free, so it has to be a jump or a duck.
    if (pos > WIDE_FROM && tr() < D.wide) {
      const type = tr() < 0.5 ? "hurdle" : "beam";
      s.objects.push({ type, lane: 0, pos, passed: false, wide: true });
      if (type === "hurdle" && tr() < 0.6) {
        const lane = tpick(lanes);
        for (let i = 0; i < 4; i++) s.objects.push({ type: "coin", lane, pos: pos - 3 + i * 2, y: 1.2 + Math.sin(((i + 0.5) / 4) * Math.PI) * 0.8, got: false });
      }
      return;
    }

    // On the wide road one more lane is blocked, so the five lanes still leave two or three free.
    const blocked = (tr() < (trackBase(pos) > FAST ? D.two[1] : D.two[0]) ? 2 : 1) + (N === 5 ? 1 : 0);
    const order = lanes.slice().sort(() => tr() - 0.5);
    for (let i = 0; i < blocked; i++) {
      // Two carts side by side leave one way out and no other choice; allow at most one.
      const type = i >= 1 && s.objects.some((o) => o.pos === pos && o.type === "cart")
        ? tpick(["crate", "barrier"])
        : tpick(["crate", "crate", "barrier", "barrier", "cart"]);
      s.objects.push({ type, lane: order[i], pos, passed: false });
    }
    const free = order.slice(blocked);

    // Extras take a free lane each: the warp pad, a mystery crate or a loose power-up.
    // Pads stay a warp's length apart, measured on the track rather than by the live warp.
    const extra = tr();
    if (extra < 0.08 && pos - s.lastWarpPos > trackBase(pos) * WARP_TIME * WARP_MULT) {
      s.lastWarpPos = pos;
      s.objects.push({ type: "warp", lane: free.pop(), pos: pos + 1, used: false });
    } else if (extra < 0.18) {
      // What the crate holds is settled here, so it is the same for everyone on this track.
      s.objects.push({ type: "mystery", kind: pickWeighted(BOX_TABLE, tr), lane: free.pop(), pos, got: false });
    } else if (extra < 0.25) {
      // Half of the loose items float high: a reason to jump with nothing in the way.
      s.objects.push({ type: "item", kind: pickWeighted(BOX_TABLE, tr), lane: free.pop(), pos, y: tr() < 0.5 ? 0.9 : 2.3, got: false });
    }

    if (free.length && tr() < 0.55) {
      coinLine(tpick(free), pos + 2, 5);
    } else if (tr() < 0.35) {
      // A coin arc over a crate: only a jump gets it.
      const crate = s.objects.find((o) => o.pos === pos && o.type === "crate");
      if (crate) for (let i = 0; i < 4; i++) s.objects.push({ type: "coin", lane: crate.lane, pos: pos - 3 + i * 2, y: 1.2 + Math.sin(((i + 0.5) / 4) * Math.PI) * 0.8, got: false });
    }
  }

  function generate() {
    while (s.spawnPos < s.dist + Z_FAR) {
      if (s.spawnPos >= s.nextGatePos && !s.gate) {
        spawnGate(s.nextGatePos);
        s.spawnPos = s.nextGatePos + 14;
        s.nextGatePos += gateGap(s.nextGatePos);
        continue;
      }
      if (s.spawnPos >= s.nextGatePos) break; // wait until the current gate is answered
      spawnRow(s.spawnPos);
      s.spawnPos += trand(15, 24) + trackBase(s.spawnPos) * 0.3;
    }
  }

  function burst(x, y, pos, colors, n = 14) {
    for (let i = 0; i < n; i++) {
      s.particles.push({
        x: x + rand(-0.4, 0.4), y: y + rand(0, 0.6), pos,
        vx: rand(-4, 4), vy: rand(3, 9), vz: s.speed * rand(0.5, 0.9),
        c: pick(colors), life: rand(0.5, 0.9),
      });
    }
  }

  function loseLife() {
    s.lives -= 1;
    s.streak = 0;
    syncMult();
    s.shake = 0.35;
    if (s.lives <= 0 && !s.over) {
      s.over = true;
      s.overT = 0;
      sfx.over();
    }
  }

  function resolveGate(g) {
    g.done = true;
    s.gate = null;
    // Only a jump into a box answers; riding underneath counts as no answer.
    const jumped = s.y > GATE_HIT_Y;
    g.picked = jumped ? laneIndex() : -1;
    g.ok = g.picked === g.q.answer;
    if (g.ok) {
      s.correct += 1;
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      syncMult();
      s.score += 100 * s.mult;
      s.flash = { color: "ok", t: 0 };
      burst(s.x, 2.4, s.dist + 1, ["#22c55e", "#facc15", "#ffffff"]);
      sfx.correct();
    } else {
      s.wrong += 1;
      if (!s.missed.some((m) => m.full === g.q.full)) s.missed.push({ full: g.q.full, english: g.q.english, id: g.q.id, say: g.q.say, audio: g.q.audio });
      deck.miss?.(g.q); // comes back a few questions later (questions.js)
      s.flash = { color: "bad", t: 0 };
      sfx.wrong();
      loseLife();
    }
    events.result?.({ ok: g.ok, q: g.q, picked: g.picked, mult: s.mult, nojump: !jumped });
  }

  function hitObstacle(o) {
    if (s.over) return;
    const lane = laneIndex() - HALF;
    if (!o.wide && lane !== o.lane) return;
    if ((o.type === "crate") && s.y > CRATE_H) return;
    if (o.type === "hurdle" && s.y > HURDLE_H) return;
    if ((o.type === "barrier" || o.type === "beam") && s.duck > 0 && s.y < 0.5) return;
    // Shield and warp smash straight through.
    if (s.power.shield > 0 || s.warp > 0) {
      o.smashed = true;
      const colors = { crate: ["#c58b4e", "#dcaa72"], cart: ["#f59e0b", "#fcd34d"], hurdle: ["#f8fafc", "#f97316"] }[o.type] || ["#f8fafc", "#facc15", "#1e293b"];
      burst(o.wide ? s.x : o.lane * LANE_W, 0.6, o.pos, colors, 18);
      s.score += 25 * s.mult;
      s.shake = 0.12;
      sfx.smash();
      return;
    }
    if (s.invuln > 0) return;
    o.hit = true;
    s.invuln = INVULN;
    s.ouch = 1; // the kart shudders, stars over Bruno's head, for a second (renderer.js)
    s.flash = { color: "bad", t: 0 };
    sfx.hit();
    loseLife();
  }

  function givePower(kind, from) {
    if (kind === "heart") {
      if (s.lives < D.lives) s.lives += 1;
      else s.score += 250 * s.mult;
    } else {
      s.power[kind] = POWERS[kind];
      syncMult();
    }
    sfx.power();
    events.power?.({ kind, from, full: kind === "heart" && s.lives >= D.lives });
  }

  function startWarp() {
    s.warp = WARP_TIME;
    sfx.warp();
    events.power?.({ kind: "warp", from: "pad" });
  }

  function update(dt) {
    if (s.over) {
      // A short slow-down before the game-over screen.
      s.overT += dt;
      s.speed = Math.max(0, s.speed - 40 * dt);
      s.dist += s.speed * dt;
      if (s.flash) s.flash.t += dt;
      s.shake = Math.max(0, s.shake - dt);
      updateParticles(dt);
      if (s.overT > 0.9 && !s.reported) {
        s.reported = true;
        const answered = s.correct + s.wrong;
        events.over?.({
          score: Math.floor(s.score),
          coins: s.coins,
          bestStreak: s.bestStreak,
          correct: s.correct,
          wrong: s.wrong,
          accuracy: answered ? Math.round((s.correct / answered) * 100) : 0,
          missed: s.missed,
          seconds: s.t,
        });
      }
      return;
    }

    s.t += dt;
    s.base = Math.min(D.max, D.start + s.t * D.gain);
    // Ease into and out of the warp instead of jumping between speeds.
    const target = s.base * (s.warp > 0 ? WARP_MULT : 1);
    s.speed += (target - s.speed) * Math.min(1, dt * 5);
    const step = s.speed * dt;
    s.dist += step;
    s.score += step * 0.5 * (s.power.double > 0 ? 2 : 1);

    // Lane slide
    const tx = s.lane * LANE_W;
    const d = tx - s.x;
    s.x += Math.sign(d) * Math.min(Math.abs(d), LANE_SPEED * dt);

    // Jump / duck
    if (s.y > 0 || s.vy > 0) {
      s.vy -= GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= 0) { s.y = 0; s.vy = 0; }
    }
    if (s.duck > 0) s.duck = Math.max(0, s.duck - dt);
    if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
    if (s.ouch > 0) s.ouch = Math.max(0, s.ouch - dt);
    if (s.warp > 0) {
      s.warp = Math.max(0, s.warp - dt);
      // A moment of grace after the warp, so it never ends inside a crate.
      if (s.warp === 0) s.invuln = Math.max(s.invuln, 0.8);
    }
    let powerEnded = false;
    for (const k in s.power) {
      if (s.power[k] > 0) {
        s.power[k] = Math.max(0, s.power[k] - dt);
        if (s.power[k] === 0) powerEnded = true;
      }
    }
    if (powerEnded) { syncMult(); if (s.invuln === 0) s.invuln = 0.6; }
    if (s.flash) { s.flash.t += dt; if (s.flash.t > 0.5) s.flash = null; }
    s.shake = Math.max(0, s.shake - dt);

    generate();

    const lane = laneIndex() - HALF;
    const magnet = s.power.magnet > 0;
    for (const o of s.objects) {
      const z = o.pos - s.dist;
      if (o.type === "gate") {
        if (!o.done && z <= 0) resolveGate(o);
      } else if (o.type === "coin") {
        if (o.got) continue;
        if (magnet && z < 14 && z > -1) {
          // Pull the coin towards the board; it is caught once it reaches the player.
          o.mag = true;
          const ox = o.x ?? o.lane * LANE_W;
          o.x = ox + (s.x - ox) * Math.min(1, dt * 9);
          o.y += (s.y + 0.8 - o.y) * Math.min(1, dt * 9);
        }
        const inLane = o.mag ? Math.abs((o.x ?? 0) - s.x) < 1.2 : o.lane === lane;
        if (Math.abs(z) < 0.9 && inLane && Math.abs(s.y + 0.8 - o.y) < 1.0) {
          o.got = true;
          s.coins += 1;
          s.score += 10 * s.mult;
          sfx.coin();
        }
      } else if (o.type === "item") {
        if (!o.got && Math.abs(z) < 1.0 && o.lane === lane && o.y > s.y - 0.3 && o.y < s.y + 1.7) {
          o.got = true;
          burst(o.lane * LANE_W, o.y, o.pos, ["#ffffff", "#facc15", "#a78bfa"]);
          givePower(o.kind, "item");
        }
      } else if (o.type === "mystery") {
        if (!o.got && Math.abs(z) < 0.9 && o.lane === lane && s.y < 1.3) {
          o.got = true;
          burst(o.lane * LANE_W, 0.6, o.pos, ["#7c3aed", "#a78bfa", "#facc15", "#ffffff"], 22);
          givePower(o.kind, "box");
        }
      } else if (o.type === "warp") {
        if (!o.used && z <= 0 && z > -4 && o.lane === lane && s.y < 0.8) {
          o.used = true;
          startWarp();
        }
      } else if (!o.passed && z <= 0.4) {
        o.passed = true;
        hitObstacle(o);
      }
    }
    s.objects = s.objects.filter((o) => o.pos - s.dist > -4 && !o.got && !o.smashed);
    updateParticles(dt);
    events.hud?.(s);
  }

  function updateParticles(dt) {
    for (const p of s.particles) {
      p.x += p.vx * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      p.vy -= 22 * dt;
      p.pos += p.vz * dt;
      p.life -= dt;
    }
    s.particles = s.particles.filter((p) => p.life > 0);
  }

  function act(a) {
    if (s.over) return;
    if (a === "left" && s.lane > -HALF) { s.lane -= 1; sfx.lane(); }
    else if (a === "right" && s.lane < HALF) { s.lane += 1; sfx.lane(); }
    else if (a === "jump" && s.y === 0) { s.vy = s.power.jump > 0 ? SUPER_JUMP_V : JUMP_V; s.duck = 0; sfx.jump(); }
    else if (a === "duck") {
      if (s.y > 0) s.vy = Math.min(s.vy, -14); // drop out of a jump
      s.duck = DUCK_TIME;
    }
  }

  generate();
  return { state: s, update, act, laneIndex };
}
