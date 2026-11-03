// Present mode on a grammar topic page (?mode=present): a full-screen deck over the page,
// built from the topic's own data (src/lib/praesentation.js, embedded as #praes-data).
// The explanation first ("Kurz erklärt", then the rule, one block per screen), then the
// example sentences, one per screen: understand it, then hear and say it.
// Inputs, scoring and the exercises stay underneath, out of sight.
//
// → / Space / PageDown / click: next · ← / PageUp: back · Esc or ✕: the normal page.
// The last screen says the deck is over and offers the rule on the page or the way back
// to the lesson (or, opened on its own, to the exercises).
// ?niveau=A1 (set by /teachers/lesson) leaves out rule cards marked for a higher
// level; without it the page's own level counts.
import "../styles/praesentation.css";
import { fitsLevel } from "./praesentation.js";
import { LERN_KEY, stundeHref } from "./unterricht/lernen.js";
import { withBase, currentPath } from "./paths.js";

// Opened from a lesson: the teacher's (?ut=1) or a learner's Stunde (?ls=1, /lesson).
const from = () => {
  const q = new URLSearchParams(location.search);
  return q.get("ut") === "1" ? "ut" : q.get("ls") === "1" ? "ls" : null;
};
// The learner's Stunde (lernstunde.js) hears that this deck was seen to its end.
const seenToEnd = () => dispatchEvent(new CustomEvent("da:deck-end", { detail: { topic: currentPath() } }));

// A chevron instead of a text arrow: ‹ › for paging, and on „Zurück zur Präsentation“.
// A rule card's running text, set for the projector: every whole example sentence (an <em>
// ending in . ! ?) on its own line with an accent bar, the "—" between examples dropped,
// and each "Label:" in bold opening a new block. Short <em> marks inside a sentence stay.
const formatRuleText = (html) => html
  .replace(/\s*—\s*(?=<em>)/g, " ")
  .replace(/<em>([^<]*[.!?])<\/em>/g, '<span class="pr-rex">$1</span>')
  .replace(/\s*(<strong>[^<]*:<\/strong>)/g, '<span class="pr-rlab">$1</span>');
const chev = (dir) => `<svg class="pr-chev" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}"/></svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** The screens of a deck for a group at `level`: explanation, rule, then the examples. */
export function slidesOf(deck, level) {
  const fits = (r) => r.kind !== "text" || fitsLevel(r.level, level);
  const n = deck.examples.length;
  const slides = [...deck.brief.filter(fits), ...deck.rules.filter(fits)];
  if (n) slides.push({ kind: "turn" });
  slides.push(...deck.examples.map((ex, i) => ({ kind: "example", ...ex, label: `Beispiel ${i + 1} von ${n}` })));
  slides.push({ kind: "end" });
  return slides;
}

function slideHtml(s, name) {
  if (s.kind === "example") {
    return `<p class="pr-label">${esc(s.label)}</p><p class="pr-example">${s.html}</p>
      ${s.audio ? `<button type="button" class="pr-audio" data-pr-audio="${esc(s.audio)}" aria-label="Anhören">▶ Anhören</button>` : ""}`;
  }
  if (s.kind === "end") {
    // Opened from a lesson (?ut=1, /teachers/lesson): back to it; else to the exercises.
    const lesson = from() != null;
    return `<p class="pr-label">${esc(name)}</p><p class="pr-reveal">Ende der Präsentation<br><span>Noch Fragen? Dann zeig die ganze Regel.</span></p>
      <div class="pr-end">
        <button type="button" class="pr-end-btn" data-pr-rule>Regel ansehen</button>
        <button type="button" class="pr-end-btn pr-end-btn--main" data-pr-back>${lesson ? "Zurück zur Stunde" : "Zu den Übungen"}</button>
      </div>`;
  }
  if (s.kind === "turn") return `<p class="pr-label">${esc(name)}</p><p class="pr-reveal">Jetzt in Sätzen<br><span>Hört zu und sprecht nach.</span></p>`;
  if (s.kind === "flow") {
    return `<p class="pr-label">Die Regel</p><div class="pr-flow">${s.items.map((f, k) =>
      `${k ? `<span class="pr-flow-arrow">${chev(1)}</span>` : ""}<span class="pr-flow-item${f.variant ? ` pr-flow-item--${esc(f.variant)}` : ""}">${esc(f.text)}</span>`).join("")}</div>`;
  }
  if (s.kind === "table") {
    return `<p class="pr-label">${esc(s.caption ?? "Die Regel")}</p><table class="pr-table">
      ${s.head?.some(Boolean) ? `<thead><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` : ""}
      <tbody>${s.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  // Few words, bigger type: a short slide fills the screen instead of floating in it.
  const size = s.words == null ? 1 : s.words <= 6 ? 1.45 : s.words <= 12 ? 1.2 : 1;
  return `<p class="pr-label">${esc(s.label ?? "Die Regel")}</p><div class="pr-card" style="--pr-size:${size}">${s.html}</div>`;
}

