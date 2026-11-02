// The Führerschein quiz engine — lesson quiz, Üben and the Übungssimulation.
//
// Built next to src/lib/quiz.js rather than on it: the theory test has question shapes that
// engine does not know — several right answers that all have to be ticked (mcN), a number to
// type (zahl), three signs to choose from (bild), a scene as the picture — and it weighs every
// question with 2–5 Fehlerpunkte. The look is the same (.quiz-* classes from practice.css).
//
//   mountFahrQuiz(root, questions, { mode: "practice" | "exam", ... })
//
// practice  one question at a time, checked at once: right/wrong, the explanation (with its
//           Einfache-Sprache twin, data-ls — the page's switch swaps it), the scene played
//           after the answer. At the end: „Fehler wiederholen".
// exam      the simulation: no feedback while answering, „Markieren", an overview grid, a
//           clock that only counts (the real test has no time limit), and a result with
//           Fehlerpunkte per topic and the pass rule from the research file.
//
// Questions arrive prepared by the page (src/lib/fuehrerscheinQuiz.js): every {{fakt:…}}
// filled, sign pictures resolved, a scene as two HTML strings (the bare picture, and the full
// animated figure for after the answer). Answers are kept under "da-exam-v1:fuehrerschein"
// (src/lib/exam/state.js), the shape /progress reads for every exam.
import { t, i18nAttrs } from "./uiText.js";
import { loadExamState, saveExamState } from "./exam/state.js";
import { recordAttempt } from "./progress.js";
import { endSet } from "./versuche.js";
import { mascotHop, celebrate } from "./mascotCelebrate.js";
import { mountSzene } from "./fahrSzenePlayer.js";
import { flagItems, meldenLink } from "./meldung.js";
import { fingerprint } from "./meldungRef.js";

export const STORE = "fuehrerschein";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tx = (key, de, vars) => `<span${i18nAttrs(key, vars)}>${esc(t(key, de, vars))}</span>`;
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Is `given` right for `q`? given: index (mc1/bild), index array (mcN), string (zahl). */
export function isCorrect(q, given) {
  if (given == null) return false;
  if (q.type === "mcN") {
    const want = [...q.answer].sort().join(",");
    return Array.isArray(given) && [...given].sort().join(",") === want;
  }
  if (q.type === "zahl") {
    // „1,5" and „1.5" both mean one and a half; „2.500" (a thousands point) only with a comma-free
    // three-digit tail. Spaces and a typed unit („50 km/h") are ignored.
    const n = (s) => {
      let x = String(s).trim().replace(/[^\d.,-]/g, "");
      if (x.includes(",")) x = x.replace(/\./g, "").replace(",", ".");
      else if (/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, "");
      return Number(x);
    };
    return String(given).trim() !== "" && n(given) === n(q.answer);
  }
  return Number(given) === Number(q.answer);
}

const answerText = (q) => {
  if (q.type === "zahl") return `${q.answer}${q.unit ? ` ${q.unit}` : ""}`;
  const idx = q.type === "mcN" ? q.answer : [q.answer];
  return idx.map((i) => (q.type === "bild" ? q.options[i].name : q.options[i].text)).join(" · ");
};

function persist(q, given, ok) {
  const st = loadExamState(STORE);
  st.answers[q.id] = { given, correct: ok };
  saveExamState(STORE, st);
}

function pictureHtml(q, answered) {
  if (q.sceneFull && answered) return `<div class="fq-pic fq-pic--scene" data-fq-scene>${q.sceneFull}</div>`;
  if (q.sceneBare) return `<div class="fq-pic fq-pic--scene">${q.sceneBare}</div>`;
  if (q.sign) return `<div class="fq-pic"><img class="fq-sign" src="${esc(q.sign.src)}" alt="${esc(q.sign.name)}" width="96" height="96" /></div>`;
  return "";
}

