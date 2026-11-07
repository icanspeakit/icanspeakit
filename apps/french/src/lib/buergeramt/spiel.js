// Bruno at the desk (/games/extranjeria): Bruno, our dachshund, works
// window 3 in the invented town of Villabruno: two days at the padrón, then the foreigners' office
// (NIE, TIE, questions about arraigo and the 2026 regularisation). The number display dings, a
// customer slides papers across the desk, and the player checks them against Regi's rule memo:
// find what contradicts (Check), ask a question in Spanish, then stamp COMPLETO or DEVUELTO.
// The player only ever checks that paperwork is complete; nothing here decides anyone's status.
// Code ids keep the names of the German original (the Bürgeramt sim from deutschacademy).
//
// This is the game flow: the start card, the days, points and warnings, the end card. The
// desk itself is tisch.js, cases come from faelle.js, rules from regeln.js. Every interface
// string is in UI below (one object, so the release tier can move them to i18n keys); the
// Spanish on the papers, memos and in the customers' mouths is the content being learnt and
// stays in regeln.js / faelle.js / kunden.json.

import { makeTisch } from "./tisch.js";
import { makeTon } from "./ton.js";
import { faelleVonTag, spielFall, richtig, offeneFehler, loese, fehlerInfo, WOERTER } from "./faelle.js";
import { REGELN, TAGE, LETZTER_TAG, WIRR, regelnBis, neueRegeln } from "./regeln.js";
import kunden from "../../data/buergeramt/kunden.json";
import { gameMuted, setGameMuted, reducedMotion, GAME_MUTE_EVENT } from "../spieleEinstellungen.js";

