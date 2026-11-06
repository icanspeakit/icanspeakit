// Bruno at the desk: the counter and the desk, all DOM (decision 1: crisp text, tappable
// words, screen readers). The window at the top shows the number display, the customer and the
// queue; the desk below holds Regi's memo (with the calendar), the papers, the notes and
// the two stamps. Spanish on the papers and in the customers' mouths, with the English in a
// `.ba-en` line that the EN button shows or hides.
//
// - Desktop: papers are cards you drag around and lay over each other; the memo stays pinned.
// - Phone (narrow desk): the memo and the papers are one fanned stack with tabs above it; tap a
//   tab or swipe the stack to bring a paper to the front.
// - Check (🔍 button, P, or hold Shift): tap a field, then a field on another paper or the memo.
//   A real contradiction gets red frames and a line and goes on the notes; agreeing fields
//   say "That matches.", unrelated ones "You can’t compare those." — never a penalty.
// - Notes: each noted mistake has one question round (three questions, one fits).
// - Stamps: tap or drag onto the form. DEVUELTO needs a noted mistake as the reason.
//
// The game flow (who comes next, points, warnings) lives in spiel.js; this module reports
// what the player did through the callbacks passed to makeTisch().

import { DOK_ARTEN, LERN_OHNE, vergleiche, notierteFehler, fehlerInfo } from "./faelle.js";
import { REGELN } from "./regeln.js";
import { kundeSvg } from "./kunde.js";
import { deDatum, wochentag } from "./daten.js";
import { setWaiting } from "../notReady.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const bold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
// A Spanish line with its English meaning underneath.
const zwei = (line, fmt = esc) => `<span lang="es">${fmt(line.de)}</span>${line.en ? `<small class="ba-en" lang="en">${esc(line.en).replace(/\*\*/g, "")}</small>` : ""}`;
export const WAPPEN = `<svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true" class="ba-wappen"><path d="M6 4 H34 V20 Q34 32 20 37 Q6 32 6 20 Z" fill="#0d9488" stroke="#1a2230" stroke-width="2.5"/><path d="M20 10 Q29 15 26 25 Q23 30 20 31 Q17 30 14 25 Q11 15 20 10 Z" fill="#a7f3d0" stroke="#1a2230" stroke-width="2"/><path d="M20 13 V32" stroke="#1a2230" stroke-width="2"/></svg>`;