function hintHtml(q) {
  if (q.type === "mcN") return `<p class="fq-hint">${tx("fs.quiz.hintMcN", "Mehrere Antworten sind richtig. Kreuze alle richtigen an.")}</p>`;
  if (q.type === "zahl") return `<p class="fq-hint">${tx("fs.quiz.hintZahl", "Tippe die Zahl ein.")}</p>`;
  if (q.type === "bild") return `<p class="fq-hint">${tx("fs.quiz.hintBild", "Wähle ein Zeichen.")}</p>`;
  return "";
}

/** The answer controls. `given` pre-selects (exam mode, coming back to a question). */
function optionsHtml(q, given) {
  if (q.type === "zahl") {
    return `<div class="fq-zahl"><input class="fq-input" type="text" inputmode="decimal" autocomplete="off" value="${esc(given ?? "")}" aria-label="${esc(t("fs.quiz.zahlLabel", "Deine Zahl"))}" />${q.unit ? `<span class="fq-unit">${esc(q.unit)}</span>` : ""}</div>`;
  }
  const multi = q.type === "mcN";
  const sel = multi ? new Set(given ?? []) : new Set(given != null ? [Number(given)] : []);
  const items = q.options.map((o, i) => {
    const on = sel.has(i);
    const inner = q.type === "bild"
      ? `<img src="${esc(o.src)}" alt="${esc(o.name)}" width="72" height="72" />`
      : `<span class="fq-box" aria-hidden="true"></span><span class="fq-txt">${esc(o.text)}</span>`;
    return `<button type="button" class="quiz-choice fq-opt${q.type === "bild" ? " fq-opt--bild" : ""}${multi ? " fq-opt--multi" : ""}${on ? " is-sel" : ""}" data-opt="${i}" ${multi ? `role="checkbox" aria-checked="${on}"` : `aria-pressed="${on}"`}>${inner}</button>`;
  });
  return `<div class="quiz-choices fq-opts${q.type === "bild" ? " fq-opts--bild" : ""}" lang="de">${items.join("")}</div>`;
}

function readGiven(root, q) {
  if (q.type === "zahl") { const v = root.querySelector(".fq-input")?.value ?? ""; return v.trim() === "" ? null : v.trim(); }
  const on = [...root.querySelectorAll(".fq-opt.is-sel")].map((b) => Number(b.dataset.opt));
  if (q.type === "mcN") return on.length ? on : null;
  return on.length ? on[0] : null;
}

