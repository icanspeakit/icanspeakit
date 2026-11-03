// Hamstis Nussnacht: headless checks of the simulation (src/lib/nussnacht/sim.js).
//   node scripts/nussnacht-sim-test.mjs [--minutes 3] [--level A1] [--runs 1]
// 1. Replay: the same seed and the same inputs give the same run (checksum per tick).
// 2. Bot: a simple bot that switches to the article of the nearest creature and walks away
//    from the crowd. Prints how long it survives.
import { createSim, DT, EV } from "../src/lib/nussnacht/sim.js";
import { woerterFuer } from "../src/lib/nussnacht/woerter.js";
import { bosseFuer } from "../src/lib/nussnacht/bosse.js";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const level = arg("level", "A1");
const minutes = Number(arg("minutes", 3));
const runs = Number(arg("runs", 1));
const skill = Number(arg("skill", 0.9)); // chance per decision that the bot reads the word right

const { words, low } = woerterFuer(level);
const { bosse } = bosseFuer(level);

/** The bot: every 0.25 s it picks the nearest creature's article (wrong with 1-skill), moves
 *  away from the weighted crowd, takes the first upgrade and uses the skill when ready. */
function bot(S, r) {
  let art = 0, mx = 0, my = 0, next = 0;
  return () => {
    if (S.state === "choice") return { mx: 0, my: 0, art, skill: false, pick: 0 };
    if (S.tick >= next) {
      next = S.tick + 15;
      let best = null, bd = Infinity, fx = 0, fy = 0;
      for (const c of S.cre) {
        if (!c.alive) continue;
        const dx = c.x - S.hx, dy = c.y - S.hy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = c; }
        const w = 1 / Math.max(400, d2);
        fx -= dx * w; fy -= dy * w;
      }
      if (best) art = r() < skill ? best.art : (best.art + 1 + Math.floor(r() * 2)) % 3;
      const l = Math.hypot(fx, fy);
      // circle around a little so the bot does not run into the next wave head-on
      if (l > 0) { mx = fx / l * 0.8 + -fy / l * 0.6; my = fy / l * 0.8 + fx / l * 0.6; }
      const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    }
    return { mx: Math.round(mx * 64) / 64, my: Math.round(my * 64) / 64, art, skill: S.skill >= 30, pick: -1 };
  };
}

function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function play(seed, inputs) {
  const sim = createSim({ seed, words, low, bosse, level });
  const { S } = sim;
  const rec = [];
  const sums = [];
  const get = inputs ? (k) => inputs[k] : bot(S, rngFrom(seed ^ 77));
  const maxTicks = minutes * 60 * 60;
  let k = 0;
  const t0 = performance.now();
  while ((S.state === "play" || S.state === "choice") && S.tick < maxTicks) {
    const inp = get(k++);
    if (!inp) break;
    rec.push(inp);
    sim.step(inp);
    if (S.tick % 60 === 0) sums.push(`${S.tick}:${S.hx.toFixed(6)},${S.hy.toFixed(6)},${S.hp},${S.kills},${S.creN},${S.xp}`);
  }
  return { S, rec, sums, ms: performance.now() - t0 };
}

let fails = 0;
// 1. replay
{
  const a = play(12345);
  const b = play(12345, a.rec);
  const same = a.sums.length === b.sums.length && a.sums.every((x, i) => x === b.sums[i]);
  console.log(`replay ${level}: ${same ? "identisch" : "ABWEICHUNG"} (${a.sums.length} Sekunden verglichen)`);
  if (!same) fails++;
}
// 2. bot runs
const times = [];
for (let r = 0; r < runs; r++) {
  const seed = 1000 + r * 7919;
  const { S, ms } = play(seed);
  times.push(S.t);
  console.log(`bot ${level} seed ${seed}: ${S.state} nach ${Math.floor(S.t / 60)}:${String(Math.floor(S.t % 60)).padStart(2, "0")} · Kills ${S.kills} · richtig ${S.right} falsch ${S.wrong} · Level ${S.plv} · HP ${Math.round(S.hp)} · Kreaturen ${S.creN} · ${Math.round(ms)} ms`);
}
if (process.argv.includes("--assert-survive")) {
  const need = minutes * 60 - 1;
  if (times.some((t) => t < need)) { console.log(`FEHLER: Bot überlebt nicht ${minutes} min`); fails++; }
}
process.exit(fails ? 1 : 0);
