// The session bar: while a lesson runs, a slim bar at the bottom of the session page and of
// every page opened from it (topic pages, the Wortliste, the plan). Group · Stunde · step
// n/N · phase (in its colour) · ← → · Pause · Uhr · Beenden, and on any other page
// "Zurück zum Schritt".
//
// On a wide screen it floats over the page's own column (as wide as <main>'s text), not
// across the whole window. Away from the session page it folds to a pill (phase + time) so
// it does not sit on the page being taught; the first time, a short tour shows it open and
// then folds it, so the teacher knows where it went.
//
// Every page load is a fresh start (the site has no client router), so boot() runs from
// Layout.astro whenever the local copy (speichern.js, "da:unterricht") exists. It draws from
// that copy at once and only then asks the server whether the session moved on elsewhere.
//
// The learner's Stunde (/stunde, mode "lernend") uses the same bar: Stunde · step n/N ·
// phase · ← → · Uhr · „Später weiter“. No Pause, no Beenden, no group; the time is „ca. 10
// Min.“, a finished step shows ✓ and lights up →. bootLern() starts it from "da:lernstunde".
import "./leiste.css";
import { setWaiting } from "../notReady.js";
import { phaseColor } from "./phasen.js";
import { createSteuerung, view } from "./steuerung.js";
import { mountUhr } from "./uhr.js";
import { readLocal, clearLocal, sessionHref } from "./speichern.js";
import { LERN_MATERIAL_WINDOW, LERN_WINDOW, toLesson, toTab } from "./zurueck.js";
import { about, progressOf, statusOf, stundeHref } from "./lernen.js";
import { createRuleIntro } from "../ruleIntro.js";
import { mascotSvg } from "../mascots.js";
import "../../styles/rule-intro.css";

// Arrow icons (stroke, currentColor) for ← →; the text glyphs were thin and read as greyed out.
const ARROW = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const LEFT = ARROW('<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>');
const RIGHT = ARROW('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>');
const FOLD = ARROW('<path d="M6 9l6 6 6-6"/>');

// Folded or open, away from the session page: the teacher's last choice ("1" = folded).
// The learner's bar has its own keys.
const FOLD_KEYS = { lehrkraft: "da-ut-leiste-zu", lernend: "da-ls-leiste-zu" };
// The tour, once per browser (matches the demo dock's "Tour neu" pattern /^da-.*seen/).
const TOUR_KEYS = { lehrkraft: "da-ut-leiste-seen", lernend: "da-ls-leiste-seen" };
const wide = matchMedia("(min-width: 761px)");
// Never narrower than this on a wide screen: below it the controls would wrap.
const MIN_W = 640;
// Narrower than this, the buttons drop their words ("Zurück zum Schritt" → ↩).
const SHORT_W = 900;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// A lesson left open (no "Beenden") stops showing its bar after half a day; the session
// itself stays and can be continued from the plan page.
const STALE_MS = 12 * 60 * 60 * 1000;

/**
 * @param ctl  createSteuerung()
 * @param opts { home: true on the session page itself (no "Zurück zum Schritt"),
 *               onEnd(): after "Beenden",
 *               mode: "lehrkraft" | "lernend",
 *               onLater(): the learner's „Später weiter“ (default: back to /stunde) }
 */
