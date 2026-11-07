import { getLang, loadDict, onLangChange } from "./i18n.js";
import { celebrateRound, mascotHop } from "./mascotCelebrate.js";
import { endSet } from "./versuche.js";
import { flagItems, meldenLink } from "./meldung.js";
import { itemFingerprint } from "./meldungRef.js";
import { seededShuffle } from "./seededShuffle.js";

// Shared quiz engine: mode "text" (typed answer) or "choice" (buttons).
/**
 * Turns typed questions into click questions by using the question set's OWN distinct
 * answers as the options — so the legacy grammatik.json topics (4-6 questions, 3-5
 * distinct answers) become clickable without anyone authoring option lists.
 *
 * Deduped case-insensitively: konjunktiv2 carries both "Wäre" (sentence-initial) and
 * "wäre", which would otherwise render as two pills that are the same word. The
 * grader already normalises case, so keeping the first spelling loses nothing.
 */
export function withChoices(questions) {
  const seen = new Map();
  for (const q of questions) {
    const key = String(q.answer).trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, String(q.answer).trim());
  }
  const options = [...seen.values()];
  return questions.map((q) => ({ ...q, options }));
}

/**
 * `meldung(q, i)` returns the item ref for "Problem melden" (docs/problem-melden-tier0-v1.md §2),
 * `i` being the question's index in `questions`; null/absent = no button.
 */
