// /politik in the browser: the level switch, glossary, matrix filter and tooltips, the
// majority calculator, the heatmap filter and the quiz. Everything is drawn by the page
// (politik.astro, render.js); this only reacts.
//
// Nothing here sends anything anywhere. The quiz answers live in a variable and are gone
// with the tab; a shared link carries the result point only (?pos=4.2,6.1).
import { isLeicht, setLeicht, onLeichtChange } from "../leichteSprache.js";
import { getLang, onLangChange } from "../i18n.js";
import { enhanceSwitch } from "../segSwitch.js";
import { score, nearest, encodePos, decodePos } from "./quiz.js";
import { px, py } from "./render.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const num = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COUNTRY = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };

export function mountPolitik(root, data) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  /** The active register of a { de, leicht } block. */
  const r = (b) => (isLeicht() ? b.leicht ?? b.de : b.de);
  const lang = () => getLang();

  /* ------------------------------------------------------------ level ---- */
  const levelSwitch = $("[data-level-switch]");
  const syncLevel = () => {
    for (const b of levelSwitch.querySelectorAll("button")) b.setAttribute("aria-pressed", String((b.dataset.level === "leicht") === isLeicht()));
  };
  levelSwitch.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setLeicht(b.dataset.level === "leicht");
  });
  document.documentElement.classList.toggle("is-leicht", isLeicht());
  syncLevel();
  enhanceSwitch(levelSwitch);
  onLeichtChange(() => { syncLevel(); redrawQuiz(); });

  /* --------------------------------------------------------- glossary ---- */
  const gloss = $("[data-gloss]");
  let glossFrom = null;
  const openGloss = (btn) => {
    const g = data.glossar[btn.dataset.term];
    if (!g) return;
    glossFrom = btn;
    gloss.querySelector("[data-gloss-term]").textContent = g.term;
    gloss.querySelector("[data-gloss-text]").textContent = r(g);
    const t = lang() !== "de" ? g.tr?.[lang()] : null;
    const trEl = gloss.querySelector("[data-gloss-tr]");
    trEl.hidden = !t;
    trEl.textContent = t ?? "";
    if (t) { trEl.lang = lang(); trEl.dir = "auto"; }
    gloss.hidden = false;
    // Beside the word on a wide screen; a sheet at the bottom on a phone (CSS).
    const rect = btn.getBoundingClientRect();
    const host = root.getBoundingClientRect();
    gloss.style.setProperty("--gx", `${Math.max(8, Math.min(rect.left - host.left, host.width - 330))}px`);
    gloss.style.setProperty("--gy", `${rect.bottom - host.top + 8}px`);
    gloss.querySelector("[data-gloss-close]").focus({ preventScroll: true });
  };
  const closeGloss = () => {
    if (gloss.hidden) return;
    gloss.hidden = true;
    glossFrom?.focus({ preventScroll: true });
  };
  root.addEventListener("click", (e) => {
    const term = e.target.closest(".pk-term");
    if (term) return openGloss(term);
    if (e.target.closest("[data-gloss-close]") || (!e.target.closest("[data-gloss]") && !gloss.hidden)) closeGloss();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeGloss(); hideTip(); } });

  /* ----------------------------------------------------------- matrix ---- */
  const byId = new Map(data.parties.map((p) => [p.id, p]));
  const fig = $("[data-matrix]");
  const tip = $("[data-tip]");
  const filter = (group, target) => {
    group.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      for (const x of group.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
      target.dataset.show = b.dataset.country;
      hideTip();
    });
    enhanceSwitch(group);
  };
  filter($("[data-country-filter]"), fig);
  filter($("[data-heat-filter]"), $("[data-heat]"));
  filter($("[data-result-filter]"), $("[data-result-matrix]"));

  function showTip(g) {
    const p = byId.get(g.dataset.party);
    if (!p) return;
    const seats = p.parl ? `${p.parl}: ${p.seats} Sitze im Parlament` : "derzeit nicht im nationalen Parlament";
    tip.innerHTML = `<p class="pk-tip-h"><span class="pk-swatch" style="background:${p.color}"></span><strong>${esc(p.short)}</strong> · ${esc(COUNTRY[p.country])}</p>
      <p class="pk-tip-name">${esc(p.name)}</p>
      ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
      <p class="pk-tip-vals">Wirtschaft ${num(p.x)} · Gesellschaft ${num(p.y)} (CHES ${data.wave}) · ${esc(seats)}</p>`;
    tip.hidden = false;
    const svg = fig.querySelector("svg").getBoundingClientRect();
    const box = fig.getBoundingClientRect();
    const sx = svg.width / 114, sy = svg.height / 116;
    const left = svg.left - box.left + px(p.x) * sx;
    const top = svg.top - box.top + py(p.y) * sy;
    tip.style.left = `${Math.max(4, Math.min(left - 140, box.width - 284))}px`;
    tip.style.top = `${top + 14}px`;
  }
  function hideTip() { tip.hidden = true; }
  fig.addEventListener("click", (e) => {
    const g = e.target.closest(".pk-dot");
    g ? showTip(g) : hideTip();
  });
  fig.addEventListener("keydown", (e) => {
    const g = e.target.closest(".pk-dot");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showTip(g); }
  });
  fig.addEventListener("focusin", (e) => { const g = e.target.closest(".pk-dot"); if (g) showTip(g); });
  fig.addEventListener("mouseover", (e) => { const g = e.target.closest(".pk-dot"); if (g && matchMedia("(hover: hover)").matches) showTip(g); });

  /* -------------------------------------------------------- majorities ---- */
  for (const card of $$("[data-parl]")) {
    const p = data.parl.find((x) => x.country === card.dataset.parl);
    const out = card.querySelector("[data-coal-out]");
    const T = data.t.parlamente;
    const sync = () => {
      const n = [...card.querySelectorAll("[data-coal]:checked")].reduce((s, i) => s + +i.value, 0);
      out.textContent = n ? `${fill(r(T.summe), { n, total: p.total })} ${n >= p.majority ? r(T.ja) : fill(r(T.nein), { n: p.majority - n })}` : "";
      out.classList.toggle("is-yes", n >= p.majority);
    };
    card.addEventListener("change", sync);
    onLeichtChange(sync);
  }

  /* ------------------------------------------------------------- quiz ---- */
  const Q = data.quiz;
  const TQ = data.t.quiz;
  const box = $("[data-quiz]");
  const qEl = $("[data-quiz-q]");
  const resEl = $("[data-quiz-result]");
  let answers = {};
  let i = 0;
  let lastPos = null;

  function drawQuestion() {
    const it = Q[i];
    $("[data-quiz-step]").textContent = fill(r(TQ.schritt), { n: i + 1, total: Q.length });
    $("[data-quiz-bar]").style.width = `${(100 * i) / Q.length}%`;
    $("[data-quiz-text]").textContent = r(it);
    const t = lang() !== "de" ? it.tr?.[lang()] : null;
    const help = $("[data-quiz-help]");
    help.hidden = !t;
    help.textContent = t ?? "";
    if (t) { help.lang = lang(); help.dir = "auto"; }
    for (const b of $$("[data-ans]")) b.setAttribute("aria-pressed", String(answers[it.id] === +b.dataset.ans));
    $("[data-quiz-back]").hidden = i === 0;
  }
  function next() {
    if (i < Q.length - 1) { i++; drawQuestion(); return; }
    showResult(score(Q, answers));
  }
  $("[data-quiz-start]").addEventListener("click", () => {
    answers = {};
    i = 0;
    $("[data-quiz-start]").hidden = true;
    $("[data-shared]").hidden = true;
    resEl.hidden = true;
    qEl.hidden = false;
    drawQuestion();
    qEl.querySelector("[data-ans]").focus({ preventScroll: true });
  });
  qEl.addEventListener("click", (e) => {
    const a = e.target.closest("[data-ans]");
    if (a) { answers[Q[i].id] = +a.dataset.ans; next(); return; }
    if (e.target.closest("[data-quiz-skip]")) { answers[Q[i].id] = null; next(); return; }
    if (e.target.closest("[data-quiz-back]") && i > 0) { i--; drawQuestion(); }
  });

  function showResult(pos, { shared = false } = {}) {
    qEl.hidden = true;
    resEl.hidden = false;
    $("[data-quiz-start]").hidden = false;
    const few = pos.x == null || pos.y == null;
    $("[data-result-few]").hidden = !few;
    $("[data-result-matrix]").hidden = few;
    $("[data-result-filter]").hidden = few;
    $("[data-result-near]").hidden = few;
    $("[data-quiz-share]").hidden = few || shared;
    lastPos = few ? null : pos;
    redrawQuiz();
    if (!few) {
      const you = resEl.querySelector("[data-you]");
      you.hidden = false;
      you.querySelector("circle").setAttribute("cx", px(pos.x));
      you.querySelector("circle").setAttribute("cy", py(pos.y));
      you.querySelector("text").setAttribute("x", px(pos.x));
      you.querySelector("text").setAttribute("y", py(pos.y) - 4.2);
    }
    resEl.focus({ preventScroll: true });
    resEl.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function redrawQuiz() {
    if (!qEl.hidden) drawQuestion();
    if (!lastPos) return;
    $("[data-result-vals]").textContent = fill(r(TQ.ergebnis.werte), { x: num(lastPos.x), y: num(lastPos.y) });
    $("[data-result-near]").innerHTML = ["DE", "AT", "CH"].map((c) => {
      const list = nearest(lastPos, data.parties.filter((p) => p.country === c).map((p) => ({ ...p, name: p.short })), 3);
      return `<div class="pk-near-col"><h5>${esc(COUNTRY[c])}</h5><ol>${list.map((p) => `<li><span class="pk-swatch" style="background:${p.color}"></span><span>${esc(p.short)}</span> <strong>${esc(fill(r(TQ.ergebnis.match), { p: p.match }))}</strong></li>`).join("")}</ol></div>`;
    }).join("");
  }
  $("[data-quiz-again]").addEventListener("click", () => $("[data-quiz-start]").click());
  $("[data-quiz-share]").addEventListener("click", async () => {
    if (!lastPos) return;
    const url = `${location.origin}${location.pathname}?pos=${encodePos(lastPos)}#pk-quiz`;
    const status = $("[data-share-status]");
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); status.textContent = r(TQ.ergebnis.kopiert); }
    } catch {
      status.textContent = url;
    }
  });

  // A shared result: the point only, shown as a result with a note; the quiz itself is fresh.
  const shared = decodePos(new URLSearchParams(location.search).get("pos"));
  if (shared) {
    const note = $("[data-shared]");
    note.hidden = false;
    const paint = () => { note.textContent = fill(r(TQ.ergebnis.geteilt), { x: num(shared.x), y: num(shared.y) }); };
    paint();
    onLeichtChange(paint);
    showResult(shared, { shared: true });
  }

  onLangChange(() => { if (!qEl.hidden) drawQuestion(); });
}