export function makeTisch(root, { ui, ton, onStempel, onFrage, onNotiz, onPasst, onWort, onHilfe }) {
  const $ = (s) => root.querySelector(s);
  const desk = $("[data-desk]");
  const area = $("[data-docs]");
  const tabs = $("[data-tabs]");
  const notiz = $("[data-notiz]");
  const notizList = $("[data-notiz-list]");
  const fragenBox = $("[data-fragen]");
  const pruefBtn = $("[data-pruefen]");
  const btnOk = $("[data-stempel='genehmigt']");
  const btnNo = $("[data-stempel='abgelehnt']");
  const svgLines = $("[data-lines]");
  const toast = $("[data-toast]");
  const kundeEl = $("[data-kunde]");
  const bubble = $("[data-bubble]");
  const nummerEl = $("[data-nummer]");

  let fall = null;
  let opts = { lern: false, regeln: [] };
  let pruefen = false;
  let shiftHeld = false;
  let selected = null;
  let front = null; // phone: the paper on top
  let z = 10;
  let locked = true;
  let toastTimer = 0;

  const isStack = () => desk.clientWidth < 720;
  const pruefOn = () => pruefen || shiftHeld;

  // ---- rendering --------------------------------------------------------------------------
  function feldHtml(fid, label, value, extra = "") {
    return `<button type="button" class="ba-f${extra}" data-f="${fid}"><span class="ba-f-l" data-wort="${esc(label)}">${esc(label)}</span><span class="ba-f-v">${value}</span></button>`;
  }

  function wertHtml(d, key, v) {
    if (key === "formular") {
      return `<span class="ba-boxes">${(DOK_ARTEN[d.art].opciones ?? []).map((f) => `<span class="ba-box${f === v ? " is-x" : ""}">${f === v ? "☒" : "☐"} ${f}</span>`).join("")}</span>`;
    }
    if (key === "unterschrift") {
      return v ? `<span class="ba-sig ba-sig--${esc(d.tinte || "schwarz")}">${esc(v)}</span>` : `<span class="ba-sig-leer">&nbsp;</span>`;
    }
    return esc(v);
  }

  function dokHtml(d) {
    const art = DOK_ARTEN[d.art];
    const fields = art.felder
      .filter(([k]) => !(opts.lern && LERN_OHNE.has(k)))
      .filter(([k]) => d.felder[k] !== undefined)
      .map(([k, label]) => feldHtml(`${d.id}.${k}`, label, wertHtml(d, k, d.felder[k])))
      .join("");
    const mitBild = d.art === "ausweis" || d.art === "pass" || d.art === "foto";
    const foto = mitBild && !d.fax ? `<div class="ba-foto${d.felder.fondo === "azul" ? " ba-foto--azul" : d.felder.fondo ? " ba-foto--blanco" : ""}">${kundeSvg(fall.person.look, "neutral", { size: 64, foto: true, hund: fall.hund })}</div>` : "";
    const titel = art.titel;
    const kopf = `<button type="button" class="ba-f ba-kopf" data-f="${d.id}.kopf">${d.fax ? `<span class="ba-fax-kopf">FAX · 07:52 · Página 1/1</span>` : ""}${WAPPEN}<span class="ba-kopf-t"><small>${esc(art.kopf)}</small><b data-wort="${esc(titel)}">${esc(titel)}</b></span></button>`;
    return `<article class="ba-doc ba-doc--${d.art}${d.fax ? " ba-doc--fax" : ""}" data-doc="${d.id}" tabindex="-1" aria-label="${esc(art.titel)}">
      ${kopf}<div class="ba-doc-body">${foto}<div class="ba-fields">${fields}</div></div><div class="ba-stamp-slot" data-stamp-slot></div></article>`;
  }

  function memoHtml() {
    const lines = opts.regeln.map((id) => {
      const r = REGELN[id];
      const neu = r.tag === opts.tag && opts.tag > 0;
      const mark = r.art === "echt" ? `<span class="ba-mark ba-mark--echt">${esc(ui.echt)}</span>` : `<span class="ba-mark ba-mark--lind">${esc(ui.lindenau)}</span>`;
      return `<button type="button" class="ba-f ba-regel${neu ? " is-neu" : ""}" data-f="memo.${id}">${mark}<span class="ba-regel-t">${zwei(r.memo, bold)}</span></button>`;
    }).join("");
    const heute = `${wochentag(fall.heute)}, ${deDatum(fall.heute)}`;
    return `<article class="ba-doc ba-doc--memo" data-doc="memo" tabindex="-1" aria-label="${esc(ui.memoTitel)}">
      <div class="ba-memo-kopf"><span class="ba-pin" aria-hidden="true"></span><b>${esc(ui.memoTitel)}</b><small>${esc(ui.memoVon)}</small></div>
      ${feldHtml("kalender.heute", "Hoy", esc(heute), " ba-kalender")}
      <div class="ba-regeln">${lines}</div>
    </article>`;
  }

  const visibleDocs = () => fall.dokumente.filter((d) => !d.weg);

  function layout() {
    const stack = isStack();
    root.classList.toggle("ba--stack", stack);
    const cards = [...area.querySelectorAll(".ba-doc")];
    if (stack) {
      if (!front || !cards.some((c) => c.dataset.doc === front)) front = cards.find((c) => c.dataset.doc !== "memo")?.dataset.doc ?? "memo";
      const order = cards.map((c) => c.dataset.doc);
      const fi = order.indexOf(front);
      cards.forEach((c, i) => {
        const off = (i - fi + order.length) % order.length;
        c.style.left = ""; c.style.top = "";
        c.style.setProperty("--off", off);
        c.classList.toggle("is-front", off === 0);
        c.style.zIndex = String(50 - off);
        c.toggleAttribute("inert", off !== 0);
        c.setAttribute("aria-hidden", off === 0 ? "false" : "true");
      });
      tabs.innerHTML = cards.map((c) => `<button type="button" class="ba-tab" data-tab="${c.dataset.doc}" aria-pressed="${c.dataset.doc === front}">${esc(c.dataset.doc === "memo" ? ui.tabMemo : c.getAttribute("aria-label"))}</button>`).join("");
    } else {
      tabs.innerHTML = "";
      const W = area.clientWidth, H = area.clientHeight;
      let k = 0;
      for (const c of cards) {
        c.removeAttribute("inert");
        c.removeAttribute("aria-hidden");
        c.classList.remove("is-front");
        if (c.dataset.doc === "memo") { c.style.left = "0px"; c.style.top = "0px"; c.style.zIndex = "5"; continue; }
        if (!c.dataset.placed) {
          const cw = c.offsetWidth || 280;
          const x0 = Math.min(W - cw, 250 + k * 150);
          c.style.left = `${Math.max(240, x0)}px`;
          c.style.top = `${Math.min(Math.max(0, H - 260), 8 + k * 26)}px`;
          c.style.zIndex = String(++z);
          c.dataset.placed = "1";
        }
        k++;
      }
    }
    drawLines();
  }

  function render() {
    const keepPlaced = new Map([...area.querySelectorAll(".ba-doc")].map((c) => [c.dataset.doc, { l: c.style.left, t: c.style.top, p: c.dataset.placed }]));
    area.innerHTML = memoHtml() + visibleDocs().map(dokHtml).join("");
    for (const c of area.querySelectorAll(".ba-doc")) {
      const k = keepPlaced.get(c.dataset.doc);
      if (k?.p) { c.style.left = k.l; c.style.top = k.t; c.dataset.placed = "1"; c.style.zIndex = String(++z); }
    }
    for (const f of fall.fehler) if (f.status === "notiert") markBad(f, false);
    layout();
    paintNotiz();
  }

  // ---- the customer window --------------------------------------------------------------
  function zeigeKunde(ausdruck = "neutral") {
    kundeEl.innerHTML = kundeSvg(fall.person.look, ausdruck, { size: 200, hund: fall.hund, className: "ba-kunde-svg" });
  }

  function sage(line, { anliegen = false } = {}) {
    bubble.hidden = !line;
    if (!line) return;
    bubble.innerHTML = anliegen
      ? `<button type="button" class="ba-f ba-anliegen" data-f="kunde.anliegen"><span class="ba-zwei">${zwei(line)}</span></button>`
      : zwei(line);
    bubble.classList.remove("is-pop");
    void bubble.offsetWidth;
    bubble.classList.add("is-pop");
  }

  // ---- toast + lines ------------------------------------------------------------------------
  function sagToast(text, kind = "") {
    toast.textContent = text;
    toast.className = `ba-toast is-in${kind ? ` ba-toast--${kind}` : ""}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove("is-in"); toastTimer = setTimeout(() => { toast.hidden = true; }, 250); }, 1500);
  }

  const fieldEl = (fid) => (fid === "kunde.anliegen" ? bubble.querySelector(`[data-f="${fid}"]`) : area.querySelector(`[data-f="${fid}"]`));

  function markBad(f, line = true) {
    const p = f.gezeigt ?? f.paare[0];
    for (const fid of p) fieldEl(fid)?.classList.add("is-bad");
    if (line) { f.linie = Date.now(); drawLines(); setTimeout(drawLines, 2700); }
  }

  function drawLines() {
    if (!fall) { svgLines.innerHTML = ""; return; }
    const box = root.querySelector(".ba-amt").getBoundingClientRect();
    svgLines.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const now = Date.now();
    svgLines.innerHTML = fall.fehler
      .filter((f) => f.status === "notiert" && f.linie && now - f.linie < 2600)
      .map((f) => {
        const [a, b] = (f.gezeigt ?? f.paare[0]).map(fieldEl);
        if (!a || !b || a.closest("[inert]") || b.closest("[inert]")) return "";
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const x1 = ra.left + ra.width / 2 - box.left, y1 = ra.top + ra.height / 2 - box.top;
        const x2 = rb.left + rb.width / 2 - box.left, y2 = rb.top + rb.height / 2 - box.top;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ba-line"/>`;
      }).join("");
  }

  // ---- Check ----------------------------------------------------------------------------
  function setPruefen(on) {
    pruefen = on;
    paintPruefen();
  }
  function paintPruefen() {
    const on = pruefOn();
    root.classList.toggle("ba--pruefen", on);
    pruefBtn.setAttribute("aria-pressed", String(on));
    if (!on) select(null);
  }

  function select(fid) {
    area.querySelectorAll(".is-sel").forEach((e) => e.classList.remove("is-sel"));
    bubble.querySelectorAll(".is-sel").forEach((e) => e.classList.remove("is-sel"));
    selected = fid;
    if (fid) fieldEl(fid)?.classList.add("is-sel");
  }

  function tapField(fid, el) {
    if (locked) return;
    if (!pruefOn()) {
      const wort = el.querySelector("[data-wort]")?.dataset.wort;
      if (!(wort && onWort?.(wort, el))) sagToast(ui.erstPruefen);
      pruefBtn.classList.remove("is-nudge"); void pruefBtn.offsetWidth; pruefBtn.classList.add("is-nudge");
      return;
    }
    if (!selected) { select(fid); ton.tick(); return; }
    if (selected === fid) { select(null); return; }
    const a = selected, b = fid;
    select(null);
    const r = vergleiche(fall, a, b);
    if (r.art === "fehler") {
      r.fehler.status = "notiert";
      r.fehler.gezeigt = [a, b];
      markBad(r.fehler);
      ton.fund();
      sagToast(`${fehlerInfo(r.fehler).notiz.de} (${fehlerInfo(r.fehler).notiz.en})`, "bad");
      paintNotiz();
      onNotiz?.(r.fehler);
    } else if (r.art === "schon") {
      sagToast(ui.schonNotiert);
    } else if (r.art === "geloest") {
      sagToast(ui.schonGeklaert);
    } else if (r.art === "passt") {
      ton.passt();
      for (const id of [a, b]) { const e = fieldEl(id); e?.classList.add("is-ok"); setTimeout(() => e?.classList.remove("is-ok"), 700); }
      sagToast(ui.passt, "ok");
      onPasst?.();
    } else {
      sagToast(ui.egal);
    }
  }

  // ---- Notes + questions -----------------------------------------------------------------
  function paintNotiz() {
    if (!fall) { notizList.innerHTML = ""; return; }
    const noted = fall.fehler.filter((f) => f.status === "notiert" || (f.status === "geloest" && f.gezeigt));
    notiz.dataset.count = String(notierteFehler(fall).length);
    notizList.innerHTML = noted.length
      ? noted.map((f) => {
          const info = fehlerInfo(f);
          const done = f.status === "geloest";
          const ask = !done && !f.gefragt ? `<button type="button" class="ba-ask" data-ask="${f.code}">${esc(ui.fragen)}</button>` : "";
          return `<li class="${done ? "is-done" : ""}"><span class="ba-zwei">${zwei(info.notiz)}</span>${done ? `<small>${esc(ui.geklaert)}</small>` : ask}</li>`;
        }).join("")
      : `<li class="ba-notiz-leer">${esc(ui.notizLeer)}</li>`;
    paintStempel();
  }

  function paintStempel() {
    const n = fall ? notierteFehler(fall).length : 0;
    setWaiting(btnNo, n ? null : ui.ablehnenWarum, "[data-pruefen]");
    setWaiting(btnOk, null);
  }

  function zeigeFragen(f) {
    const info = fehlerInfo(f);
    fragenBox.hidden = false;
    fragenBox.innerHTML = `<p class="ba-fragen-h">${esc(ui.wasFragen)}</p>
      ${info.fragen.map((q, i) => `<button type="button" class="ba-frage" data-frage="${i}">${zwei(q)}</button>`).join("")}
      <button type="button" class="ba-quiet" data-frage-zu>${esc(ui.abbrechen)}</button>`;
    fragenBox.dataset.code = f.code;
    fragenBox.querySelector("[data-frage]")?.focus({ preventScroll: true });
  }
  function schliesseFragen() { fragenBox.hidden = true; fragenBox.innerHTML = ""; }

  // ---- stamps ---------------------------------------------------------------------------
  const formular = () => area.querySelector('[data-doc="meldeschein"], [data-doc="solicitud"], [data-doc="antrag"]') ?? area.querySelector(".ba-doc:not(.ba-doc--memo)");

  function stempeln(entscheid) {
    if (locked) return;
    const btn = entscheid === "genehmigt" ? btnOk : btnNo;
    if (btn.getAttribute("aria-disabled") === "true") { sagToast(btn.dataset.why); return; }
    const noted = notierteFehler(fall);
    if (entscheid === "abgelehnt" && noted.length > 1) { zeigeGrund(noted); return; }
    stempelAuf(entscheid, entscheid === "abgelehnt" ? noted[0] : null);
  }

  function zeigeGrund(noted) {
    fragenBox.hidden = false;
    fragenBox.dataset.code = "";
    fragenBox.innerHTML = `<p class="ba-fragen-h">${esc(ui.grundWaehlen)}</p>
      ${noted.map((f) => `<button type="button" class="ba-frage" data-grund="${f.code}">${zwei(fehlerInfo(f).notiz)}</button>`).join("")}
      <button type="button" class="ba-quiet" data-frage-zu>${esc(ui.abbrechen)}</button>`;
    fragenBox.querySelector("[data-grund]")?.focus({ preventScroll: true });
  }

  function stempelAuf(entscheid, grund) {
    locked = true;
    schliesseFragen();
    setPruefen(false);
    const form = formular();
    if (isStack() && form) { front = form.dataset.doc; layout(); }
    const slot = form?.querySelector("[data-stamp-slot]");
    if (slot) {
      slot.innerHTML = `<span class="ba-stamp-mark ba-stamp-mark--${entscheid}">${entscheid === "genehmigt" ? ui.genehmigt : ui.abgelehnt}${grund ? `<small lang="es">${esc(fehlerInfo(grund).notiz.de)}</small>` : ""}</span>`;
    }
    ton.stempel();
    root.classList.add("is-thunk");
    setTimeout(() => root.classList.remove("is-thunk"), 260);
    onStempel(entscheid, grund);
  }

  // ---- pointer: drag papers, drag stamps, swipe the stack ---------------------------------
  let drag = null;
  area.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".ba-doc");
    if (!card || e.button > 0) return;
    if (isStack()) { drag = { swipe: true, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }; return; }
    if (card.dataset.doc === "memo") return;
    card.style.zIndex = String(++z);
    drag = { card, x: e.clientX, y: e.clientY, l: card.offsetLeft, t: card.offsetTop, id: e.pointerId, moved: false };
  });
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; if (drag.card) { drag.card.classList.add("is-drag"); try { drag.card.setPointerCapture(e.pointerId); } catch {} } }
    if (drag.swipe) return;
    const W = area.clientWidth, H = area.clientHeight;
    const c = drag.card;
    c.style.left = `${Math.max(-c.offsetWidth * 0.4, Math.min(W - c.offsetWidth * 0.6, drag.l + dx))}px`;
    c.style.top = `${Math.max(0, Math.min(H - 60, drag.t + dy))}px`;
    drawLines();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    d.card?.classList.remove("is-drag");
    if (d.moved) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      if (d.swipe) {
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) blaettern(dx < 0 ? 1 : -1);
      } else ton.papier();
    }
  };
  let suppressClick = false;
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);

  function blaettern(dir) {
    const order = [...area.querySelectorAll(".ba-doc")].map((c) => c.dataset.doc);
    const i = order.indexOf(front);
    zeigeVorne(order[(i + dir + order.length) % order.length]);
  }
  function zeigeVorne(id) {
    front = id;
    ton.papier();
    layout();
  }

  // stamps: tap, or drag onto the form
  for (const btn of [btnOk, btnNo]) {
    let sd = null;
    btn.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      sd = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null };
    });
    btn.addEventListener("pointermove", (e) => {
      if (!sd || e.pointerId !== sd.id || btn.getAttribute("aria-disabled") === "true" || locked) return;
      if (!sd.moved && Math.hypot(e.clientX - sd.x, e.clientY - sd.y) < 8) return;
      if (!sd.moved) {
        sd.moved = true;
        try { btn.setPointerCapture(e.pointerId); } catch {}
        sd.ghost = btn.cloneNode(true);
        sd.ghost.classList.add("ba-stempel-ghost");
        sd.ghost.removeAttribute("data-stempel");
        document.body.append(sd.ghost);
      }
      sd.ghost.style.left = `${e.clientX}px`;
      sd.ghost.style.top = `${e.clientY}px`;
      const form = formular();
      const r = form?.getBoundingClientRect();
      form?.classList.toggle("is-target", !!r && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
    });
    const up = (e) => {
      if (!sd || e.pointerId !== sd.id) return;
      const d = sd;
      sd = null;
      if (!d.moved) return; // a tap: the click handler stamps
      d.ghost?.remove();
      const form = formular();
      const hit = form?.classList.contains("is-target");
      form?.classList.remove("is-target");
      btn.dataset.dragged = "1";
      setTimeout(() => delete btn.dataset.dragged, 0);
      if (hit) stempeln(btn.dataset.stempel);
    };
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", (e) => { if (sd?.ghost) sd.ghost.remove(); sd = null; formular()?.classList.remove("is-target"); });
    btn.addEventListener("click", () => { if (btn.dataset.dragged) return; stempeln(btn.dataset.stempel); });
  }

  // ---- clicks ---------------------------------------------------------------------------
  root.addEventListener("click", (e) => {
    if (suppressClick) return;
    const t = e.target;
    const tab = t.closest("[data-tab]");
    if (tab) { zeigeVorne(tab.dataset.tab); return; }
    const f = t.closest("[data-f]");
    if (f && root.contains(f)) {
      // phone: a tap on a card that isn't in front brings it forward first
      const card = f.closest(".ba-doc");
      if (isStack() && card && !card.classList.contains("is-front")) { zeigeVorne(card.dataset.doc); return; }
      tapField(f.dataset.f, f);
      return;
    }
    const card = t.closest(".ba-doc");
    if (card && isStack() && !card.classList.contains("is-front")) { zeigeVorne(card.dataset.doc); return; }
    if (t.closest("[data-pruefen]")) { setPruefen(!pruefen); return; }
    const ask = t.closest("[data-ask]");
    if (ask) { const fe = fall.fehler.find((x) => x.code === ask.dataset.ask); if (fe) zeigeFragen(fe); return; }
    const q = t.closest("[data-frage]");
    if (q) {
      const fe = fall.fehler.find((x) => x.code === fragenBox.dataset.code);
      schliesseFragen();
      if (fe) onFrage(fe, Number(q.dataset.frage));
      return;
    }
    const g = t.closest("[data-grund]");
    if (g) { const fe = fall.fehler.find((x) => x.code === g.dataset.grund); if (fe) stempelAuf("abgelehnt", fe); return; }
    if (t.closest("[data-frage-zu]")) { schliesseFragen(); return; }
    if (t.closest("[data-hilfe]")) { onHilfe?.(); return; }
  });

  // keyboard: P = check, C / D = stamps (COMPLETO, DEVUELTO), Shift held = Check while held, Esc = drop selection
  function onKey(e) {
    if (root.closest("[hidden]") || root.querySelector(".ba-amt")?.hidden) return;
    if (e.key === "Shift") { if (!shiftHeld) { shiftHeld = true; paintPruefen(); } return; }
    if (e.target.closest?.("input, textarea, select")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "p") { e.preventDefault(); setPruefen(!pruefen); }
    else if (k === "c") { e.preventDefault(); stempeln("genehmigt"); }
    else if (k === "d") { e.preventDefault(); stempeln("abgelehnt"); }
    else if (e.key === "Escape") { if (!fragenBox.hidden) schliesseFragen(); else select(null); }
    else if (isStack() && (e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.target.closest?.(".ba-fragen")) { blaettern(e.key === "ArrowRight" ? 1 : -1); }
  }
  function onKeyUp(e) { if (e.key === "Shift" && shiftHeld) { shiftHeld = false; paintPruefen(); } }
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", () => { if (shiftHeld) { shiftHeld = false; paintPruefen(); } });
  let rz = 0;
  addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => fall && layout()); });

  return {
    /** Lay a new case on the desk. */
    zeige(neuerFall, o) {
      fall = neuerFall;
      opts = { ...opts, ...o };
      front = null;
      area.querySelectorAll(".ba-doc").forEach((c) => delete c.dataset.placed);
      area.innerHTML = "";
      select(null);
      schliesseFragen();
      render();
      root.classList.remove("is-leer");
      ton.papier();
    },
    leeren() {
      fall = null;
      area.innerHTML = "";
      tabs.innerHTML = "";
      svgLines.innerHTML = "";
      notizList.innerHTML = "";
      schliesseFragen();
      root.classList.add("is-leer");
    },
    nummer(n) {
      nummerEl.textContent = String(n);
      nummerEl.classList.remove("is-blink"); void nummerEl.offsetWidth; nummerEl.classList.add("is-blink");
    },
    zeigeKunde,
    kundeKommt() { kundeEl.classList.remove("is-geht"); kundeEl.classList.add("is-kommt"); },
    kundeGeht() { kundeEl.classList.remove("is-kommt"); kundeEl.classList.add("is-geht"); },
    sage,
    toast: sagToast,
    /** After a question: re-render what changed (new paper, corrected field). */
    nachFrage(res) {
      if (!res?.geloest) { paintNotiz(); return; }
      render();
      for (const fid of res.gesetzt) fieldEl(fid)?.classList.add("is-neu");
      if (isStack() && res.neu[0]) { front = res.neu[0]; layout(); }
      ton.papier();
    },
    entsperren() { locked = false; paintStempel(); },
    sperren() { locked = true; },
    /** Learning mode: light up the fields of the first open mistake. */
    hinweis(fids) { for (const fid of fids) fieldEl(fid)?.classList.add("is-hint"); },
    setPruefen,
    get fall() { return fall; },
    zeigeVorne,
    layout,
  };
}