export function mountQuiz(root, questions, { mode = "text", shuffle = true, onDone, onAnswer, showWrongCount = false, meldung } = {}) {
  let dict = null;
  function tr(key, fallback, vars) {
    const base = (dict && dict[key]) ?? fallback;
    if (!vars) return base;
    return base.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  }
  loadDict(getLang()).then((d) => {
    dict = d;
    render();
  });
  onLangChange((code, newDict) => {
    dict = newDict;
    render();
  });

  let order = questions.map((_, i) => i);
  if (shuffle) order = order.sort(() => Math.random() - 0.5);
  let pos = 0;
  let score = 0;
  let wrong = 0;
  const total = order.length;

  // One cheer per finished round, not one per re-render (a language switch redraws).
  let cheered = false;

  // "Problem melden": the question on screen, and what the learner picked for it.
  let given = null; // { pos, answer }; a language switch redraws, so it is not reset per render
  const target = () => {
    if (!meldung || pos >= total) return null;
    const i = order[pos];
    const q = questions[i];
    const ref = meldung(q, i);
    return ref
      ? { ref, fingerprint: itemFingerprint(q), snapshot: () => ({ frage: q.prompt, optionen: q.options, loesung: q.answer, alt: q.alt, erklaerung: q.explain, antwort: given?.pos === pos ? given.answer : null }) }
      : null;
  };
  if (meldung) flagItems(root, ".quiz-prompt", target);

  function render() {
    if (pos >= total) {
      if (!cheered) { cheered = true; celebrateRound(score, total); }
      root.innerHTML = `
        <div class="quiz-done">
          <div class="quiz-done-score">${score} / ${total}</div>
          <p>${tr("quiz.correctAnswered", "richtig beantwortet")}</p>
          <button class="quiz-btn quiz-btn--primary" id="quiz-restart" type="button">${tr("quiz.restart", "Nochmal üben")}</button>
        </div>`;
      root.querySelector("#quiz-restart").addEventListener("click", () => {
        // shuffle: false means the order is part of the exercise (Lesen follows the text).
        if (shuffle) order = order.sort(() => Math.random() - 0.5);
        pos = 0;
        score = 0;
        wrong = 0;
        cheered = false;
        render();
      });
      // One round is one set in the Klassen log; "Nochmal üben" starts the next.
      endSet();
      if (onDone) onDone(score, total);
      return;
    }
    const q = questions[order[pos]];
    let inputHtml;
    // Options in a fixed per-question order (src/lib/seededShuffle.js): the data mostly lists
    // the right answer first, and data order made "always the first one" a winning guess.
    const opts = mode === "choice" ? seededShuffle(q.options, q.prompt) : [];
    if (mode === "choice") {
      inputHtml = `<div class="quiz-choices">${opts
        .map((opt, i) => `<button class="quiz-choice" type="button" data-opt="${i}">${opt}</button>`)
        .join("")}</div>`;
    } else {
      inputHtml = `
        <form id="quiz-form" class="quiz-form" autocomplete="off">
          <input type="text" id="quiz-input" autocomplete="off" placeholder="${tr("quiz.inputPlaceholder", "Antwort eintippen…")}" />
          <button type="submit" class="quiz-btn quiz-btn--primary">${tr("quiz.check", "Prüfen")}</button>
        </form>`;
    }
    const progress = showWrongCount
      ? `<div class="quiz-progress quiz-progress--split"><span>${tr("quiz.progress.question", "Frage {n} / {total}", { n: pos + 1, total })}</span><span>${tr("quiz.progress.scoreSplit", "{score} richtig · {wrong} falsch", { score, wrong })}</span></div>`
      : `<div class="quiz-progress">${tr("quiz.progress.full", "Frage {n} / {total} · {score} richtig", { n: pos + 1, total, score })}</div>`;
    root.innerHTML = `
      ${progress}
      <div class="quiz-prompt">${q.prompt}</div>
      ${inputHtml}
      <div class="quiz-feedback" id="quiz-feedback"></div>`;
    if (meldung) {
      const row = document.createElement("div");
      row.className = "mf-row";
      row.append(meldenLink(target));
      root.append(row);
    }

    const feedback = root.querySelector("#quiz-feedback");

    function lockInputs() {
      root.querySelectorAll(".quiz-choice").forEach((b) => (b.disabled = true));
      const form = root.querySelector("#quiz-form");
      if (form) [...form.elements].forEach((el) => (el.disabled = true));
    }

    const ANSWER_DELAY_MS = 600;

    function checkAnswer(answer, chosenBtn) {
      given = { pos, answer };
      lockInputs();
      if (chosenBtn) chosenBtn.classList.add("quiz-choice--pending");

      setTimeout(() => {
        const norm = (s) =>
          String(s)
            .trim()
            .toLowerCase()
            .replace(/ä/g, "ae")
            .replace(/ö/g, "oe")
            .replace(/ü/g, "ue")
            .replace(/ß/g, "ss");
        const accepted = [q.answer, ...(q.alt || [])].map(norm);
        const ok = accepted.includes(norm(answer));
        if (ok) score++;
        else wrong++;
        if (onAnswer) onAnswer(ok, q);
        feedback.innerHTML = ok
          ? `<span class="quiz-ok">${tr("quiz.correct", "✓ Richtig!")}</span>`
          : `<span class="quiz-no">${tr("quiz.incorrect", "✗ Nicht ganz — richtig: {answer}", { answer: `<strong>${q.answer}</strong>` })}</span>`;
        if (q.explain) feedback.innerHTML += `<div class="quiz-explain">${q.explain}</div>`;
        mascotHop(feedback.querySelector(".quiz-ok, .quiz-no"), ok);
        const nextBtn = document.createElement("button");
        nextBtn.className = "quiz-btn quiz-btn--next";
        nextBtn.type = "button";
        nextBtn.textContent = pos + 1 < total ? tr("quiz.next", "Weiter") : tr("quiz.showResult", "Ergebnis anzeigen");
        nextBtn.addEventListener("click", () => {
          pos++;
          render();
        });
        feedback.appendChild(nextBtn);
        if (mode === "choice") {
          root.querySelectorAll(".quiz-choice").forEach((b) => {
            b.classList.remove("quiz-choice--pending");
            if (norm(b.textContent) === norm(q.answer)) b.classList.add("quiz-choice--correct");
            else if (b === chosenBtn && !ok) b.classList.add("quiz-choice--incorrect");
          });
        }
      }, ANSWER_DELAY_MS);
    }

    if (mode === "choice") {
      root.querySelectorAll(".quiz-choice").forEach((btn) => {
        btn.addEventListener("click", () => checkAnswer(opts[+btn.dataset.opt], btn));
      });
    } else {
      const form = root.querySelector("#quiz-form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        checkAnswer(root.querySelector("#quiz-input").value);
      });
      root.querySelector("#quiz-input").focus();
    }
  }
  render();
}
