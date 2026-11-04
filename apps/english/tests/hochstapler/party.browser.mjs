// Bruno sucht den Hochstapler, Party mode: a scripted 5-player game in a real browser, at
// 1280×800 (mouse) and 390×844 (touch). Checks: no word on any pass screen, the Hochstapler
// never twice in a row, every screen reached, no console errors. Screenshots go to OUT.
//   node tests/hochstapler/party.browser.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:4405";
const OUT = process.argv[3] || "docs/hochstapler-shots/tier1";
mkdirSync(OUT, { recursive: true });
const NAMES = ["Mila", "Tom", "Aylin", "Jonas", "Sara"];
const fail = (msg) => { console.error("FAIL", msg); process.exitCode = 1; };

async function run(viewport, touch, tag) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, reducedMotion: tag === "mobile" ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  const tap = (sel, force = false) => (touch ? page.tap(sel, { force }) : page.click(sel, { force }));
  await page.goto(`${BASE}/spiele/hochstapler`, { waitUntil: "networkidle" });
  await page.evaluate(() => { localStorage.removeItem("hst.party.setup"); sessionStorage.removeItem("hst.party"); });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/${tag}-01-start.png`, fullPage: true });
  await tap("[data-go-setup]");
  // Start before 3 players: says why, does nothing.
  await tap("[data-start]", true);
  if (!(await page.isVisible("[data-screen=setup]"))) fail(`${tag}: started with 0 players`);
  if ((await page.getAttribute("[data-start]", "aria-disabled")) !== "true") fail(`${tag}: start not marked waiting`);
  for (const n of NAMES) { await page.fill("[data-add] input", n); await page.press("[data-add] input", "Enter"); }
  await page.screenshot({ path: `${OUT}/${tag}-02-setup.png`, fullPage: true });

  const game = () => page.evaluate(() => document.getElementById("hst-party").hst.game);
  await tap("[data-start]");
  let lastImp = null;
  for (let round = 1; round <= 4; round++) {
    await page.waitForSelector("[data-screen=pass]:not([hidden])");
    const g = await game();
    const word = g.round.word.de;
    const imp = g.round.impostors[0];
    if (imp === lastImp) fail(`${tag}: Hochstapler twice in a row (${imp})`);
    lastImp = imp;
    if (g.round.order[0] === imp) fail(`${tag}: Hochstapler speaks first`);
    for (let i = 0; i < NAMES.length; i++) {
      await page.waitForSelector("[data-screen=pass]:not([hidden])");
      const text = await page.evaluate(() => document.getElementById("hst-party").innerText);
      const lemma = word.split(" ").pop();
      if (text.includes(lemma)) fail(`${tag}: word "${word}" visible on pass screen ${i}`);
      const html = await page.evaluate(() => document.querySelector("[data-secret-card]").innerHTML);
      if (html.trim()) fail(`${tag}: secret card not empty on pass screen`);
      if (round === 1 && i === 0) await page.screenshot({ path: `${OUT}/${tag}-03-pass.png` });
      await tap("[data-pass-go]");
      const card = await page.textContent("[data-secret-card]");
      const isImp = g.players[i].id === imp;
      if (isImp ? card.includes(lemma) : !card.includes(lemma)) fail(`${tag}: wrong secret for ${g.players[i].name}`);
      if (round === 1 && (isImp || i === 0)) await page.screenshot({ path: `${OUT}/${tag}-04-secret-${isImp ? "imp" : "word"}.png` });
      await tap("[data-hide]");
    }
    await page.waitForSelector("[data-screen=clues]:not([hidden])");
    if (round === 1) await page.screenshot({ path: `${OUT}/${tag}-05-clues.png`, fullPage: true });
    for (let i = 0; i < NAMES.length; i++) await tap("[data-next-turn]");
    await page.waitForSelector("[data-screen=discuss]:not([hidden])");
    await page.waitForTimeout(1200);
    if (round === 1) await page.screenshot({ path: `${OUT}/${tag}-06-discuss.png`, fullPage: true });
    await tap("[data-to-vote]");
    // Round 1 and 3: everyone votes the Hochstapler. Round 2: a tie. Round 4: all on someone else.
    const players = g.players;
    const innocent = players.find((p) => p.id !== imp).id;
    for (let i = 0; i < players.length; i++) {
      await page.waitForSelector("[data-screen=pass]:not([hidden])");
      await tap("[data-pass-go]");
      await page.waitForSelector("[data-screen=vote]:not([hidden])");
      let target = round === 4 ? innocent : round === 2 ? (i % 2 ? imp : innocent) : imp;
      if (target === players[i].id) target = players.find((p) => p.id !== players[i].id && p.id !== imp)?.id ?? target;
      if (round === 1 && i === 0) {
        await tap("[data-vote-ok]", true); // nothing picked: stays
        if (!(await page.isVisible("[data-screen=vote]"))) fail(`${tag}: vote without a pick`);
      }
      await tap(`[data-pick="${target}"]`);
      if (round === 1 && i === 0) await page.screenshot({ path: `${OUT}/${tag}-07-vote.png`, fullPage: true });
      await tap("[data-vote-ok]");
    }
    await page.waitForSelector("[data-reveal-next]:not([hidden])", { timeout: 8000 });
    if (round === 1) await page.screenshot({ path: `${OUT}/${tag}-08-reveal.png`, fullPage: true });
    const caught = (await game()).round.caught.length > 0;
    if ((round === 1 || round === 3) !== caught) fail(`${tag}: round ${round} caught=${caught}`);
    await tap("[data-reveal-next]");
    if (caught) {
      await page.waitForSelector("[data-screen=rescue]:not([hidden])");
      if (round === 1) await page.screenshot({ path: `${OUT}/${tag}-09-rescue.png`, fullPage: true });
      const n = await page.locator("[data-guess]").count();
      if (n !== 6) fail(`${tag}: ${n} rescue options`);
      const right = (await game()).round.word.id;
      const pick = round === 1 ? await page.getAttribute(`[data-guess]:not([data-guess="${right}"])`, "data-guess") : right;
      await tap(`[data-guess="${pick}"]`);
    }
    await page.waitForSelector("[data-screen=score]:not([hidden])");
    const after = await game();
    const winner = after.round.result.winner;
    const expect = round === 1 ? "gruppe" : "hochstapler";
    if (winner !== expect) fail(`${tag}: round ${round} winner ${winner}, expected ${expect}`);
    if (round === 1) await page.screenshot({ path: `${OUT}/${tag}-10-score.png`, fullPage: true });
    if (round === 2) {
      // A reload mid-game keeps the game.
      await page.reload({ waitUntil: "networkidle" });
      if (!(await page.isVisible("[data-screen=score]"))) fail(`${tag}: reload lost the score screen`);
    }
    if (round < 4) await tap("[data-next-round]");
  }
  await tap("[data-end]");
  await page.waitForSelector("[data-screen=end]:not([hidden])");
  await page.screenshot({ path: `${OUT}/${tag}-11-end.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) fail(`${tag}: horizontal overflow`);
  if (errors.length) fail(`${tag}: console errors:\n  ${errors.join("\n  ")}`);
  await browser.close();
  console.log(`${tag}: done`);
}

await run({ width: 1280, height: 800 }, false, "desktop");
await run({ width: 390, height: 844 }, true, "mobile");
if (!process.exitCode) console.log("PASS");
