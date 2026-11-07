// The typed side of the conjugation trainer: one question at a time, an input with the accent
// key row, two tries. The pill side is mountPracticeWorkspace, which has no typed answers; this
// uses the same card classes and hooks, so a session looks and reports the same either way.
//
// Answers go through judge() in conjugationTrainer.js: one accent off is wrong, with the hint
// "Check the accent." (content-plan §1.2).
import { judge } from "./conjugationTrainer.js";
import { celebrateRound, mascotHop } from "./mascotCelebrate.js";
import { flagItems, meldenLinkHtml, onMeldenClick } from "./meldung.js";
import { itemFingerprint } from "./meldungRef.js";
import { setWaiting } from "./notReady.js";
import { t, onUiText } from "./uiText.js";

const ACCENT_KEYS = ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"];
const WRONG_BEFORE_REVEAL = 2;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * @param {HTMLElement} root
 * @param {object[]} questions  conjugationTrainer questions
 * @param {{ onSessionUpdate?: Function, onAnswer?: Function, onMore?: Function, meldung?: Function }} hooks
 *   `onAnswer(ok, id, { firstTry })` and `onSessionUpdate({ answered, correct, hints, total })`
 *   as in mountPracticeWorkspace; `onMore()` asks the page for a new round.
 */
export function mountTypedDrill(root, questions, { onSessionUpdate, onAnswer, onMore, meldung } = {}) {
  const fresh = () => ({ typed: "", wrong: 0, why: null, solved: false, revealed: false });
  let progress = new Map(questions.map((q) => [q.id, fresh()]));
  let idx = 0;
  let cheered = false;

  if (meldung) {
    const target = (qid) => {
      const q = questions.find((x) => x.id === qid);
      const ref = q && meldung(q);
      return ref
        ? { ref, fingerprint: itemFingerprint(q), snapshot: () => ({ satz: q.prompt, optionen: q.options, loesung: q.answer, erklaerung: q.explain, antwort: progress.get(qid)?.typed ?? null }) }
        : null;
    };
    onMeldenClick(root, (b) => target(b.dataset.mfQid));
    flagItems(root, ".akk-focus-card[data-qid]", (el) => target(el.dataset.qid));
  }

  function report() {
    if (!onSessionUpdate) return;
    const all = [...progress.values()];
    onSessionUpdate({
      answered: all.filter((p) => p.solved || p.revealed).length,
      correct: all.filter((p) => p.solved).length,
      hints: all.filter((p) => p.revealed).length,
      total: questions.length,
    });
  }

  const verdictText = (p) => {
    if (p.why === "accent") return t("vp.checkAccent", "Check the accent.");
    if (p.why === "pronoun") return t("conj.addPronoun", "Add the pronoun too.");
    return t("conj.tryAgain", "Not quite. One more try.");
  };

  function doneHtml() {
    const correct = [...progress.values()].filter((p) => p.solved).length;
    if (!cheered) {
      cheered = true;
      setTimeout(() => celebrateRound(correct, questions.length), 0);
    }
    return `
      <div class="akk-focus-done akk-anim-in">
        <div class="akk-focus-done-score" dir="ltr">${correct} / ${questions.length}</div>
        <p>${esc(t("pw.done", "correct"))}</p>
        <div class="akk-focus-done-actions">
          <button class="akk-btn" type="button" data-back>${esc(t("pw.back", "← Back"))}</button>
          <button class="akk-btn" type="button" data-restart>${esc(t("quiz.restart", "Practice again"))}</button>
          ${onMore ? `<button class="akk-btn akk-btn-primary" type="button" data-more>${esc(t("ap.continue", "Keep practising"))}</button>` : ""}
        </div>
      </div>`;
  }

  function cardHtml(q, p) {
    const settled = p.solved || p.revealed;
    const sentence = settled
      ? q.prompt.replace("___", `<b class="cj-filled">${esc(q.answer)}</b>`)
      : q.prompt.replace("___", '<span class="akk-blank">___</span>');
    const also = q.accepted?.find((f) => f !== q.answer);
    const seg = (i) => (i < idx ? "akk-rail-seg--done" : i === idx ? "akk-rail-seg--current" : "");
    return `
      <div class="akk-anim-in">
        <div class="akk-focus-progress">
          <button type="button" class="akk-back" data-back aria-label="${esc(t("pw.prev", "Previous question"))}" title="${esc(t("pw.prev", "Previous question"))}"${idx === 0 ? " disabled" : ""}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <div class="akk-rail">${questions.map((_, i) => `<span class="akk-rail-seg ${seg(i)}"></span>`).join("")}</div>
          <span class="akk-counter">${idx + 1} / ${questions.length}</span>
        </div>
        <div class="akk-focus-card cj-typed-card" data-qid="${esc(q.id)}" data-settled="${settled}">
          <p class="akk-focus-sentence">${sentence}</p>
          ${settled ? "" : `
          <form class="cj-typed-form" data-form autocomplete="off" novalidate>
            <input class="ak-write-input ${p.wrong ? "is-wrong" : ""}" data-input type="text" lang="es" spellcheck="false" autocapitalize="off" autocorrect="off"
              value="${esc(p.typed)}"
              placeholder="${esc(t("conj.placeholder", "Type the form …"))}"
              aria-label="${esc(t("conj.placeholder", "Type the form …"))}">
            <button class="akk-btn akk-btn-primary" type="submit" data-check>${esc(t("ak.write.check", "Check"))}</button>
          </form>
          <div class="ak-accent-keys" role="group" aria-label="${esc(t("ak.write.keys", "Spanish letters"))}">${ACCENT_KEYS.map((k) => `<button type="button" class="ak-accent-key" data-key="${k}">${k}</button>`).join("")}</div>
          `}
          <p class="ak-write-verdict" aria-live="polite">${!settled && p.wrong ? esc(verdictText(p)) : ""}</p>
          <div class="akk-feedback">
            ${settled ? `
              <div class="akk-feedback-row">
                ${p.solved
                  ? `<span class="akk-feedback--correct">${esc(t("pw.right", "Correct."))}</span>`
                  : `<span class="akk-feedback--incorrect">${esc(t("pw.correctForm", "The correct form is „{a}“.", { a: q.answer }))}</span>`}
                <button class="akk-btn akk-btn-primary" type="button" data-next>${esc(t("quiz.next", "Next"))}</button>
              </div>
              <div class="akk-why">
                <span class="akk-tag">${esc(t("pw.why", "WHY?"))}</span>
                <p class="akk-why-text">${esc(q.explain)}${also ? ` ${esc(t("conj.also", "Also right: {form}.", { form: also }))}` : ""}</p>
                <span class="akk-why-chip" lang="es">${esc(q.change)}</span>
              </div>` : ""}
          </div>
          ${meldung ? meldenLinkHtml(`data-mf-qid="${esc(q.id)}"`) : ""}
        </div>
      </div>`;
  }

  function check(q, p) {
    const res = judge(q, p.typed);
    if (res.ok) {
      p.solved = true;
      p.why = null;
      onAnswer?.(true, q.id, { firstTry: p.wrong === 0 });
      report();
      render();
      mascotHop(root.querySelector(".akk-feedback--correct"), true);
      return;
    }
    p.wrong++;
    p.why = res.why;
    if (p.wrong >= WRONG_BEFORE_REVEAL) {
      p.revealed = true;
      onAnswer?.(false, q.id, { firstTry: false });
    }
    report();
    render();
  }

  function wire(q, p) {
    root.querySelector("[data-back]")?.addEventListener("click", () => go(idx - 1));
    root.querySelector("[data-next]")?.addEventListener("click", () => go(idx + 1));
    root.querySelector("[data-restart]")?.addEventListener("click", () => {
      progress = new Map(questions.map((x) => [x.id, fresh()]));
      cheered = false;
      go(0);
    });
    root.querySelector("[data-more]")?.addEventListener("click", () => onMore?.());
    const input = root.querySelector("[data-input]");
    if (!input) {
      root.querySelector("[data-next]")?.focus({ preventScroll: true });
      return;
    }
    const checkBtn = root.querySelector("[data-check]");
    const syncReady = () => setWaiting(checkBtn, p.typed.trim() ? null : t("conj.typeFirst", "Type the form first."), "[data-input]");
    syncReady();
    input.addEventListener("input", () => { p.typed = input.value; syncReady(); });
    root.querySelector("[data-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      if (p.typed.trim()) check(q, p);
    });
    // Letters a keyboard may not have: they go in at the caret, and the field keeps the focus.
    root.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => {
      const at = input.selectionStart ?? input.value.length;
      input.setRangeText(b.dataset.key, at, input.selectionEnd ?? at, "end");
      p.typed = input.value;
      syncReady();
      input.focus({ preventScroll: true });
    }));
    if (root.offsetParent) input.focus({ preventScroll: true });
  }

  function render() {
    const q = questions[idx];
    if (!q) {
      root.innerHTML = doneHtml();
      wire(null, null);
      return;
    }
    const p = progress.get(q.id);
    root.innerHTML = cardHtml(q, p);
    wire(q, p);
  }

  function go(next) {
    idx = Math.min(Math.max(0, next), questions.length);
    render();
  }

  render();
  report();
  root._typedUiOff?.();
  root._typedUiOff = onUiText(() => { if (root._typedQuestions === questions) render(); });
  root._typedQuestions = questions;
  return { stop() { root._typedUiOff?.(); root._typedQuestions = null; root.innerHTML = ""; } };
}
