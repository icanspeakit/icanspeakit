// „Für dich": the pronunciation drills by first language, wired up in the browser —
// src/components/AusspracheFuerDich.astro renders them, on /culture/mistakes (under each
// language) and in the Aussprache-Check (the „Für dich" section). Was ausspracheDrills.js,
// which only served /culture/mistakes.
//
// Three things per drill:
//   [data-say]        a word or sentence to hear — the pre-made Azure mp3, the browser's
//                     German voice if the file is missing
//   [data-hoertest]   "Welches Wort hörst du?": plays one word of a minimal pair, five rounds
//   [data-record]     reads the drill sentence into the microphone, scores every word with the
//                     Aussprache-Check's provider and helpers, and shows the findings for the
//                     learner's first language (src/lib/aussprachePatterns.js)
import { pronunciationProvider as provider, PronunciationError } from "./pronunciation/index.ts";
import { checkMicrophone, alignWords, MSG } from "./ausspracheCheck.js";
import { findingsFor, findingsHtml, insertionsOf, esc, t } from "./aussprachePatterns.js";
import { DRILL_AUDIO_DIR, drillSlug } from "./drillAudio.js";
import { withBase } from "./paths.js";

const LANG = "en-GB";
const ROUNDS = 5;
const band = (s) => (s >= 80 ? "good" : s >= 60 ? "ok" : "bad");

/* ---------------------------------------------------------------- hearing ---- */
let current = null;
function browserSpeak(text) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG;
    u.rate = 0.85;
    const voices = synth.getVoices();
    const en = voices.find((v) => v.lang?.replace("_", "-") === "en-GB") ?? voices.find((v) => v.lang?.startsWith("en"));
    if (en) u.voice = en;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
  });
}

export async function say(text) {
  current?.pause();
  window.speechSynthesis?.cancel();
  const a = new Audio(withBase(`${DRILL_AUDIO_DIR}/${drillSlug(text)}.mp3`));
  current = a;
  try {
    await a.play();
    await new Promise((r) => { a.onended = r; a.onerror = r; });
  } catch {
    await browserSpeak(text);
  }
}

/* --------------------------------------------------------------- Hörtest ---- */
function mountHoertest(root) {
  const pairs = JSON.parse(root.dataset.hoertest);
  const box = root.querySelector("[data-hoertest-box]");
  const start = root.querySelector("[data-hoertest-start]");
  let round = 0, right = 0, target = null;

  function next() {
    if (round === ROUNDS) {
      box.innerHTML = `<p class="md-ht-result">${esc(t("af.ht.result", "{n} von {total} richtig", { n: right, total: ROUNDS }))}${right === ROUNDS ? esc(t("af.ht.perfect", " — sehr gut!")) : ""}</p>`;
      start.textContent = t("af.ht.again", "Noch einmal");
      start.hidden = false;
      return;
    }
    round += 1;
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    target = pair[Math.random() < 0.5 ? 0 : 1];
    const options = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    box.innerHTML = `
      <p class="md-ht-q">${esc(t("af.ht.round", "Runde {n} / {total} · Welches Wort hörst du?", { n: round, total: ROUNDS }))}
        <button type="button" class="md-say md-say--icon" data-replay aria-label="${esc(t("af.ht.replay", "Noch einmal hören"))}">▶</button></p>
      <div class="md-ht-options">${options.map((w) => `<button type="button" class="md-ht-opt" data-pick="${esc(w)}">${esc(w)}</button>`).join("")}</div>`;
    box.querySelector("[data-replay]").addEventListener("click", () => say(target));
    for (const b of box.querySelectorAll("[data-pick]")) {
      b.addEventListener("click", () => {
        const ok = b.dataset.pick === target;
        if (ok) right += 1;
        for (const o of box.querySelectorAll("[data-pick]")) {
          o.disabled = true;
          if (o.dataset.pick === target) o.classList.add("is-right");
          else if (o === b) o.classList.add("is-wrong");
        }
        setTimeout(next, ok ? 700 : 1400);
      });
    }
    say(target);
  }

  start.addEventListener("click", () => {
    round = 0; right = 0;
    start.hidden = true;
    next();
  });
}

/* ------------------------------------------------------------ Nachsprechen ---- */

/**
 * One take of `sentence`: microphone check, the provider's assessment, words lined up with the
 * sentence. The same steps as the Aussprache-Check's own recorder, from the same helpers.
 */
export async function recordTake(sentence, { onListening, onRetry } = {}) {
  const stream = await checkMicrophone();
  try {
    const assessment = await provider.assess({ referenceText: sentence, language: LANG, onListening, onRetry });
    const words = alignWords(sentence, assessment);
    if (!words.some((w) => w.error !== "omission")) throw new PronunciationError("wrongText");
    return { assessment, words, inserted: insertionsOf(assessment) };
  } finally {
    stream?.getTracks().forEach((tr) => tr.stop());
  }
}

