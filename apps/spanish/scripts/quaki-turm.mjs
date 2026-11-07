// Quaki springt: proves the tower can be climbed and writes the route.
//
//   node scripts/quaki-turm.mjs                 search a route bottom → goal, print a room report
//   node scripts/quaki-turm.mjs --write         … and write tests/quaki-springt/route.json
//   node scripts/quaki-turm.mjs --check         replay tests/quaki-springt/route.json, exit 1 if it fails
//   node scripts/quaki-turm.mjs --seed 12345    which pads are right comes from this seed
//
// The search runs the game's own physics (src/lib/quakiSpringt/physics.js): from every spot
// Quaki can stand on it tries every direction × charge, keeps where he lands, and always
// expands the highest spot first. It is a proof that each room can be cleared, not the
// fastest route.
import fs from "node:fs";
import { P, buildWorld, createSim, replay } from "../src/lib/quakiSpringt/physics.js";
import { assignQuestions, padIsRight } from "../src/lib/quakiSpringt/questions.js";

const turm = JSON.parse(fs.readFileSync(new URL("../src/data/quakiSpringt/turm.json", import.meta.url)));
const fragen = JSON.parse(fs.readFileSync(new URL("../src/data/quakiSpringt/fragen.json", import.meta.url)));
const ROUTE = new URL("../tests/quaki-springt/route.json", import.meta.url);
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const seedArg = args.indexOf("--seed");
const seed = seedArg >= 0 ? Number(args[seedArg + 1]) >>> 0 : 20261028;

const world = buildWorld(turm);
const plan = assignQuestions(world, fragen, seed);
const correct = (room, slot) => padIsRight(plan, room, slot);

const CHARGES = [];
for (let n = 0; n <= P.CHARGE_MAX; n += 3) CHARGES.push(n);
if (CHARGES.at(-1) !== P.CHARGE_MAX) CHARGES.push(P.CHARGE_MAX);
const BITS = { "-1": 2, 0: 0, 1: 4 };
const SETTLE = P.SINK_DELAY + 8; // stand this long on a pad to know it holds

/** One jump from a standing spot: where he ends up, and after how many ticks. */
function tryJump(x, y, dir, n) {
  const sim = createSim(world, { correct });
  sim.place(x, y);
  const s = sim.s;
  sim.setInput(1 | BITS[dir]);
  for (let i = 0; i <= n && s.mode === "ground" && s.charge < P.CHARGE_MAX; i++) sim.step();
  sim.setInput(0);
  let still = 0;
  for (let i = 0; i < 1500; i++) {
    sim.step();
    if (s.won) return { x: s.x, y: s.y, ticks: s.tick, won: true };
    if (s.mode === "ground") { if (++still > SETTLE) return { x: s.x, y: s.y, ticks: s.tick }; }
    else still = 0;
  }
  return null;
}

function search() {
  const start = createSim(world, { correct }).s;
  const key = (x, y) => `${Math.round(x * 2)}:${Math.round(y)}`;
  const seen = new Map([[key(start.x, start.y), { x: start.x, y: start.y, prev: null }]]);
  const open = [seen.get(key(start.x, start.y))];
  let best = open[0];
  let expanded = 0;
  while (open.length) {
    // highest (smallest y) first
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].y < open[bi].y) bi = i;
    const node = open.splice(bi, 1)[0];
    expanded++;
    if (node.y < best.y) best = node;
    for (const dir of [-1, 0, 1]) {
      for (const n of CHARGES) {
        const r = tryJump(node.x, node.y, dir, n);
        if (!r) continue;
        const k = key(r.x, r.y);
        if (seen.has(k)) continue;
        const next = { x: r.x, y: r.y, prev: node, act: { dir, n, ticks: r.ticks } };
        seen.set(k, next);
        if (r.won) return { goal: next, expanded, seen };
        open.push(next);
      }
    }
  }
  return { goal: null, best, expanded, seen };
}

/** The actions along the path → an input log for replay(). */
function toLog(goal) {
  const acts = [];
  for (let n = goal; n.prev; n = n.prev) acts.unshift(n.act);
  const log = [];
  let t = 1;
  for (const a of acts) {
    log.push([t, 1 | BITS[a.dir]]);
    log.push([t + a.n + 1, 0]);
    t += a.ticks;
  }
  return { log, acts, end: t };
}

function report(seen) {
  // Highest spot reached per room.
  const rooms = new Map();
  for (const v of seen.values()) {
    const room = world.rooms.length - 1 - Math.floor((v.y + P.H / 2) / P.ROOM_H);
    rooms.set(room, Math.min(rooms.get(room) ?? Infinity, v.y));
  }
  for (const r of world.rooms) {
    const top = r.y;
    const hi = rooms.get(r.global);
    const lv = turm.levels[r.level].id;
    console.log(`${lv} Raum ${r.index + 1}: ${hi === undefined ? "nicht erreicht" : `höchster Stand ${((top + P.ROOM_H - hi - P.H) / P.TILE).toFixed(1)} Kacheln über dem Boden`}`);
  }
}

if (flag("--check")) {
  const route = JSON.parse(fs.readFileSync(ROUTE));
  const w = buildWorld(turm);
  const p = assignQuestions(w, fragen, route.seed);
  const sim = createSim(w, { correct: (room, slot) => padIsRight(p, room, slot), sanft: route.sanft });
  replay(sim, route.log, route.end + 600);
  const ok = sim.s.won && Math.round(sim.s.x) === route.x && Math.round(sim.s.y) === route.y;
  console.log(ok ? `Route ok: Ziel nach ${(sim.s.tick / 120).toFixed(2)} s, ${sim.s.jumps} Sprünge` : `Route kaputt: steht bei x=${sim.s.x.toFixed(1)} y=${sim.s.y.toFixed(1)}, Höhe ${sim.height().toFixed(1)} m`);
  process.exit(ok ? 0 : 1);
}

const t0 = Date.now();
const res = search();
console.log(`${res.expanded} Standplätze geprüft in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!res.goal) {
  report(res.seen);
  console.log("KEIN WEG ZUM ZIEL");
  process.exit(1);
}
const { log, acts, end } = toLog(res.goal);
// Replay the whole log in one sim: the route only counts if that reaches the goal too.
const sim = createSim(world, { correct });
replay(sim, log, end + 600);
console.log(`Weg gefunden: ${acts.length} Sprünge, ${(end / 120).toFixed(1)} s Spielzeit · Nachspielen: ${sim.s.won ? "Ziel erreicht" : "NICHT im Ziel"}`);
if (flag("--report")) report(res.seen);
if (flag("--write") && sim.s.won) {
  fs.mkdirSync(new URL(".", ROUTE), { recursive: true });
  const out = { seed, sanft: false, end: sim.s.tick, x: Math.round(sim.s.x), y: Math.round(sim.s.y), jumps: acts.length, log };
  fs.writeFileSync(ROUTE, JSON.stringify(out) + "\n");
  console.log("geschrieben:", ROUTE.pathname);
}
if (!sim.s.won) process.exit(1);
