// Engine for the grammar workspaces at /<topic>.
//
// Generalized from the original "Verben mit Präpositionen" page (src/lib/prepositionWorkspace.js,
// now retired): that page's five exercise widgets are topic-agnostic, so they live here as five
// renderers keyed by `type` and are driven entirely by src/data/grammatik/<topic>.json. Adding a
// topic is a JSON file — no new page, no new engine.
//
// Behavioural rule carried over from the original, worth keeping: the text-input exercises
// (fill, table, story) never re-render on keystroke, only on an explicit Prüfen/Zurücksetzen
// click, so typing never blows away caret position or focus. match and build have no text
// inputs, so they can safely re-render on every click.

import { t } from "./uiText.js";
import { waitAttrs } from "./notReady.js";
import { mascotHop } from "./mascotCelebrate.js";
import { recordResult } from "./fehler.js";
import { hintItem } from "./versuche.js";
import { seededShuffle } from "./seededShuffle.js";
import { markedHtml, unmark } from "./markedText.js";
import { meldenLink, flagElement, flagItems } from "./meldung.js";
import { accepts, distinctOptions } from "./answerMatch.js";
import { exerciseFingerprint, fingerprint, grammarItems } from "./meldungRef.js";
import { mountZimmer } from "./zimmerUebung.js";
import { eulerIconSvg } from "./eulerArt.js";