function mountRecord(root, ctx) {
  const sentence = root.dataset.record;
  const drill = root.dataset.recordDrill;
  const btn = root.querySelector("[data-record-btn]");
  const label = btn.querySelector("span");
  const status = root.querySelector("[data-record-status]");
  const out = root.querySelector("[data-record-words]");
  const findingsBox = root.querySelector("[data-record-findings]");
  let busy = false;

  btn.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    label.textContent = t("af.rec.wait", "Moment …");
    status.textContent = "";
    status.dataset.kind = "";
    findingsBox.innerHTML = "";
    try {
      const { assessment, words, inserted } = await recordTake(sentence, {
        onListening: () => { label.textContent = t("af.rec.listening", "Ich höre zu …"); status.textContent = MSG.listening; },
        onRetry: () => { status.textContent = MSG.retrying; },
      });
      out.innerHTML = words.map((w) => `<span class="md-w md-w--${w.error === "omission" ? "bad" : band(w.score)}">${esc(w.display)}</span>`).join(" ");
      out.hidden = false;
      const overall = Math.round(assessment.overall);
      status.textContent = t(
        overall >= 80 ? "af.rec.good" : overall >= 60 ? "af.rec.ok" : "af.rec.bad",
        overall >= 80 ? "{n} von 100 — klingt gut!" : overall >= 60 ? "{n} von 100 — fast. Hör dir die roten Wörter noch einmal an." : "{n} von 100 — hör dir den Satz noch einmal an und versuch es wieder.",
        { n: overall },
      );
      status.dataset.kind = band(overall);
      const lang = ctx.lang();
      const findings = findingsFor({ words, assessment, inserted, lang, info: ctx.info });
      // „Jetzt üben" for the drill already open would point at itself.
      findingsBox.innerHTML = findingsHtml(findings, { lang, info: ctx.info, practice: findings.some((f) => f.drillId !== drill), why: ctx.why });
      for (const a of findingsBox.querySelectorAll("[data-practice]")) {
        if (a.dataset.practice === drill) a.remove();
      }
      ctx.onFindings?.(findingsBox);
    } catch (err) {
      if (!(err instanceof PronunciationError)) console.error(err);
      const code = err instanceof PronunciationError ? err.code : "failed";
      status.textContent = MSG[code] ?? MSG.failed;
      status.dataset.kind = "error";
      root.querySelector("[data-record-login]").hidden = code !== "auth";
    } finally {
      busy = false;
      btn.disabled = false;
      label.textContent = t("af.rec.again", "Noch einmal");
    }
  });
}

/**
 * Wire up every „Für dich" block under `scope`.
 *   info     the first-language data (src/lib/mutterspracheData.ts), embedded by the page
 *   lang()   the learner's first language for findings; a block with data-af-lang uses its own
 *   why      show „Warum passiert das?" links (false on /culture/mistakes, where the reason is on screen)
 *   onFindings(box)  called after findings render, for the page to intercept links
 */
export function mountFuerDich(scope, { info, lang = () => null, why = true, onFindings } = {}) {
  for (const b of scope.querySelectorAll("[data-say]")) b.addEventListener("click", () => say(b.dataset.say));
  for (const r of scope.querySelectorAll("[data-hoertest]")) mountHoertest(r);
  for (const block of scope.querySelectorAll("[data-fuer-dich]")) {
    const own = block.dataset.afLang;
    for (const r of block.querySelectorAll("[data-record]")) {
      mountRecord(r, { info, lang: () => own || lang(), why, onFindings });
    }
  }
}

/**
 * The Check's „Für dich" (lang="*"): show only `lang`'s drills, in its order. Returns the
 * number shown.
 */
export function showDrillsFor(block, info, lang) {
  const ids = (lang && info.drills[lang]) || [];
  for (const d of block.querySelectorAll("[data-drill-id]")) {
    const at = ids.indexOf(d.dataset.drillId);
    d.hidden = at === -1;
    d.style.order = String(at);
  }
  return ids.length;
}

/** Open one drill, scroll it into view and let it light up once. */
export function openDrill(block, id) {
  const d = block.querySelector(`[data-drill-id="${CSS.escape(id)}"]`);
  if (!d || d.hidden) return false;
  d.open = true;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  d.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  d.classList.remove("is-flash");
  void d.offsetWidth;
  d.classList.add("is-flash");
  d.querySelector("summary")?.focus({ preventScroll: true });
  return true;
}
