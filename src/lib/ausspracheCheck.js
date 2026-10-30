// The Aussprache-Check: the learner reads a sentence into the microphone and a
// pronunciation service scores every word. See src/pages/aussprache-check.astro.
//
// Nothing in this file knows which service that is. It talks to the provider-neutral
// interface in src/lib/pronunciation/ (today backed by Azure, in ./pronunciation/azure.ts)
// and only handles what is the same for any provider: the microphone check, lining the
// scored words up with the sentence, the page, the tips, and the fallback voice.
import { tipFor, soundLabel } from "./ausspracheTipps.js";
import { pronunciationProvider as provider, PronunciationError } from "./pronunciation/index.ts";
import { referenceMelody, learnerMelody, compareMelody, melodyChart } from "./satzmelodie.js";
import { wouldLock } from "./intent.js";
import { setWaiting } from "./notReady.js";

const LANG = "en-GB";
const BEST_KEY = "ac.best";
const POS_KEY = "ac.pos";

// Every message the learner can see, in one place, keyed by PronunciationErrorCode where
// one applies. English only for now: this page is speaking practice, and the words around
// it stay simple.
export const MSG = {
  ready: "Tap “Record” and read the sentence aloud.",
  preparing: "Getting the microphone ready …",
  listening: "I'm listening … Read the sentence now.",
  analysing: "Checking …",
  done: "Done! Tap a word to hear it.",
  // The Android app has no address bar: Android asks itself, and src/lib/appFeel.js points
  // to the app's settings page once Android stops asking.
  micDenied: import.meta.env.PUBLIC_TARGET === "app"
    ? "No access to the microphone. Without a microphone you can't speak here."
    : "No access to the microphone. Allow the microphone in your browser settings (the lock icon next to the address) and reload the page.",
  micMissing: "No microphone found. Connect a microphone or headset and try again.",
  micUnsupported: "Your browser can't record here. Open the page in Chrome, Edge or Safari.",
  insecure: "Recording only works over a secure connection (https).",
  auth: "You need to be signed in to get a score. Free twice a day with an account.",
  rate: "You have started a lot of checks just now. Take a short break and try again in a few minutes.",
  limit: "You have used all your sessions for today. You can go on tomorrow.",
  // All learners together used today's share of the Azure quota (GLOBAL_DAILY_CAP, src/lib/usage.ts).
  full: "Fully booked today – back tomorrow.",
  retrying: "One moment, nearly there …",
  busy: "The speech service is busy right now. Try again in a few seconds.",
  quota: "The pronunciation check is fully used for this month. Please try again later.",
  config: "Pronunciation scoring is not set up at the moment. Please try again later.",
  token: "No connection to the speech service. Check your internet connection and try again.",
  noSpeech: "I didn't hear anything. Speak a bit louder or closer to the microphone and try again.",
  wrongText: "I heard something different. Read exactly the sentence above.",
  failed: "The check didn't work. Please try again.",
  listenFailed: "Playing the audio didn't work.",
};

/** WordError → what the detail panel says. */
const ERROR_LABEL = {
  none: "",
  mispronunciation: "Mispronounced",
  omission: "Left out",
  insertion: "Extra word",
  unexpectedBreak: "Unexpected pause",
  missingBreak: "Missing pause",
  monotone: "Too flat",
};

const band = (s) => (s >= 80 ? "good" : s >= 60 ? "ok" : "bad");
const norm = (w) => w.toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "") ?? fallback; } catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ------------------------------------------------------------- microphone ---- */
// Ask for the microphone ourselves before the provider does: its own failure is usually a
// generic cancellation, and a learner who clicked "Blockieren" needs to be told where to
// undo it. The stream is kept, not closed: the Satzmelodie records from it while the
// provider listens (see record()).
export async function checkMicrophone() {
  // Dev only: with a fake assessment set (see src/lib/pronunciation/index.ts) there is no
  // recording, so no microphone either.
  if (import.meta.env.DEV && globalThis.__fakeAssessment) return null;
  if (!window.isSecureContext) throw new PronunciationError("insecure");
  if (!navigator.mediaDevices?.getUserMedia) throw new PronunciationError("micUnsupported");
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    const name = err?.name;
    if (name === "NotAllowedError" || name === "SecurityError") throw new PronunciationError("micDenied");
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new PronunciationError("micMissing");
    throw new PronunciationError("micUnsupported");
  }
}