// A friendly flag next to the verb hint for items marked `irregular: true` in the topic
// JSON (sein → sei/seid, sprechen → sprich): the form can't be built from the rule, so
// say so before the learner tries.
function irregularHtml(item) {
  if (!item.irregular) return "";
  const note = t("vp.irregular.note", "Unregelmäßig: Diese Form musst du dir merken.");
  return ` <span class="vp-irregular" title="${escapeHtml(note)}">${escapeHtml(t("vp.irregular", "unregelmäßig"))}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function modelAnswer(answer) {
  return Array.isArray(answer) ? answer.join(" / ") : answer;
}

/* -------------------------------------------------------------- choices ----
 * Learners click, they do not type. Every answerable slot in fill/table/story is a
 * pill. The option set is the exercise's own distinct answers — or an explicit
 * `choices` list where the data declares one — so this needed no new content.
 *
 * Up to INLINE_MAX options render in full on each item, which reads as a direct
 * question. Above that each item gets a short multiple choice of its own (nearChoices):
 * 14 options across 14 blanks would be ~200 buttons, and the shared word bank that used
 * to stand in for them scrolled out of sight by the third question.
 * -------------------------------------------------------------------------- */
const INLINE_MAX = 8;

function optionSet(ex, answers) {
  if (Array.isArray(ex.choices) && ex.choices.length) return distinctOptions(ex.choices);
  const flat = answers
    .map((a) => (Array.isArray(a) ? a[0] : a))
    .filter((a) => a != null && String(a).trim() !== "")
    .map(String);
  return distinctOptions(flat);
}

/* Per-item multiple choice for exercises whose option set is too big to repeat on every
 * item. A shared bank above the items scrolled away after the third question and left
 * learners scrolling up and down; instead each item gets its answer plus the forms that
 * look most like it (hätte → hätten, wärst, wäre), which is also the harder, fairer
 * question — the near misses are the ones worth telling apart. */
const ITEM_CHOICES = 4;
const fold = (w) => String(w).toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
function editDistance(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}
function nearChoices(answer, pool) {
  const right = String(Array.isArray(answer) ? answer[0] : answer);
  const target = fold(right);
  const others = pool
    .filter((o) => !accepts(answer, o))
    .map((o) => ({ o, d: editDistance(target, fold(o)) + Math.random() * 0.5 }))
    .sort((x, y) => x.d - y.d)
    .slice(0, ITEM_CHOICES - 1)
    .map((x) => x.o);
  return shuffleList([right, ...others]);
}

function shuffleList(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stateClass(checked, ok, chosen) {
  if (!checked) return chosen ? "is-chosen" : "";
  // The right answer the learner did not pick is shown, but quieter than their own hit.
  return ok ? (chosen ? "is-correct" : "is-answer") : chosen ? "is-wrong" : "";
}

// Answer buttons that show a picture above the word (exercise `choiceArt`), e.g. the
// three Euler diagrams of nutzen-benutzen: the learner picks the picture, not a term.
const CHOICE_ART = { euler: eulerIconSvg };

/** Inline pill row for one slot. */
function pillsHtml(options, idx, value, checked, answer, art) {
  const icon = CHOICE_ART[art];
  return `<span class="vp-pills${icon ? " vp-pills--art" : ""}">${options
    .map((o) => {
      const chosen = value === o;
      const ok = checked && accepts(answer, o);
      const body = icon
        ? `<span class="vp-pill-art">${icon(o)}</span><span class="vp-pill-label">${escapeHtml(o)}</span>`
        : escapeHtml(o);
      return `<button type="button" class="vp-pill-opt${icon ? " vp-pill-opt--art" : ""} ${stateClass(checked, ok, chosen)}" data-slot="${idx}" data-val="${escapeHtml(o)}" ${checked ? "disabled" : ""}>${body}</button>`;
    })
    .join("")}</span>`;
}

const POP = "vp-pop .3s ease";
const SHAKE = "vp-shake .35s ease";

// In the UI language (uiText.js). The three buttons also carry data-i18n, so a language
// switch repaints them in place; a feedback line follows on the next answer.
const LABEL = {
  get check() { return `<span data-i18n="quiz.check">${escapeHtml(t("quiz.check", "Prüfen"))}</span>`; },
  get reset() { return `<span data-i18n="vp.reset">${escapeHtml(t("vp.reset", "Zurücksetzen"))}</span>`; },
  get retry() { return `<span data-i18n="vp.retry">${escapeHtml(t("vp.retry", "Nochmal"))}</span>`; },
  get correct() { return escapeHtml(t("quiz.correct", "✓ Richtig!")); },
  wrongIs: (a) => escapeHtml(t("vp.wrongIs", "✗ Richtig wäre: „{a}“", { a })),
  get allPairs() { return escapeHtml(t("vp.allPairs", "✓ Alle Paare gefunden!")); },
  get allCorrect() { return escapeHtml(t("vp.allCorrect", "✓ Alles richtig!")); },
  fillScore: (n, total) => escapeHtml(t("vp.fill.score", "{n} von {total} richtig", { n, total })),
  fillOpen: (n) => escapeHtml(t("vp.fill.open", "{n} offen", { n })),
  get someWrong() { return escapeHtml(t("vp.someWrong", "Noch nicht alles richtig — markierte Lücken prüfen.")); },
  // Zuordnen: one line that says what to do next, and what just went wrong.
  get matchStart() { return escapeHtml(t("vp.match.start", "① Tippen Sie links auf einen Satz.")); },
  matchNext: (n) => escapeHtml(t("vp.match.next", "② Und jetzt rechts: Was passt zu {n}?", { n })),
  matchWrong: (l, n) => escapeHtml(t("vp.match.wrong", "✗ {l} passt nicht zu {n}. Wählen Sie rechts eine andere Antwort.", { l, n })),
  get wrongOrder() { return escapeHtml(t("vp.wrongOrder", "✗ Reihenfolge nicht korrekt — versuch's nochmal.")); },
  // Satzbau: what is right so far, and where it goes wrong.
  get buildFrom() { return escapeHtml(t("vp.build.from", "Bis hierhin stimmt's. Ab dem roten Wort tippst du einfach weiter.")); },
  get buildFirst() { return escapeHtml(t("vp.build.first", "Schon das erste Wort passt nicht. Tipp einfach neu.")); },
  get buildShow() { return `<span data-i18n="vp.build.show">${escapeHtml(t("vp.build.show", "Lösung zeigen"))}</span>`; },
};

/* The demo dock's "⏭ Ende" (da:demo-finish, our own devices only): every open item gets a
   made-up answer — every third one wrong — and the exercise is checked, so the corrections
   show and the misses go to "Meine Fehler" through the usual notify(). Answers already
   given stay. `demoWrong(i)` picks the items; `demoPick` the right or a wrong option. */
const demoWrong = (i) => i % 3 === 1;
function demoPick(opts, answer, wrong) {
  return opts.find((o) => accepts(answer, o) !== wrong) ?? (wrong ? "–" : modelAnswer(answer));
}

/* ---------------------------------------------------------------- fill ----
 * Choose everything first, check once at the end (Edgar, 2026-10-15): one „Prüfen" under
 * the list instead of one per sentence. Items left open are fine — they are neither marked
 * nor counted, and stay open to answer after the check; Prüfen comes back as soon as one of
 * them has a choice. A wrong item keeps its own „Nochmal", so it can be tried again alone. */
function mountFill(root, ex, notify) {
  // `also`: a second answer that is just as right (auf den / einen hohen Berg). It counts, and
  // after a right answer the learner sees the other one too: „Auch richtig: …“.
  const rightOf = (item) => (item.also ? [].concat(item.answer, item.also) : item.answer);
  const isRight = (item, v) => accepts(rightOf(item), v);
  const answers = ex.items.map((it) => it.answer);
  const options = shuffleList(optionSet(ex, answers));
  // Too many options to repeat on every item: each gets its own short multiple choice
  // (its `choices` if the data has them) instead of a bank that scrolls out of sight.
  const many = options.length > INLINE_MAX;
  const itemOptions = ex.items.map((it) =>
    Array.isArray(it.choices) && it.choices.length ? shuffleList(it.choices) : many ? nearChoices(it.answer, options) : null);
  // `fresh` = the items of the last check: only they pop/shake, not every earlier one.
  const state = { values: {}, checked: {}, fresh: new Set(), checkedOnce: false };

  function render() {
    const items = ex.items
      .map((item, idx) => {
        const val = state.values[idx] || "";
        const checked = !!state.checked[idx];
        const ok = checked && isRight(item, val);
        const feedback = checked
          ? `<span class="vp-feedback ${ok ? "is-correct" : "is-wrong"}">${ok ? LABEL.correct : LABEL.wrongIs(modelAnswer(item.answer))}</span>
             ${ok ? "" : `<button type="button" class="vp-link-btn" data-reset="${idx}">${LABEL.retry}</button>`}`
          : "";
        const opts = itemOptions[idx] ?? options;
        const control = pillsHtml(opts, idx, val, checked, rightOf(item));
        const others = ok && item.also ? [modelAnswer(item.answer), ...[].concat(item.also)].filter((a) => !accepts(a, val)) : [];
        // Few options: on a wide card they sit beside the sentence, not under it (CSS).
        const side = opts.length <= 4 ? " vp-fill-item--side" : "";
        return `
          <div class="vp-fill-item${side}${checked ? (ok ? " is-correct" : " is-wrong") : ""}${state.fresh.has(idx) ? " is-fresh" : ""}" data-mitem="${idx}">
            <p class="vp-fill-prompt">${escapeHtml(item.prompt)}</p>
            ${item.hint ? `<p class="vp-fill-hint">${escapeHtml(item.hint)}${irregularHtml(item)}</p>` : ""}
            <div class="vp-fill-row">${control}${feedback}</div>
            ${others.length ? `<p class="vp-fill-why" lang="de"><b>${escapeHtml(t("vp.fillAlso", "Auch richtig:"))}</b> ${others.map((a) => `„${escapeHtml(a)}“`).join(", ")}</p>` : ""}
            ${checked && !ok && item.why ? `<p class="vp-fill-why" lang="de"><b>${escapeHtml(t("vp.fillWhy", "Warum?"))}</b> ${escapeHtml(item.why)}</p>` : ""}
          </div>`;
      })
      .join("");
    const pending = ex.items.some((_, i) => !state.checked[i] && state.values[i]);
    const done = Object.keys(state.checked).map(Number);
    const right = done.filter((i) => isRight(ex.items[i], state.values[i] || "")).length;
    const open = ex.items.length - done.length;
    const summary = state.checkedOnce && done.length
      ? `<span class="vp-feedback ${right === done.length ? "is-correct" : "is-wrong"}" data-fill-summary>${right === ex.items.length ? LABEL.allCorrect : LABEL.fillScore(right, done.length)}${open ? ` · ${LABEL.fillOpen(open)}` : ""}</span>`
      : "";
    root.classList.add("vp-fill-list");
    root.innerHTML = `${items}
      <div class="vp-actions vp-fill-actions">
        ${ex.instant ? "" : `<button type="button" class="vp-btn-check" data-fill-check${pending ? "" : open ? waitAttrs(t("vp.fillPick", "Tippen Sie zuerst in einem Satz ein Wort an."), ".vp-fill-item:not(.is-correct):not(.is-wrong) .vp-pills") : " disabled"}>${LABEL.check}</button>`}
        ${state.checkedOnce || pending ? `<button type="button" class="vp-link-btn" data-fill-reset>${LABEL.reset}</button>` : ""}
        ${summary}
      </div>`;
    state.fresh = new Set();

    root.querySelectorAll("[data-val]").forEach((b) => {
      b.addEventListener("click", () => {
        state.values[+b.dataset.slot] = b.dataset.val;
        // `instant` exercises judge a sentence the moment a word is tapped: the verdict and
        // its „Warum?" come right away, no „Prüfen" round trip.
        if (ex.instant) checkItems([+b.dataset.slot]); else render();
      });
    });
    root.querySelector("[data-fill-check]")?.addEventListener("click", check);
    root.querySelector("[data-fill-reset]")?.addEventListener("click", resetAll);
    root.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", () => reset(+b.dataset.reset)));
  }
  function check() {
    // Every answered, not yet checked item at once; the open ones are left alone.
    checkItems(ex.items.map((_, idx) => idx));
  }
  function checkItems(idxs) {
    idxs.forEach((idx) => {
      const item = ex.items[idx];
      if (state.checked[idx] || !state.values[idx]) return;
      state.checked[idx] = true;
      state.fresh.add(idx);
      notify(isRight(item, state.values[idx]), {
        itemId: idx, prompt: item.prompt + (item.hint ? ` (${item.hint})` : ""), expected: modelAnswer(item.answer), given: state.values[idx],
      });
    });
    state.checkedOnce = true;
    render();
    // Regi (grammar) hops in next to the verdict, as on the tables — on an instant
    // exercise only once the last sentence is done, not on every tap.
    if (ex.instant && Object.keys(state.checked).length < ex.items.length) return;
    const fb = root.querySelector("[data-fill-summary]");
    mascotHop(fb, fb?.classList.contains("is-correct"), "regi");
  }
  function reset(idx) {
    delete state.values[idx];
    delete state.checked[idx];
    render();
  }
  function resetAll() {
    state.values = {};
    state.checked = {};
    state.checkedOnce = false;
    render();
  }
  function demo() {
    ex.items.forEach((item, idx) => {
      if (!state.values[idx]) state.values[idx] = demoPick(itemOptions[idx] ?? options, item.answer, demoWrong(idx));
    });
    check();
  }
  render();
  return { given: (k) => state.values[k] ?? "", demo };
}

/* --------------------------------------------------------------- match ---- */
function mountMatch(root, ex, notify) {
  const order = ex.pairs.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // `fresh` = the pair just solved, so only it pops on the re-render.
  // `misses` counts wrong picks per left item; from the second miss the right answer glows
  // (session replays: learners rage-tapped after several misses). `nudge` = a right-hand tap
  // came before any left pick, so the step line and the left column shake instead of nothing.
  const state = { selectedLeft: null, solved: [], wrong: null, fresh: null, misses: {}, nudge: false };
  // A pair's two labels: the number on the left, the letter on the right.
  const letterOf = (rightIdx) => String.fromCharCode(65 + order.indexOf(rightIdx));

  function render() {
    const left = ex.pairs
      .map((p, i) => {
        const solved = state.solved.includes(i);
        const wrong = !!(state.wrong && state.wrong.left === i);
        const selected = state.selectedLeft === i;
        const anim = state.fresh === i ? POP : wrong || (state.nudge && !solved) ? SHAKE : "none";
        // A solved pair says what it was paired with, so the solution stays readable.
        const tag = solved ? `<em class="vp-match-tag">✓ ${letterOf(i)}</em>` : "";
        return `<button type="button" class="vp-match-btn ${solved ? "is-solved" : ""} ${selected ? "is-selected" : ""}" data-left="${i}" ${solved ? "disabled" : ""} style="animation:${anim}"><strong>${i + 1}</strong>${markedHtml(p.q)}${tag}</button>`;
      })
      .join("");
    const right = order
      .map((rightIdx, pos) => {
        const solved = state.solved.includes(rightIdx);
        const wrong = !!(state.wrong && state.wrong.right === rightIdx);
        const anim = state.fresh === rightIdx ? POP : wrong ? SHAKE : "none";
        const tag = solved ? `<em class="vp-match-tag">✓ ${rightIdx + 1}</em>` : "";
        // Waiting for a right-hand pick: the open answers say so.
        const ready = state.selectedLeft != null && !solved;
        const hint = ready && rightIdx === state.selectedLeft && (state.misses[rightIdx] ?? 0) >= 2;
        return `<button type="button" class="vp-match-btn ${solved ? "is-solved" : ""} ${wrong ? "is-wrong" : ""} ${ready ? "is-ready" : ""} ${hint ? "is-hint" : ""}" data-right="${rightIdx}" ${solved ? "disabled" : ""} style="animation:${anim}"><strong>${String.fromCharCode(65 + pos)}</strong>${markedHtml(ex.pairs[rightIdx].a)}${tag}</button>`;
      })
      .join("");
    const done = state.solved.length === ex.pairs.length;
    // The step line: what to do now, or why the last pick was wrong. It stays until the
    // next tap — the wrong pair is no longer wiped after 0.7 s.
    const step = done ? "" : state.wrong
      ? `<p class="vp-match-step is-wrong" role="status">${LABEL.matchWrong(letterOf(state.wrong.right), state.wrong.left + 1)}</p>`
      : `<p class="vp-match-step" role="status"${state.nudge ? ` style="animation:${SHAKE}"` : ""}>${state.selectedLeft == null ? LABEL.matchStart : LABEL.matchNext(state.selectedLeft + 1)}</p>`;
    state.fresh = null;
    state.nudge = false;

    root.innerHTML = `
      ${step}
      <div class="vp-match-grid">
        <div class="vp-match-col">${left}</div>
        <div class="vp-match-col">${right}</div>
      </div>
      <div class="vp-actions">
        ${done ? `<span class="vp-feedback is-correct">${LABEL.allPairs}</span>` : ""}
        <button type="button" class="vp-link-btn" data-match-reset>${LABEL.reset}</button>
      </div>`;

    root.querySelectorAll("[data-left]").forEach((b) => b.addEventListener("click", () => selectLeft(+b.dataset.left)));
    root.querySelectorAll("[data-right]").forEach((b) => b.addEventListener("click", () => selectRight(+b.dataset.right)));
    root.querySelector("[data-match-reset]").addEventListener("click", reset);
  }
  function selectLeft(i) {
    // A second tap on the chosen one keeps it chosen: toggling it off read as "broken"
    // to learners who tapped again to be sure. Another left tap switches the choice.
    if (state.solved.includes(i) || state.selectedLeft === i) return;
    state.selectedLeft = i;
    state.wrong = null;
    render();
  }
  function selectRight(rightIdx) {
    const { selectedLeft, solved } = state;
    if (solved.includes(rightIdx)) return;
    if (selectedLeft == null) {
      state.nudge = true;
      render();
      return;
    }
    if (selectedLeft === rightIdx) {
      state.solved = [...state.solved, selectedLeft];
      state.fresh = selectedLeft;
      state.selectedLeft = null;
      state.wrong = null;
      notify(true, selectedLeft);
      render();
    } else {
      // The left one stays chosen: the next tap on the right is the next try.
      state.wrong = { left: selectedLeft, right: rightIdx };
      state.misses = { ...state.misses, [selectedLeft]: (state.misses[selectedLeft] ?? 0) + 1 };
      notify(false, selectedLeft);
      render();
    }
  }
  function reset() {
    state.selectedLeft = null;
    state.solved = [];
    state.wrong = null;
    state.misses = {};
    render();
  }
  render();
  return { given: (k) => (state.solved.includes(k) ? ex.pairs[k].a : "") };
}

/* --------------------------------------------------------------- table ---- */
// The fixes after a check, one row per mistake: what was asked, what was picked, what is
// right. As one run-on line ("der Arzt · Akkusativ → den · der Arzt · Dativ → dem …") they
// were hard to match back to the rows above.
function fixTableHtml(wrong) {
  const th = (key, de) => `<th data-i18n="${key}">${escapeHtml(t(key, de))}</th>`;
  return `
      <table class="vp-fix-table">
        <thead><tr>${th("vp.fix.task", "Aufgabe")}${th("vp.fix.given", "Ihre Antwort")}${th("vp.fix.right", "Richtig")}</tr></thead>
        <tbody>${wrong.map(({ row, given }) => `<tr>
          <td>${markedHtml(row.term)}</td>
          <td class="vp-fix-given">${given ? `<s>${escapeHtml(given)}</s>` : "–"}</td>
          <td class="vp-fix-right">${escapeHtml(modelAnswer(row.answer))}</td>
        </tr>`).join("")}</tbody>
      </table>`;
}

function mountTable(root, ex, notify) {
  const answers = ex.rows.map((r) => r.answer);
  const options = shuffleList(optionSet(ex, answers));
  // Rows may bring their own choices — the right form next to the typical wrong ones
  // (du nimmst → Nimm / Nehm / Nimmst). Then every row is a real question; a shared bank
  // of each row's answer would be solvable by elimination.
  // Without them, a large option set still goes per row (nearChoices) rather than a bank.
  const many = options.length > INLINE_MAX;
  // Picture choices keep the data's order in every row: each picture stays in its own
  // column, so the learner learns three positions once instead of searching each row.
  const rowOptions = ex.rows.map((r) =>
    Array.isArray(r.choices) && r.choices.length ? (ex.choiceArt ? r.choices : shuffleList(r.choices)) : many ? nearChoices(r.answer, options) : null);
  const perRow = rowOptions.every(Boolean);
  const state = { values: {}, checked: false };

  function render() {
    const head = ex.columns
      ? `<div class="vp-table-row vp-table-head"><span>${escapeHtml(ex.columns[0])}</span><span>${escapeHtml(ex.columns[1])}</span></div>`
      : "";
    const rows = ex.rows
      .map((row, idx) => {
        const val = state.values[idx] || "";
        const control = pillsHtml(rowOptions[idx] ?? options, idx, val, state.checked, row.answer, ex.choiceArt);
        return `
          <div class="vp-table-row" data-mitem="${idx}">
            <span class="vp-table-verb">${markedHtml(row.term)}${irregularHtml(row)}</span>
            ${control}
          </div>`;
      })
      .join("");
    const wrong = state.checked
      ? ex.rows.map((row, i) => ({ row, given: state.values[i] || "" })).filter((w) => !accepts(w.row.answer, w.given))
      : [];
    root.innerHTML = `
      <div class="vp-table${perRow ? " vp-table--choices" : ""}">${head}${rows}</div>
      <div class="vp-actions">
        ${state.checked ? "" : `<button type="button" class="vp-btn-check" data-table-check>${LABEL.check}</button>`}
        <button type="button" class="vp-link-btn" data-table-reset>${LABEL.reset}</button>
        ${state.checked ? `<span class="vp-feedback ${wrong.length ? "is-wrong" : "is-correct"}">${wrong.length ? LABEL.someWrong : LABEL.allCorrect}</span>` : ""}
      </div>
      ${state.checked && wrong.length ? fixTableHtml(wrong) : ""}`;

    root.querySelectorAll("[data-val]").forEach((b) => {
      b.addEventListener("click", () => { state.values[+b.dataset.slot] = b.dataset.val; render(); });
    });
    root.querySelector("[data-table-check]")?.addEventListener("click", check);
    root.querySelector("[data-table-reset]").addEventListener("click", reset);
  }
  function check() {
    state.checked = true;
    ex.rows.forEach((row, idx) =>
      notify(accepts(row.answer, state.values[idx] || ""), {
        itemId: idx, prompt: unmark(row.term), expected: modelAnswer(row.answer), given: state.values[idx] || "",
      }),
    );
    render();
    // Regi (grammar) hops in next to the verdict: cheering, or "oops" with the fixes below.
    const fb = root.querySelector(".vp-feedback");
    mascotHop(fb, fb?.classList.contains("is-correct"), "regi");
  }
  function reset() {
    state.values = {};
    state.checked = false;
    render();
  }
  function demo() {
    if (state.checked) return;
    ex.rows.forEach((row, idx) => {
      if (!state.values[idx]) state.values[idx] = demoPick(rowOptions[idx] ?? options, row.answer, demoWrong(idx));
    });
    check();
  }
  render();
  return { given: (k) => state.values[k] ?? "", demo };
}

/* --------------------------------------------------------------- story ----
 * Sentence rows, not a word bank.
 *
 * The bank sat at the top and the blanks ran down the page, which on a 664px phone
 * put the words 328px above the gap being filled by the time the learner reached
 * the last one: you pick a word, scroll down, and forget which blank you were on.
 * It was also a two-move interaction (word, then blank) in a page whose other
 * exercises answer in one, and nothing said so.
 *
 * So the text breaks at its own sentence boundaries and each sentence carries its
 * own answer row — the same shape as the `fill` exercise directly above it, which
 * means no new mechanic to learn and nothing that can scroll out of reach.
 *
 * Every story uses this layout, whatever its answers cost. The row set used to be
 * capped at five options because the set repeats under EVERY gap, so the price is
 * options x gaps, not options: Perfekt (8 answers, 12 gaps) rendered 96 pills and
 * a 9000px card — the exact wall of choices the bank was invented to avoid — and
 * anything wider fell back to the bank. That price is now paid per gap instead of
 * per exercise (see `gapOptions`), so a text may range over as many answers as it
 * likes — fourteen connectors, ten negation words, one preposition per sentence —
 * without any row growing past a line.
 *
 * One thing the data forced (see src/data/grammatik): 11 of 15 stories have a
 * sentence holding two or three blanks, so a row with more than one gets numbered
 * gaps and numbered answer rows. A single-gap sentence stays unnumbered — a "1"
 * there is noise.
 */

/** Five is where a row still reads as one line of answers on a 390px phone. */
const STORY_ROW_OPTIONS = 5;

/** The options offered under one gap: its own answer plus distractors drawn from
 *  the exercise's other answers. Anything `accepts` would also mark correct here
 *  is excluded, so a row never offers two right answers against one key. */
function gapOptions(pool, answer, max) {
  const correct = String(Array.isArray(answer) ? answer[0] : answer);
  const distractors = shuffleList(pool.filter((o) => o !== correct && !accepts(answer, o)));
  return shuffleList([correct, ...distractors.slice(0, Math.max(0, max - 1))]);
}

/** Cut the segment list into sentences. The boundaries sit INSIDE the text
 *  segments — one routinely ends a sentence and opens the next ("… das Wochenende.
 *  Sie wartet ") — so this splits the text, not just the list.
 *
 *  A row is a sentence and the answers that belong to it, so a piece with no blank
 *  in it is not a row: it joins the next one. Without that, the list-numbered texts
 *  (zweiteilige-konnektoren opens its items "1. Jan möchte …") each spend a row on
 *  a bare "1." above the sentence it numbers. */
function storyRows(segments) {
  const rows = [];
  let cur = [];
  for (const seg of segments) {
    if (seg.text === undefined) { cur.push(seg); continue; }
    let rest = seg.text;
    let m;
    while ((m = rest.match(/^[\s\S]*?[.!?](?=\s|$)/))) {
      cur.push({ text: m[0] });
      rows.push(cur);
      cur = [];
      rest = rest.slice(m[0].length).replace(/^\s+/, "");
      if (!rest) break;
    }
    if (rest) cur.push({ text: rest });
  }
  if (cur.length) rows.push(cur);

  const hasBlank = (r) => r.some((s) => s.blank !== undefined);
  const merged = [];
  let carry = [];
  for (const row of rows.filter((r) => r.length)) {
    // The split ate the whitespace between the two pieces; put one back.
    const next = carry.length ? [...carry, { text: " " }, ...row] : [...row];
    carry = [];
    if (hasBlank(next)) merged.push(next);
    else carry = next;
  }
  // A gapless tail has nothing to carry into, so it rides on the last row.
  if (carry.length) {
    if (merged.length) merged[merged.length - 1].push({ text: " " }, ...carry);
    else merged.push(carry);
  }
  return merged;
}

function mountStory(root, ex, notify) {
  const blanks = ex.segments.filter((s) => s.blank !== undefined);
  const pool = optionSet(ex, blanks.map((b) => b.answer));
  const rows = storyRows(ex.segments);
  const state = { values: {}, checked: false };

  // An exercise whose whole answer set already fits the cap keeps showing all of
  // it everywhere: with four prepositions on the table the learner is comparing
  // them, and thinning that per gap would hand out free eliminations.
  const shared = pool.length <= STORY_ROW_OPTIONS ? shuffleList(pool) : null;
  // Drawn once, not per render — re-drawing a row must not reshuffle the answers
  // under the learner's thumb between one tap and the next.
  const optionsFor = {};
  blanks.forEach((s) => { optionsFor[s.blank] = shared || gapOptions(pool, s.answer, STORY_ROW_OPTIONS); });

  function gapHtml(seg, numbered) {
    const value = state.values[seg.blank] || "";
    const ok = state.checked && accepts(seg.answer, value);
    const cls = state.checked ? (ok ? "is-correct" : "is-wrong") : value ? "is-chosen" : "";
    const num = numbered ? `<span class="vp-gap-num">${seg.blank + 1}</span>` : "";
    return `<span class="vp-gap ${cls}" data-gap="${seg.blank}">${num}${value ? escapeHtml(value) : "&nbsp;&nbsp;&nbsp;"}</span>`;
  }

  function render() {
    const body = rows
      .map((segs) => {
        const gaps = segs.filter((s) => s.blank !== undefined);
        // Only a sentence with more than one gap needs its gaps told apart.
        const numbered = gaps.length > 1;
        const text = segs
          .map((s) => (s.text !== undefined ? escapeHtml(s.text) : gapHtml(s, numbered)))
          .join("");
        const answers = gaps
          .map((g) => `<div class="vp-srow-answer" data-mitem="${g.blank}">${
            numbered ? `<span class="vp-srow-num">${g.blank + 1}</span>` : ""
          }${pillsHtml(optionsFor[g.blank], g.blank, state.values[g.blank] || "", state.checked, g.answer)}</div>`)
          .join("");
        return `<div class="vp-srow"><p class="vp-srow-text">${text}</p>${answers}</div>`;
      })
      .join("");

    const allCorrect = state.checked && blanks.every((s) => accepts(s.answer, state.values[s.blank] || ""));
    const missed = state.checked ? blanks.filter((s) => !accepts(s.answer, state.values[s.blank] || "")) : [];

    root.innerHTML = `
      ${body}
      <div class="vp-actions">
        ${state.checked ? "" : `<button type="button" class="vp-btn-check" data-story-check>${LABEL.check}</button>`}
        <button type="button" class="vp-link-btn" data-story-reset>${LABEL.reset}</button>
        ${state.checked ? `<span class="vp-feedback ${allCorrect ? "is-correct" : "is-wrong"}">${allCorrect ? LABEL.allCorrect : LABEL.someWrong}</span>` : ""}
      </div>
      ${missed.length ? `<p class="vp-fill-hint">${missed.map((s) => `${s.blank + 1}. <strong>${escapeHtml(modelAnswer(s.answer))}</strong>`).join(" · ")}</p>` : ""}`;

    root.querySelectorAll("[data-slot]").forEach((b) => {
      b.addEventListener("click", () => {
        state.values[+b.dataset.slot] = b.dataset.val;
        render();
      });
    });
    root.querySelector("[data-story-check]")?.addEventListener("click", check);
    root.querySelector("[data-story-reset]").addEventListener("click", reset);
  }

  function check() {
    state.checked = true;
    blanks.forEach((s) => notify(accepts(s.answer, state.values[s.blank] || ""), s.blank));
    render();
  }
  function reset() {
    state.values = {};
    state.checked = false;
    render();
  }
  function demo() {
    if (state.checked) return;
    blanks.forEach((s, i) => {
      if (!state.values[s.blank]) state.values[s.blank] = demoPick(optionsFor[s.blank], s.answer, demoWrong(i));
    });
    check();
  }
  render();
  return { given: (k) => state.values[k] ?? "", demo };
}

/* --------------------------------------------------------------- build ----
   A tile in brackets, „(trinken)“, is a word the joined sentence may repeat or drop:
   „Trinken Sie Tee oder (trinken) (Sie) Kaffee?“. Brackets next to each other are one
   group — all of it or none of it — and the tile counts by its word, so an unbracketed
   „ist“ in the bracketed place is as right as the bracketed one. */
const OPTIONAL = /^\((.+)\)$/;
const bare = (w) => String(w).replace(OPTIONAL, "$1");
/** The correct sentence's readings: every optional group kept or left out. */
function buildReadings(correct) {
  const parts = [];
  for (const w of correct) {
    const opt = OPTIONAL.test(w);
    const last = parts[parts.length - 1];
    if (opt && last?.opt) last.words.push(bare(w));
    else parts.push({ opt, words: [bare(w)] });
  }
  let out = [[]];
  for (const p of parts) out = p.opt ? out.flatMap((r) => [[...r, ...p.words], r]) : out.map((r) => [...r, ...p.words]);
  return out;
}
/* Satzbau, made less frustrating (2026-10-16, after replays of learners tapping in anger):
   - a used tile stays in the pool as an empty slot, so the others never slide under the
     finger (taps used to land on the neighbour);
   - the full stop or question mark at the end is not a tile: it is printed after the strip;
   - a second right order counts too: the clauses swapped (`swapClauses`) and any `alt`
     orders in the data;
   - a wrong try keeps what is right: those tiles turn green, the first wrong one red, and the
     next tap simply builds on from there. The solution waits behind "Lösung zeigen" and
     shows itself after the second wrong try. */
const END = /^[.?!]$/;
const SUBORD = new Set("als wenn weil bevor nachdem während obwohl seit seitdem bis sobald damit falls sodass".split(" "));
const PRON = new Set("ich du er sie es wir ihr man".split(" "));
const capW = (w) => w[0].toUpperCase() + w.slice(1);
const lowW = (w) => (w === "Sie" ? w : w[0].toLowerCase() + w.slice(1));
/** The same sentence with main and subordinate clause swapped, where that is just as right:
    one comma, a pronoun subject, an adverbial clause (not dass/ob: fronted they sound odd), no
    pronominal adverb (darauf …) pointing at it, and no hint that asks for one order. */
function swapClauses(words, hint = "") {
  if (/zuerst|vorne|am Anfang|beginnt/i.test(hint)) return null;
  const c = words.indexOf(",");
  if (c < 1 || words.indexOf(",", c + 1) !== -1) return null;
  const a = words.slice(0, c), b = words.slice(c + 1);
  if ([...a, ...b].some((w) => /^dar?(an|auf|aus|bei|für|mit|nach|über|um|von|vor|zu)$/i.test(bare(w)))) return null;
  if (SUBORD.has(bare(a[0]).toLowerCase()) && b.length >= 2 && PRON.has(bare(b[1]).toLowerCase())) return [capW(b[1]), b[0], ...b.slice(2), ",", lowW(a[0]), ...a.slice(1)];
  if (a.length >= 2 && PRON.has(bare(a[0]).toLowerCase()) && SUBORD.has(bare(b[0]))) return [capW(b[0]), ...b.slice(1), ",", a[1], lowW(a[0]), ...a.slice(2)];
  return null;
}
/** A sentence ready to build: its tiles (without the closing mark), that mark, and every right order. */
function prepBuild(sentence) {
  const end = END.test(sentence.correct.at(-1)) ? sentence.correct.at(-1) : "";
  const strip = (list) => (end && list.at(-1) === end ? list.slice(0, -1) : list);
  const tiles = [...sentence.shuffled];
  if (end) { const k = tiles.lastIndexOf(end); if (k !== -1) tiles.splice(k, 1); }
  const main = strip(sentence.correct);
  const orders = [main, ...(sentence.alt ?? []).map(strip)];
  const swapped = end !== "?" && swapClauses(main, sentence.hint);
  if (swapped) orders.push(swapped);
  return { tiles, end, readings: orders.flatMap(buildReadings), min: main.filter((w) => !OPTIONAL.test(w)).length };
}
// Compared without case: a tile keeps its spelling from the original sentence ("Wenn", "wir"),
// while the swapped order needs "wenn" and "Wir". The strip capitalises the first word (`shown`).
const wordsOf = (b, chosen) => chosen.map((i) => bare(b.tiles[i]).toLowerCase());
const sameWord = (r, got, k) => r[k].toLowerCase() === got[k];
const buildOk = (b, chosen) => { const got = wordsOf(b, chosen); return b.readings.some((r) => r.length === got.length && r.every((_, k) => sameWord(r, got, k))); };
/** A tile as it reads at position `pos`: first word capitalised, a sentence-initial
    conjunction or pronoun lower-cased further in. */
const shown = (w, pos) => (pos === 0 ? capW(w) : SUBORD.has(w.toLowerCase()) || PRON.has(w.toLowerCase()) ? lowW(w) : w);
/** How many tiles from the start are right, in the closest right order. */
function buildPrefix(b, chosen) {
  const got = wordsOf(b, chosen);
  let best = 0;
  for (const r of b.readings) { let k = 0; while (k < got.length && k < r.length && sameWord(r, got, k)) k++; best = Math.max(best, k); }
  return best;
}

function mountBuild(root, ex, notify) {
  const prep = Object.fromEntries(ex.sentences.map((s) => [s.id, prepBuild(s)]));
  const fresh = () => ({ chosen: [], checked: false, ok: false, good: 0, misses: 0, shown: false });
  const state = Object.fromEntries(ex.sentences.map((s) => [s.id, fresh()]));

  function itemHtml(sentence) {
    const b = prep[sentence.id], bs = state[sentence.id];
    const wrong = bs.checked && !bs.ok;
    const complete = bs.chosen.length >= b.min;
    const stripAnim = bs.checked ? (bs.ok ? POP : SHAKE) : "none";
    const chosen = bs.chosen.map((origIdx, pos) => {
      const mark = bs.ok ? " is-correct" : wrong ? (pos < bs.good ? " is-correct" : pos === bs.good ? " is-wrong" : "") : "";
      return `<button type="button" class="vp-chip vp-chip-chosen${mark}" data-sentence="${sentence.id}" data-remove="${pos}" ${bs.ok ? "disabled" : ""}>${escapeHtml(shown(b.tiles[origIdx], pos))}</button>`;
    }).join("") + (b.end ? `<span class="vp-build-end" aria-hidden="true">${escapeHtml(b.end)}</span>` : "");
    // Every tile keeps its place: a used one leaves an empty slot of its own width. After a
    // wrong try only the right part stays used; the rest can be tapped again straight away.
    const kept = wrong ? bs.chosen.slice(0, bs.good) : bs.chosen;
    const pool = b.tiles.map((w, i) => kept.includes(i)
      ? `<span class="vp-chip vp-chip-slot" aria-hidden="true">${escapeHtml(w)}</span>`
      : `<button type="button" class="vp-chip" data-sentence="${sentence.id}" data-pick="${i}" ${bs.ok ? "disabled" : ""}>${escapeHtml(w)}</button>`).join("");
    const solution = sentence.correct.join(" ").replace(/ ([,.?!])/g, "$1");
    return `
          <div class="vp-build-item" data-mitem="${sentence.id}">
            ${sentence.hint ? `<p class="vp-fill-hint">${escapeHtml(sentence.hint)}</p>` : ""}
            <div class="vp-build-strip" style="animation:${stripAnim}">${chosen}</div>
            <div class="vp-build-pool">${pool}</div>
            <div class="vp-actions">
              <button type="button" class="vp-btn-check" data-check="${sentence.id}" ${bs.checked ? "disabled" : ""}${waitAttrs(bs.checked || complete ? null : t("vp.buildMissing", "Es fehlen noch Wörter – tippen Sie die Kacheln unten in der richtigen Reihenfolge an."), ".vp-build-pool .vp-chip:not(.vp-chip-slot)")}>${LABEL.check}</button>
              <button type="button" class="vp-link-btn" data-reset="${sentence.id}">${LABEL.reset}</button>
              ${bs.ok ? `<span class="vp-feedback is-correct">${LABEL.correct}</span>` : ""}
              ${wrong && !bs.shown ? `<button type="button" class="vp-link-btn" data-show="${sentence.id}">${LABEL.buildShow}</button>` : ""}
            </div>
            ${wrong ? `<p class="vp-feedback is-wrong">${bs.good ? LABEL.buildFrom : LABEL.buildFirst}</p>` : ""}
            ${wrong && bs.shown ? `<p class="vp-fill-hint">${escapeHtml(solution)}</p>` : ""}
          </div>`;
  }
  // The strip holds as much as the pool from the start, so it never grows a line under
  // the learner and pushes the tiles down.
  function fit(node) {
    const strip = node.querySelector(".vp-build-strip"), pool = node.querySelector(".vp-build-pool");
    if (strip && pool) strip.style.minHeight = `${pool.offsetHeight + 24}px`;
  }
  // Only the sentence that changed is redrawn, so nothing else on the page moves.
  function paint(id) {
    const node = root.querySelector(`[data-mitem="${id}"]`);
    if (!node) return;
    node.outerHTML = itemHtml(ex.sentences.find((s) => s.id === id));
    fit(root.querySelector(`[data-mitem="${id}"]`));
  }
  root.innerHTML = ex.sentences.map(itemHtml).join("");
  root.querySelectorAll("[data-mitem]").forEach(fit);
  new ResizeObserver(() => root.querySelectorAll("[data-mitem]").forEach(fit)).observe(root);
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-sentence], button[data-check], button[data-reset], button[data-show]");
    if (!btn || btn.disabled || !root.contains(btn)) return;
    const d = btn.dataset;
    if (d.pick != null) pick(d.sentence, +d.pick);
    else if (d.remove != null) remove(d.sentence, +d.remove);
    else if (d.check) check(d.check);
    else if (d.reset) { state[d.reset] = fresh(); paint(d.reset); }
    else if (d.show) { state[d.show].shown = true; paint(d.show); }
  });
  /** After a wrong try, the next move starts from what was right. */
  function reopen(bs) {
    if (!bs.checked || bs.ok) return;
    bs.chosen = bs.chosen.slice(0, bs.good);
    bs.checked = false;
  }
  function pick(id, origIdx) {
    const bs = state[id];
    if (bs.ok) return;
    reopen(bs);
    if (!bs.chosen.includes(origIdx)) bs.chosen.push(origIdx);
    paint(id);
  }
  function remove(id, pos) {
    const bs = state[id];
    if (bs.ok) return;
    const wasWrong = bs.checked;
    reopen(bs);
    // After a wrong try the strip is already cut back to the right part; a tap on a tile
    // that is still there takes it (and what follows) back too.
    if (!wasWrong || pos < bs.chosen.length) bs.chosen.splice(pos, wasWrong ? Infinity : 1);
    paint(id);
  }
  function check(id) {
    const b = prep[id], bs = state[id];
    if (bs.chosen.length < b.min) return; // notReady.js has said what is missing
    bs.checked = true;
    bs.ok = buildOk(b, bs.chosen);
    if (!bs.ok) { bs.good = buildPrefix(b, bs.chosen); bs.misses++; if (bs.misses >= 2) bs.shown = true; }
    notify(bs.ok, id);
    paint(id);
  }
  return {
    given: (k) => {
      const b = prep[k];
      return b && state[k] ? state[k].chosen.map((i) => b.tiles[i]).join(" ") + (b.end && state[k].chosen.length ? b.end : "") : "";
    },
  };
}

/* ------------------------------------------------------------ wordbank ----
   telc "Sprachbausteine, Teil 1": one gap text, one bank of lettered words,
   each usable exactly once, and more words than gaps. Each gap is a <select>
   rather than a click-to-place target — a native control keeps the keyboard
   and screen-reader path intact and makes "which word did I already use"
   answerable at a glance. */
function mountWordbank(root, ex, notify) {
  const letters = Object.keys(ex.letters);
  const blanks = ex.segments.filter((s) => s.blank !== undefined);
  const state = { values: {}, checked: false };

  function render() {
    const used = new Set(Object.values(state.values).filter(Boolean));
    const text = ex.segments
      .map((seg) => {
        if (seg.text !== undefined) return escapeHtml(seg.text);
        const val = state.values[seg.blank] || "";
        const ok = state.checked && val === seg.answer;
        const opts = letters
          .map((l) => {
            // a letter already spent on another gap stays visible but unpickable
            const taken = used.has(l) && val !== l;
            return `<option value="${l}" ${val === l ? "selected" : ""} ${taken ? "disabled" : ""}>${l}) ${escapeHtml(ex.letters[l])}</option>`;
          })
          .join("");
        return `<select class="vp-gap-select ${state.checked ? (ok ? "is-correct" : "is-wrong") : ""}" data-blank="${seg.blank}" ${state.checked ? "disabled" : ""}>
            <option value="">${seg.blank + 1} —</option>${opts}
          </select>`;
      })
      .join("");

    const bank = letters
      .map((l) => `<li class="${used.has(l) ? "is-used" : ""}"><strong>${l}</strong> ${escapeHtml(ex.letters[l])}</li>`)
      .join("");

    const missed = state.checked ? blanks.filter((s) => state.values[s.blank] !== s.answer) : [];
    const allCorrect = state.checked && !missed.length;

    root.innerHTML = `
      <div class="vp-sb-letter-bank"><ul>${bank}</ul></div>
      <p class="vp-story-text vp-sb-text">${text}</p>
      <div class="vp-actions">
        ${state.checked ? "" : `<button type="button" class="vp-btn-check" data-wb-check>${LABEL.check}</button>`}
        <button type="button" class="vp-link-btn" data-wb-reset>${LABEL.reset}</button>
        ${state.checked ? `<span class="vp-feedback ${allCorrect ? "is-correct" : "is-wrong"}">${allCorrect ? LABEL.allCorrect : LABEL.someWrong}</span>` : ""}
      </div>
      ${missed.length ? `<p class="vp-fill-hint">${missed.map((s) => `${s.blank + 1}. <strong>${s.answer}) ${escapeHtml(ex.letters[s.answer])}</strong>`).join(" · ")}</p>` : ""}`;

    root.querySelectorAll("[data-blank]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        state.values[+sel.dataset.blank] = e.target.value;
        render(); // re-render so the bank + remaining options reflect what is now used
      });
    });
    root.querySelector("[data-wb-check]")?.addEventListener("click", check);
    root.querySelector("[data-wb-reset]").addEventListener("click", reset);
  }
  function check() {
    state.checked = true;
    blanks.forEach((s) => notify(state.values[s.blank] === s.answer, s.blank));
    render();
  }
  function reset() {
    state.values = {};
    state.checked = false;
    render();
  }
  function demo() {
    if (state.checked) return;
    blanks.forEach((s, i) => {
      if (!state.values[s.blank]) state.values[s.blank] = demoWrong(i) ? letters.find((l) => l !== s.answer) : s.answer;
    });
    check();
  }
  render();
  return { given: (k) => (state.values[k] ? `${state.values[k]}) ${ex.letters[state.values[k]] ?? ""}` : ""), demo };
}

/* --------------------------------------------------------------- mcgap ----
   telc "Sprachbausteine, Teil 2": the same gap text, but each gap offers three
   options. Text on top with numbered gaps, options listed underneath — the
   layout of the printed exam, so the page rehearses the real thing. */
function mountMcgap(root, ex, notify) {
  const state = { values: {}, checked: false };

  function render() {
    const text = ex.segments
      .map((seg) => {
        if (seg.text !== undefined) return escapeHtml(seg.text);
        const item = ex.items[seg.blank];
        const picked = state.values[seg.blank];
        const filled = picked != null ? item.options[picked] : null;
        const ok = state.checked && picked === item.correct;
        const cls = state.checked ? (ok ? "is-correct" : "is-wrong") : filled ? "is-filled" : "";
        return `<span class="vp-sb-gap ${cls}" data-gap="${seg.blank}">${filled ? escapeHtml(filled) : `___ ${seg.blank + 1} ___`}</span>`;
      })
      .join("");

    const questions = ex.items
      .map((item, i) => {
        const picked = state.values[i];
        // A fixed per-gap order (src/lib/seededShuffle.js): the data puts the right option
        // first in every gap, and "always a" must not win. `oi` stays the data index, so
        // grading and `correct` are unchanged; the letter shown is the position.
        const order = seededShuffle(item.options.map((_, oi) => oi), `${ex.title ?? ""}|${i}|${item.options.join("|")}`);
        const opts = order
          .map((oi, pos) => {
            const opt = item.options[oi];
            const isPicked = picked === oi;
            const cls = state.checked
              ? oi === item.correct
                ? "is-solved"
                : isPicked
                  ? "is-wrongpick"
                  : ""
              : isPicked
                ? "is-selected"
                : "";
            return `<button type="button" class="vp-match-btn vp-sb-opt ${cls}" data-i="${i}" data-o="${oi}" ${state.checked ? "disabled" : ""}><strong>${"abc"[pos]}</strong>${escapeHtml(opt)}</button>`;
          })
          .join("");
        return `<div class="vp-sb-question" data-mitem="${i}"><span class="vp-sb-num">${i + 1}</span><div class="vp-sb-opts">${opts}</div></div>`;
      })
      .join("");

    const right = ex.items.filter((item, i) => state.values[i] === item.correct).length;

    root.innerHTML = `
      <p class="vp-story-text vp-sb-text">${text}</p>
      <div class="vp-sb-questions">${questions}</div>
      <div class="vp-actions">
        ${state.checked ? "" : `<button type="button" class="vp-btn-check" data-mc-check>${LABEL.check}</button>`}
        <button type="button" class="vp-link-btn" data-mc-reset>${LABEL.reset}</button>
        ${state.checked ? `<span class="vp-feedback ${right === ex.items.length ? "is-correct" : "is-wrong"}">${right} / ${ex.items.length} richtig</span>` : ""}
      </div>`;

    root.querySelectorAll("[data-o]").forEach((b) =>
      b.addEventListener("click", () => {
        state.values[+b.dataset.i] = +b.dataset.o;
        render();
      })
    );
    root.querySelector("[data-mc-check]")?.addEventListener("click", check);
    root.querySelector("[data-mc-reset]").addEventListener("click", reset);
  }
  function check() {
    state.checked = true;
    ex.items.forEach((item, i) => notify(state.values[i] === item.correct, i));
    render();
  }
  function reset() {
    state.values = {};
    state.checked = false;
    render();
  }
  function demo() {
    if (state.checked) return;
    ex.items.forEach((item, i) => {
      if (state.values[i] == null) state.values[i] = demoWrong(i) ? (item.correct + 1) % item.options.length : item.correct;
    });
    check();
  }
  render();
  return { given: (k) => (state.values[k] != null ? ex.items[k].options[state.values[k]] : ""), demo };
}

const RENDERERS = {
  fill: mountFill,
  match: mountMatch,
  table: mountTable,
  story: mountStory,
  build: mountBuild,
  wordbank: mountWordbank,
  mcgap: mountMcgap,
  zimmer: mountZimmer,
};

/* ------------------------------------------------------- Problem melden ----
   docs/problem-melden-tier0-v1.md §2–3. Learners get one quiet link under each exercise
   (outside the slot, so a re-render never wipes it); the sheet asks "Welcher Satz?" and
   puts wrong items first. Dev gets a ⚑ per item ([data-mitem], re-added after every
   render) and one on the link row for the whole exercise. Match pairs are buttons, so
   they get no per-item ⚑ (a button can't hold a button); the sheet still lists them. */
function mountMelden(slot, ex, exIndex, refBase, engine) {
  const items = grammarItems(ex);
  const exRef = `${refBase}/${exIndex + 1}`;
  const itemSnap = (it) => ({ typ: ex.type, satz: it.prompt, loesung: it.answer, optionen: it.options, antwort: engine?.given?.(it.key) ?? "" });
  const itemTarget = (it) => ({ ref: `${exRef}/${it.part}`, fingerprint: fingerprint(it.prompt, it.answer), snapshot: () => itemSnap(it) });
  const isWrong = (it) => {
    const g = engine?.given?.(it.key);
    return Boolean(g) && !accepts(it.answer, g) && !(ex.type === "wordbank" && String(g).startsWith(`${it.answer})`));
  };
  const exTarget = () => ({
    ref: exRef,
    fingerprint: exerciseFingerprint(ex),
    snapshot: () => ({
      typ: ex.type,
      titel: ex.title,
      hinweis: ex.hint,
      saetze: items.slice(0, 20).map((it) => ({ nr: it.part, satz: it.prompt, loesung: it.answer, antwort: engine?.given?.(it.key) ?? "" })),
    }),
    items: () => {
      const list = items.map((it, i) => ({ ...itemTarget(it), label: String(i + 1), wrong: isWrong(it) }));
      return [...list.filter((x) => x.wrong), ...list.filter((x) => !x.wrong)];
    },
  });

  // A set switch (Sprachbausteine) mounts into the same slot again: replace, don't stack.
  if (slot.nextElementSibling?.classList.contains("mf-row")) slot.nextElementSibling.remove();
  const row = document.createElement("div");
  row.className = "mf-row";
  row.append(meldenLink(exTarget));
  slot.after(row);
  flagElement(row, exTarget);
  if (ex.type !== "match" && items.length) {
    const byKey = new Map(items.map((it) => [String(it.key), it]));
    flagItems(slot, "[data-mitem]", (el) => {
      const it = byKey.get(el.dataset.mitem);
      return it ? itemTarget(it) : null;
    });
  }
}

/**
 * Mounts every exercise the page rendered a slot for. The page emits one
 * <div data-ex-index="n"> per entry in data.exercises; this pairs them up by index.
 * `meldungRef` is the ref base for "Problem melden" (default `g:<topic>`).
 */
export function mountGrammarWorkspace(pageRoot, data, { onAnswer, meldungRef } = {}) {
  const topic = data.slug ?? data.id;
  const refBase = meldungRef ?? `g:${String(topic).toLowerCase()}`;
  const demos = [];
  pageRoot.querySelectorAll("[data-ex-index]").forEach((slot) => {
    const exIndex = +slot.dataset.exIndex;
    const ex = data.exercises[exIndex];
    const render = ex && RENDERERS[ex.type];
    if (!render) return;
    // `detail` is the item's key within the exercise, or (fill/table) an object whose
    // `itemId` is that key plus what "Meine Fehler" (src/lib/fehler.js) stores. "Prüfen" may
    // be pressed again after a fix; the Klassen log (./versuche.js) keeps the last result per
    // item instead of counting each check. The caller's onAnswer(ok) is unchanged.
    const notify = (ok, detail) => {
      const rich = detail != null && typeof detail === "object";
      const key = rich ? detail.itemId : detail;
      if (key != null) hintItem(`${exIndex}/${key}`);
      if (onAnswer) onAnswer(ok);
      // Live üben (src/lib/liveUebung/schueler.js) listens: which item, how it went, and –
      // for a typed answer – what was typed, for the teacher's list of common mistakes.
      if (key != null) {
        const said = rich ? { given: String(detail.given ?? ""), expected: String(detail.expected ?? ""), prompt: String(detail.prompt ?? "") } : {};
        dispatchEvent(new CustomEvent("da:answer", { detail: { topic, ex: exIndex, item: String(key), ok, ...said } }));
      }
      if (rich) {
        recordResult({
          source: "grammatik", itemId: `${topic}/${exIndex}/${detail.itemId}`, prompt: detail.prompt, expected: detail.expected,
          given: detail.given, level: data.level, topic: data.name ?? topic, href: `/${topic}#uebung-${exIndex + 1}`,
        }, ok);
      }
    };
    const engine = render(slot, ex, notify);
    if (engine?.demo) demos.push({ slot, demo: engine.demo });
    try { mountMelden(slot, ex, exIndex, refBase, engine); } catch (e) { console.error(e); }
  });
  // "⏭ Ende" in the demo dock: every exercise on the page answered and checked at once,
  // then back up to the first one, so the corrections can be scrolled through.
  if (!demos.length) return;
  // A slot that a later mount (grammarRun.js) has replaced is skipped, and its listener goes.
  const onDemoFinish = (e) => {
    const live = demos.filter((d) => d.slot.isConnected);
    if (!live.length) return removeEventListener("da:demo-finish", onDemoFinish);
    if (e.detail) e.detail.handled++;
    live.forEach(({ demo }) => { try { demo(); } catch (err) { console.error(err); } });
    live[0].slot.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  addEventListener("da:demo-finish", onDemoFinish);
}