export const UI = {
  eyebrow: "Game · A2–B1 · Prototype",
  titel: "Bruno at the desk: padrón and Extranjería",
  lead: "Bruno works at window 3 in the invented town of Villabruno: first at the town hall (padrón), then at the foreigners’ office (NIE and TIE). Check the papers, find the mistakes, ask in Spanish and stamp: COMPLETO (complete) or DEVUELTO (sent back).",
  orientacion: "General orientation, not legal advice. Villabruno and its office are invented, and the papers are simplified. A stamp here only says whether paperwork is complete. Rules and deadlines change, so check your town hall, the sede electrónica, your Oficina de Extranjería or your consulate. Facts as of November 2026.",
  comoJugar: "How to play",
  pasos: [
    "Tap 🔍 Check (or press P), then two things that don’t match: two fields, a field and the calendar, a field and a rule, or what the customer says and a rule.",
    "A match goes on your notes. Tap Ask and choose the question that fits. Sometimes that fixes the problem.",
    "Papers in order: stamp COMPLETO. Still a problem: stamp DEVUELTO.",
    "Tap a word on a paper to see what it means. The EN button shows or hides all the English.",
  ],
  verdad: "How it really works in Spain",
  fuente: "Source",
  verdadHoy: "Today’s real rules",
  inventada: "Rules marked “Villabruno rule” are made up for the game.",
  los: "Start day 1",
  wartende: "Waiting",
  punkte: "Points",
  verwarnungen: "Warnings",
  ton: "Sound on/off",
  enTitel: "Show or hide the English",
  nummer: "Turno",
  schalter: "Ventanilla 3",
  pruefen: "Check",
  pruefenTitel: "Check: tap two fields that don’t match (key P, or hold Shift)",
  notizzettel: "Notes",
  notizLeer: "Nothing found yet.",
  fragen: "Ask",
  wasFragen: "What do you ask?",
  grundWaehlen: "Why are you rejecting it?",
  abbrechen: "Cancel",
  geklaert: "sorted ✓",
  genehmigt: "COMPLETO",
  abgelehnt: "DEVUELTO",
  ablehnenWarum: "Find a mistake first: tap 🔍 Check, then two fields that don’t match.",
  erstPruefen: "To compare, tap 🔍 Check first (or hold Shift).",
  passt: "That matches.",
  egal: "You can’t compare those.",
  schonNotiert: "That’s already in your notes.",
  schonGeklaert: "That’s already sorted.",
  memoTitel: "Normas de hoy",
  memoVon: "– Regi",
  tabMemo: "📌 Normas",
  echt: "Usual in Spain",
  lindenau: "Villabruno rule",
  verwarnung: "Warning",
  richtigGenehmigt: "Correct! The papers were complete.",
  richtigAbgelehnt: "Correctly sent back.",
  falschGenehmigt: (notiz) => `You missed this: ${notiz}`,
  falschAbgelehnt: "The papers were complete: you should have stamped COMPLETO.",
  plus: (n) => `+${n}`,
  endeTitel: (tag) => `End of day ${tag}!`,
  endeWoche: "You’ve finished the week!",
  endeKunden: (n) => (n === 1 ? "1 customer" : `${n} customers`),
  endeRichtig: (r, n) => `${r} of ${n} correct`,
  endeVerw: (n) => (n === 1 ? "1 warning" : `${n} warnings`),
  nochmal: "Play this day again",
  weiter: (tag) => `Start day ${tag}`,
  vonVorn: "Back to day 1",
  wirr: "Wrong question – that costs time.",
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** The real-life facts behind some rules: Spanish, English and a source type with a link. */
function verdadHtml(ids) {
  return ids.filter((id) => REGELN[id].wirklich).map((id) => {
    const r = REGELN[id];
    return `<li><p lang="es">${esc(r.wirklich.de)}</p><p class="ba-verdad-en" lang="en">${esc(r.wirklich.en)}</p>
      <small>${UI.fuente}: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.quelle)}</a></small></li>`;
  }).join("");
}

export function mountBuergeramt(root) {
  const $ = (s) => root.querySelector(s);
  const amt = $("[data-amt]");
  const start = $("[data-start]");
  const ende = $("[data-ende]");
  const rosa = $("[data-rosa]");
  const ton = makeTon();
  const reduced = reducedMotion();
  root.classList.toggle("ba--ruhig", reduced);

  let muted = gameMuted(false);
  ton.setMuted(muted);

  const tisch = makeTisch(root, {
    ui: UI,
    ton,
    onStempel,
    onFrage,
    onNotiz: () => {},
    onWort: (wort) => {
      if (!WOERTER[wort]) return false;
      tisch.toast(`${wort} = ${WOERTER[wort]}`);
      return true;
    },
  });

  // ---- static texts from UI -------------------------------------------------------------
  function paintTexts() {
    for (const el of root.querySelectorAll("[data-ui]")) {
      const v = UI[el.dataset.ui];
      if (typeof v === "string") el.textContent = v;
    }
    for (const el of root.querySelectorAll("[data-ui-title]")) {
      const v = UI[el.dataset.uiTitle];
      el.title = v; el.setAttribute("aria-label", v);
    }
  }
  paintTexts();

  // The start card: how to play, the "not legal advice" box and every real rule with its source.
  const alleEchten = Object.keys(REGELN).filter((id) => REGELN[id].art === "echt");
  $("[data-start-body]").innerHTML = `
    <p class="ba-orient" role="note">${esc(UI.orientacion)}</p>
    <h2 class="ba-h">${esc(UI.comoJugar)}</h2>
    <ol class="ba-pasos">${UI.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
    <details class="ba-verdad"><summary>${esc(UI.verdad)}</summary>
      <p>${esc(UI.inventada)}</p><ul>${verdadHtml(alleEchten)}</ul></details>`;

  // The English lines: on until the player turns them off.
  const enBtn = $("[data-en-btn]");
  let conEn = true;
  enBtn.addEventListener("click", () => {
    conEn = !conEn;
    root.classList.toggle("ba--sin-en", !conEn);
    enBtn.setAttribute("aria-pressed", String(conEn));
  });

  const muteBtn = $("[data-mute]");
  function paintMute() {
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
  }
  paintMute();
  muteBtn.addEventListener("click", () => { muted = !muted; ton.setMuted(muted); setGameMuted(muted); paintMute(); });
  addEventListener(GAME_MUTE_EVENT, (e) => { muted = !!e.detail?.muted; ton.setMuted(muted); paintMute(); });

  // ---- a day -----------------------------------------------------------------------------
  let s = null; // the running day
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function paintHud() {
    $("[data-tag]").textContent = TAGE[s.tag].titel;
    $("[data-punkte]").textContent = String(s.punkte);
    $("[data-wartende]").textContent = String(Math.max(0, s.queue.length));
    const v = $("[data-verw]");
    v.innerHTML = [0, 1, 2].map((i) => `<span class="ba-verw-dot${i < s.verw ? " is-on" : ""}"></span>`).join("");
    v.setAttribute("aria-label", `${UI.verwarnungen}: ${s.verw} / 3`);
  }

  function startSchicht(tag = 1) {
    s = {
      tag,
      regeln: regelnBis(tag),
      queue: faelleVonTag(tag),
      punkte: 0,
      verw: 0,
      log: [],
      fall: null,
      t0: 0,
    };
    start.hidden = true;
    ende.hidden = true;
    amt.hidden = false;
    root.dataset.phase = "amt";
    ton.unlock();
    paintHud();
    amt.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    setTimeout(naechster, 400);
  }

  function naechster() {
    if (!s.queue.length) { schichtEnde(); return; }
    const fall = spielFall(s.queue.shift());
    s.fall = fall;
    tisch.leeren();
    tisch.sage(null);
    tisch.nummer(fall.nr);
    ton.ding();
    tisch.zeigeKunde("neutral", fall);
    tisch.kundeKommt();
    paintHud();
    setTimeout(() => {
      tisch.sage(fall.satz, { anliegen: true });
      tisch.zeige(fall, { regeln: s.regeln, tag: s.tag, lern: false });
      tisch.entsperren();
      s.t0 = performance.now();
    }, reduced ? 200 : 700);
  }

  function onFrage(f, idx) {
    const info = fehlerInfo(f);
    f.gefragt = true;
    if (idx === info.passt) {
      if (f.loesbar && info.loest) {
        tisch.sage(info.loest);
        tisch.zeigeKunde("erleichtert");
        tisch.nachFrage(loese(s.fall, f));
      } else {
        tisch.sage(info.nicht);
        tisch.zeigeKunde(f.code === "zimmer" ? "froh" : f.code.startsWith("derivar") ? "neutral" : "genervt");
        tisch.nachFrage(null);
      }
    } else {
      tisch.sage(pick(WIRR));
      tisch.zeigeKunde("wirr");
      tisch.toast(UI.wirr);
      tisch.nachFrage(null);
    }
  }

  function zeigeRosa(text) {
    rosa.innerHTML = `<b>${UI.verwarnung}</b><span>${esc(text)}</span><small>– Regi</small>`;
    rosa.hidden = false;
    rosa.classList.remove("is-in"); void rosa.offsetWidth; rosa.classList.add("is-in");
    clearTimeout(zeigeRosa.t);
    zeigeRosa.t = setTimeout(() => { rosa.hidden = true; }, 4200);
  }

  function onStempel(entscheid, grund) {
    const fall = s.fall;
    tisch.sperren();
    const soll = richtig(fall);
    const ok = entscheid === soll;
    const sek = (performance.now() - s.t0) / 1000;
    let plus = 0;
    if (ok) {
      plus = 100 + Math.max(0, Math.round(50 * Math.min(1, (45 - sek) / 30)));
      s.punkte += plus;
      tisch.toast(`${entscheid === "genehmigt" ? UI.richtigGenehmigt : UI.richtigAbgelehnt} ${UI.plus(plus)}`, "ok");
    } else {
      s.verw += 1;
      ton.verwarnung();
      const missed = offeneFehler(fall)[0];
      zeigeRosa(missed ? UI.falschGenehmigt(fehlerInfo(missed).notiz.en) : UI.falschAbgelehnt);
    }
    s.log.push({ nr: fall.nr, ok, entscheid, soll, sek: Math.round(sek), grund: grund?.code ?? null });
    const zeile = entscheid === "genehmigt" ? (fall.zeilen?.genehmigt ?? pick(kunden.genehmigt)) : pick(kunden.abgelehnt);
    tisch.sage(entscheid === "abgelehnt" && grund && fehlerInfo(grund).nicht && grund.gefragt ? fehlerInfo(grund).nicht : zeile);
    tisch.zeigeKunde(entscheid === "genehmigt" ? "froh" : "genervt");
    paintHud();
    setTimeout(() => tisch.kundeGeht(), 1500);
    setTimeout(() => (s.verw >= 3 ? schichtEnde() : naechster()), reduced ? 1900 : 2300);
  }

  function schichtEnde() {
    ton.ende();
    tisch.leeren();
    amt.hidden = true;
    root.dataset.phase = "ende";
    const richtigN = s.log.filter((l) => l.ok).length;
    const tag = s.tag;
    const letzter = tag >= LETZTER_TAG;
    const verdad = verdadHtml(neueRegeln(tag));
    ende.innerHTML = `<h2>${esc(letzter ? UI.endeWoche : UI.endeTitel(tag))}</h2>
      <p class="ba-big">${s.punkte} <small>${UI.punkte}</small></p>
      <p>${UI.endeKunden(s.log.length)} · ${UI.endeRichtig(richtigN, s.log.length)} · ${UI.endeVerw(s.verw)}</p>
      ${verdad ? `<div class="ba-verdad"><h3 class="ba-h">${esc(UI.verdadHoy)}</h3><ul>${verdad}</ul></div>` : ""}
      <p class="ba-orient" role="note">${esc(UI.orientacion)}</p>
      <div class="ba-ende-knoepfe">
        <button type="button" class="ba-go" data-next>${esc(letzter ? UI.vonVorn : UI.weiter(tag + 1))}</button>
        <button type="button" class="ba-quiet" data-again>${esc(UI.nochmal)}</button>
      </div>`;
    ende.hidden = false;
    ende.querySelector("[data-next]").addEventListener("click", () => startSchicht(letzter ? 1 : tag + 1));
    ende.querySelector("[data-again]").addEventListener("click", () => startSchicht(tag));
  }

  $("[data-los]").addEventListener("click", () => startSchicht(1));
  return { startSchicht, get schicht() { return s; } };
}
