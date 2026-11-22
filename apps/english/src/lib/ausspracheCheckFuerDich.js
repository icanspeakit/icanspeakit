// The Aussprache-Check's first-language layer, next to its sentence recorder
// (src/lib/ausspracheCheck.js):
//
//   picker      „Deine Muttersprache" — the shared setting (src/lib/muttersprache.js); the
//               tab on /culture/mistakes follows it, and it follows that tab
//   Für dich    the drills for that language (<AusspracheFuerDich lang="*">); ?drill=<id>
//               opens one and scrolls to it
//   native tip  in the result card, the findings for that language replace the generic tip,
//               with „Jetzt üben →" (opens the drill below) and „Warum passiert das? →"
//               (/culture/mistakes?lang=<id>#<mistake>)
//   live        a short text read in one go, each sentence scored and coloured as its result
//               arrives, at most 60 s, one session at a time
import { pronunciationProvider as provider, PronunciationError } from "./pronunciation/index.ts";
import { checkMicrophone, MSG } from "./ausspracheCheck.js";
import { findingsFor, findingsHtml, langName, esc, t, onDict } from "./aussprachePatterns.js";
import { mountFuerDich, showDrillsFor, openDrill } from "./ausspracheFuerDich.js";
import { mutterspracheFromUrl, setMuttersprache, onMutterspracheChange, syncMutterspracheFromAccount } from "./muttersprache.js";
import { currentPath, BASE_PATH } from "./paths.js";

const LIVE_MS = 60_000;
const LIVE_SENTENCES = 3;
const band = (s) => (s >= 80 ? "good" : s >= 60 ? "ok" : "bad");
const norm = (w) => w.toLowerCase().replace(/[^a-zäöüß0-9]/g, "");

/**
 * Wire the first-language layer. Returns `nativeTip` for mountAusspracheCheck's data.
 * `levels` are the Check's sentences, `info` the first-language data.
 */
export function mountCheckFuerDich(root, { info, levels }) {
  const known = info.languages.map((l) => l.id);
  const $ = (s) => root.querySelector(s);
  const picker = $("[data-muttersprache]");
  const fuer = $("[data-fuer-dich]");
  const fuerHead = $("[data-fuer-head]");
  const fuerEmpty = $("[data-fuer-empty]");
  const more = $("[data-more-fehler]");
  let lang = mutterspracheFromUrl(known);

  /* ------------------------------------------------------------ language ---- */
  function paint() {
    if (picker) picker.value = lang ?? "";
    const n = fuer ? showDrillsFor(fuer, info, lang) : 0;
    if (fuer) fuer.hidden = !n;
    if (fuerEmpty) fuerEmpty.hidden = !!n;
    if (fuerHead) fuerHead.textContent = lang ? t("ac.fuer.titleLang", "Für dich: {lang}", { lang: langName(info, lang) }) : t("ac.fuer.title", "Für dich");
    if (more) {
      more.hidden = !lang;
      if (lang) {
        more.href = `${BASE_PATH}/culture/mistakes?lang=${encodeURIComponent(lang)}#${encodeURIComponent(lang)}`;
        more.textContent = t("ac.moreFehler", "Weitere typische Fehler für {lang}-Sprecher", { lang: langName(info, lang) });
      }
    }
  }
  picker?.addEventListener("change", () => {
    lang = picker.value || null;
    setMuttersprache(lang);
    const q = new URLSearchParams(location.search);
    q.delete("drill");
    if (lang) q.set("lang", lang);
    else q.delete("lang");
    const qs = q.toString();
    history.replaceState(null, "", `${currentPath()}${qs ? `?${qs}` : ""}${location.hash}`);
    paint();
  });
  onMutterspracheChange((id) => {
    lang = id && known.includes(id) ? id : null;
    paint();
  });
  syncMutterspracheFromAccount();
  paint();
  onDict(paint);

  /* ------------------------------------------------------------- drills ---- */
  // A „Jetzt üben" link for a drill that is right here opens it instead of reloading.
  function catchPractice(box) {
    for (const a of box.querySelectorAll("[data-practice]")) {
      a.addEventListener("click", (e) => {
        if (!fuer || !openDrill(fuer, a.dataset.practice)) return;
        e.preventDefault();
        const q = new URLSearchParams(location.search);
        q.set("drill", a.dataset.practice);
        if (lang) q.set("lang", lang);
        history.replaceState(null, "", `${currentPath()}?${q}`);
      });
    }
  }
  if (fuer) {
    mountFuerDich(root, { info, lang: () => lang, onFindings: catchPractice });
    let drill = new URLSearchParams(location.search).get("drill");
    // After load: the page above has to be in place for the scroll to land right. If the
    // language only arrives later (account sync), the drill is shown then, and opened then.
    if (drill) {
      const go = () => { if (openDrill(fuer, drill)) drill = null; };
      if (document.readyState === "complete") setTimeout(go, 0);
      else addEventListener("load", go, { once: true });
      onMutterspracheChange(() => { if (drill && document.readyState === "complete") setTimeout(go, 0); });
    }
  }

  /* --------------------------------------------------------- native tip ---- */
  function nativeTip({ words, assessment }) {
    const findings = findingsFor({ words, assessment, lang, info });
    if (!findings.length) return null;
    setTimeout(() => catchPractice(root.querySelector("[data-tip]") ?? root), 0);
    return { html: findingsHtml(findings, { lang, info }), words: findings.map((f) => f.word) };
  }

  mountLive(root, { info, levels, lang: () => lang, catchPractice });
  return { nativeTip };
}

