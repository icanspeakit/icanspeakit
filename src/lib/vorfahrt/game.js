// Vorfahrt-Flitzer: the game state and the loop. The learner's car drives along a road; every
// SPACING units comes a crossing (rules.js). Before the lock line the learner says „warten“
// (brake) or „fahren“ (gas) – doing nothing means driving on, as on a real road. At the lock
// line the choice is fixed and the crossing plays out: the cars that have priority go, the
// others wait, and a wrong choice ends in a near miss (or a honking queue) and the „Warum?“
// card. Same world units and projection as Artikel-Flitzer: x across, `pos` along the road,
// z = pos - dist in front of the camera. Drawing is renderer.js; this file never touches the canvas.

import { decide, makeCrossing, similar, blinkFor, blinkVerdict, NO_CROSS_ROAD } from "./rules.js";
import { reducedMotion } from "../spieleEinstellungen.js";

/** A small seeded generator (mulberry32) for the daily drive: same seed, same crossings. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** "2026-10-28" → a number: the daily drive's seed. */
export const daySeed = (day) => [...`vorfahrt-${day}`].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
/** How many crossings the daily drive has. */
export const DAILY_LENGTH = 20;
/** A missed crossing comes back this many crossings later (at least, at most +2). */
const RETRY_AFTER = 3;
/** ... and at most this often (the first miss, then twice more if it is missed again). */
const RETRY_TRIES = 2;

/** Half the road's width: two lanes, the learner drives in the right one. */
export const RW = 2.6;
export const LANE_X = RW / 2;
/** How deep a crossing's cross road is. */
export const CW = 5.2;
export const Z_FAR = 100;

const SPACING = 56;
const FIRST_AT = 55;
/** Where the choice is fixed: this far before the crossing (the car's rear). */
const LOCK = 11;
/** Where a waiting car stands: the rear this far before the crossing, the bonnet at the line. */
const STOP_GAP = 3.4;
export const SPEED_START = 14;
export const SPEED_MAX = 24;
const SPEED_STEP = 0.5;
/** Hearts: a mistake costs one, the drive ends at none. */
export const LIVES = 5;
/** This many right in a row win a lost heart back. */
export const HEART_EVERY = 8;
const ACCEL = 9;
const OTHER_V = 9;
const PED_V = 1.9;
const TURN_TIME = 0.7;
/** From this far before a crossing the car rolls at APPROACH_V. */
const APPROACH_AT = 38;
const APPROACH_V = 8;

const CAR_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e", "#64748b", "#db2777"];

/**
 * The others at a crossing. `prio`: goes before the learner by the rules. `wait`: where it
 * stands until it may go; `to`: where it is gone.
 */
function actorsFor(c, P, rnd) {
  const color = () => CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)];
  const a = [];
  const hasPrio = (side) => {
    if (c.blue === side) return true;
    if (side === "right") return ["rvl", "achten", "stop"].includes(c.control);
    if (side === "left") return ["achten", "stop", "kreisel"].includes(c.control);
    return false;
  };
  // From the right on the far lane, driving to the left; from the left on the near lane.
  const side = (s, blue) => ({
    kind: blue ? "amb" : "car", side: s, color: blue ? "#f8fafc" : color(), prio: hasPrio(s),
    x: s === "right" ? 22 : -22, z: P + (s === "right" ? CW * 0.75 : CW * 0.25),
    wait: s === "right" ? RW + 1.7 : -RW - 1.7, to: s === "right" ? -30 : 30, axis: "x", state: "come",
  });
  if (c.right || c.blue === "right") a.push(side("right", c.blue === "right"));
  if (c.left || c.blue === "left") a.push(side("left", c.blue === "left"));
  // At a red light the cross road has green: a car crosses there, and it goes first.
  if (c.control === "rot" || c.control === "pfeil") a.push({ ...side("left", false), prio: true });
  // The train comes from the right and waits out of the way until the learner has decided.
  if (c.train) a.push({ kind: "train", side: "right", color: "#dc2626", prio: true, x: 60, z: P + CW * 0.5, wait: RW + 8, to: -80, axis: "x", state: "come" });
  if (c.oncoming) {
    // At a Z. 308 narrow spot the oncoming car waits for the learner, well before it.
    const prio = c.turn === "left" || c.control === "eng208";
    const waits = prio || c.control === "eng308";
    a.push({ kind: "car", side: "oncoming", color: color(), prio,
      x: -LANE_X, z: P + CW + 40, wait: P + CW + (c.control === "eng308" ? 9 : 2), to: P - 40, axis: "z",
      // Only a car that stops (for the learner, or the learner for it) waits in view; any other just drives through.
      state: waits ? "come" : "go" });
  }
  if (c.ped) {
    if (c.control === "zebra") {
      a.push({ kind: "ped", side: "zebra", color: "#f97316", prio: true,
        x: RW + 2.5, z: P - 2.8, wait: RW + 0.5, to: -RW - 2, axis: "x", state: "come" });
    } else {
      // On the crosswalk of the road the learner turns into, walking across it.
      const dx = (c.turn === "left" ? -1 : 1) * (RW + 1.4);
      a.push({ kind: "ped", side: "turn", color: "#0ea5e9", prio: true,
        x: dx, z: P - 3.5, wait: P - 0.9, to: P + CW + 2, axis: "z", state: "come" });
    }
  }
  return a;
}

