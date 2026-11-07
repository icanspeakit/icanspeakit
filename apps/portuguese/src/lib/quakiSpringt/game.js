// Quaki springt: one run. Wraps the physics (physics.js) with what the page needs: the mode,
// the questions on the signs (questions.js), the input log (for ghosts, Duell links and the
// route test), the timer in ticks and the answers. No DOM; main.js draws and listens.
//
// Modes: sanft (a flag per level catches falls; a wrong pad shows the right answer and the
// rule), wut (no flags, timer to hundredths), tagesturm (wut with today's seed).

import { P, createSim } from "./physics.js";
import { assignQuestions, padIsRight } from "./questions.js";

export const MODES = ["sanft", "wut", "tagesturm"];
export const LEVEL_IDS = ["A1", "A2", "B1", "B2", "C1"];

export function createRun({ world, fragen, seed, mode = "sanft" }) {
  const plan = assignQuestions(world, fragen, seed);
  const sim = createSim(world, { correct: (room, slot) => padIsRight(plan, room, slot), sanft: mode === "sanft" });
  const s = sim.s;
  const log = []; // [tick, bits] whenever the input changes
  let bits = 0;
  // Per question room: first landing decides right/wrong; every wrong pad counts for the emoji.
  const answers = new Map(); // room → { first: true|false, wrong: n, revealed }
  const wrongPerLevel = LEVEL_IDS.map(() => 0);
  const missed = []; // { q, picked, right, rule, level }
  const run = {
    seed,
    mode,
    plan,
    sim,
    s,
    log,
    answers,
    wrongPerLevel,
    missed,
    richtig: 0,
    falsch: 0,
    levelReached: 0,
    /** Held / left / right from the controls; logged when it changes. */
    input(next) {
      if (next === bits) return;
      bits = next;
      log.push([s.tick + 1, bits]);
      sim.setInput(bits);
    },
    /** One tick; returns the tick's events (physics events plus "answer"). */
    step() {
      sim.step();
      const evs = s.events;
      for (const e of evs) {
        if (e.type === "pad") onPad(e);
      }
      const lv = world.rooms[Math.max(0, Math.min(world.rooms.length - 1, sim.room()))].level;
      if (lv > run.levelReached) run.levelReached = lv;
      return evs;
    },
    seconds: () => s.tick * P.DT,
    height: () => sim.height(),
    level: () => world.rooms[Math.max(0, Math.min(world.rooms.length - 1, sim.room()))].level,
    /** The question of the room he is in (or the one just above when he stands under it). */
    question(room = sim.room()) {
      return plan.get(room) ? { room, ...plan.get(room), state: answers.get(room) } : null;
    },
  };

  function onPad(e) {
    const p = plan.get(e.room);
    if (!p) return;
    let a = answers.get(e.room);
    if (!a) {
      a = { first: e.ok, wrong: 0, revealed: false };
      answers.set(e.room, a);
      if (e.ok) run.richtig++;
    }
    if (!e.ok) {
      a.wrong++;
      wrongPerLevel[world.rooms[e.room].level]++;
      if (a.wrong === 1) {
        if (a.first) { /* right first, then wrong later: still counts as right */ }
        else {
          run.falsch++;
          missed.push({ q: p.q.q, picked: p.slots[e.slot], right: p.q.a[0], rule: p.q.r, level: p.level });
        }
      }
      if (mode === "sanft") a.revealed = true;
    }
    e.answer = { ok: e.ok, text: p.slots[e.slot], right: p.q.a[0] };
  }

  return run;
}

/** Hundredths as "12:41,07" (m:ss,hh), the way the HUD and the share text show it. */
export function fmtTime(sec) {
  const cs = Math.floor(sec * 100 + 1e-6);
  const m = Math.floor(cs / 6000);
  const ss = Math.floor((cs % 6000) / 100);
  const hh = cs % 100;
  return `${m}:${String(ss).padStart(2, "0")},${String(hh).padStart(2, "0")}`;
}

export const metres = (units) => Math.round(units / P.METER);