/**
 * Line the scored words up with the words of the sentence as written (with capitals and
 * punctuation). Providers list every reference word — omitted ones as "omission" — plus
 * any extra words as "insertion"; the insertions are set aside.
 */
export function alignWords(sentence, assessment) {
  const shown = sentence.split(/\s+/).filter(Boolean);
  const heard = assessment.words.filter((w) => w.error !== "insertion");
  let j = 0;
  return shown.map((display) => {
    const key = norm(display);
    // Prefer an exact match within the next two heard words, else take the next one.
    let k = heard.slice(j, j + 3).findIndex((w) => norm(w.word) === key);
    if (k < 0) k = 0;
    const w = heard[j + k];
    if (w) j += k + 1;
    const error = w ? w.error : "omission";
    return {
      display,
      word: display.replace(/[.,!?;:„“"]/g, ""),
      score: error === "omission" ? 0 : w.score,
      error,
      phonemes: w?.phonemes ?? [],
    };
  });
}

/* --------------------------------------------------------------- speaking ---- */
let currentAudio = null;
function stopAudio() {
  currentAudio?.pause?.();
  currentAudio = null;
  window.speechSynthesis?.cancel();
}

function browserSpeak(text, rate = 0.9) {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) return reject(new Error("no tts"));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG;
    u.rate = rate;
    const voices = synth.getVoices();
    const en = voices.find((v) => v.lang?.replace("_", "-") === "en-GB") ?? voices.find((v) => v.lang?.startsWith("en"));
    if (en) u.voice = en;
    u.onend = resolve;
    u.onerror = reject;
    synth.speak(u);
  });
}

// The provider's voice when it can speak without asking for credentials (so listening
// never forces a sign-in), the browser's own English voice otherwise.
async function speak(text, { slow = false } = {}) {
  stopAudio();
  if (provider.canSpeak()) {
    try { await provider.speak(text, { language: LANG, slow }); return; } catch { /* fall back */ }
  }
  await browserSpeak(text, slow ? 0.7 : 0.9);
}

// A sentence may bring its own files (`src`, and `srcSlow` for a slow take, as on
// /zungenbrecher); otherwise its reference recording lives in /audio/aussprache-check/.
async function playSentence(s, { slow = false } = {}) {
  stopAudio();
  if (s.audio) {
    const a = new Audio((slow && s.srcSlow) || s.src || `/audio/aussprache-check/${s.id}.mp3`);
    currentAudio = a;
    // For a page that draws along (the melody playhead on /zungenbrecher).
    window.dispatchEvent(new CustomEvent("da:ac-play", { detail: { audio: a, sentence: s, slow } }));
    try { await a.play(); return; } catch { /* file missing or blocked: speak it instead */ }
  }
  await speak(s.text, { slow });
}

/** Plays another take of sentence `s` (the dialect take on /zungenbrecher) through the same
 *  single player, so it stops whatever plays and the next take stops it. No spoken fallback:
 *  the promise rejects when the file cannot play. `take` names it in the da:ac-play event. */
export function playTake(s, url, take) {
  stopAudio();
  const a = new Audio(url);
  currentAudio = a;
  window.dispatchEvent(new CustomEvent("da:ac-play", { detail: { audio: a, sentence: s, slow: false, take } }));
  return a.play();
}

