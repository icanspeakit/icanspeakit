// Shared "practice workspace" engine: Fokus-Modus (one question at a time) and
// Testmodus (compact list), sharing per-question progress within the session.
// Question shape: { id, difficulty?, prompt, options, answer, explain, explainLeicht?, change, audioSrc? }.
// `audioSrc` is the answer spoken (a recorded "la casa"); `speak` is the same as text, for the
// browser's Spanish voice while there are no recordings. Both optional. It plays once the
// question is settled (solved, or revealed), and the `change` chip replays it.
// `explainLeicht` is the Leichte-Sprache register of `explain`; optional, and absent means
// the switch leaves that question's explanation as it is.
// `difficulty` is optional — when absent, all questions form a single implicit group.

import { TEMPOS, getTempo } from "./practiceTempo.js";
import { t, onUiText } from "./uiText.js";
import { celebrateRound, mascotHop } from "./mascotCelebrate.js";
import { mascotSvg } from "./mascots.js";
import { flagItems, meldenLinkHtml, onMeldenClick } from "./meldung.js";
import { itemFingerprint } from "./meldungRef.js";
import { withBase } from "./paths.js";

const KNOWN_DIFFICULTY_ORDER = ["leicht", "mittel", "schwer"];
const WRONG_ATTEMPTS_BEFORE_REVEAL = 2;
const CORRECT_ADVANCE_DELAY_MS = 550;
// Long enough to see which pill was wrong before the pills come back.
const WRONG_FLASH_DELAY_MS = 1200;
// wrongFlow "advance-and-requeue" (the Artikel-Trainer): one wrong tap shows the answer,
// then the card moves on by itself — after this long, or this long when the learner is on
// the keyboard and needs time to hear the verdict and find their place again. A card with
// something to read (`holdAfterWrong`: a rule, an exception) gets HOLD_EXTRA_MS on top.
// „Anhalten" stops the pause; then the card waits for Weiter.
const WRONG_ADVANCE_DELAY_MS = 2200;
const WRONG_ADVANCE_DELAY_KEYBOARD_MS = 4000;
const HOLD_EXTRA_MS = 2000;
// wrongFlow, right answer: long enough for Bruno to pop up (a 0.5 s hop) and stay a moment.
const CORRECT_ADVANCE_DELAY_WRONGFLOW_MS = 1050;

/* The article in its colour, for the noun shown in full after a wrong answer: el and la take the
   site's two gender colours. */
const ARTICLE_COLOUR = { el: "der", la: "die" };
function articleHtml(q) {
  const cls = ARTICLE_COLOUR[q.answer] ?? "";
  return `<b class="akk-art${cls ? ` akk-art--${cls}` : ""}" lang="es">${q.answer}</b>`;
}

function sentenceHtml(prompt) {
  return prompt.replace("___", '<span class="akk-blank">___</span>');
}

const SPEAKER_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

const MUTED_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';

/* Sound on or off, for the whole page and remembered per browser. On by default: the
   audio is the point, and a learner in a quiet room is one tap from turning it off. Off
   only silences the automatic play after an answer — a tap on the replay chip is an
   explicit ask and plays either way. */
const SOUND_KEY = "da.practice.sound";
let soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch {}
export const isSoundOn = () => soundOn;

/* Langsam: the same file played at 0.7× with the pitch held, so a learner can hear where
   the article ends and the noun begins. No second recording needed — the browser stretches
   it. Remembered per browser like the sound switch. */
