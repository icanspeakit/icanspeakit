// Brunos Bürgeramt (/spiele/buergeramt): Bruno, our dachshund, works counter 3 of the
// Bürgeramt Lindenau. The number display dings, a customer slides papers across the desk, and
// the player checks them against Regi's rule memo: find what contradicts (Prüfen), ask a
// question in German, then stamp GENEHMIGT or ABGELEHNT. Plan: BUERGERAMT-TIERED-PROMPT.md,
// notes: docs/buergeramt-tier*-v1.md.
//
// This is the game flow: the start card, the shift, points and warnings, the end card. The
// desk itself is tisch.js, cases come from faelle.js, rules from regeln.js. Every interface
// string is in UI below (one object, so the release tier can move them to i18n keys); the
// German on the papers, memos and in the customers' mouths is the content being learnt and
// stays in regeln.js / faelle.js / kunden.json.

import { makeTisch } from "./tisch.js";
import { makeTon } from "./ton.js";
import { HANDFAELLE, spielFall, richtig, offeneFehler, loese, fehlerInfo } from "./faelle.js";
import { REGELN, WIRR, regelnBis } from "./regeln.js";
import kunden from "../../data/buergeramt/kunden.json";
import { gameMuted, setGameMuted, reducedMotion, GAME_MUTE_EVENT } from "../spieleEinstellungen.js";

export const UI = {
  eyebrow: "Spiel · A2–B1 · Prototyp",
  titel: "Brunos Bürgeramt",
  lead: "Bruno sitzt am Schalter 3 im Bürgeramt Lindenau. Prüf die Papiere, finde die Fehler und stempel: GENEHMIGT oder ABGELEHNT.",
  los: "Schicht beginnen",
  uhr: "Uhr",
  wartende: "Wartende",
  punkte: "Punkte",
  verwarnungen: "Verwarnungen",
  ton: "Ton an/aus",
  nummer: "Nummer",
  schalter: "Schalter 3",
  pruefen: "Prüfen",
  pruefenTitel: "Prüfen: zwei Felder antippen, die nicht zusammenpassen (Taste P oder Shift halten)",
  notizzettel: "Notizzettel",
  notizLeer: "Noch nichts gefunden.",
  fragen: "Fragen",
  wasFragen: "Was fragst du?",
  grundWaehlen: "Warum lehnst du ab?",
  abbrechen: "Abbrechen",
  geklaert: "geklärt ✓",
  genehmigt: "GENEHMIGT",
  abgelehnt: "ABGELEHNT",
  ablehnenWarum: "Erst einen Fehler finden: 🔍 Prüfen, dann zwei Felder antippen, die nicht passen.",
  erstPruefen: "Zum Vergleichen erst 🔍 Prüfen antippen (oder Shift halten).",
  passt: "Passt.",
  egal: "Das kann man nicht vergleichen.",
  schonNotiert: "Steht schon auf dem Notizzettel.",
  schonGeklaert: "Das ist schon geklärt.",
  memoTitel: "Regeln für heute",
  memoVon: "– Regi, Amtsleiterin",
  tabMemo: "📌 Regeln",
  echt: "Echt in Deutschland",
  lindenau: "Lindenau-Regel",
  verwarnung: "Verwarnung",
  richtigGenehmigt: "Richtig! Alles war in Ordnung.",
  richtigAbgelehnt: "Richtig abgelehnt.",
  falschGenehmigt: (notiz) => `Verwarnung: ${notiz}`,
  falschAbgelehnt: "Verwarnung: Alles war in Ordnung – genehmigen wäre richtig gewesen.",
  plus: (n) => `+${n}`,
  endeTitel: "Feierabend!",
  endeKunden: (n) => `${n} Kunden`,
  endeRichtig: (r, n) => `${r} von ${n} richtig`,
  endeVerw: (n) => (n === 1 ? "1 Verwarnung" : `${n} Verwarnungen`),
  nochmal: "Noch eine Schicht",
  wirr: "Falsche Frage – das kostet Zeit.",
};

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

  const muteBtn = $("[data-mute]");
  function paintMute() {
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", String(muted));
  }
  paintMute();
  muteBtn.addEventListener("click", () => { muted = !muted; ton.setMuted(muted); setGameMuted(muted); paintMute(); });
  addEventListener(GAME_MUTE_EVENT, (e) => { muted = !!e.detail?.muted; ton.setMuted(muted); paintMute(); });

  // ---- a shift ---------------------------------------------------------------------------
  let s = null; // the running shift
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function paintHud() {
    $("[data-punkte]").textContent = String(s.punkte);
    $("[data-wartende]").textContent = String(Math.max(0, s.queue.length));
    const v = $("[data-verw]");
    v.innerHTML = [0, 1, 2].map((i) => `<span class="ba-verw-dot${i < s.verw ? " is-on" : ""}"></span>`).join("");
    v.setAttribute("aria-label", `${UI.verwarnungen}: ${s.verw} / 3`);
  }

  function startSchicht() {
    s = {
      tag: 1,
      regeln: regelnBis(1),
      queue: HANDFAELLE.map((f) => f),
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
    tisch.zeigeKunde("neutral");
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
        tisch.zeigeKunde(f.code === "zimmer" ? "froh" : "genervt");
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
    rosa.innerHTML = `<b>${UI.verwarnung}</b><span lang="de">${text}</span><small>– Regi</small>`;
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
      zeigeRosa(missed ? UI.falschGenehmigt(fehlerInfo(missed).notiz.de) : UI.falschAbgelehnt);
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
    ende.innerHTML = `<h2>${UI.endeTitel}</h2>
      <p class="ba-big">${s.punkte} <small>${UI.punkte}</small></p>
      <p>${UI.endeKunden(s.log.length)} · ${UI.endeRichtig(richtigN, s.log.length)} · ${UI.endeVerw(s.verw)}</p>
      <button type="button" class="ba-go" data-again>${UI.nochmal}</button>`;
    ende.hidden = false;
    ende.querySelector("[data-again]").addEventListener("click", startSchicht);
  }

  $("[data-los]").addEventListener("click", startSchicht);
  return { startSchicht, get schicht() { return s; } };
}