export function mountLeiste(ctl, { home = false, onEnd, mode = "lehrkraft", onLater } = {}) {
  const lern = mode === "lernend";
  const FOLD_KEY = FOLD_KEYS[mode];
  const TOUR_SEEN = TOUR_KEYS[mode];
  // finish() runs once, whichever comes first: "Ja, beenden" here or the end arriving from
  // another tab.
  let gone = false;
  const bar = document.createElement("div");
  bar.className = "ut-leiste";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", lern ? "Deine Stunde" : "Laufender Unterricht");
  if (lern) bar.classList.add("ut-leiste--lern");
  document.body.append(bar);
  document.body.classList.add("ut-mit-leiste");
  const uhr = mountUhr(ctl, { mode, onToggle: () => render(ctl.state) });
  const stunde = ctl.key.stunde;
  const backHref = lern ? stundeHref(ctl.key) : sessionHref(ctl.id);

  bar.innerHTML = `
    <span class="ut-leiste-bruno" data-l-bruno data-mascot-part aria-hidden="true"></span>
    <div class="ut-leiste-who">${lern ? `<b>Stunde ${stunde}</b><span>${esc(ctl.gruppe)}</span>` : `<b>${esc(ctl.gruppe)}</b><span>Stunde ${stunde}</span>`}</div>
    <span class="ut-leiste-phase" data-l-phase></span>
    <span class="ut-leiste-extra" data-l-extra></span>
    <span class="ut-leiste-spacer"></span>
    <span class="ut-leiste-warn" data-l-warn hidden>Nicht gespeichert – keine Verbindung</span>
    ${home ? "" : `<a class="ut-leiste-btn" data-l-back href="${backHref}" title="Zurück zum Schritt">↩ <span class="ut-leiste-lbl">Zurück zum Schritt</span></a>`}
    <button type="button" class="ut-leiste-btn ut-leiste-arrow" data-l-prev aria-label="Vorheriger Schritt" title="Vorheriger Schritt (←)">${LEFT}</button>
    ${lern ? "" : `<button type="button" class="ut-leiste-btn ut-leiste-btn--main" data-l-play></button>`}
    <button type="button" class="ut-leiste-btn ut-leiste-arrow" data-l-next aria-label="Nächster Schritt" title="Nächster Schritt (→)">${RIGHT}</button>
    <button type="button" class="ut-leiste-btn" data-l-uhr aria-label="Uhr zeigen oder ausblenden" title="Uhr zeigen oder ausblenden">◔ <span class="ut-leiste-lbl">Uhr</span></button>
    ${lern
      ? `<button type="button" class="ut-leiste-btn" data-l-later title="Die Stunde bleibt gespeichert">Später weiter</button>`
      : `<button type="button" class="ut-leiste-btn ut-leiste-btn--end" data-l-end>Beenden</button>`}
    ${home ? "" : `<button type="button" class="ut-leiste-btn ut-leiste-fold" data-l-fold>${FOLD}</button>`}`;
  const $ = (s) => bar.querySelector(s);
  const main = bar.innerHTML;

  // Folded: only the phase pill and the button that opens the bar again.
  let folded = false;
  function setFolded(on, remember = true) {
    folded = !home && on;
    bar.classList.toggle("ut-leiste--zu", folded);
    document.body.classList.toggle("ut-leiste-zu", folded);
    const b = $("[data-l-fold]");
    if (b) {
      b.setAttribute("aria-expanded", String(!folded));
      b.setAttribute("aria-label", folded ? "Leiste öffnen" : "Leiste einklappen");
      b.title = folded ? "Leiste öffnen" : "Leiste einklappen";
    }
    if (remember) { try { localStorage.setItem(FOLD_KEY, folded ? "1" : "0"); } catch {} }
  }
  let saved = null;
  try { saved = localStorage.getItem(FOLD_KEY); } catch {}
  setFolded(saved !== "0", false);

  // As wide as the page's text column (<main> minus its padding), centred on it.
  const column = document.querySelector("main");
  function place() {
    if (!wide.matches || !column) {
      bar.style.removeProperty("--ut-l");
      bar.style.removeProperty("--ut-w");
      bar.classList.remove("ut-leiste--eng");
      return;
    }
    const r = column.getBoundingClientRect();
    const cs = getComputedStyle(column);
    const left = r.left + parseFloat(cs.paddingLeft);
    const cw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = Math.min(Math.max(cw, MIN_W), window.innerWidth - 32);
    const l = Math.min(Math.max(left + cw / 2 - w / 2, 16), window.innerWidth - w - 16);
    bar.style.setProperty("--ut-l", Math.round(l) + "px");
    bar.style.setProperty("--ut-w", Math.round(w) + "px");
    bar.classList.toggle("ut-leiste--eng", w < SHORT_W);
  }
  place();
  const ro = column ? new ResizeObserver(place) : null;
  ro?.observe(column);
  window.addEventListener("resize", place);
  wide.addEventListener("change", place);

  // Bruno keeps the teacher company: thinking while a phase runs, asleep while paused, and
  // a short cheer when the last phase's time is up. Hidden with "Maskottchen: aus"
  // (data-mascot-part); with reduced motion the cheer is just the drawing, nothing moves.
  let mood = "";
  let cheered = false;
  let cheerUntil = 0;
  function setBruno(expr) {
    const el = $("[data-l-bruno]");
    if (!el || (expr === mood && el.firstChild)) return;
    mood = expr;
    el.innerHTML = mascotSvg({ name: "bruno", expr, view: "three", size: 34, label: "", ...(lern ? {} : { extra: "klemmbrett" }) });
    el.classList.toggle("is-cheer", expr === "celebrate" && !matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // The learner's step just turned „fertig“: Bruno cheers once, → lights up.
  let doneSeen = null;
  function renderLern(state) {
    const v = view(state);
    if (v.completed) return finish();
    const status = statusOf(ctl.extra, v.index);
    const goal = ctl.extra?.goals?.[v.index];
    const done = status === "fertig";
    if (doneSeen === null) doneSeen = done;
    if (done && !doneSeen) { cheerUntil = Date.now() + 2500; setTimeout(() => render(ctl.state), 2600); }
    doneSeen = done;
    setBruno(Date.now() < cheerUntil ? "celebrate" : done ? "happy" : "thinking");
    const col = phaseColor(v.step.id);
    const ph = $("[data-l-phase]");
    ph.style.background = col.bg;
    ph.style.boxShadow = `inset 0 0 0 1px ${col.ink}33`;
    // What is left of the step, when it can be counted ("12/40"); else the soft time.
    const p = goal && goal.kind !== "fertig" ? progressOf(goal, ctl.extra?.seen?.[v.index]) : null;
    const how = done ? "✓ fertig" : status === "uebersprungen" ? "übersprungen" : p && p.need > 1 ? `${p.have}/${p.need}` : about(v.step.minutes);
    ph.innerHTML = `<span>${v.index + 1}/${v.count}</span> ${esc(v.step.name)} <small>${how}</small>`;
    ph.classList.toggle("ut-leiste-phase--done", done);
    const next = $("[data-l-next]");
    next.classList.toggle("ut-leiste-arrow--go", done && v.index < v.count - 1);
    setWaiting($("[data-l-prev]"), v.index === 0 ? "Das ist der erste Schritt." : null);
    setWaiting(next, v.index === v.count - 1 ? "Das ist der letzte Schritt. Schließ ihn auf der Seite der Stunde ab." : null);
    $("[data-l-uhr]").setAttribute("aria-pressed", String(uhr.visible));
  }

  function render(state) {
    if (!$("[data-l-phase]")) return; // the "Beenden?" question is showing
    if (lern) return renderLern(state);
    const v = view(state);
    // Ended here or in another tab (steuerung.js follows the other tabs).
    if (v.completed) return finish();
    const last = v.index === v.count - 1;
    if (last && v.over && v.running && !cheered) { cheered = true; cheerUntil = Date.now() + 2500; setTimeout(() => render(ctl.state), 2600); }
    setBruno(Date.now() < cheerUntil ? "celebrate" : v.running ? "thinking" : "sleepy");
    const col = phaseColor(v.step.id);
    const ph = $("[data-l-phase]");
    ph.style.background = col.bg;
    ph.style.boxShadow = `inset 0 0 0 1px ${col.ink}33`;
    ph.classList.toggle("ut-leiste-phase--over", !!v.over);
    ph.innerHTML = `<span>${v.index + 1}/${v.count}</span> ${esc(v.step.name)} <small>${v.over || v.remaining}</small>`;
    const play = $("[data-l-play]");
    play.textContent = v.running ? "Pause" : "Weiter";
    play.setAttribute("aria-label", v.running ? "Uhr anhalten" : "Uhr weiterlaufen lassen");
    setWaiting($("[data-l-prev]"), v.index === 0 ? "Das ist der erste Schritt." : null);
    setWaiting($("[data-l-next]"), v.index === v.count - 1 ? "Das ist der letzte Schritt. Zum Abschluss: „Beenden“." : null);
    $("[data-l-uhr]").setAttribute("aria-pressed", String(uhr.visible));
    $("[data-l-warn]").hidden = !ctl.saveFailed;
  }

  function wire() {
    $("[data-l-prev]").addEventListener("click", () => ctl.prev());
    $("[data-l-next]").addEventListener("click", () => ctl.next());
    $("[data-l-play]")?.addEventListener("click", () => ctl.toggle());
    $("[data-l-uhr]").addEventListener("click", () => { uhr.toggle(); render(ctl.state); });
    $("[data-l-end]")?.addEventListener("click", ask);
    // „Später weiter“: the clock stops and stays stopped until /stunde is opened again.
    $("[data-l-later]")?.addEventListener("click", () => {
      ctl.patch((x) => ({ ...x, parked: true }));
      ctl.pause();
      if (onLater) onLater();
      else location.assign(stundeHref(ctl.key, "&spaeter=1"));
    });
    $("[data-l-fold]")?.addEventListener("click", () => setFolded(!folded));
    // Folded, the phase pill is the bigger target for opening it again.
    $("[data-l-phase]").addEventListener("click", () => { if (folded) setFolded(false); });
    // To the lesson's tab; this page stays open in its own tab (zurueck.js). A learner's
    // material opens in the same tab, so the link just goes back – except the word cards,
    // which have a tab of their own.
    $("[data-l-back]")?.addEventListener("click", (e) => {
      if (lern && window.name !== LERN_MATERIAL_WINDOW) return;
      e.preventDefault();
      if (lern) toTab(LERN_WINDOW, backHref);
      else toLesson();
    });
  }

  // "Beenden" asks in the bar itself: no browser dialog on the projector.
  let parked = [];
  function ask() {
    // What other parts put in the bar (Live üben's chip) waits outside meanwhile.
    parked = [...($("[data-l-extra]")?.childNodes ?? [])];
    // The question needs the whole bar.
    bar.classList.remove("ut-leiste--zu");
    document.body.classList.remove("ut-leiste-zu");
    bar.innerHTML = `<div class="ut-leiste-ask">
      <p>Stunde ${stunde} mit ${esc(ctl.gruppe)} beenden?</p>
      <button type="button" class="ut-leiste-btn ut-leiste-btn--main" data-l-yes>Ja, beenden</button>
      <button type="button" class="ut-leiste-btn" data-l-no>Weiter unterrichten</button></div>`;
    $("[data-l-no]").addEventListener("click", () => {
      bar.innerHTML = main;
      mood = "";
      $("[data-l-extra]").append(...parked);
      wire(); setFolded(folded, false); render(ctl.state);
    });
    $("[data-l-yes]").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true; // saving
      await ctl.end();
      finish();
    });
    $("[data-l-no]").focus();
  }

  // Arrow keys on the session page and in present mode belong to the slides; elsewhere
  // nothing here listens to keys.
  wire();
  setFolded(folded, false);
  const off = ctl.on(render);
  if (!home) tour();

  // First time the bar shows up on another page: open, named, folded, and the light left
  // on the button that opens it. ?intro replays it without spending the flag.
  function tour() {
    const forced = new URLSearchParams(location.search).has("intro");
    let seen = false;
    try { seen = localStorage.getItem(TOUR_SEEN) === "1"; } catch {}
    if ((seen && !forced) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!forced) { try { localStorage.setItem(TOUR_SEEN, "1"); } catch {} }
    const compact = !wide.matches;
    const intro = createRuleIntro({
      mascot: "bruno",
      ruleEl: bar,
      ruleBtn: $("[data-l-fold]"),
      ruleCard: bar,
      // A demo, not the teacher's choice: the tour hands back the folded bar.
      setRule: (hidden) => setFolded(hidden, false),
      compact,
      coach: lern ? [
        ["Deine Stunde ist dabei", "Schritt und Phase, ← → zum Weitergehen, „Zurück zum Schritt“ und „Später weiter“ – auf jeder Seite der Stunde."],
        ["Hier klappst du sie auf und zu", "Eingeklappt bleibt nur der Schritt. Ein Tippen öffnet die Leiste wieder."],
      ] : [
        ["Dein Unterricht läuft weiter", "Schritt, Phase und Zeit, ← → zum Weiterschalten, Pause, Uhr und Beenden – auf jeder Seite, die du aus der Stunde öffnest."],
        ["Hier klappst du sie auf und zu", compact
          ? "Eingeklappt bleibt nur die Phase mit der Zeit. Ein Tippen öffnet die Leiste wieder."
          : "Eingeklappt bleibt nur die Phase mit der Zeit. Ein Klick öffnet die Leiste wieder."],
      ],
    });
    // After the page has laid out, so the spotlight measures the bar where it really is.
    requestAnimationFrame(() => requestAnimationFrame(() => intro.play()));
  }
  function finish() {
    if (gone) return;
    gone = true;
    destroy();
    onEnd?.();
  }
  function destroy() {
    off();
    ro?.disconnect();
    window.removeEventListener("resize", place);
    wide.removeEventListener("change", place);
    uhr.destroy();
    bar.remove();
    document.body.classList.remove("ut-mit-leiste", "ut-leiste-zu");
  }
  return { bar, uhr, destroy };
}