/* =================================================================== live ==== */

function mountLive(root, { info, levels, lang, catchPractice }) {
  const $ = (s) => root.querySelector(s);
  const tabs = [...root.querySelectorAll("[data-mode]")];
  const card = $("[data-card]");
  const live = $("[data-live]");
  if (!live || !tabs.length) return;
  const textBox = live.querySelector("[data-live-text]");
  const heard = live.querySelector("[data-live-heard]");
  const startBtn = live.querySelector("[data-live-start]");
  const startLabel = live.querySelector("[data-live-label]");
  const timerEl = live.querySelector("[data-live-timer]");
  const status = live.querySelector("[data-live-status]");
  const out = live.querySelector("[data-live-findings]");

  if (!provider.assessLive) {
    tabs.find((b) => b.dataset.mode === "live")?.remove();
    return;
  }

  let session = null;
  let ref = [];
  let sentences = [];

  function setMode(mode, message) {
    if (mode !== "live") session?.stop();
    for (const b of tabs) b.setAttribute("aria-selected", String(b.dataset.mode === mode));
    card.hidden = mode === "live";
    live.hidden = mode !== "live";
    if (mode === "live") prepare();
    if (message) {
      const s = root.querySelector("[data-status]");
      if (s) { s.textContent = message; s.dataset.kind = "error"; }
    }
  }
  for (const b of tabs) b.addEventListener("click", () => setMode(b.dataset.mode));

  /* The text: the sentence the Check is on and the next two of the same level. */
  function prepare() {
    let pos = {};
    try { pos = JSON.parse(localStorage.getItem("ac.pos") || "{}"); } catch {}
    const level = levels.find((l) => l.level === pos.level) ?? levels[0];
    const from = Math.min(pos.index ?? 0, level.sentences.length - 1);
    sentences = Array.from({ length: Math.min(LIVE_SENTENCES, level.sentences.length) }, (_, k) => level.sentences[(from + k) % level.sentences.length]);
    ref = sentences.flatMap((s, si) => s.text.split(/\s+/).map((display) => ({
      display, word: display.replace(/[.,!?;:„“"]/g, ""), si, score: null, error: null, phonemes: [],
    })));
    textBox.innerHTML = sentences
      .map((s, si) => `<p class="ac-live-s" data-live-s="${si}">${ref.map((w, k) => (w.si === si ? `<span class="ac-live-w" data-k="${k}">${esc(w.display)}</span>` : "")).join(" ")}</p>`)
      .join("");
    heard.textContent = "";
    out.innerHTML = "";
    status.textContent = t("ac.live.ready", "Tippe auf „Live starten“ und lies den ganzen Text in einem Zug.");
    status.dataset.kind = "";
    timerEl.textContent = "";
  }

  /* Heard words are matched to the text in order; a word the learner skipped stays open
     until the sentence is done, then counts as not heard. */
  let cursor = 0;
  let inserted = [];
  let doneSentences = new Set();

  function applySegment(assessment) {
    for (const w of assessment.words) {
      const n = norm(w.word);
      let k = -1;
      for (let j = cursor; j < Math.min(ref.length, cursor + 5); j++) if (norm(ref[j].word) === n) { k = j; break; }
      if (k === -1) {
        if (cursor < ref.length) inserted.push({ at: cursor, word: w.word });
        continue;
      }
      for (let j = cursor; j < k; j++) if (ref[j].score == null) Object.assign(ref[j], { score: 0, error: "omission" });
      Object.assign(ref[k], { score: w.score, error: w.error === "insertion" ? "none" : w.error, phonemes: w.phonemes });
      paintWord(k);
      cursor = k + 1;
    }
    for (let si = 0; si < sentences.length; si++) {
      const last = ref.findLastIndex((w) => w.si === si);
      if (!doneSentences.has(si) && cursor > last) finishSentence(si);
    }
  }

  function paintWord(k) {
    const el = textBox.querySelector(`[data-k="${k}"]`);
    const w = ref[k];
    if (el) el.className = `ac-live-w ac-live-w--${w.error === "omission" ? "omit" : band(w.score)}`;
  }

  function finishSentence(si) {
    doneSentences.add(si);
    const idx = ref.map((w, k) => (w.si === si ? k : -1)).filter((k) => k >= 0);
    for (const k of idx) if (ref[k].score == null) { Object.assign(ref[k], { score: 0, error: "omission" }); paintWord(k); }
    const words = idx.map((k) => ref[k]);
    const said = words.filter((w) => w.error !== "omission");
    const avg = said.length ? Math.round(said.reduce((a, w) => a + w.score, 0) / said.length) : 0;
    const p = textBox.querySelector(`[data-live-s="${si}"]`);
    if (p) p.dataset.band = said.length ? band(avg) : "omit";
    const first = idx[0];
    const localIns = inserted.filter((x) => x.at >= first && x.at <= idx[idx.length - 1] + 1).map((x) => ({ before: x.at - first, word: x.word }));
    const findings = findingsFor({ words, inserted: localIns, lang: lang(), info, max: 1 });
    if (findings.length) {
      const box = document.createElement("div");
      box.innerHTML = findingsHtml(findings, { lang: lang(), info });
      out.append(box);
      catchPractice(box);
    }
  }

  startBtn.addEventListener("click", async () => {
    if (session) { session.stop(); return; }
    prepare();
    cursor = 0; inserted = []; doneSentences = new Set();
    startBtn.disabled = true;
    startLabel.textContent = t("ac.live.wait", "Moment …");
    status.textContent = MSG.preparing;
    let left = LIVE_MS / 1000;
    let tick = null;
    try {
      const stream = await checkMicrophone();
      stream?.getTracks().forEach((tr) => tr.stop());
      session = await provider.assessLive({
        referenceText: sentences.map((s) => s.text).join(" "),
        language: "en-GB",
        maxMs: LIVE_MS,
        onListening: () => {
          startBtn.disabled = false;
          startBtn.dataset.state = "rec";
          startLabel.textContent = t("ac.live.stop", "Stopp");
          status.textContent = t("ac.live.listening", "Ich höre zu … Lies jetzt den Text.");
          status.dataset.kind = "live";
          tick = setInterval(() => {
            left -= 1;
            timerEl.textContent = t("ac.live.left", "noch {n} s", { n: Math.max(0, left) });
          }, 1000);
        },
        onRetry: () => { status.textContent = MSG.retrying; },
        onPartial: (text) => { heard.textContent = text; },
        onSegment: (assessment) => { heard.textContent = ""; applySegment(assessment); },
      });
      await session.done;
      for (let si = 0; si < sentences.length; si++) {
        if (!doneSentences.has(si) && ref.some((w) => w.si === si && w.score != null)) finishSentence(si);
      }
      status.textContent = doneSentences.size
        ? t("ac.live.done", "Fertig. Tippe auf einen Link oder starte noch einmal.")
        : MSG.noSpeech;
      status.dataset.kind = doneSentences.size ? "ok" : "error";
    } catch (err) {
      if (!(err instanceof PronunciationError)) console.error(err);
      const code = err instanceof PronunciationError ? err.code : "failed";
      if (code === "busy") {
        // F0 takes one session at a time: back to single sentences, which queue better.
        setMode("satz", t("ac.live.busy", "Live ist gerade besetzt. Wir sind zurück bei einzelnen Sätzen — probier Live gleich noch einmal."));
      } else {
        status.textContent = MSG[code] ?? MSG.failed;
        status.dataset.kind = "error";
        const login = root.querySelector("[data-login]");
        if (login && code === "auth") login.hidden = false;
      }
    } finally {
      clearInterval(tick);
      session = null;
      startBtn.disabled = false;
      startBtn.dataset.state = "idle";
      startLabel.textContent = t("ac.live.start", "Live starten");
      timerEl.textContent = "";
    }
  });
}