export function mountDeck(deck, { name, level, rule = false }) {
  const slides = slidesOf(deck, level);
  let i = 0;
  // Opened from a lesson (?ut=1): every way out leads back to the lesson, never down onto the
  // topic page under the deck – its exercises and side list are where a teacher gets lost.
  const fromLesson = from() != null;
  let shown = false; // a slide was on screen (else the rule was the first thing, ?regel=1)
  const root = document.createElement("div");
  root.className = "pr";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", `${name} – Präsentation`);
  root.innerHTML = `
    <div class="pr-top"><b>${esc(name)}</b>
      <button type="button" class="pr-btn" data-pr-full aria-label="Vollbild">⛶</button>
      <button type="button" class="pr-btn" data-pr-close aria-label="${fromLesson ? "Zurück zur Stunde" : "Präsentation schließen"}" title="${fromLesson ? "Zurück zur Stunde" : "Schließen"}">✕</button></div>
    <section class="pr-stage" data-pr-stage aria-live="polite"></section>
    <div class="pr-nav">
      <button type="button" class="pr-btn" data-pr-prev aria-label="Zurück">${chev(-1)}</button>
      <span class="pr-count" data-pr-count></span>
      <button type="button" class="pr-btn" data-pr-next aria-label="Weiter">${chev(1)}</button>
    </div>`;
  document.body.append(root);
  document.documentElement.dataset.praes = "on";
  delete document.documentElement.dataset.praesBoot; // the page's hold (see [id].astro): the deck covers it now
  const $ = (s) => root.querySelector(s);
  const audio = new Audio();

  // A short slide-and-fade on every change, from the side you are going to (praesentation.css).
  function draw(dir = 0) {
    audio.pause();
    ruleOpen = false;
    shown = true;
    $(".pr-nav").style.display = "";
    const stage = $("[data-pr-stage]");
    stage.innerHTML = slideHtml(slides[i], name);
    stage.dataset.kind = slides[i].kind;
    if (slides[i].kind === "end") seenToEnd();
    stage.dataset.dir = dir < 0 ? "back" : "next";
    stage.classList.remove("pr-in");
    void stage.offsetWidth; // restart the animation
    stage.classList.add("pr-in");
    $("[data-pr-count]").textContent = `${i + 1} / ${slides.length}`;
    $("[data-pr-prev]").style.visibility = i === 0 ? "hidden" : "";
    $("[data-pr-next]").style.visibility = i === slides.length - 1 ? "hidden" : "";
  }
  const go = (d) => {
    // From the rule, ← goes back to the end screen; → has nowhere further to go.
    if (ruleOpen) { if (d < 0) draw(-1); return; }
    const j = Math.min(slides.length - 1, Math.max(0, i + d));
    if (j !== i) { i = j; draw(d); }
  };
  function close() {
    audio.pause();
    root.remove();
    delete document.documentElement.dataset.praes;
    removeEventListener("keydown", onKey);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const u = new URL(location.href);
    u.searchParams.delete("mode");
    history.replaceState(null, "", u);
  }
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.("input, textarea, select")) return;
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
    else if (e.key === "Home") { i = 0; draw(-1); }
    else if (e.key === "End") { i = slides.length - 1; draw(); }
    else if (e.key === "Escape" && !document.fullscreenElement) (fromLesson ? back() : close());
  }
  addEventListener("keydown", onKey);
  $("[data-pr-prev]").addEventListener("click", () => go(-1));
  $("[data-pr-next]").addEventListener("click", () => go(1));
  $("[data-pr-close]").addEventListener("click", () => (fromLesson ? back() : close()));
  $("[data-pr-full]").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else root.requestFullscreen?.().catch(() => {});
  });
  // „Regel ansehen“: the page's whole rule card, shown inside the deck as one scrolling
  // screen – the teacher stays in the presentation (the page under it, with its exercises
  // and side list, is where a projector audience gets lost). A copy of the card without
  // its sheet controls; ← or „Zurück zur Präsentation“ returns to the end screen.
  let ruleOpen = false;
  function showRule() {
    const body = document.querySelector("#vp-rule-card .vp-sheet-body") ?? document.getElementById("vp-rule-card");
    if (!body) return showRuleOnPage();
    ruleOpen = true;
    audio.pause();
    seenToEnd();
    const stage = $("[data-pr-stage]");
    // The same two buttons above and under the rule: a long rule is scrolled to its end, and
    // the way on should be there, not back at the top.
    const bar = `<div class="pr-rule-bar">
        <button type="button" class="pr-end-btn" data-pr-rule-back>${shown ? `${chev(-1)} Zurück zur Präsentation` : "Präsentation zeigen"}</button>
        <button type="button" class="pr-end-btn pr-end-btn--main" data-pr-back>${fromLesson ? "Zurück zur Stunde" : "Zu den Übungen"}</button>
      </div>`;
    stage.innerHTML = `${bar}
      <div class="pr-rule"><div class="vp-card vp-rule-card"></div></div>
      ${bar}`;
    const copy = body.cloneNode(true);
    copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    copy.querySelectorAll("[data-sheet-close], .vp-rule-bar, [hidden]").forEach((el) => el.remove());
    stage.querySelector(".vp-rule-card").append(...copy.childNodes);
    stage.querySelectorAll(".vp-qa-text, .vp-note").forEach((el) => { el.innerHTML = formatRuleText(el.innerHTML); });
    stage.dataset.kind = "rule";
    stage.dataset.dir = "next";
    stage.classList.remove("pr-in");
    void stage.offsetWidth;
    stage.classList.add("pr-in");
    stage.scrollTop = 0;
    // The bar above already has „← Zurück zur Präsentation“; a second ← with „Die Regel“
    // beside it read like a button back to the rule.
    $(".pr-nav").style.display = "none";
  }
  // A topic without a rule card: the rule column on the page, as „Ganze Regel ansehen“ in
  // [id].astro opens it, enlarged on a wide screen.
  function showRuleOnPage() {
    close();
    const btn = [document.getElementById("vp-rule-toggle"), document.getElementById("vp-rule-peek")].find((b) => b && b.offsetParent !== null);
    if (document.getElementById("vp-page")?.dataset.rule === "hidden") btn?.click();
    // On a wide screen, straight into the enlarged focus view (ruleColumn.js) – the whole
    // rule readable on the projector. A phone already shows it as a full sheet.
    const max = document.querySelector("#vp-rule .vp-rule-max");
    if (max && max.offsetParent !== null && max.getAttribute("aria-pressed") !== "true") max.click();
    else document.getElementById("vp-rule")?.scrollIntoView({ block: "start" });
  }
  // Opened from the lesson: switch to the lesson's tab and leave this one as it is, so the
  // deck is still here (on its end screen or the rule) when the teacher comes back.
  async function back() {
    if (!fromLesson) return close();
    // A learner's Stunde opens its material in the same tab: back to /lesson.
    if (from() === "ls") {
      let k = null;
      try { k = JSON.parse(localStorage.getItem(LERN_KEY) ?? "null")?.key; } catch {}
      location.assign(withBase(k ? stundeHref(k) : "/lesson"));
      return;
    }
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    const { toLesson } = await import("./unterricht/zurueck.js");
    toLesson();
  }

  $("[data-pr-stage]").addEventListener("click", (e) => {
    if (e.target.closest("[data-pr-rule]")) return showRule();
    if (e.target.closest("[data-pr-back]")) return back();
    if (e.target.closest("[data-pr-rule-back]")) return draw(-1);
    if (ruleOpen) return; // reading the rule: a click is not „next“
    const a = e.target.closest("[data-pr-audio]");
    if (a) {
      audio.src = withBase(a.dataset.prAudio);
      audio.play().catch(() => {});
      return;
    }
    go(1);
  });
  // ?regel=1 („Regel“ beside the deck in the lesson): straight to the whole rule, without
  // the first slide flashing under it.
  if (rule) showRule();
  else draw();
  $("[data-pr-next]").focus();
  return { close };
}

/** From [id].astro: on ?mode=present, the deck for this page's #praes-data. */
export function bootDeck() {
  const q = new URLSearchParams(location.search);
  if (q.get("mode") !== "present") return;
  const el = document.getElementById("praes-data");
  if (!el) { delete document.documentElement.dataset.praesBoot; return; }
  const { deck, name, level } = JSON.parse(el.textContent);
  const want = (q.get("niveau") ?? "").toUpperCase();
  mountDeck(deck, { name, level: /^[ABC][12]$/.test(want) ? want : level, rule: q.get("regel") === "1" });
}