/** From Layout.astro on every page except the session page, when a local copy exists. */
export async function boot() {
  const local = readLocal();
  if (!local) return;
  const last = Date.parse(local.row.last_active_at ?? "") || 0;
  if (local.row.status === "completed" || Date.now() - last > STALE_MS) return clearLocal();

  const ctl = createSteuerung(local);
  const ui = mountLeiste(ctl, { onEnd: () => ctl.destroy() });

  // Did the session move on in another tab, end, or vanish (deleted, other account)?
  try {
    const { sitzungLaden } = await import("./sitzung.js");
    const row = await sitzungLaden(local.id);
    if (!row || row.status === "completed") {
      clearLocal();
      ui.destroy();
      ctl.destroy();
      return;
    }
    ctl.adopt(row);
  } catch {
    // Offline: keep going on the local copy; the saver retries.
  }
}

/**
 * From Layout.astro on every page except /stunde, when a learner's Stunde is stored and no
 * teacher session is (the teacher's bar wins on a shared device). Not after „Später weiter“,
 * not for a finished Stunde, not after half a day without a look at it.
 */
export async function bootLern() {
  const { readLern, createLernSteuerung, listenSteps } = await import("./lernstunde.js");
  const local = readLern();
  if (!local || local.extra?.parked) return;
  const last = Date.parse(local.row.last_active_at ?? "") || 0;
  if (local.row.status === "completed" || Date.now() - last > STALE_MS) return;
  const ctl = createLernSteuerung(local);
  const stop = listenSteps(ctl);
  mountLeiste(ctl, { mode: "lernend", onEnd: () => { stop(); ctl.destroy(); } });
}
