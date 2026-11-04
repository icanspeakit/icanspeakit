// Quaki springt: browser checks against a running dev server.
//
//   node tests/quaki-springt/browser.mjs [base=http://localhost:4404] [shots-dir]
//
// Desktop 1280×800 (keyboard) and phone 390×844 (touch). Fails on any console error.
// Screenshots go to the shots dir (default docs/quaki-springt/shots, not committed).
import { chromium } from "@playwright/test";
import fs from "node:fs";

const base = process.argv[2] || "http://localhost:4404";
const shots = process.argv[3] || "docs/quaki-springt/shots";
fs.mkdirSync(shots, { recursive: true });
const url = `${base}/spiele/quaki-springt`;
const results = [];
const ok = (name, pass, info = "") => { results.push({ name, pass }); console.log(`${pass ? "✓" : "✗"} ${name}${info ? ` – ${info}` : ""}`); };

const browser = await chromium.launch();
async function page(opts) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() => window.__qs);
  return { p, errors, ctx };
}

// ---- desktop ----------------------------------------------------------------------
{
  const { p, errors, ctx } = await page({ viewport: { width: 1280, height: 800 } });
  await p.screenshot({ path: `${shots}/desktop-start.png` });

  // Same input log, two runs → same end position.
  const det = await p.evaluate(() => {
    const { world, fragen, createRun } = window.__qs;
    const log = [];
    let t = 1;
    // a fixed little dance: hops left, right, up with different charges
    for (const [bits, hold, wait] of [[5, 40, 150], [3, 70, 160], [1, 108, 200], [5, 20, 120], [3, 90, 200], [1, 55, 180]]) {
      log.push([t, bits], [t + hold, 0]);
      t += hold + wait;
    }
    const play = () => {
      const r = createRun({ world, fragen, seed: 4242, mode: "wut" });
      let i = 0;
      while (r.s.tick < t) {
        while (i < log.length && log[i][0] <= r.s.tick + 1) r.input(log[i++][1]);
        r.step();
      }
      return [r.s.x, r.s.y, r.s.jumps, r.s.tick];
    };
    return [play(), play()];
  });
  ok("gleiches Eingabeprotokoll → gleiche Endposition", JSON.stringify(det[0]) === JSON.stringify(det[1]), JSON.stringify(det[0]));

  // Keyboard: hold space with → for 0.4 s, release → a jump to the right.
  await p.click("[data-start-sanft]");
  await p.waitForTimeout(200);
  const x0 = await p.evaluate(() => window.__qs.run.s.x);
  await p.keyboard.down("ArrowRight");
  await p.keyboard.down("Space");
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${shots}/desktop-charge.png` });
  await p.keyboard.up("Space");
  await p.keyboard.up("ArrowRight");
  await p.waitForTimeout(900);
  const kb = await p.evaluate(() => ({ x: window.__qs.run.s.x, jumps: window.__qs.run.s.jumps }));
  ok("Tastatur: Leertaste + → springt nach rechts", kb.jumps === 1 && kb.x > x0 + 20, `x ${x0.toFixed(0)} → ${kb.x.toFixed(0)}`);

  // A wrong pad sinks: put Quaki on the wrong pad of the first question.
  const sink = await p.evaluate(() => {
    const { run, world, P } = window.__qs;
    const room = world.pads[0].room;
    const plan = run.plan.get(room);
    const wrong = world.pads.find((pd) => pd.room === room && pd.slot !== plan.right);
    run.sim.place(wrong.c0 * P.TILE + 2, wrong.y - P.H);
    run.s.mode = "air"; run.s.vy = 10; // drop the last pixel so it lands
    run.s.takeoffY = run.s.y;
    const seen = [];
    for (let i = 0; i < 120; i++) for (const e of run.step()) seen.push(e.type);
    return { seen, y: run.s.y, padY: wrong.y, mode: run.s.mode, revealed: run.answers.get(room)?.revealed };
  });
  ok("falsche Seerose sinkt, Quaki fällt", sink.seen.includes("sink") && sink.y > sink.padY, `${sink.seen.filter((t) => t !== "charge").join(",")} · Sanft zeigt die Lösung: ${sink.revealed}`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${shots}/desktop-reveal.png` });

  // Sanft: a fall never ends below the last flag.
  const flag = await p.evaluate(() => {
    const { run, world, P } = window.__qs;
    const fi = world.flags.length - 1;
    const f = world.flags[fi];
    run.s.flag = fi;
    // in the air high above the flag, in a shaft: falls down to it
    run.sim.place(f.x - P.W / 2, f.y - P.H - 400);
    run.s.mode = "air";
    run.s.takeoffY = run.s.y;
    let maxY = 0;
    for (let i = 0; i < 600; i++) { run.step(); maxY = Math.max(maxY, run.s.y + P.H); }
    return { maxY, flagY: f.y, n: world.flags.length };
  });
  ok("Sanft: ein Sturz endet nie unter der Fahne", flag.maxY <= flag.flagY + 2 * 20 + 1, `tiefster Punkt ${flag.maxY.toFixed(0)}, Fahne ${flag.flagY} (${flag.n} Fahnen)`);

  // Route: replay the committed route (if there is one) in the page.
  const route = fs.existsSync("tests/quaki-springt/route.json") ? JSON.parse(fs.readFileSync("tests/quaki-springt/route.json", "utf8")) : null;
  if (route) {
    const r = await p.evaluate((route) => {
      const { world, fragen, createRun } = window.__qs;
      const run = createRun({ world, fragen, seed: route.seed, mode: route.sanft ? "sanft" : "wut" });
      let i = 0;
      while (run.s.tick < route.end + 600 && !run.s.won) {
        while (i < route.log.length && route.log[i][0] <= run.s.tick + 1) run.input(route.log[i++][1]);
        run.step();
      }
      return { won: run.s.won, t: run.seconds() };
    }, route);
    ok("Route im Browser nachgespielt: Ziel erreicht", r.won, `${r.t.toFixed(1)} s`);
  }
  ok("Desktop: keine Konsolenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- phone (touch) ------------------------------------------------------------------
{
  const { p, errors, ctx } = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await p.screenshot({ path: `${shots}/phone-start.png` });
  await p.tap("[data-start-sanft]");
  await p.waitForTimeout(300);
  const box = await p.locator("[data-stage]").boundingBox();
  const x0 = await p.evaluate(() => window.__qs.run.s.x);
  // Hold in the right third for 0.35 s (touch events via CDP).
  const cdp = await ctx.newCDPSession(p);
  const pt = { x: box.x + box.width * 0.85, y: box.y + box.height * 0.6 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
  await p.waitForTimeout(350);
  await p.screenshot({ path: `${shots}/phone-charge.png` });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(900);
  const t = await p.evaluate(() => ({ x: window.__qs.run.s.x, jumps: window.__qs.run.s.jumps }));
  ok("Touch 390×844: rechts halten + loslassen springt nach rechts", t.jumps === 1 && t.x > x0 + 20, `x ${x0.toFixed(0)} → ${t.x.toFixed(0)}`);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok("Handy: kein seitliches Scrollen", overflow <= 0, `${overflow}px`);
  await p.screenshot({ path: `${shots}/phone-play.png` });
  ok("Handy: keine Konsolenfehler", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass).length;
console.log(failed ? `${failed} Prüfung(en) fehlgeschlagen` : "alle Prüfungen bestanden");
process.exit(failed ? 1 : 0);
