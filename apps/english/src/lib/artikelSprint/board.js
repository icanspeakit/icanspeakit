// Artikel-Flitzer: the ranking under the game („Bestenliste“) and the line about it on the
// game-over screen. One board per mode, level and difficulty, „Diese Woche“ or „Allzeit“;
// the server side is /api/sprint/bestenliste, sending and waiting runs bestenliste.js.
//
// Signed out, the board is there to read, and a run is kept until sign-in. Signed in, the
// player needs a nickname once before their runs show up; the account's name never does.

import { fetchBoard, submitRun, saveName, flushRuns, signedIn } from "./bestenliste.js";
import { getPrefs, savePrefs } from "./storage.js";
import { setWaiting } from "../notReady.js";
import { t } from "../uiText.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const LOGIN = `/anmelden?next=${encodeURIComponent("/games/countable-sprint#bestenliste")}`;

export function mountBoard(el, { modeName, diffName }) {
  const noop = { show() {}, runOver() {}, render() {} };
  if (!el) return noop;
  const $ = (sel) => el.querySelector(sel);
  const list = $("[data-lb-list]");
  const empty = $("[data-lb-empty]");
  const me = $("[data-lb-me]");
  const label = $("[data-lb-board]");
  let zeit = "woche";
  let cfg = null;
  let data = null; // the last answer: { rows, signedIn, name }
  let loading = 0;
  let overEl = null;
  let overState = null; // what the game-over line says: "saved" | "name" | "login" | "failed"

  const boardKey = () => (cfg ? `${cfg.mode}:${cfg.level}:${cfg.diff}:${zeit}` : "");
  let shownKey = "";

  async function load() {
    if (!cfg) return;
    const key = boardKey();
    const n = ++loading;
    el.setAttribute("aria-busy", "true");
    const res = await fetchBoard({ modus: cfg.mode, stufe: cfg.level, schwierigkeit: cfg.diff, zeit });
    if (n !== loading) return;
    el.removeAttribute("aria-busy");
    data = res;
    shownKey = key;
    render();
  }

  function render() {
    if (!cfg) return;
    label.textContent = `${modeName(cfg.mode)} · ${cfg.level} · ${diffName(cfg.diff)}`;
    for (const b of el.querySelectorAll("[data-lb-zeit]")) b.setAttribute("aria-pressed", String(b.dataset.lbZeit === zeit));
    const rows = data?.rows ?? [];
    list.innerHTML = rows.map((r, i) => {
      // A gap before the player's own row when it is far below the top ten.
      const gap = i > 0 && r.rang - rows[i - 1].rang > 1 ? '<li class="asp-lb-gap" aria-hidden="true">…</li>' : "";
      return `${gap}<li${r.ich ? ' class="is-me"' : ""}><span class="asp-board-n">${r.rang}</span><span class="asp-board-name">${esc(r.name)}${r.ich ? ` <small>(${esc(t("sprint.room.you", "du"))})</small>` : ""}</span><b>${r.punkte}</b></li>`;
    }).join("");
    empty.hidden = !!rows.length || !data;
    empty.textContent = !data ? "" : zeit === "woche"
      ? t("sprint.lb.emptyWeek", "Diese Woche ist noch niemand gefahren. Hol dir Platz 1!")
      : t("sprint.lb.empty", "Hier ist noch niemand. Hol dir Platz 1!");
    if (!data && !loading) empty.hidden = false;
    renderMe();
    renderOver();
  }

  /** Under the list: sign in, choose a nickname, or who you play as. */
  function renderMe() {
    const inNow = data ? data.signedIn : signedIn();
    if (!inNow) {
      me.innerHTML = `<p>${esc(t("sprint.lb.loginWhy", "Melde dich an, damit deine Läufe in die Bestenliste kommen."))}</p>
        <a class="asp-btn" href="${LOGIN}">${esc(t("sprint.lb.login", "Anmelden"))}</a>`;
      return;
    }
    if (!data?.name) {
      const suggest = getPrefs().name || "";
      me.innerHTML = `<label class="asp-label" for="asp-lb-name">${esc(t("sprint.lb.nameAsk", "Dein Name in der Bestenliste"))}</label>
        <div class="asp-join"><input class="asp-input" id="asp-lb-name" data-lb-name maxlength="16" autocomplete="nickname" enterkeyhint="done" value="${esc(suggest)}" placeholder="${esc(t("sprint.lb.namePh", "z. B. Schneller Fuchs"))}" />
        <button type="button" class="asp-btn asp-btn--go" data-lb-save>${esc(t("sprint.lb.save", "Speichern"))}</button></div>
        <p class="asp-lb-note">${esc(t("sprint.lb.nameNote", "Alle sehen diesen Namen. Nimm nicht deinen vollen Namen."))}</p>
        <p class="asp-room-msg" data-lb-msg role="status"></p>`;
      bindName();
      return;
    }
    me.innerHTML = `<p>${t("sprint.lb.playingAs", "Du spielst als {name}.", { name: `<b>${esc(data.name)}</b>` })}
      <button type="button" class="asp-link-btn" data-lb-rename>${esc(t("sprint.lb.rename", "Namen ändern"))}</button></p>`;
    $("[data-lb-rename]").addEventListener("click", () => { data = { ...data, name: null }; renderMe(); $("[data-lb-name]")?.focus(); });
  }

  function bindName() {
    const input = $("[data-lb-name]");
    const btn = $("[data-lb-save]");
    const msg = $("[data-lb-msg]");
    const sync = () => setWaiting(btn, input.value.trim().length < 2 ? t("sprint.lb.nameShort", "Mindestens 2 Zeichen.") : null, input);
    input.addEventListener("input", sync);
    sync();
    const go = async () => {
      if (input.value.trim().length < 2) return;
      btn.disabled = true;
      const name = await saveName(input.value);
      btn.disabled = false;
      if (!name) {
        msg.textContent = t("sprint.lb.nameBad", "Dieser Name geht nicht. Nur Buchstaben, Zahlen und Leerzeichen, 2 bis 16 Zeichen.");
        return;
      }
      savePrefs({ name });
      if (overState === "name") overState = "saved";
      await load();
    };
    btn.addEventListener("click", go);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  /** The line on the game-over screen. */
  function renderOver() {
    if (!overEl || !overState) return;
    const mine = data?.rows?.find((r) => r.ich);
    const link = `<a href="#bestenliste" data-lb-jump>${esc(t("sprint.lb.see", "Bestenliste ansehen"))}</a>`;
    let html = "";
    if (overState === "login") html = `${esc(t("sprint.lb.overLogin", "Melde dich an, dann kommt dieser Lauf in die Bestenliste."))} <a href="${LOGIN}">${esc(t("sprint.lb.login", "Anmelden"))}</a>`;
    else if (overState === "name") html = `${esc(t("sprint.lb.overName", "Gespeichert. Wähl noch einen Namen, dann stehst du in der Bestenliste."))} ${link}`;
    else if (overState === "failed") html = esc(t("sprint.lb.overFailed", "Die Bestenliste ist gerade nicht erreichbar. Dein Lauf wird später gesendet."));
    else if (mine) html = `${esc(t(zeit === "woche" ? "sprint.lb.overRankWeek" : "sprint.lb.overRank", zeit === "woche" ? "Platz {n} diese Woche" : "Platz {n} insgesamt", { n: mine.rang }))} · ${link}`;
    else html = `${esc(t("sprint.lb.overSaved", "In der Bestenliste gespeichert."))} ${link}`;
    overEl.innerHTML = html;
    overEl.hidden = false;
    overEl.querySelector("[data-lb-jump]")?.addEventListener("click", (e) => { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  for (const b of el.querySelectorAll("[data-lb-zeit]")) {
    b.addEventListener("click", () => { zeit = b.dataset.lbZeit; load(); });
  }

  // Runs from before sign-in go out on the first visit after it.
  flushRuns().then((r) => { if (r) load(); });

  return {
    /** The board for this mode, level and difficulty; fetched only when it changed. */
    show(next) {
      cfg = { ...next };
      if (boardKey() !== shownKey) load();
      else render();
    },
    render,
    async runOver(run, lineEl) {
      overEl = lineEl;
      overState = null;
      if (overEl) overEl.hidden = true;
      cfg = { mode: run.modus, level: run.stufe, diff: run.schwierigkeit };
      const res = await submitRun(run);
      overState = res.saved ? (res.needName ? "name" : "saved") : res.waiting && !signedIn() ? "login" : "failed";
      await load();
    },
  };
}