const SLOW_KEY = "da.practice.slow";
const SLOW_RATE = 0.7;
let slowOn = false;
try { slowOn = localStorage.getItem(SLOW_KEY) === "on"; } catch {}
function setSlowOn(on) {
  slowOn = Boolean(on);
  try { localStorage.setItem(SLOW_KEY, slowOn ? "on" : "off"); } catch {}
  document.querySelectorAll("[data-slow-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(slowOn)));
}
export function setSoundOn(on) {
  soundOn = Boolean(on);
  try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch {}
  if (!soundOn && player) player.pause();
  document.dispatchEvent(new CustomEvent("practice:sound", { detail: { on: soundOn } }));
}

/* The "this word can be heard" mark beside the prompt. It cannot play the word before the
   answer — that would say the article — so it is the sound switch instead, and its icon
   says which way the switch is set. Only questions with a file get one, which is what
   tells a learner which words are voiced. */
function hearHtml(question, { slow = false } = {}) {
  if (!question.audioSrc && !question.speak) return "";
  const slowBtn = slow
    ? `<button type="button" class="akk-slow" data-slow-toggle aria-pressed="${slowOn}" title="${attr(t("pw.slow.title", "Langsamer vorlesen"))}"><span class="akk-slow-track" aria-hidden="true"><span class="akk-slow-knob"></span></span>${t("pw.slow", "Langsam")}</button>`
    : "";
  // One group, so a long noun on a phone takes the controls to the next line together
  // instead of leaving the speaker stranded under the word.
  return `<span class="akk-hear-group">${slowBtn}<button type="button" class="akk-hear" data-sound-toggle aria-pressed="${soundOn}"
    title="${attr(soundTitle())}"
    aria-label="${attr(t("pw.sound.aria", "Aussprache nach der Antwort"))}">${soundOn ? SPEAKER_SVG : MUTED_SVG}</button></span>`;
}
function soundTitle() {
  return soundOn
    ? t("pw.sound.on", "Nach der Antwort hörst du das Wort. Tippen: Ton aus")
    : t("pw.sound.off", "Ton ist aus. Tippen: Ton an");
}
function syncSoundMarks(scope = document) {
  scope.querySelectorAll(".akk-hear").forEach((b) => {
    b.setAttribute("aria-pressed", String(soundOn));
    b.title = soundTitle();
    b.innerHTML = soundOn ? SPEAKER_SVG : MUTED_SVG;
  });
}
if (typeof document !== "undefined") document.addEventListener("practice:sound", () => syncSoundMarks());

// One player for the page: a new answer cuts off the last one instead of talking over it,
// and it outlives the re-render Fokus-Modus does when it moves on to the next card.
let player = null;
function speak(question, { force = false } = {}) {
  if (!soundOn && !force) return;
  if (!question.audioSrc) {
    // No recording: the browser's voice, one from Spain first. No speech at all: stay silent, the
    // answer is on the card anyway.
    if (!question.speak || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(question.speak);
    u.lang = "es-ES";
    u.rate = slowOn ? 0.6 : 0.9;
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => /^es(-|_)ES/i.test(x.lang)) ?? voices.find((x) => /^es(-|_)/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return;
  }
  if (!player) player = new Audio();
  player.pause();
  player.src = withBase(question.audioSrc);
  // Set after src: loading a new source resets the rate to the default.
  player.defaultPlaybackRate = player.playbackRate = slowOn ? SLOW_RATE : 1;
  player.preservesPitch = true;
  player.play().catch(() => {});
}

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* The "warum" line is the one the Leichte-Sprache switch matters most for: it is the
   sentence a learner reads precisely because they did not know the answer, and it was
   written at a level well above the question. A question that carries `explainLeicht` gets
   both registers on the element; one that does not keeps its single text and the switch
   leaves it alone. See src/lib/leichteSprache.js. */
function whyHtml(question) {
  const leicht = question.explainLeicht
    ? ` data-ls-leicht="${attr(question.explainLeicht)}"`
    : "";
  return `
    <div class="akk-why">
      <span class="akk-tag">${t("pw.why", "WARUM?")}</span>
      <p class="akk-why-text" data-ls="${attr(question.explain)}"${leicht}>${question.explain}</p>
      ${
        question.audioSrc || question.speak
          ? `<button type="button" class="akk-why-chip akk-why-chip--audio" data-speak="${attr(question.id)}" aria-label="${attr(t("pw.listenTo", "{x} anhören", { x: question.change }))}">${SPEAKER_SVG}<span>${question.change}</span></button>`
          : `<span class="akk-why-chip">${question.change}</span>`
      }
    </div>`;
}

// `onAnswer(ok, id, { firstTry })`: `ok` is whether the question ended solved; `firstTry`
// says it was solved without a wrong tap first — the Artikel-Trainer counts only those
// toward "sicher", since a second try among three options is half a guess.
//
// `wrongFlow: "advance-and-requeue"` (the Artikel-Trainer only; absent = the two-tries flow
// every other trainer keeps): one wrong tap settles the question, shows the answer and moves
// on after a short pause, a longer one when `holdAfterWrong(question)` says there is something
// to read. See docs/artikel-fehler-tier0-v1.md.
// `doneActions: { practiseMissed(questions), more() }` (wrongFlow): the done screen lists the
// nouns missed on the first try and offers "Nur diese üben" and "Weiter üben" in place of
// "Nochmal üben".
// `onRoundEnd({ total, correct, wrong, retriedRight })` (Fokus): called when the done screen
// first shows for a round. `wrong` counts first tries; `retriedRight` the misses the retry got.
// `meldung(q)` → the item ref for "Problem melden" (g:praepositionen/<id>, g:akkusativ/<id>,
// g:artikel/<lexId>). The link sits under the Fokus card always, and under a Test row once
// it is settled (ten links on an open test would be clutter); dev gets a ⚑ per card/row.
export function mountPracticeWorkspace(root, allQuestions, { onSessionUpdate, onAnswer, wrongFlow, holdAfterWrong, doneActions, onRoundEnd, meldung } = {}) {
  const advanceOnWrong = wrongFlow === "advance-and-requeue";
  // One auto-advance timer per root, not per mount: the Artikel-Trainer and Präpositionen
  // remount into the same element for every round, and a timer left from the last mount
  // would otherwise fire into the new one and paint the old round over it.
  clearTimeout(root._practiceTimer);
  root._practiceTimer = null;
  // The chip in the WARUM box replays the answer; the mark beside the prompt flips the
  // sound. Delegated, because both modes re-render — and wired once per root, because the
  // Artikel-Trainer remounts into the same element for every round.
  root._practiceQuestions = allQuestions;
  if (meldung) {
    const byId = new Map(allQuestions.map((q) => [String(q.id), q]));
    const picks = (root._mfPicks = root._mfPicks ?? {});
    if (!root._mfPickWired) {
      root._mfPickWired = true;
      root.addEventListener("click", (e) => {
        const pill = e.target.closest?.(".akk-pill");
        const qid = pill?.closest("[data-qid]")?.dataset.qid;
        if (qid) root._mfPicks[qid] = pill.dataset.opt;
      }, true);
    }
    const target = (qid) => {
      const q = byId.get(String(qid));
      const ref = q && meldung(q);
      return ref
        ? { ref, fingerprint: itemFingerprint(q), snapshot: () => ({ satz: q.prompt, optionen: q.options, loesung: q.answer, erklaerung: q.explain, antwort: picks[qid] ?? null }) }
        : null;
    };
    onMeldenClick(root, (b) => target(b.dataset.mfQid));
    flagItems(root, ".akk-focus-card[data-qid], .akk-test-row[data-qid]", (el) => target(el.dataset.qid));
  }
  const mfLink = (q, show = true) => (meldung && show ? meldenLinkHtml(`data-mf-qid="${attr(q.id)}"`) : "");
  if (!root._practiceWired) {
    root._practiceWired = true;
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-sound-toggle]")) return setSoundOn(!soundOn);
      const slowBtn = e.target.closest("[data-slow-toggle]");
      if (slowBtn) {
        setSlowOn(!slowOn);
        // Once the answer is out, hearing the change is the point of pressing it.
        const card = slowBtn.closest("[data-qid]");
        const q = card && root._practiceQuestions.find((x) => x.id === card.dataset.qid);
        if (q && card.dataset.settled === "true") speak(q, { force: true });
        return;
      }
      const chip = e.target.closest("[data-speak]");
      if (!chip) return root._practiceOnTap?.(e);
      const q = root._practiceQuestions.find((x) => x.id === chip.dataset.speak);
      if (q) speak(q, { force: true });
    });
    // The handlers below are the current mount's (set further down); these listeners only
    // forward to them, so remounting does not stack listeners.
    root.addEventListener("keydown", (e) => root._practiceOnKey?.(e));
    document.addEventListener("visibilitychange", () => { if (document.hidden) root._practiceOnHide?.(); });
  }
  root._practiceOnTap = root._practiceOnKey = root._practiceOnHide = null;

  // The verdict for screen readers. Outside `root`, whose contents are replaced on every
  // step: a live region inserted together with its text is not reliably read out.
  let live = null;
  if (advanceOnWrong) {
    live = root._practiceLive;
    if (!live) {
      live = root._practiceLive = document.createElement("p");
      live.className = "akk-sr";
      live.setAttribute("aria-live", "polite");
      root.insertAdjacentElement("afterend", live);
    }
  }
  function announce(text) {
    if (!live) return;
    live.textContent = "";
    // A beat later, so the same words twice in a row ("Richtig.") are still announced.
    requestAnimationFrame(() => { live.textContent = text; });
  }

  const hasTiers = allQuestions.some((q) => q.difficulty);
  const groups = hasTiers
    ? [...new Set(allQuestions.map((q) => q.difficulty))].sort(
        (a, b) => KNOWN_DIFFICULTY_ORDER.indexOf(a) - KNOWN_DIFFICULTY_ORDER.indexOf(b)
      )
    : ["alle"];
  const byGroup = Object.fromEntries(groups.map((g) => [g, hasTiers ? allQuestions.filter((q) => q.difficulty === g) : allQuestions]));

  const state = {
    group: groups[0],
    mode: "fokus",
    focusIndex: Object.fromEntries(groups.map((g) => [g, 0])),
    progress: Object.fromEntries(
      allQuestions.map((q) => [q.id, { answered: false, solved: false, revealed: false, wrongCount: 0 }])
    ),
  };

  function currentSet() {
    return byGroup[state.group];
  }

  /* wrongFlow: the round as it is played in Fokus — each question once, plus a second
     showing of every noun missed on the first try, slotted in a few cards later. The retry
     is the same question (same `data-qid`, so the Herkunft card and the chart follow it) with
     its own progress, which never reaches `onAnswer`: the first answer is the one that counts.
     Without wrongFlow the sequence is simply the set. */
  const RETRY_GAP = 3;
  state.seq = Object.fromEntries(groups.map((g) => [g, byGroup[g].map((q) => ({ q, retry: false }))]));
  state.retryProgress = {};
  const freshRetry = () => ({ answered: false, solved: false, revealed: false, wrongCount: 0 });
  function currentSeq() {
    return state.seq[state.group];
  }
  function progressOf(entry) {
    if (!entry.retry) return state.progress[entry.q.id];
    return (state.retryProgress[entry.q.id] ??= freshRetry());
  }
  /** After the card at `idx`, RETRY_GAP other cards, then the retry — or last, if fewer remain. */
  function requeue(q, idx) {
    const seq = currentSeq();
    if (seq.some((e) => e.retry && e.q.id === q.id)) return;
    seq.splice(Math.min(idx + 1 + RETRY_GAP, seq.length), 0, { q, retry: true });
  }

  // A settled question's pills. Revealed after two tries: every wrong option red. In
  // wrongFlow only the one that was tapped is red, the rest step back.
  function pillClass(q, p, opt) {
    if (p.revealed) {
      if (opt === q.answer) return "akk-pill--correct";
      if (advanceOnWrong && p.wrongPick != null) return opt === p.wrongPick ? "akk-pill--incorrect" : "akk-pill--dim";
      return "akk-pill--incorrect";
    }
    if (p.solved) return opt === q.answer ? "akk-pill--correct" : "akk-pill--dim";
    return "";
  }

  function updateSession() {
    if (!onSessionUpdate) return;
    const set = currentSet();
    let answered = 0;
    let correct = 0;
    let hints = 0;
    set.forEach((q) => {
      const p = state.progress[q.id];
      if (p.answered) answered++;
      if (p.solved) correct++;
      // A shown answer is the hint: after two wrong taps today, after one in wrongFlow.
      if (advanceOnWrong ? p.revealed : p.wrongCount >= WRONG_ATTEMPTS_BEFORE_REVEAL) hints++;
    });
    onSessionUpdate({ answered, correct, hints, total: set.length, group: state.group });
  }

  function render() {
    root.innerHTML = state.mode === "fokus" ? renderFocusShell() : renderTestShell();
    if (state.mode === "fokus") wireFocus();
    else wireTest();
    updateSession();
  }

  // ---------- Fokus-Modus ----------
  function progressRailHtml(set, currentIdx) {
    return `
      <div class="akk-focus-progress">
        <button type="button" class="akk-back" id="akk-zurueck" aria-label="${attr(t("pw.prev", "Vorherige Frage"))}" title="${attr(t("pw.prev", "Vorherige Frage"))}"${currentIdx === 0 ? " disabled" : ""}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <div class="akk-rail">
          ${set
            .map((q, i) => {
              const cls = i < currentIdx ? "akk-rail-seg--done" : i === currentIdx ? "akk-rail-seg--current" : "";
              return `<span class="akk-rail-seg ${cls}"></span>`;
            })
            .join("")}
        </div>
        <span class="akk-counter">${currentIdx + 1} / ${set.length}</span>
      </div>`;
  }

  /* The round's summary: one table, so article, noun and answer line up down the page.
     First the nouns missed on the first try (the tapped article struck through, and
     "2. Versuch ✓" when the retry got it), then those right at once. The plural sits under
     the noun, so the table keeps three columns at 390px. */
  const doneNoun = (q) => q.lemma ?? q.prompt.replace("___", "").trim();
  function doneRowHtml(q, wrong) {
    const plural = q.plural && !q.pluralOnly
      ? `<span class="akk-done-plural"><b class="akk-art akk-art--plural">die</b> ${q.plural}</span>`
      : "";
    let answer;
    if (wrong) {
      const pick = state.progress[q.id].wrongPick;
      const second = state.retryProgress[q.id]?.solved
        ? `<span class="akk-done-second">${t("pw.done.secondTryShort", "2. Versuch ✓")}</span>`
        : "";
      answer = (pick && pick !== q.answer
        ? `<s class="akk-done-pick" lang="es" title="${attr(t("pw.done.yourPick", "Deine Antwort: {a}", { a: pick }))}">${pick}</s>`
        : `<span class="akk-done-x">✗</span>`) + second;
    } else {
      answer = `<span class="akk-done-ok" title="${attr(t("pw.done", "richtig"))}">✓</span>`;
    }
    return `
          <tr class="akk-done-row${wrong ? " akk-done-row--wrong" : ""}">
            <td class="akk-done-art" dir="ltr">${articleHtml(q)}</td>
            <td class="akk-done-word" dir="ltr" lang="es"><span class="akk-done-noun">${doneNoun(q)}</span>${plural}</td>
            <td class="akk-done-ans">${answer}</td>
          </tr>`;
  }
  function missedListHtml(missed, right) {
    const group = (list, wrong, title) => list.length
      ? `
        <tbody>
          <tr class="akk-done-group akk-done-group--${wrong ? "wrong" : "right"}"><th colspan="3" scope="colgroup">${title} <span class="akk-done-count">${list.length}</span></th></tr>
          ${list.map((q) => doneRowHtml(q, wrong)).join("")}
        </tbody>`
      : "";
    return `
      ${missed.length ? "" : `<p class="akk-done-clean">${t("pw.done.clean", "Alles beim ersten Mal richtig.")}</p>`}
      <table class="akk-done-table">
        <thead><tr>
          <th scope="col">${t("pw.done.colArticle", "Artikel")}</th>
          <th scope="col">${t("pw.done.colNoun", "Nomen")}</th>
          <th scope="col">${t("pw.done.colAnswer", "Deine Antwort")}</th>
        </tr></thead>
        ${group(missed, true, t("pw.done.wrongTitle", "Beim ersten Mal falsch"))}
        ${group(right, false, t("pw.done.rightTitle", "Beim ersten Mal richtig"))}
      </table>`;
  }

  /* Regi's line about the round, from its numbers: the amount and the effort, never the
     person, and no exclamation marks. Gone with the mascots (CSS), like Regi. */
  function moodHtml(set, missed) {
    const n = missed.length;
    const k = missed.filter((q) => state.retryProgress[q.id]?.solved).length;
    let say;
    let more = "";
    if (!n) say = t("pw.mood.clean", "Alles richtig. Ruhig so weitermachen.");
    else if (n / set.length > 0.5) {
      say = t("pw.mood.hard", "Schwierige Runde. Die Endungs-Regeln helfen bei genau diesen Wörtern.");
      if (document.querySelector("[data-regel-open]")) more = ` <button type="button" class="akk-done-save-link akk-done-regel" data-done-regel>${t("pw.mood.toRule", "Zur Regel")}</button>`;
    } else if (k) say = t("pw.mood.retried", "{n} Fehler, {k} davon im zweiten Versuch richtig. Genau so bleibt es hängen.", { n, k });
    else say = t("pw.mood.list", "Die {n} hier sind deine Lernliste. Morgen kurz wiederholen, dann sitzen sie.", { n });
    return `<p class="akk-done-mood">${say}${more}</p>`;
  }

  /* Under the summary, Regi says where this round went: signed out, only into this
     browser (and how to keep it); signed in, into the account, with the way to Fortschritt.
     With the mascots off the line stays and Regi goes (CSS). */
  function saveNoteHtml(mood = "") {
    const signedIn = document.documentElement.dataset.auth === "in";
    const next = encodeURIComponent(location.pathname + location.search);
    const say = signedIn
      ? t("pw.done.savedAccount", "Gespeichert. Deinen Fortschritt und deine Fehler findest du jederzeit wieder.")
      : t("pw.done.savedLocal", "Dein Fortschritt und deine Fehler sind nur in diesem Browser gespeichert. Melde dich an, dann gehen sie nicht verloren.");
    const link = signedIn
      ? `<a class="akk-done-save-link" href="${withBase("/progress")}">${t("pw.done.toProgress", "Zum Fortschritt")}</a>`
      : `<a class="akk-done-save-link" href="${withBase("/account")}?next=${next}">${t("pw.done.signIn", "Anmelden und speichern")}</a>`;
    return `
      <div class="akk-done-save${signedIn ? "" : " akk-done-save--local"}">
        <span class="akk-done-save-who" aria-hidden="true">${mascotSvg({ name: "regi", expr: "happy", size: 52, label: "" })}</span>
        <div class="akk-done-save-txt">${mood}<p>${say}</p>${link}</div>
      </div>`;
  }

  // One cheer per finished round, not one per re-render.
  let cheeredGroup = null;

  function renderFocusShell() {
    const set = currentSet();
    const seq = currentSeq();
    const idx = state.focusIndex[state.group];

    if (idx < seq.length && cheeredGroup === state.group) cheeredGroup = null;
    if (idx >= seq.length) {
      const correct = set.filter((q) => state.progress[q.id].solved).length;
      if (cheeredGroup !== state.group) {
        cheeredGroup = state.group;
        // After this render has landed, so the overlay sits over the finished screen.
        setTimeout(() => celebrateRound(correct, set.length), 0);
        if (onRoundEnd) {
          const wrong = set.filter((q) => state.progress[q.id].revealed);
          onRoundEnd({
            total: set.length,
            correct,
            wrong: wrong.length,
            retriedRight: wrong.filter((q) => state.retryProgress[q.id]?.solved).length,
          });
        }
      }
      // wrongFlow with the host's actions: the nouns missed on the first try, and a way to
      // practise exactly those. Otherwise the done screen is the one every trainer had.
      const summary = advanceOnWrong && doneActions;
      const missed = summary ? set.filter((q) => state.progress[q.id].revealed) : [];
      const right = summary ? set.filter((q) => state.progress[q.id].solved && !state.progress[q.id].revealed) : [];
      return `
        <div class="akk-focus-done akk-anim-in">
          <div class="akk-focus-done-score" dir="ltr">${correct} / ${set.length}</div>
          <p>${hasTiers ? t("pw.done.inGroup", "richtig in „{g}“", { g: t(`akk.diff.${state.group}`, state.group) }) : t("pw.done", "richtig")}</p>
          ${summary ? missedListHtml(missed, right) + saveNoteHtml(moodHtml(set, missed)) : ""}
          <div class="akk-focus-done-actions">
            <button class="akk-btn" id="akk-zurueck" type="button">${t("pw.back", "← Zurück")}</button>
            ${summary
              ? `${missed.length ? `<button class="akk-btn akk-btn-primary" id="akk-done-missed" type="button">${t("pw.done.onlyThese", "Nur diese üben ({n})", { n: missed.length })}</button>` : ""}
                 <button class="akk-btn${missed.length ? "" : " akk-btn-primary"}" id="akk-done-more" type="button">${t("ap.continue", "Weiter üben")}</button>`
              : `<button class="akk-btn akk-btn-primary" id="akk-focus-restart" type="button">${t("quiz.restart", "Nochmal üben")}</button>`}
          </div>
        </div>`;
    }

    const entry = seq[idx];
    const q = entry.q;
    const p = progressOf(entry);
    const revealed = p.revealed;
    const solved = p.solved;
    const settled = solved || revealed;
    return `
      <div class="akk-anim-in">
        ${progressRailHtml(seq, idx)}
        <div class="akk-focus-card${entry.retry ? " akk-focus-card--again" : ""}" data-qid="${q.id}" data-settled="${settled}">
          ${entry.retry ? `<span class="akk-again">${t("pw.again", "Nochmal")}</span>` : ""}
          <p class="akk-focus-sentence">${revealed && advanceOnWrong && q.prompt.includes("___")
            // The noun in full once the answer is out, its article in colour: „die Dividende".
            // One LTR span: the sentence is a flex row, which an Arabic UI would reverse
            // into „Dividende die".
            ? `<span dir="ltr" lang="es">${q.prompt.replace("___", articleHtml(q))}</span>`
            : sentenceHtml(q.prompt)}${hearHtml(q, { slow: true })}</p>
          <div class="akk-pills">
            ${q.options
              .map((opt) => {
                const cls = pillClass(q, p, opt);
                return `<button class="akk-pill ${cls}" type="button" data-opt="${opt}" ${settled ? "disabled" : ""}>${opt}</button>`;
              })
              .join("")}
          </div>
          ${root.dataset.instruction
            // A host trainer that is not about articles says its own line (data-instruction
            // on the root) — the Präpositionen trainer asks "Welche Präposition passt?".
            ? `<p class="akk-focus-instruction">${attr(root.dataset.instruction)}</p>`
            : `<p class="akk-focus-instruction" data-ls="${attr(t("pw.instruction", "Wähle den passenden Artikel."))}" data-ls-leicht="${attr(t("pw.instruction.leicht", "Was passt: der, die oder das? Klicke auf ein Wort."))}">${t("pw.instruction", "Wähle den passenden Artikel.")}</p>`}
          ${q.plural && !root.dataset.instruction
            ? `<p class="akk-focus-plural">${t("pw.plural", "Plural:")} <b lang="es">${q.plural}</b></p>`
            : ""}
          <div class="akk-feedback" id="akk-focus-feedback">
            ${
              revealed
                ? `<div class="akk-feedback-row">
                     <span class="akk-feedback--incorrect">${t("pw.correctForm", "Die richtige Form ist „{a}“.", { a: q.answer })}</span>
                     <button class="akk-btn akk-btn-primary" id="akk-weiter" type="button">${t("quiz.next", "Weiter")}</button>
                   </div>
                   ${whyHtml(q)}`
                : solved
                ? `<div class="akk-feedback-row">
                     <span class="akk-feedback--correct">${t("pw.right", "Richtig.")}</span>
                     <button class="akk-btn akk-btn-primary" id="akk-weiter" type="button">${t("quiz.next", "Weiter")}</button>
                   </div>
                   ${whyHtml(q)}`
                : ""
            }
          </div>
          ${mfLink(q)}
        </div>
      </div>`;
  }

  // The auto-advance after an answer is a timer; going back, switching mode or remounting
  // inside that window must not have it fire afterwards and skip a card. It lives on the
  // root (see the top of the mount), and every way of moving on clears it first, so a tap
  // during the pause moves exactly one card.
  function clearAdvance() {
    clearTimeout(root._practiceTimer);
    root._practiceTimer = null;
  }
  function scheduleAdvance(ms) {
    clearAdvance();
    root._practiceTimer = setTimeout(() => {
      root._practiceTimer = null;
      goToFocusIndex(state.focusIndex[state.group] + 1);
    }, ms);
  }
  // Whether the last answer came from the keyboard (Enter/Space on a pill fires a click with
  // detail 0). wrongFlow only: the pause is longer, and focus is put back on the card after
  // each step instead of being dropped on <body> by the re-render.
  let keyboard = false;
  function goToFocusIndex(nextIdx) {
    clearAdvance();
    state.focusIndex[state.group] = Math.max(0, nextIdx);
    render();
    if (advanceOnWrong && keyboard) {
      root.querySelector(".akk-pill:not([disabled]), #akk-weiter, #akk-focus-restart")?.focus({ preventScroll: true });
    }
  }

  // A thin bar under the verdict that fills while the pause runs, so moving on by itself
  // does not come as a surprise, and „Anhalten" beside Weiter: it stops the pause, and the
  // card stays until Weiter (time to read, to listen again, to look something up).
  function showCountdown(ms) {
    const box = root.querySelector("#akk-focus-feedback");
    if (!box) return;
    box.insertAdjacentHTML("afterbegin", `<span class="akk-autoadv" aria-hidden="true" style="--akk-autoadv:${ms}ms"></span>`);
    const weiter = box.querySelector("#akk-weiter");
    if (!weiter) return;
    weiter.insertAdjacentHTML("beforebegin", `<button class="akk-btn akk-pause" id="akk-pause" type="button"><span aria-hidden="true">❚❚</span> ${t("pw.pause", "Anhalten")}</button>`);
    const pause = box.querySelector("#akk-pause");
    pause.addEventListener("click", () => {
      clearAdvance();
      box.querySelector(".akk-autoadv")?.remove();
      pause.remove();
      weiter.focus({ preventScroll: true });
      announce(t("pw.paused", "Angehalten. Weiter geht es mit „Weiter“."));
    });
  }

  if (advanceOnWrong) {
    // Any tap on the card during the pause moves on now. Buttons keep their own job (the
    // replay chip, Langsam, the sound switch), and the pill that was just tapped is a button
    // too, so the click that answered never counts as the tap that skips.
    root._practiceOnTap = (e) => {
      if (state.mode !== "fokus" || !root._practiceTimer) return;
      if (e.target.closest("button, a, summary") || !e.target.closest(".akk-focus-card")) return;
      goToFocusIndex(state.focusIndex[state.group] + 1);
    };
    root._practiceOnKey = (e) => {
      if (state.mode !== "fokus" || !root._practiceTimer) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      // On a button, Enter/Space is that button's click: Weiter already moves on.
      if (e.target.closest("button, a, input, textarea, select, summary")) return;
      e.preventDefault();
      goToFocusIndex(state.focusIndex[state.group] + 1);
    };
    // A learner who leaves the tab mid-pause comes back to the card they left, with
    // Weiter, rather than to one that moved on while they were away.
    root._practiceOnHide = () => {
      if (!root._practiceTimer) return;
      clearAdvance();
      render();
    };
  }

  function wireFocus() {
    const back = root.querySelector("#akk-zurueck");
    if (back) back.addEventListener("click", () => goToFocusIndex(state.focusIndex[state.group] - 1));

    const onlyThese = root.querySelector("#akk-done-missed");
    if (onlyThese) {
      onlyThese.addEventListener("click", () => {
        clearAdvance();
        doneActions.practiseMissed(currentSet().filter((q) => state.progress[q.id].revealed));
      });
    }
    root.querySelector("[data-done-regel]")?.addEventListener("click", () => document.querySelector("[data-regel-open]")?.click());
    const more = root.querySelector("#akk-done-more");
    if (more) {
      more.addEventListener("click", () => { clearAdvance(); doneActions.more(); });
      return;
    }

    const restart = root.querySelector("#akk-focus-restart");
    if (restart) {
      restart.addEventListener("click", () => {
        clearAdvance();
        currentSet().forEach((q) => {
          state.progress[q.id] = { answered: false, solved: false, revealed: false, wrongCount: 0 };
          delete state.retryProgress[q.id];
        });
        state.seq[state.group] = currentSet().map((q) => ({ q, retry: false }));
        state.focusIndex[state.group] = 0;
        render();
      });
      return;
    }

    const weiter = root.querySelector("#akk-weiter");
    if (weiter) {
      weiter.addEventListener("click", () => goToFocusIndex(state.focusIndex[state.group] + 1));
    }

    const idx = state.focusIndex[state.group];
    const entry = currentSeq()[idx];
    const question = entry.q;
    const p = progressOf(entry);
    // A retry is played like any card but is never reported: the first answer counts.
    const report = entry.retry ? null : onAnswer;
    if (p.revealed || p.solved) return;

    const pills = [...root.querySelectorAll(".akk-pill")];

    pills.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        pills.forEach((b) => (b.disabled = true));
        const ok = btn.dataset.opt === question.answer;
        p.answered = true;
        keyboard = e.detail === 0;

        if (ok) {
          p.solved = true;
          btn.classList.add("akk-pill--correct", "akk-pill--pop");
          pills.forEach((b) => {
            if (b !== btn) b.classList.add("akk-pill--dim");
          });
          root.querySelector("#akk-focus-feedback").innerHTML = `<span class="akk-feedback--correct">${t("pw.right", "Richtig.")}</span>`;
          mascotHop(root.querySelector("#akk-focus-feedback .akk-feedback--correct"), true);
          speak(question);
          announce(t("pw.right", "Richtig."));
          if (report) report(true, question.id, { firstTry: p.wrongCount === 0 });
          updateSession();
          if (!advanceOnWrong) {
            scheduleAdvance(CORRECT_ADVANCE_DELAY_MS);
          } else if (TEMPOS[getTempo()]) {
            scheduleAdvance(CORRECT_ADVANCE_DELAY_WRONGFLOW_MS * TEMPOS[getTempo()]);
          } else {
            // Tempo „Aus": the solved card with its Weiter, as after a wrong answer.
            render();
            mascotHop(root.querySelector("#akk-focus-feedback .akk-feedback--correct"), true);
            if (keyboard) root.querySelector("#akk-weiter")?.focus({ preventScroll: true });
          }
        } else if (advanceOnWrong) {
          // One wrong tap is enough: the answer is shown, counted as not known, and the
          // card moves on by itself — unless there is a rule or an exception to read.
          p.wrongCount++;
          p.revealed = true;
          p.wrongPick = btn.dataset.opt;
          speak(question);
          if (report) report(false, question.id, { firstTry: false });
          // Missed the first time: it comes back once, a few cards on. Missed again: no third.
          if (!entry.retry) requeue(question, idx);
          render();
          root.querySelector(`.akk-pill[data-opt="${CSS.escape(p.wrongPick)}"]`)?.classList.add("akk-pill--shake");
          announce(`${t("pw.wrong", "Falsch.")} ${t("pw.correctForm", "Die richtige Form ist „{a}“.", { a: question.change ?? question.answer })}`);
          const hold = Boolean(holdAfterWrong?.(question));
          if (keyboard) root.querySelector("#akk-weiter")?.focus({ preventScroll: true });
          const tempo = TEMPOS[getTempo()];
          if (tempo) {
            const ms = ((keyboard ? WRONG_ADVANCE_DELAY_KEYBOARD_MS : WRONG_ADVANCE_DELAY_MS) + (hold ? HOLD_EXTRA_MS : 0)) * tempo;
            scheduleAdvance(ms);
            showCountdown(ms);
          }
        } else {
          p.wrongCount++;
          if (p.wrongCount >= WRONG_ATTEMPTS_BEFORE_REVEAL) {
            p.revealed = true;
            speak(question);
            if (onAnswer) onAnswer(false, question.id, { firstTry: false });
            updateSession();
            render();
          } else {
            btn.classList.add("akk-pill--incorrect", "akk-pill--shake");
            updateSession();
            setTimeout(() => {
              pills.forEach((b) => {
                b.disabled = false;
                b.classList.remove("akk-pill--incorrect", "akk-pill--shake");
              });
            }, WRONG_FLASH_DELAY_MS);
          }
        }
      });
    });
  }

  // ---------- Testmodus ----------
  function renderTestShell() {
    const set = currentSet();
    const solved = set.filter((q) => state.progress[q.id].solved).length;
    const pct = set.length ? Math.round((solved / set.length) * 100) : 0;

    return `
      <div>
        <div class="akk-test-toolbar akk-anim-in">
          <span class="akk-test-count">${t("pw.solved", "{n} / {total} gelöst", { n: solved, total: set.length })}</span>
          <div class="akk-test-rail"><span class="akk-test-rail-fill" style="width:${pct}%"></span></div>
        </div>
        <div class="akk-test-list">
          ${set
            .map((q, i) => {
              const p = state.progress[q.id];
              let badgeContent = String(i + 1);
              let badgeCls = "";
              if (p.solved) {
                badgeContent = "✓";
                badgeCls = " akk-test-badge--solved";
              } else if (p.revealed) {
                badgeContent = "✗";
                badgeCls = " akk-test-badge--revealed";
              }
              const locked = p.solved || p.revealed;
              return `
              <div class="akk-test-row akk-anim-in" data-qid="${q.id}" style="animation-delay:${Math.min(i * 40, 240)}ms">
                <span class="akk-test-badge${badgeCls}">${badgeContent}</span>
                <div class="akk-test-body">
                  <p class="akk-test-sentence">${sentenceHtml(q.prompt)}${hearHtml(q)}</p>
                  <div class="akk-pills">
                    ${q.options
                      .map((opt) => {
                        const cls = p.revealed ? pillClass(q, p, opt) : "";
                        return `<button class="akk-pill ${cls}" type="button" data-opt="${opt}" ${locked ? "disabled" : ""}>${opt}</button>`;
                      })
                      .join("")}
                  </div>
                  <div class="akk-row-why">${p.revealed ? whyHtml(q) : ""}</div>
                  ${mfLink(q, locked)}
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  function updateTestToolbar() {
    const set = currentSet();
    const solved = set.filter((q) => state.progress[q.id].solved).length;
    const pct = set.length ? Math.round((solved / set.length) * 100) : 0;
    const toolbar = root.querySelector(".akk-test-toolbar");
    if (!toolbar) return;
    toolbar.querySelector(".akk-test-count").textContent = t("pw.solved", "{n} / {total} gelöst", { n: solved, total: set.length });
    toolbar.querySelector(".akk-test-rail-fill").style.width = `${pct}%`;
  }

  function wireTest() {
    root.querySelectorAll(".akk-test-row").forEach((row) => {
      const qid = row.dataset.qid;
      const question = allQuestions.find((q) => q.id === qid);
      const p = state.progress[qid];
      if (p.solved || p.revealed) return;

      const pills = [...row.querySelectorAll(".akk-pill")];
      const badge = row.querySelector(".akk-test-badge");
      const whyBox = row.querySelector(".akk-row-why");

      pills.forEach((btn) => {
        btn.addEventListener("click", () => {
          pills.forEach((b) => (b.disabled = true));
          const ok = btn.dataset.opt === question.answer;
          p.answered = true;

          if (ok) {
            p.solved = true;
            btn.classList.add("akk-pill--correct", "akk-pill--pop");
            pills.forEach((b) => {
              if (b !== btn) b.classList.add("akk-pill--dim");
            });
            badge.textContent = "✓";
            badge.classList.add("akk-test-badge--solved", "akk-pill--pop");
            whyBox.insertAdjacentHTML("afterend", mfLink(question));
            speak(question);
            if (onAnswer) onAnswer(true, question.id, { firstTry: p.wrongCount === 0 });
            updateSession();
            updateTestToolbar();
          } else {
            p.wrongCount++;
            // wrongFlow: the first wrong tap settles it here too. A list has no next card to
            // move on to, so that is all it changes in Testmodus.
            if (advanceOnWrong || p.wrongCount >= WRONG_ATTEMPTS_BEFORE_REVEAL) {
              p.revealed = true;
              if (advanceOnWrong) {
                p.wrongPick = btn.dataset.opt;
                btn.classList.add("akk-pill--shake");
                announce(`${t("pw.wrong", "Falsch.")} ${t("pw.correctForm", "Die richtige Form ist „{a}“.", { a: question.change ?? question.answer })}`);
              }
              pills.forEach((b) => {
                const cls = pillClass(question, p, b.dataset.opt);
                if (cls) b.classList.add(cls);
              });
              badge.textContent = "✗";
              badge.classList.add("akk-test-badge--revealed", "akk-pill--pop");
              whyBox.insertAdjacentHTML("afterend", mfLink(question));
              whyBox.innerHTML = whyHtml(question);
              whyBox.firstElementChild.classList.add("akk-anim-in");
              speak(question);
              if (onAnswer) onAnswer(false, question.id, { firstTry: false });
              updateSession();
            } else {
              btn.classList.add("akk-pill--incorrect", "akk-pill--shake");
              updateSession();
              setTimeout(() => {
                pills.forEach((b) => {
                  b.disabled = false;
                  b.classList.remove("akk-pill--incorrect", "akk-pill--shake");
                });
              }, WRONG_FLASH_DELAY_MS);
            }
          }
        });
      });
    });
  }

  // ---------- Public controls ----------
  function setDifficulty(group) {
    clearAdvance();
    state.group = group;
    render();
  }
  function setMode(mode) {
    clearAdvance();
    state.mode = mode;
    render();
  }

  render();
  // Words follow the UI language. One subscription per root: the Artikel-Trainer remounts
  // into the same element for every round.
  root._practiceUiOff?.();
  root._practiceUiOff = onUiText(() => { if (root._practiceQuestions === allQuestions) render(); });

  /* Dev only (?demo=fertig), and the demo dock's "⏭ Ende" (da:demo-finish, our own devices
     only): jump to the done screen with a made-up round — every third noun missed (a wrong
     article "tapped"), every other miss got right on the retry. Questions already answered
     keep their real result. `record` sends the made-up answers through onAnswer like real
     taps, so the misses land in the learner's record (Fortschritt, "Fehler üben"); without
     it nothing is recorded. */
  function demoFinish({ record = false } = {}) {
    clearAdvance();
    const set = currentSet();
    set.forEach((q, i) => {
      const p = state.progress[q.id];
      if (p.answered) return;
      p.answered = true;
      const wrong = i % 3 === 0;
      if (wrong) {
        p.revealed = true;
        p.wrongCount = 1;
        p.wrongPick = (q.options ?? ["der", "die", "das"]).find((o) => o !== q.answer);
        if (i % 2 === 0) state.retryProgress[q.id] = { ...freshRetry(), answered: true, solved: true };
      } else {
        p.solved = true;
      }
      if (record && onAnswer) onAnswer(!wrong, q.id, { firstTry: !wrong });
    });
    state.focusIndex[state.group] = currentSeq().length;
    state.mode = "fokus";
    render();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  root._practiceDemoOff?.();
  const onDemoFinish = (e) => {
    if (root._practiceQuestions !== allQuestions || !root.isConnected) return;
    if (e.detail) e.detail.handled++;
    demoFinish({ record: true });
  };
  addEventListener("da:demo-finish", onDemoFinish);
  root._practiceDemoOff = () => removeEventListener("da:demo-finish", onDemoFinish);

  return { setDifficulty, setMode, groups, hasTiers, demoFinish };
}