/* -------------------------------------------------------------------- UI ---- */
// Options beside `levels`: `posKey`/`bestKey` keep another page's place and best scores
// apart, `unit` names the card ("Satz"), and `listenFirst` keeps "Aufnehmen" locked until
// the model has been heard once (and plays it by itself when the learner moves on).
// `onResult(overall, sentence)` after each scored take. `onChange(levelIndex, index)` runs
// whenever another sentence is shown; the returned
// `select(levelIndex, index)` opens one from outside (the list on /zungenbrecher).
export function mountAusspracheCheck(root, data) {
  const POS = data.posKey || POS_KEY;
  const BEST = data.bestKey || BEST_KEY;
  const unit = data.unit || "Sentence";
  const listenFirst = Boolean(data.listenFirst);
  const ready = listenFirst ? "Listen first – then tap “Record” and say it after the model." : MSG.ready;
  let heard = false;
  const $ = (sel) => root.querySelector(sel);
  const els = {
    tabs: [...root.querySelectorAll("[data-level]")],
    pos: $("[data-pos]"),
    best: $("[data-best]"),
    focus: $("[data-focus]"),
    sentence: $("[data-sentence]"),
    hint: $("[data-hint]"),
    listen: [...root.querySelectorAll("[data-card] [data-listen]")],
    record: $("[data-record]"),
    recordLabel: $("[data-record-label]"),
    status: $("[data-status]"),
    login: $("[data-login]"),
    results: $("[data-results]"),
    overall: $("[data-overall]"),
    overallRing: $("[data-overall-ring]"),
    scores: $("[data-scores]"),
    detail: $("[data-detail]"),
    tip: $("[data-tip]"),
    melody: $("[data-melody]"),
    prev: $("[data-prev]"),
    next: $("[data-next]"),
  };

  const levels = data.levels;
  const saved = readJSON(POS, {});
  let li = Math.max(0, levels.findIndex((l) => l.level === saved.level));
  let si = Math.min(saved.index ?? 0, levels[li].sentences.length - 1);
  let busy = false;
  let words = null;
  let best = readJSON(BEST, {});

  const sentence = () => levels[li].sentences[si];

  // Names the listen buttons as they read on screen ("Langsam" / "Schnell"), else the play sign.
  const listenFirstWhy = () => {
    const names = els.listen.map((x) => x.textContent.trim()).filter(Boolean).map((n) => `“${n}”`);
    return `Listen to the sentence first – tap ${names.length ? names.join(" or ") : "▶"}.`;
  };

  function setStatus(text, kind = "") {
    els.status.textContent = text;
    els.status.dataset.kind = kind;
  }

  function showError(err) {
    const code = err instanceof PronunciationError ? err.code : "failed";
    const msg = MSG[code] ?? MSG.failed;
    setStatus(msg, "error");
    els.login.hidden = code !== "auth";
    // Daily allowance used up: the lock card replaces the record button.
    if (code === "limit") {
      const lock = document.querySelector("[data-ac-limit]");
      if (lock) {
        lock.hidden = false;
        els.record.hidden = true;
      }
      import("./analytics.js").then(({ track }) => track("aussprache_limit_reached", {})).catch(() => {});
      // traffic-baseline: would_lock — the server meter (src/lib/usage.ts) refused the session.
      wouldLock("aussprache", true);
    }
  }

  /* The new sentence slides in from the side it came from: from the right for "Weiter",
     from the left for "Zurück", so the arrow keys and buttons read as a row of cards. */
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  function slideIn(dir) {
    if (!dir || calm.matches) return;
    const frames = [
      { opacity: 0, transform: `translateX(${dir * 32}px)` },
      { opacity: 1, transform: "none" },
    ];
    for (const el of [els.focus, els.sentence]) {
      el.animate(frames, { duration: 320, easing: "cubic-bezier(.2,.8,.25,1)" });
    }
  }

  function renderSentence(dir = 0) {
    const s = sentence();
    words = null;
    els.tabs.forEach((t, i) => {
      t.setAttribute("aria-selected", String(i === li));
      t.tabIndex = i === li ? 0 : -1;
    });
    els.pos.textContent = `${unit} ${si + 1} / ${levels[li].sentences.length}`;
    els.best.textContent = best[s.id] != null ? `Bestwert ${best[s.id]}` : "";
    els.focus.innerHTML = s.focus.map((f) => `<span class="ac-chip">${esc(soundLabel(f))}</span>`).join("");
    els.sentence.innerHTML = s.text.split(/\s+/).map((w) => `<span class="ac-w">${esc(w)}</span>`).join(" ");
    if (els.hint) {
      els.hint.textContent = s.hint || "";
      els.hint.hidden = !s.hint;
    }
    els.results.hidden = true;
    els.melody.hidden = true;
    els.login.hidden = true;
    // Warm the reference contour while the learner reads, so the score is quick later.
    referenceMelody(s);
    els.prev.disabled = si === 0 && li === 0;
    els.next.disabled = si === levels[li].sentences.length - 1 && li === levels.length - 1;
    setStatus(ready);
    heard = !listenFirst;
    setWaiting(els.record, heard ? null : listenFirstWhy(), "[data-listen]");
    writeJSON(POS, { level: levels[li].level, index: si });
    data.onChange?.(li, si);
    slideIn(dir);
  }

  function renderWordDetail(i) {
    const w = words[i];
    els.sentence.querySelectorAll(".ac-w").forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    const label = w.error === "omission" ? "Left out" : `${w.score} out of 100`;
    const err = w.error !== "none" && w.error !== "omission" ? ERROR_LABEL[w.error] ?? "" : "";
    // Only with names: de-DE scores the sounds but does not name them, and a row of blanks says nothing.
    const phon = w.phonemes.some((p) => p.symbol)
      ? `<p class="ac-detail-sub">Sounds</p><div class="ac-phonemes">${w.phonemes
          .map((p) => `<span class="ac-ph ac-ph--${band(p.score)}" title="${p.score}"><b>${esc(p.symbol)}</b><small>${p.score}</small></span>`)
          .join("")}</div>`
      : "";
    els.detail.innerHTML = `
      <div class="ac-detail-head">
        <strong class="ac-detail-word">${esc(w.word)}</strong>
        <span class="ac-badge ac-badge--${w.error === "omission" ? "omit" : band(w.score)}">${esc(label)}</span>
      </div>
      ${err ? `<p class="ac-detail-err">${esc(err)}</p>` : ""}
      ${phon}
      <div class="ac-detail-actions">
        <button type="button" class="ac-btn ac-btn--quiet" data-say="normal">▶ Hear the word</button>
        <button type="button" class="ac-btn ac-btn--quiet" data-say="slow">Slowly</button>
      </div>`;
    els.detail.hidden = false;
    els.detail.querySelectorAll("[data-say]").forEach((b) =>
      b.addEventListener("click", () => speak(w.word, { slow: b.dataset.say === "slow" }).catch(() => setStatus(MSG.listenFailed, "error"))),
    );
  }

  function renderResults(assessment) {
    const s = sentence();
    const aligned = alignWords(s.text, assessment);

    // A take that got none of the sentence scores zero everywhere; say so instead of
    // painting every word red.
    if (!aligned.some((w) => w.error !== "omission")) throw new PronunciationError("wrongText");
    words = aligned;

    const overall = assessment.overall;
    data.onResult?.(overall, sentence());
    els.overall.textContent = overall;
    els.overallRing.style.setProperty("--p", overall);
    els.overallRing.dataset.band = band(overall);

    const rows = [
      ["Accuracy", assessment.accuracy, "How exact the sounds are"],
      ["Fluency", assessment.fluency, "Speed and pauses"],
      ["Completeness", assessment.completeness, "How many of the words you said"],
      // Our own score, filled in by renderMelody() — the provider's prosody score is
      // English-only.
      ["Sentence melody", null, "Stress and melody"],
    ];
    els.scores.innerHTML = rows
      .map(([name, v, hint]) => {
        const has = typeof v === "number";
        const n = has ? Math.round(v) : null;
        return `<div class="ac-score" data-band="${has ? band(n) : "none"}"${name === "Sentence melody" ? " data-melody-score" : ""}>
          <div class="ac-score-top"><span>${name}</span><b>${has ? n : "—"}</b></div>
          <span class="ac-score-bar"><span style="width:${has ? n : 0}%"></span></span>
          <small>${has ? hint : name === "Sentence melody" ? "Working it out …" : "Not scored"}</small>
        </div>`;
      })
      .join("");

    els.sentence.innerHTML = words
      .map((w, i) => {
        const cls = w.error === "omission" ? "omit" : band(w.score);
        const aria = w.error === "omission" ? `${w.word}: left out` : `${w.word}: ${w.score} out of 100`;
        return `<button type="button" class="ac-w ac-w--${cls}" data-word="${i}" aria-pressed="false" aria-label="${esc(aria)}">${esc(w.display)}</button>`;
      })
      .join(" ");

    // The tip is about the worst word that was actually said: a sound rule helps with that
    // one. Left-out words get their own line underneath, since there is no sound to fix.
    const spoken = words.filter((w) => w.error !== "omission");
    const worst = spoken.reduce((a, w) => (w.score < a.score ? w : a), spoken[0]);
    const missing = words.filter((w) => w.error === "omission").map((w) => `“${esc(w.word)}”`);
    const missingLine = missing.length
      ? `<p class="ac-tip-missing">Not heard: ${missing.join(", ")}. Read every word, the small ones too.</p>`
      : "";
    if (worst.score >= 85) {
      els.tip.innerHTML = missing.length
        ? `<p class="ac-tip-title">Well pronounced!</p>${missingLine}`
        : `<p class="ac-tip-title">Very good!</p><p>Every word has 85 points or more. Try the next sentence.</p>`;
    } else {
      const t = tipFor(worst.word, s.focus);
      els.tip.innerHTML = `<p class="ac-tip-title">Tip for “${esc(worst.word)}”${t.label ? ` <span class="ac-chip">${esc(t.label)}</span>` : ""}</p><p>${esc(t.text)}</p>${missingLine}`;
    }

    // A mistake typical for the learner's first language replaces the generic tip. The page
    // supplies it (data.nativeTip, see src/lib/ausspracheCheckFuerDich.js); a word it
    // explains ("Hun" heard for "Hund") is not also listed as not heard.
    const native = data.nativeTip?.({ words, assessment });
    if (native) {
      const rest = words.filter((w) => w.error === "omission" && !native.words.includes(w.word)).map((w) => `“${esc(w.word)}”`);
      els.tip.innerHTML = native.html + (rest.length ? `<p class="ac-tip-missing">Not heard: ${rest.join(", ")}. Read every word, the small ones too.</p>` : "");
    }

    els.detail.hidden = true;
    els.results.hidden = false;

    if (best[s.id] == null || overall > best[s.id]) {
      best = { ...best, [s.id]: overall };
      writeJSON(BEST, best);
    }
    els.best.textContent = `Bestwert ${best[s.id]}`;
  }

  /* Satzmelodie: pitch contour of the take against the reference clip, all in the
     browser (src/lib/satzmelodie.js). Runs after the word scores are on screen, so the
     learner never waits for it. */
  async function renderMelody(blob) {
    const s = sentence();
    const row = els.scores.querySelector("[data-melody-score]");
    const setRow = (n, hint) => {
      if (!row) return;
      row.dataset.band = n == null ? "none" : band(n);
      row.querySelector("b").textContent = n == null ? "—" : n;
      row.querySelector(".ac-score-bar span").style.width = `${n ?? 0}%`;
      row.querySelector("small").textContent = hint;
    };
    els.melody.hidden = true;
    try {
      const [ref, you] = await Promise.all([referenceMelody(s), blob ? learnerMelody(blob) : null]);
      if (!ref?.length) return setRow(null, "No model recording for this sentence yet");
      if (!you?.length) return setRow(null, "Not enough voice heard");
      const r = compareMelody(ref, you, s);
      if (!r) return setRow(null, "Not enough voice heard");
      setRow(r.score, "Stress and melody");
      const kind = { "ja-nein": "Yes/no question: up at the end", "w-frage": "Wh- question: down at the end", aussage: "Statement: down at the end" }[r.type];
      els.melody.innerHTML = `
        <div class="ac-mel-head">
          <span class="ac-mel-title">Sentence melody</span>
          <span class="ac-mel-kind">${esc(kind)}</span>
        </div>
        ${melodyChart(ref, you)}
        <div class="ac-mel-legend"><span><i class="ac-mel-key ac-mel-key--ref"></i>Model</span><span><i class="ac-mel-key ac-mel-key--you"></i>You</span></div>
        ${r.tip ? `<p class="ac-mel-tip">${esc(r.tip)}</p>` : r.score >= 75 ? `<p class="ac-mel-tip">Your melody matches the model well.</p>` : ""}`;
      els.melody.hidden = false;
    } catch (err) {
      console.error(err);
      setRow(null, "Not scored");
    }
  }

  /** MediaRecorder on the stream we already hold; resolves to the take as a Blob. */
  function startTake(stream) {
    if (!stream || typeof MediaRecorder === "undefined") return null;
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const done = new Promise((resolve) => { rec.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType }) : null); });
    rec.start();
    return { stop: () => { if (rec.state !== "inactive") rec.stop(); return done; } };
  }

  async function record() {
    if (busy) return;
    busy = true;
    stopAudio();
    els.record.dataset.state = "prep";
    els.recordLabel.textContent = "Moment …";
    els.login.hidden = true;
    setStatus(MSG.preparing);
    let stream = null;
    let take = null;
    try {
      stream = await checkMicrophone();
      take = startTake(stream);
      const result = await provider.assess({
        referenceText: sentence().text,
        language: LANG,
        onListening: () => {
          els.record.dataset.state = "rec";
          els.recordLabel.textContent = "Listening …";
          setStatus(MSG.listening, "live");
        },
        onRetry: () => {
          els.record.dataset.state = "prep";
          els.recordLabel.textContent = "Moment …";
          setStatus(MSG.retrying);
        },
      });
      els.record.dataset.state = "prep";
      setStatus(MSG.analysing);
      const blob = await take?.stop();
      take = null;
      renderResults(result);
      setStatus(MSG.done, "ok");
      renderMelody(blob);
    } catch (err) {
      if (!(err instanceof PronunciationError)) console.error(err);
      showError(err);
    } finally {
      take?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      busy = false;
      els.record.dataset.state = "idle";
      els.recordLabel.textContent = words ? "Again" : "Record";
    }
  }

  function go(delta) {
    if (busy) return;
    si += delta;
    if (si < 0) { li = Math.max(0, li - 1); si = levels[li].sentences.length - 1; }
    if (si >= levels[li].sentences.length) { li = Math.min(levels.length - 1, li + 1); si = 0; }
    els.recordLabel.textContent = "Record";
    renderSentence(Math.sign(delta));
    if (listenFirst) listen(preferSlow);
  }

  els.tabs.forEach((t, i) =>
    t.addEventListener("click", () => {
      if (busy || i === li) return;
      const dir = Math.sign(i - li);
      li = i; si = 0;
      els.recordLabel.textContent = "Record";
      renderSentence(dir);
      if (listenFirst) listen(preferSlow);
    }),
  );
  root.querySelector("[role=tablist]")?.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = (li + (e.key === "ArrowRight" ? 1 : -1) + levels.length) % levels.length;
    els.tabs[i].click();
    els.tabs[i].focus();
  });
  // ← / → step through the sentences from anywhere on the page, except where the arrows
  // already mean something: the level tabs (above), form fields, and with a modifier held.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable], [role=tablist], [role=slider]")) return;
    const btn = e.key === "ArrowRight" ? els.next : els.prev;
    if (btn.disabled) return;
    e.preventDefault();
    go(e.key === "ArrowRight" ? 1 : -1);
  });
  els.prev.addEventListener("click", () => go(-1));
  els.next.addEventListener("click", () => go(1));
  els.record.addEventListener("click", record);
  // The speed the learner picked last ("Langsam" or "Schnell") sticks: moving on plays that
  // take, and its button stays marked. Saved under `${POS}.speed`.
  let preferSlow = readJSON(`${POS}.speed`, "slow") !== "fast";
  function markSpeed() {
    els.listen.forEach((b) => b.dataset.listen && b.setAttribute("aria-pressed", String((b.dataset.listen === "slow") === preferSlow)));
  }
  markSpeed();
  function listen(slow = false) {
    if (els.listen.some((b) => b.dataset.listen)) {
      preferSlow = slow;
      writeJSON(`${POS}.speed`, slow ? "slow" : "fast");
      markSpeed();
    }
    const p = playSentence(sentence(), { slow });
    if (!heard) {
      heard = true;
      setWaiting(els.record, null);
      setStatus(MSG.ready);
    }
    return p.catch(() => setStatus(MSG.listenFailed, "error"));
  }
  els.listen.forEach((b) => b.addEventListener("click", () => listen(b.dataset.listen === "slow")));
  els.sentence.addEventListener("click", (e) => {
    const b = e.target.closest("[data-word]");
    if (!b || !words) return;
    const i = Number(b.dataset.word);
    renderWordDetail(i);
    speak(words[i].word).catch(() => {});
  });

  renderSentence();

  return {
    select(l, i) {
      if (busy || (l === li && i === si)) return;
      li = l; si = i;
      els.recordLabel.textContent = "Record";
      renderSentence(0);
      if (listenFirst) listen(preferSlow);
    },
  };
}
