// DOM primitives shared by every exam trainer — the reusable pieces (state.js,
// scoring.js, this file and the .exam-app chrome in src/styles/exam-app.css) that a
// new exam page builds on. Ported from Pflegeplace's src/lib/exam/render-helpers.ts,
// rewritten against this project's plain-JS + design-token style.
import { tx } from "./i18n.js";
import { flagElement, meldenLink } from "../meldung.js";
import { fingerprint } from "../meldungRef.js";

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';

/* A single auto-graded question: renders the options, locks and colours them on the
   first tap, shows the right/wrong line, and reports back through onAnswer so the
   caller can persist it and refresh the sidebar. Answering is one tap — no separate
   "Prüfen" — because that is how the click-to-answer exercises elsewhere behave.
   `meldung` is the item ref for "Problem melden" (docs/problem-melden-tier0-v1.md §2);
   with it the card gets the quiet link under the feedback and, in dev mode, a ⚑.
   `deferred`: a tap only picks (and can be changed); the caller checks later through
   card.check(). `why` explains the solution under the feedback. */
export function choiceCard({ qLabel, questionText, context, options, correctKey, existing, layout = "list", onAnswer, meldung, deferred = false, picked = null, onPick, why, contentLang }) {
  const card = el("div", "qcard");
  card.appendChild(el("div", "qhead", '<span class="qnum">' + escapeHtml(qLabel) + "</span>"));
  if (context) card.appendChild(el("p", "qcontext", escapeHtml(context)));
  if (questionText) {
    const q = el("p", "qtext", escapeHtml(questionText));
    // `contentLang`: the exam text is Spanish whatever the UI language (screen readers, hyphenation).
    if (contentLang) q.lang = contentLang;
    card.appendChild(q);
  }

  const optWrap = el("div", "options" + (layout === "grid" ? " grid" : layout === "wrap" ? " wrap" : layout === "pool" ? " pool" : ""));
  if (contentLang) optWrap.lang = contentLang;
  const fb = el("div", "feedback");
  fb.hidden = true;
  const whyEl = why ? el("p", "fb-why", escapeHtml(why)) : null;
  if (whyEl) whyEl.hidden = true;

  for (const o of options) {
    const b = el("button", "opt");
    b.type = "button";
    b.dataset.key = o.key;
    // `badge`: the letter shown, when it differs from the stored key (a shuffled list keeps
    // each option's original key so saved answers keep their meaning).
    b.innerHTML = '<span class="optbadge">' + escapeHtml((o.badge ?? o.key).toUpperCase()) + "</span><span>" + escapeHtml(o.label) + "</span>";
    optWrap.appendChild(b);
  }

  function lock(givenKey) {
    for (const child of optWrap.children) {
      child.disabled = true;
      child.classList.remove("picked", "used");
      const k = child.dataset.key;
      if (k === correctKey) child.classList.add("correct");
      else if (k === givenKey) child.classList.add("incorrect");
      else child.classList.add("dim");
    }
    const ok = givenKey === correctKey;
    fb.hidden = false;
    fb.className = "feedback " + (ok ? "correct" : "incorrect");
    const right = options.find((o) => o.key === correctKey);
    // In a lettered pool the letter is what learners look for: "richtig ist D: Business English".
    const poolText = (o) => (o.badge ?? o.key).toUpperCase() + ": " + o.label;
    const rightText = right ? (layout === "pool" ? poolText(right) : right.label) : correctKey;
    // In a long pool a wrong tap on the neighbouring tile is easy to miss; naming the pick
    // ("Du hast B gewählt") shows it was a mis-tap and not a wrong key.
    const given = layout === "pool" ? options.find((o) => o.key === givenKey) : null;
    fb.innerHTML = ok
      ? CHECK + " <span>" + escapeHtml(tx("exam.fb.correct", "Richtig.")) + "</span>"
      : CROSS + " <span>" + (given
        ? tx("exam.fb.wrongPick", "Du hast <b>{g}</b> gewählt. Richtig ist <b>{a}</b>.", { g: escapeHtml(poolText(given)), a: escapeHtml(rightText) })
        : tx("exam.fb.wrong", "Nicht ganz — richtig ist <b>{a}</b>.", { a: escapeHtml(rightText) })) + "</span>";
    if (whyEl) whyEl.hidden = false;
  }

  let pickedKey = existing ? null : picked;
  const paintPick = () => {
    for (const child of optWrap.children) {
      const on = child.dataset.key === pickedKey;
      child.classList.toggle("picked", on);
      child.setAttribute("aria-pressed", String(on));
    }
  };

  let givenKey = existing?.given ?? null;
  if (existing) lock(existing.given);

  if (deferred && !existing) paintPick();

  optWrap.addEventListener("click", (e) => {
    const b = e.target.closest(".opt");
    if (!b || b.disabled) return;
    if (deferred) {
      // A second tap on the same option takes the pick back.
      pickedKey = b.dataset.key === pickedKey ? null : b.dataset.key;
      paintPick();
      onPick?.(pickedKey);
      return;
    }
    const given = b.dataset.key;
    givenKey = given;
    lock(given);
    onAnswer(given, given === correctKey);
  });

  card.appendChild(optWrap);
  card.appendChild(fb);
  if (whyEl) card.appendChild(whyEl);
  // Deferred cards: grade the pick (if any) now. Returns whether there was one.
  card.check = () => {
    if (!deferred || !pickedKey || givenKey) return false;
    const given = pickedKey;
    givenKey = given;
    pickedKey = null;
    lock(given);
    onAnswer(given, given === correctKey);
    return true;
  };
  // Deferred cards in a "use each once" pool: options already chosen elsewhere,
  // as { key: "→ 3" }. They stay tappable; the note only says where they went.
  card.markUsed = (used) => {
    for (const child of optWrap.children) {
      const note = child.disabled ? null : used[child.dataset.key];
      child.classList.toggle("used", !!note);
      let tag = child.querySelector(".optused");
      if (note && !tag) tag = child.appendChild(el("span", "optused"));
      if (tag) { if (note) tag.textContent = note; else tag.remove(); }
    }
  };
  if (meldung) {
    const labelOf = (k) => options.find((o) => o.key === k)?.label ?? k;
    const target = () => ({
      ref: meldung,
      fingerprint: fingerprint(questionText || context || "", labelOf(correctKey)),
      snapshot: () => ({ frage: questionText, kontext: context, optionen: options.map((o) => o.label), loesung: labelOf(correctKey), antwort: givenKey ? labelOf(givenKey) : null }),
    });
    const row = el("div", "mf-row");
    row.append(meldenLink(target));
    card.appendChild(row);
    flagElement(card, target);
  }
  return card;
}

/* For read-through material that has no right answer (a Fakten page, a speaking
   prompt): a manual "als geübt markieren" toggle that still records through the same
   state shape, so the progress math needs no special case for it. */
export function practiceToggle({ existing, onToggle }) {
  let marked = !!existing;
  const btn = el("button", "practice-toggle");
  btn.type = "button";
  function paint() {
    btn.classList.toggle("marked", marked);
    btn.innerHTML = marked
      ? CHECK + " <span>" + escapeHtml(tx("exam.practiced.done", "Als geübt markiert")) + "</span>"
      : '<span class="practice-toggle-dot"></span><span>' + escapeHtml(tx("exam.practiced.mark", "Als geübt markieren")) + "</span>";
  }
  paint();
  btn.addEventListener("click", () => {
    marked = !marked;
    paint();
    onToggle(marked);
  });
  return btn;
}

export function sectionHeader(main, { eyebrow, title, instruction }) {
  if (eyebrow) main.appendChild(el("p", "section-eyebrow", escapeHtml(eyebrow)));
  main.appendChild(el("h2", "section-title", escapeHtml(title)));
  if (instruction) main.appendChild(el("p", "instruction", instruction));
}