/**
 * @param {{ events: { hud?(s): void, choice?(s): void, crossing?(x): void, result?(r): void,
 *   over?(summary): void } }} opts
 */
export function createGame({ events = {} } = {}) {
  const rnd = Math.random;
  /** Draws the crossings. Seeded for the daily drive; the cars' colours, houses and the
   *  returning crossings stay on Math.random so the sequence does not depend on frame timing. */
  let crossRnd = Math.random;
  /** @type {any} */
  const s = {
    t: 0, dist: 0, speed: SPEED_START, cruise: SPEED_START, lives: LIVES, score: 0, streak: 0, bestStreak: 0,
    n: 0, right: 0, crossings: [], decor: [], turn: null, shake: 0, flash: null, braking: false,
    skyOff: 0, over: false, held: false, missed: [], retry: [], fresh: 0, gen: 0, limit: 0, daily: false,
    blink: null, heartBack: 0,
  };

  function addCrossing(pos) {
    // A crossing the learner got wrong comes back: the same rule, drawn afresh.
    const back = s.retry.findIndex((r) => r.due <= s.gen);
    const again = back >= 0 ? s.retry.splice(back, 1)[0].entry : null;
    // A missed indicator comes back as the very same turn: it is the indicator that is practised.
    const c = again ? (again.key.startsWith("blink") ? { ...again.c } : similar(again.c)) : makeCrossing(s.fresh++, crossRnd);
    s.gen++;
    const x = { pos, c, verdict: decide(c), choice: null, locked: false, phase: "open", timer: 0,
      actors: actorsFor(c, pos, rnd), done: false, crashed: false, retryOf: again };
    s.crossings.push(x);
    return x;
  }

  /** Houses along the road, outside the crossings. Seeded by position so they stay put. */
  function decorUpTo(pos) {
    const last = s.decor.length ? s.decor[s.decor.length - 1].pos : -10;
    for (let p = last + 9; p < pos; p += 9 + rnd() * 6) {
      for (const sideX of [-1, 1]) {
        if (rnd() < 0.25) continue;
        s.decor.push({ pos: p, x: sideX * (RW + 9 + rnd() * 6), w: 4 + rnd() * 3, h: 2.5 + rnd() * 3.5, d: 4 + rnd() * 3,
          hue: Math.floor(rnd() * 5), tree: rnd() < 0.35 });
      }
    }
  }

  const cur = () => s.crossings.find((x) => !x.done) ?? null;
  /** Where the learner's way meets the others: the junction, or a Zebrastreifen's near edge. */
  const edge = (x) => x.pos - (x.c.control === "zebra" ? 4.2 : 0);

  /** "go" / "wait", or "left" / "right" for the indicator (a second tap switches it off). */
  function choose(kind) {
    const x = cur();
    if (!x || x.locked || s.over || s.held) return;
    if (kind === "left" || kind === "right") {
      s.blink = s.blink === kind ? null : kind;
      events.choice?.(s);
      return;
    }
    x.choice = kind;
    s.braking = kind === "wait";
    events.choice?.(s);
  }

  function lockCrossing(x) {
    x.locked = true;
    x.choice ??= "go";
    x.blink = s.blink;
    x.correct = (x.choice === "go") === x.verdict.go;
    x.phase = x.choice === "wait" ? "braking" : "driving";
    s.braking = x.choice === "wait";
    if (x.choice === "go" && !x.correct) {
      // Whoever had priority goes as well: the learner meets them in the middle.
      for (const a of x.actors) if (a.prio) a.state = "go";
    }
  }

  function finishCrossing(x) {
    x.done = true;
    s.n++;
    if (x.correct) {
      s.right++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.score += 10 + Math.min(10, s.streak - 1);
      // A run of right ones wins a lost heart back.
      if (s.streak % HEART_EVERY === 0 && s.lives < LIVES) { s.lives++; s.heartBack++; }
    } else {
      s.streak = 0;
    }
    s.cruise = Math.min(SPEED_MAX, SPEED_START + s.n * SPEED_STEP);
    if (s.limit && s.n >= s.limit) end();
    // A choice that was not used yet carries no weight on the next crossing; the indicator goes off.
    s.braking = false;
    s.blink = null;
    events.hud?.(s);
    events.choice?.(s);
  }

  /** The verdict is in: tell the page (toast or card) and score it. */
  function judge(x) {
    if (x.judged) return;
    x.judged = true;
    // Right about the rule, wrong with the indicator: a mistake too, explained as one.
    if (x.correct && (x.blink ?? null) !== blinkFor(x.c)) {
      x.correct = false;
      x.blinkMiss = true;
      x.verdict = { ...blinkVerdict(x.c, x.blink), go: x.verdict.go };
    }
    if (x.correct) s.flash = { t: 0, color: "ok" };
    const entry = x.retryOf;
    if (entry) entry.again = x.correct ? "ok" : "no";
    let back = false;
    if (!x.correct) {
      s.lives--;
      // A returning crossing missed again stays one line in the list.
      const m = entry ?? { c: x.c, why: x.verdict.why, key: x.verdict.key, choice: x.choice, again: null, tries: 0 };
      if (!entry) s.missed.push(m);
      if (m.tries < RETRY_TRIES) {
        m.tries++;
        back = true;
        s.retry.push({ entry: m, due: s.gen + RETRY_AFTER - 1 + Math.floor(Math.random() * 3) });
      }
    }
    events.result?.({ x, correct: x.correct, lives: s.lives, back });
    if (!x.correct) s.held = true; // the page shows the card, then calls resume()
    events.hud?.(s);
  }

  function moveActor(a, dt) {
    const v = a.kind === "ped" ? PED_V : OTHER_V;
    const dir = Math.sign((a.state === "go" ? a.to : a.wait) - a[a.axis]);
    if (a.state === "come") {
      const left = a.wait - a[a.axis];
      // Slow down into the waiting spot.
      const step = Math.min(Math.abs(left), (a.kind === "ped" ? v : Math.max(1.5, Math.abs(left) * 1.6)) * dt);
      a[a.axis] += Math.sign(left) * step;
    } else if (a.state === "go") {
      a.v = Math.min(v * (a.kind === "amb" ? 1.4 : 1), (a.v ?? 0) + 10 * dt);
      a[a.axis] += dir * a.v * dt;
      if (Math.sign(a.to - a[a.axis]) !== dir || dir === 0) a.state = "gone";
    }
  }

  function step(dt) {
    if (s.over) return;
    s.t += dt;
    s.shake = Math.max(0, s.shake - dt * 2.5);
    if (s.flash) {
      s.flash.t += dt;
      if (s.flash.t > 0.6) s.flash = null;
    }
    if (s.held) return; // the card is up: the world stands still

    const x = cur();
    // Speed: cruise, or brake to the line, or stand.
    let target = s.cruise;
    // Slow into a crossing, as one does, so there is time to look.
    if (x && !x.locked && x.pos - s.dist < APPROACH_AT) target = Math.min(target, APPROACH_V);
    if (x && x.phase === "braking") {
      const gap = edge(x) - STOP_GAP - s.dist;
      if (gap <= 0.05) {
        s.speed = 0;
        x.phase = "standing";
        x.timer = 0;
      } else {
        // v² = 2·a·d: the deceleration that ends exactly at the line.
        s.speed = Math.min(s.speed, Math.sqrt(2 * 9 * gap));
      }
      target = s.speed;
    } else if (x && x.phase === "standing") {
      target = 0;
      s.speed = 0;
    }
    if (s.speed < target) s.speed = Math.min(target, s.speed + ACCEL * dt);
    else if (!x || (x.phase !== "braking" && x.phase !== "standing")) s.speed = Math.max(target, s.speed - 10 * dt);
    s.dist += s.speed * dt;

    // Whip pan through a turn: the world swaps in the middle.
    if (s.turn) {
      s.turn.t += dt / TURN_TIME;
      if (s.turn.t >= 0.5 && !s.turn.swapped) {
        s.turn.swapped = true;
        s.skyOff += s.turn.dir * 140;
        finishCrossing(s.turn.x);
        // Fresh road after the corner: drop the old houses, place the next crossing ahead.
        s.decor = [];
        const next = s.crossings.find((c) => !c.done);
        if (next) {
          const shift = s.dist + SPACING - 12 - next.pos;
          next.pos += shift;
          for (const a of next.actors) {
            if (a.axis === "z") { a.z += shift; a.wait += shift; a.to += shift; } else a.z += shift;
          }
        }
      }
      if (s.turn.t >= 1) s.turn = null;
    }

    if (x) {
      const z = edge(x) - s.dist;
      for (const a of x.actors) {
        // Nobody rolls in before they could be seen.
        if (a.state === "come" && z > 70) continue;
        moveActor(a, dt);
      }
      if (!x.locked && z <= LOCK) lockCrossing(x);

      if (x.phase === "standing") {
        x.timer += dt;
        const prio = x.actors.filter((a) => a.prio);
        if (x.correct) {
          // Let the ones with priority go, then drive off.
          if (x.timer > 0.3) for (const a of prio) if (a.state === "come") a.state = "go";
          // Clear once each of them is past the learner's lane (or, on foot, well on the way).
          const clear = prio.every((a) => a.state === "gone"
            || (a.kind === "ped" ? a.state === "go" && Math.abs(a[a.axis] - a.wait) > 2.5
              : a.kind === "train" ? a.x < -14
              : a.side === "oncoming" ? a.z < x.pos - 2
              : a.side === "right" ? a.x < -0.8 : a.x > RW + 2));
          if (x.timer > 0.9 && clear) {
            judge(x);
            x.phase = "leaving";
          }
        } else if (x.timer > 1.1) {
          // Waited for nobody: the others wait for the learner, someone behind honks.
          judge(x);
          x.phase = "leaving";
        }
      } else if (x.phase === "driving") {
        if (!x.correct && !x.crashed && z <= 1.2) {
          x.crashed = true;
          s.shake = reducedMotion() ? 0 : 1;
          s.flash = { t: 0, color: "bad" };
          s.speed = 0;
          // Out of the way before the drive goes on.
          for (const a of x.actors) if (a.prio) a.state = "gone";
          judge(x);
          x.phase = "leaving";
        } else if (x.correct && z <= 0.5) {
          judge(x);
          x.phase = "leaving";
        }
      } else if (x.phase === "leaving") {
        // Behind the learner, the others carry on.
        if (z < -1) for (const a of x.actors) if (a.state === "come") a.state = "go";
        // Into a Kreisverkehr the car bears right: the same whip pan as a right turn.
        const bends = x.c.turn !== "straight" || x.c.control === "kreisel";
        if (bends && !s.turn && !x.turned && z <= CW * 0.3) {
          x.turned = true;
          s.turn = { t: 0, dir: x.c.turn === "left" ? -1 : 1, x };
        } else if (!bends && z < (NO_CROSS_ROAD.has(x.c.control) ? -6 : -CW - 4)) {
          finishCrossing(x);
        }
      }
      // The next one goes after the last crossing on the road. Not after x: x may have just
      // finished, and its follower already stands at x.pos + SPACING.
      if (x.locked && s.crossings.filter((c) => !c.done).length < 2) {
        addCrossing(Math.max(...s.crossings.map((c) => c.pos)) + SPACING);
      }
    }
    // Forget what is far behind.
    s.crossings = s.crossings.filter((c) => !c.done || c.pos - s.dist > -40);
    s.decor = s.decor.filter((d) => d.pos - s.dist > -10);
    decorUpTo(s.dist + Z_FAR + 10);

    if (s.lives <= 0 && !s.held) end();
  }

  function end() {
    if (s.over) return;
    s.over = true;
    events.over?.({ score: s.score, right: s.right, n: s.n, bestStreak: s.bestStreak, missed: s.missed,
      daily: s.daily, done: !!s.limit && s.n >= s.limit });
  }

  /** After the „Warum?“ card. */
  function resume() {
    s.held = false;
    s.speed = Math.max(s.speed, 0);
    if (s.lives <= 0) end();
  }

  /** @param {{ daily?: string }} [opts] `daily`: the day ("2026-10-28"): same crossings for everyone, DAILY_LENGTH of them */
  function start({ daily = "" } = {}) {
    crossRnd = daily ? seeded(daySeed(daily)) : Math.random;
    Object.assign(s, { t: 0, dist: 0, speed: SPEED_START, cruise: SPEED_START, lives: LIVES, score: 0, streak: 0,
      bestStreak: 0, n: 0, right: 0, crossings: [], decor: [], turn: null, shake: 0, flash: null,
      braking: false, over: false, held: false, missed: [], retry: [], fresh: 0, gen: 0, blink: null, heartBack: 0,
      limit: daily ? DAILY_LENGTH : 0, daily: !!daily });
    addCrossing(FIRST_AT);
    decorUpTo(Z_FAR + 10);
    events.hud?.(s);
    events.choice?.(s);
  }

  /** Dev checks only (window.__vf): replace the next crossing with a given one. */
  function setNext(c) {
    const x = cur();
    if (!x) return;
    Object.assign(x, { c, verdict: decide(c), actors: actorsFor(c, x.pos, rnd) });
    events.choice?.(s);
  }

  return { s, step, start, choose, resume, cur, end, setNext };
}
