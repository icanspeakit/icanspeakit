// Regis Satzregen: browser checks against a running dev server, desktop (1280×800, keys) and
// phone (390×844, touch). Each tier adds its checks; screenshots land in the folder given by
// --shots (default docs/satzregen-shots/, not committed).
//
//   node scripts/test-satzregen.mjs                       http://localhost:4403
//   node scripts/test-satzregen.mjs --url http://localhost:4391 --only tier1
//
// The page exposes its game as #satzregen.__sr (game.js); the tests read the state there
// and play with real key presses and taps.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = opt("--url", "http://localhost:4403");
const SHOTS = opt("--shots", "docs/satzregen-shots");
const ONLY = opt("--only", null);
mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) fails++;
};

async function open(browser, { w, h, touch = false, query = "" }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/spiele/satzregen${query}`, { waitUntil: "load", timeout: 240000 });
  await page.waitForFunction(() => document.querySelector("#satzregen")?.__sr, null, { timeout: 60000 });
  return { ctx, page, errors };
}

const state = (page) =>
  page.evaluate(() => {
    const g = document.querySelector("#satzregen").__sr.g;
    if (!g) return null;
    const E = document.querySelector("#satzregen").__sr.E;
    return {
      phase: g.phase,
      lines: g.lines,
      stones: g.stones.length,
      stonesTotal: g.stonesTotal,
      line: g.line && { id: g.line.s.id, c: g.line.s.c, slots: g.line.slots },
      falling: g.falling && { kind: g.falling.kind, chunk: g.falling.chunk, lane: g.falling.lane, drop: g.falling.drop },
      lupe: E.lupeSlot(g),
      score: g.score,
    };
  });

/** Wait until a chunk is falling and nothing is being shown. */
async function waitFalling(page) {
  await page.waitForFunction(() => {
    const g = document.querySelector("#satzregen").__sr.g;
    return g && (g.phase === "over" || (g.phase === "play" && g.falling && !g.falling.drop));
  }, null, { timeout: 30000 });
  return state(page);
}

/** Place the current line's chunks in `order` (chunk texts) with the keyboard. */
async function playLine(page, order) {
  for (;;) {
    const s = await waitFalling(page);
    if (s.phase === "over" || !s.line) return s;
    if (s.falling.kind === "radier") {
      await page.keyboard.press("Space");
      continue;
    }
    const text = s.line.c[s.falling.chunk];
    // the first empty slot whose wanted text is this chunk
    let target = order.findIndex((t, i) => t === text && s.line.slots[i] === null);
    if (target < 0) target = s.line.slots.findIndex((x) => x === null);
    let lane = s.falling.lane;
    while (lane !== target) {
      await page.keyboard.press(lane < target ? "ArrowRight" : "ArrowLeft");
      const n = await state(page);
      if (n.falling.lane === lane) break; // could not move (should not happen)
      lane = n.falling.lane;
    }
    const before = s.line.slots.filter((x) => x !== null).length;
    await page.keyboard.press("Space");
    if (before + 1 === s.line.c.length) {
      await page.waitForFunction(() => document.querySelector("#satzregen").__sr.g.phase !== "play", null, { timeout: 10000 });
      return state(page);
    }
  }
}

async function tier1(browser) {
  console.log("\n— Tier 1: Desktop 1280×800");
  const { ctx, page, errors } = await open(browser, { w: 1280, h: 800 });
  await page.screenshot({ path: path.join(SHOTS, "t1-start-desktop.png") });

  // 1. a correct line clears (canonical order)
  await page.evaluate(() => document.querySelector("#satzregen").__sr.start(1, ["v2-044"]));
  let s = await waitFalling(page);
  const canon = s.line.c;
  await page.screenshot({ path: path.join(SHOTS, "t1-falling-desktop.png") });
  s = await playLine(page, canon);
  ok(s.lines === 1 && s.stones === 0, `richtige Zeile verschwindet: „${canon.join(" / ")}“`);
  await page.screenshot({ path: path.join(SHOTS, "t1-clear-desktop.png") });

  // 2. a Vorfeld variant clears: "Morgen gehe ich zum Arzt."
  await page.evaluate(() => document.querySelector("#satzregen").__sr.start(2, ["v2-044"]));
  await waitFalling(page);
  s = await playLine(page, ["morgen", "gehe", "ich", "zum Arzt"]);
  ok(s.lines === 1 && s.stones === 0, "Vorfeld-Variante „Morgen gehe ich zum Arzt.“ wird angenommen");

  // 3. a wrong order becomes stone, the right order is shown
  await page.evaluate(() => document.querySelector("#satzregen").__sr.start(3, ["v2-044"]));
  await waitFalling(page);
  s = await playLine(page, ["ich", "morgen", "gehe", "zum Arzt"]);
  ok(s.stones === 1 && s.lines === 0, "falsche Reihenfolge wird zur Steinzeile");
  const shown = await page.locator("[data-show]").innerText();
  ok(/Ich gehe morgen zum Arzt\./.test(shown) && /Platz 2/.test(shown), `richtige Reihenfolge + Regel sichtbar: ${shown.replace(/\s+/g, " ")}`);
  ok((await page.locator(".sr-line.is-stone .is-wrong").count()) > 0, "falsche Kacheln rot markiert");
  await page.screenshot({ path: path.join(SHOTS, "t1-stone-desktop.png") });

  // 4. stack-out ends the game
  for (let i = 0; i < 30; i++) {
    s = await state(page);
    if (s.phase === "over") break;
    await waitFalling(page);
    s = await state(page);
    if (s.phase === "over") break;
    s = await playLine(page, [...s.line.c].reverse());
  }
  await page.waitForFunction(() => document.querySelector("#satzregen").dataset.phase === "end", null, { timeout: 15000 });
  ok(await page.locator("[data-end]").isVisible(), "Stapel oben → Spielende mit Ergebnis");
  ok((await page.locator("[data-tricky] li").count()) >= 1, "„Diese Sätze waren knifflig“ listet die Steinzeilen");
  await page.screenshot({ path: path.join(SHOTS, "t1-end-desktop.png"), fullPage: true });
  ok(errors.length === 0, `keine Konsolenfehler (Desktop)${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await ctx.close();

  console.log("\n— Tier 1: Handy 390×844 (Touch)");
  const m = await open(browser, { w: 390, h: 844, touch: true });
  await m.page.screenshot({ path: path.join(SHOTS, "t1-start-phone.png") });
  await m.page.locator("[data-go]").tap();
  s = await waitFalling(m.page);
  ok(s && s.phase === "play", "Start per Tippen");
  // tap the slot where the falling chunk belongs
  const target = s.lupe >= 0 ? s.lupe : 0;
  const box = await m.page.locator(".sr-line.is-active [data-slot]").nth(target).boundingBox();
  await m.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await m.page.waitForTimeout(600);
  const after = await state(m.page);
  ok(after.line && after.line.slots[target] === s.line.c[s.falling.chunk], `Tippen auf Platz ${target + 1}: Kachel „${s.line.c[s.falling.chunk]}“ landet dort`);
  await m.page.screenshot({ path: path.join(SHOTS, "t1-tap-phone.png") });
  // swipe down = hard drop
  s = await waitFalling(m.page);
  const b = await m.page.locator("[data-board]").boundingBox();
  await m.page.evaluate(({ x, y }) => {
    const el = document.querySelector("[data-board]");
    const ev = (type, yy) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: yy, bubbles: true, pointerType: "touch" }));
    ev("pointerdown", y);
    ev("pointerup", y + 120);
  }, { x: b.x + b.width / 2, y: b.y + 60 });
  const sw = await state(m.page);
  ok(!sw.falling || sw.falling.drop === "hard" || sw.line.slots.filter((x) => x !== null).length > s.line.slots.filter((x) => x !== null).length, "nach unten wischen = fallen lassen");
  const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(!overflow, "kein seitliches Scrollen bei 390 px");
  ok(m.errors.length === 0, `keine Konsolenfehler (Handy)${m.errors.length ? `: ${m.errors.join(" | ")}` : ""}`);
  await m.ctx.close();
}

const browser = await chromium.launch();
try {
  if (!ONLY || ONLY === "tier1") await tier1(browser);
} finally {
  await browser.close();
}
console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : "\nAlles grün");
process.exit(fails ? 1 : 0);