function wireOptions(root, q, onChange) {
  root.querySelectorAll(".fq-opt").forEach((b) => b.addEventListener("click", () => {
    if (b.disabled) return;
    if (q.type === "mcN") {
      b.classList.toggle("is-sel");
      b.setAttribute("aria-checked", String(b.classList.contains("is-sel")));
    } else {
      root.querySelectorAll(".fq-opt").forEach((x) => { x.classList.toggle("is-sel", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    }
    onChange?.(b);
  }));
  root.querySelector(".fq-input")?.addEventListener("input", () => onChange?.());
}

function explainHtml(q) {
  if (!q.explain) return "";
  return `<p class="quiz-explain fq-explain" lang="de" data-ls="${esc(q.explain)}"${q.explainEasy ? ` data-ls-leicht="${esc(q.explainEasy)}"` : ""}>${esc(q.explain)}</p>`;
}

const pts = (q) => tx("fs.quiz.points", "{n} Punkte", { n: q.points });

/* "Problem melden" (docs/problem-melden-tier0-v1.md): f:<question id>. The prompt here has its
   {{fakt:…}} already filled, so the fingerprint is of the filled text; the stable id is what
   finds the question. Not offered while a Simulation runs (exam conditions), only in its review. */
const givenText = (q, given) => {
  if (given == null) return null;
  if (q.type === "zahl") return String(given);
  return (Array.isArray(given) ? given : [given]).map((i) => q.options[i]?.text ?? q.options[i]?.name ?? i).join(" · ");
};
const fahrTarget = (q, given) => ({
  ref: `f:${q.id}`,
  fingerprint: fingerprint(q.prompt, answerText(q)),
  snapshot: () => ({ frage: q.prompt, typ: q.type, optionen: q.options?.map((o) => o.text ?? o.name), loesung: answerText(q), erklaerung: q.explain, antwort: givenText(q, given?.()) }),
});
const meldenRow = (q, given) => {
  const row = document.createElement("div");
  row.className = "mf-row";
  row.append(meldenLink(() => fahrTarget(q, given)));
  return row;
};

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------
function practice(root, all, { onDone, skill = "fuehrerschein", lessonHref } = {}) {
  let list = all;
  let pos = 0;
  let right = 0;
  let wrongIds = [];
  let lastGiven = null; // { q, given } for the report snapshot
  flagItems(root, ".fq-prompt", () => (list[pos] ? fahrTarget(list[pos], () => (lastGiven?.q === list[pos] ? lastGiven.given : null)) : null));

  function done() {
    const n = list.length;
    root.innerHTML = `
      <div class="quiz-done fq-done">
        <div class="quiz-done-score">${right} / ${n}</div>
        <p>${tx("quiz.correctAnswered", "richtig beantwortet")}</p>
        <div class="fq-done-btns">
          ${wrongIds.length ? `<button type="button" class="quiz-btn quiz-btn--primary" data-fq-wrong>${tx("fs.quiz.repeatWrong", "Fehler wiederholen ({n})", { n: wrongIds.length })}</button>` : ""}
          <button type="button" class="quiz-btn${wrongIds.length ? "" : " quiz-btn--primary"}" data-fq-again>${tx("quiz.restart", "Nochmal üben")}</button>
        </div>
      </div>`;
    if (right === n) celebrate({ title: t("fs.quiz.allRight", "Alles richtig!"), body: t("fs.quiz.roundBody", "{s} von {n} richtig.", { s: right, n }) });
    root.querySelector("[data-fq-wrong]")?.addEventListener("click", () => {
      const ids = new Set(wrongIds);
      start(all.filter((q) => ids.has(q.id)));
    });
    root.querySelector("[data-fq-again]")?.addEventListener("click", () => start(shuffle(all)));
    endSet();
    onDone?.(right, n);
  }

  function show() {
    if (pos >= list.length) return done();
    const q = list[pos];
    root.innerHTML = `
      <div class="quiz-progress quiz-progress--split">
        <span>${tx("quiz.progress.question", "Frage {n} / {total}", { n: pos + 1, total: list.length })}</span>
        <span class="fq-pts">${pts(q)}</span>
      </div>
      ${q.topicTitle ? `<p class="fq-topic">${esc(q.topicTitle)}</p>` : ""}
      <div class="quiz-prompt fq-prompt" lang="de">${esc(q.prompt)}</div>
      <div data-fq-pic>${pictureHtml(q, false)}</div>
      ${hintHtml(q)}
      ${optionsHtml(q)}
      ${q.type !== "mc1" && q.type !== "bild" ? `<button type="button" class="quiz-btn quiz-btn--primary fq-check" data-fq-check disabled>${tx("quiz.check", "Prüfen")}</button>` : ""}
      <div class="quiz-feedback fq-feedback" aria-live="polite"></div>`;
    root.append(meldenRow(q, () => (lastGiven?.q === q ? lastGiven.given : null)));
    const checkBtn = root.querySelector("[data-fq-check]");
    const check = () => {
      const given = readGiven(root, q);
      if (given == null) return;
      const ok = isCorrect(q, given);
      lastGiven = { q, given };
      if (ok) right++; else wrongIds.push(q.id);
      persist(q, given, ok);
      recordAttempt({ skill, correct: ok, topic: `fuehrerschein-${q.topic}`, item: q.id });
      root.querySelectorAll(".fq-opt").forEach((b) => {
        b.disabled = true;
        const i = Number(b.dataset.opt);
        const isRight = q.type === "mcN" ? q.answer.includes(i) : i === Number(q.answer);
        if (isRight) b.classList.add("quiz-choice--correct");
        else if (b.classList.contains("is-sel")) b.classList.add("quiz-choice--incorrect");
      });
      const input = root.querySelector(".fq-input");
      if (input) { input.disabled = true; input.classList.add(ok ? "is-ok" : "is-no"); }
      if (checkBtn) checkBtn.hidden = true;
      const fb = root.querySelector(".fq-feedback");
      fb.innerHTML = `${ok
        ? `<span class="quiz-ok">${esc(t("quiz.correct", "✓ Richtig!"))}</span>`
        : `<span class="quiz-no">${esc(t("fs.quiz.wrong", "✗ Nicht richtig."))} ${q.type === "zahl" || q.type === "mcN" ? `${esc(t("fs.quiz.rightIs", "Richtig:"))} <strong lang="de">${esc(answerText(q))}</strong>` : ""}</span>`}
        ${explainHtml(q)}
        ${q.lessonHref ? `<a class="fq-lesson" href="${esc(q.lessonHref)}">${tx("fs.quiz.toLesson", "Zur Lektion")} →</a>` : ""}
        <button type="button" class="quiz-btn quiz-btn--next" data-fq-next>${pos + 1 < list.length ? tx("quiz.next", "Weiter") : tx("quiz.showResult", "Ergebnis anzeigen")}</button>`;
      mascotHop(fb.querySelector(".quiz-ok, .quiz-no"), ok, ok ? "bruno" : "quaki");
      if (q.sceneFull) {
        const pic = root.querySelector("[data-fq-pic]");
        pic.innerHTML = pictureHtml(q, true);
        const fig = pic.querySelector("[data-fahrszene]");
        if (fig) mountSzene(fig);
      }
      fb.querySelector("[data-fq-next]").addEventListener("click", () => { pos++; show(); root.scrollIntoView({ block: "start", behavior: "smooth" }); });
    };
    wireOptions(root, q, () => {
      if (q.type === "mc1" || q.type === "bild") return check();
      if (checkBtn) checkBtn.disabled = readGiven(root, q) == null;
    });
    checkBtn?.addEventListener("click", check);
    root.querySelector(".fq-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); check(); } });
  }

  function start(qs) {
    list = qs;
    pos = 0;
    right = 0;
    wrongIds = [];
    show();
  }
  start(all);
}

// ---------------------------------------------------------------------------
// Exam (Übungssimulation)
// ---------------------------------------------------------------------------
/**
 * @param rules { maxFehlerpunkte, zweiFuenfer: true } — from the research file, via the page
 * @param topics { [id]: { title, href } }
 */
function exam(root, list, { rules, topics = {}, onFinish } = {}) {
  const given = new Array(list.length).fill(null);
  const marked = new Set();
  let pos = 0;
  const t0 = Date.now();
  let clock = null;

  const time = () => {
    const s = Math.floor((Date.now() - t0) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  function grid() {
    return `<div class="fq-grid" role="list">${list.map((q, i) => `<button type="button" role="listitem" class="fq-cell${i === pos ? " is-cur" : ""}${given[i] != null ? " is-done" : ""}${marked.has(i) ? " is-mark" : ""}" data-fq-go="${i}" aria-label="${esc(t("fs.sim.cell", "Frage {n}", { n: i + 1 }))}">${i + 1}</button>`).join("")}</div>`;
  }

  function show() {
    const q = list[pos];
    const answered = given.filter((g) => g != null).length;
    root.innerHTML = `
      <div class="fq-sim-bar">
        <span class="fq-clock" data-fq-clock aria-label="${esc(t("fs.sim.clockLabel", "Bisherige Zeit"))}">⏱ ${time()}</span>
        <span>${tx("fs.sim.answered", "{n} von {total} beantwortet", { n: answered, total: list.length })}</span>
      </div>
      ${grid()}
      <div class="quiz-progress quiz-progress--split">
        <span>${tx("quiz.progress.question", "Frage {n} / {total}", { n: pos + 1, total: list.length })}</span>
        <span class="fq-pts">${pts(q)}</span>
      </div>
      <div class="quiz-prompt fq-prompt" lang="de">${esc(q.prompt)}</div>
      ${pictureHtml(q, false)}
      ${hintHtml(q)}
      ${optionsHtml(q, given[pos])}
      <div class="fq-sim-nav">
        <button type="button" class="quiz-btn" data-fq-prev ${pos === 0 ? "disabled" : ""}>← ${tx("fs.sim.prev", "Zurück")}</button>
        <button type="button" class="quiz-btn fq-mark${marked.has(pos) ? " is-on" : ""}" data-fq-mark aria-pressed="${marked.has(pos)}">⚑ ${tx("fs.sim.mark", "Markieren")}</button>
        ${pos + 1 < list.length
          ? `<button type="button" class="quiz-btn quiz-btn--primary" data-fq-next>${tx("fs.sim.next", "Weiter")} →</button>`
          : `<button type="button" class="quiz-btn quiz-btn--primary" data-fq-submit>${tx("fs.sim.submit", "Abgeben")}</button>`}
      </div>
      ${pos + 1 < list.length ? `<p class="fq-submit-row"><button type="button" class="fq-linkbtn" data-fq-submit>${tx("fs.sim.submitNow", "Prüfung abgeben")}</button></p>` : ""}`;
    wireOptions(root, q, () => { given[pos] = readGiven(root, q); refreshGrid(); });
    const go = (i) => { given[pos] = readGiven(root, q); pos = i; show(); };
    root.querySelectorAll("[data-fq-go]").forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.fqGo))));
    root.querySelector("[data-fq-prev]")?.addEventListener("click", () => go(pos - 1));
    root.querySelector("[data-fq-next]")?.addEventListener("click", () => go(pos + 1));
    root.querySelector("[data-fq-mark]").addEventListener("click", () => { if (marked.has(pos)) marked.delete(pos); else marked.add(pos); given[pos] = readGiven(root, q); show(); });
    root.querySelectorAll("[data-fq-submit]").forEach((b) => b.addEventListener("click", () => { given[pos] = readGiven(root, q); submit(); }));
  }

  function refreshGrid() {
    const cells = root.querySelectorAll(".fq-cell");
    cells.forEach((c, i) => c.classList.toggle("is-done", given[i] != null));
  }

  function submit() {
    const open = given.filter((g) => g == null).length;
    if (open > 0 && !confirm(t("fs.sim.confirmOpen", "Noch {n} Fragen sind offen. Trotzdem abgeben?", { n: open }))) return;
    clearInterval(clock);
    const res = list.map((q, i) => ({ q, given: given[i], ok: isCorrect(q, given[i]) }));
    res.forEach((r) => { persist(r.q, r.given, r.ok); recordAttempt({ skill: "fuehrerschein", correct: r.ok, topic: `fuehrerschein-${r.q.topic}`, item: r.q.id }); });
    endSet(); // the simulation is graded at once: one row for the whole test
    const fehler = res.filter((r) => !r.ok);
    const fp = fehler.reduce((n, r) => n + r.q.points, 0);
    const fuenfer = fehler.filter((r) => r.q.points === 5).length;
    const passed = fp <= rules.maxFehlerpunkte && !(rules.zweiFuenfer && fuenfer >= 2);
    const byTopic = {};
    for (const r of fehler) {
      const k = r.q.topic;
      byTopic[k] = byTopic[k] ?? { fp: 0, n: 0 };
      byTopic[k].fp += r.q.points;
      byTopic[k].n += 1;
    }
    const why = passed ? "" : fp > rules.maxFehlerpunkte
      ? tx("fs.sim.tooMany", "Noch {n} Fehlerpunkte zu viel.", { n: fp - rules.maxFehlerpunkte })
      : tx("fs.sim.twoFive", "Zwei Fragen mit 5 Punkten waren falsch — damit ist die Prüfung nicht bestanden, auch mit wenigen Fehlerpunkten.");
    try { localStorage.setItem("da-fs-sim-v1", JSON.stringify({ at: new Date().toISOString(), fp, passed, n: list.length })); } catch {}
    root.innerHTML = `
      <div class="fq-result ${passed ? "is-pass" : "is-fail"}">
        <p class="fq-result-k">${passed ? tx("fs.sim.passed", "Bestanden") : tx("fs.sim.failed", "Nicht bestanden")}</p>
        <p class="fq-result-fp"><b>${fp}</b> ${tx("fs.sim.fpOf", "Fehlerpunkte (erlaubt: höchstens {max})", { max: rules.maxFehlerpunkte })}</p>
        ${why ? `<p class="fq-result-why">${why}</p>` : ""}
        <p class="fq-result-time">${tx("fs.sim.time", "Deine Zeit: {t}", { t: time() })}</p>
      </div>
      ${fehler.length ? `
      <h3 class="fq-h">${tx("fs.sim.byTopic", "Fehlerpunkte nach Thema")}</h3>
      <ul class="fq-topics">${Object.entries(byTopic).sort((a, b) => b[1].fp - a[1].fp).map(([k, v]) => `
        <li><a href="${esc(topics[k]?.href ?? "#")}">${esc(topics[k]?.title ?? k)}</a><span>${tx("fs.sim.topicFp", "{fp} Punkte · {n} Fragen", { fp: v.fp, n: v.n })}</span></li>`).join("")}</ul>
      <h3 class="fq-h">${tx("fs.sim.review", "Deine Fehler")}</h3>
      <ol class="fq-review">${fehler.map((r) => `
        <li><p class="fq-review-q" lang="de">${esc(r.q.prompt)} <span class="fq-pts">(${r.q.points})</span></p>
          <p class="fq-review-a"><span class="quiz-no">${esc(t("fs.quiz.rightIs", "Richtig:"))}</span> <strong lang="de">${esc(answerText(r.q))}</strong></p>
          ${explainHtml(r.q)}</li>`).join("")}</ol>` : ""}
      <div class="fq-done-btns"><button type="button" class="quiz-btn quiz-btn--primary" data-fq-restart>${tx("fs.sim.again", "Neue Simulation")}</button></div>`;
    root.querySelectorAll(".fq-review > li").forEach((li, i) => li.append(meldenRow(fehler[i].q, () => fehler[i].given)));
    root.querySelector("[data-fq-restart]").addEventListener("click", () => onFinish?.("restart"));
    root.scrollIntoView({ block: "start", behavior: "smooth" });
    if (passed) celebrate({ title: t("fs.sim.passed", "Bestanden"), body: t("fs.sim.celebrate", "{fp} Fehlerpunkte — gut gemacht!", { fp }), lead: "bruno", crew: ["quaki", "regi", "hamsti"] });
    else celebrate({ title: t("fs.sim.failed", "Nicht bestanden"), body: fp > rules.maxFehlerpunkte ? t("fs.sim.tooMany", "Noch {n} Fehlerpunkte zu viel.", { n: fp - rules.maxFehlerpunkte }) : t("fs.sim.twoFiveShort", "Zwei 5-Punkte-Fragen falsch."), lead: "quaki", crew: ["bruno"], expr: "oops" });
    onFinish?.({ fp, passed });
  }

  clock = setInterval(() => { const el = root.querySelector("[data-fq-clock]"); if (el) el.textContent = `⏱ ${time()}`; }, 1000);
  show();
}

export function mountFahrQuiz(root, questions, opts = {}) {
  if (!root || !questions?.length) return;
  if (opts.mode === "exam") exam(root, questions, opts);
  else practice(root, opts.shuffle === false ? questions : shuffle(questions), opts);
}
