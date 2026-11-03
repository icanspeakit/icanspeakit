// Hamstis Wachtelhuhn: the ranking under the game („Bestenliste“) and the line about it on the end
// screen. One board per level and card mode, „Diese Woche“ or „Allzeit“. Modelled on
// src/lib/artikelSprint/board.js; the nickname is shared with Bruno Kart.
import { fetchBoard, submitRun, saveName, flushRuns, signedIn } from "./bestenliste.js";
import { setWaiting } from "../notReady.js";
import { t, onUiText } from "../uiText.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const LOGIN = `/anmelden?next=${encodeURIComponent("/games/listening-safari#bestenliste")}`;
const karten = (k) => (k === "bild" ? t("hs.cards.bild", "Bilder") : k === "wort" ? t("hs.cards.wort", "Wörter") : k);

export function mountBoard(el) {
  const noop = { show() {}, runOver() {} };
  if (!el) return noop;
  const $ = (s) => el.querySelector(s);
  const list = $("[data-lb-list]");
  const empty = $("[data-lb-empty]");
  const me = $("[data-lb-me]");
  const label = $("[data-lb-board]");
  let zeit = "woche";
  let cfg = null;
  let data = null;
  let loading = 0;
  let overEl = null;
  let overState = null;
  let shownKey = "";
  const boardKey = () => (cfg ? `${cfg.stufe}:${cfg.karten}:${zeit}` : "");

  async function load() {
    if (!cfg) return;
    const key = boardKey();
    const n = ++loading;
    el.setAttribute("aria-busy", "true");
    const res = await fetchBoard({ ...cfg, zeit });
    if (n !== loading) return;
    el.removeAttribute("aria-busy");
    data = res;
    shownKey = key;
    render();
  }

  function render() {
    if (!cfg) return;
    label.textContent = `${cfg.stufe} · ${karten(cfg.karten)}`;
    for (const b of el.querySelectorAll("[data-lb-zeit]")) b.setAttribute("aria-pressed", String(b.dataset.lbZeit === zeit));
    const rows = data?.rows ?? [];
    list.innerHTML = rows.map((r, i) => {
      const gap = i > 0 && r.rang - rows[i - 1].rang > 1 ? '<li class="hs-lb-gap" aria-hidden="true">…</li>' : "";
      return `${gap}<li${r.ich ? ' class="is-me"' : ""}><span class="hs-lb-n">${r.rang}</span><span class="hs-lb-name">${esc(r.name)}${r.ich ? ` <small>(${t("hs.lb.you", "du")})</small>` : ""}</span><b>${r.punkte}</b></li>`;
    }).join("");
    empty.hidden = !!rows.length;
    empty.textContent = !data
      ? t("hs.lb.down", "Die Bestenliste ist gerade nicht erreichbar.")
      : zeit === "woche" ? t("hs.lb.emptyWeek", "Diese Woche hat hier noch niemand gespielt. Hol dir Platz 1!") : t("hs.lb.emptyAll", "Hier ist noch niemand. Hol dir Platz 1!");
    renderMe();
    renderOver();
  }

  function renderMe() {
    const inNow = data ? data.signedIn : signedIn();
    if (!inNow) {
      me.innerHTML = `<p>${t("hs.lb.login", "Melde dich an, damit deine Runden in die Bestenliste kommen.")}</p><a class="hs-quiet hs-quiet--link" href="${LOGIN}">${t("hs.lb.loginBtn", "Anmelden")}</a>`;
      return;
    }
    if (!data?.name) {
      me.innerHTML = `<label class="hs-label" for="hs-lb-name">${t("hs.lb.nameLabel", "Dein Name in der Bestenliste")}</label>
        <div class="hs-lb-join"><input class="hs-input" id="hs-lb-name" data-lb-name maxlength="16" autocomplete="nickname" enterkeyhint="done" placeholder="${esc(t("hs.lb.placeholder", "z. B. Schneller Fuchs"))}" />
        <button type="button" class="hs-go hs-go--small" data-lb-save>${t("hs.lb.save", "Speichern")}</button></div>
        <p class="hs-muted">${t("hs.lb.nameNote", "Alle sehen diesen Namen – auch in Bruno Kart. Nimm nicht deinen vollen Namen.")}</p>
        <p class="hs-muted" data-lb-msg role="status"></p>`;
      bindName();
      return;
    }
    me.innerHTML = `<p>${t("hs.lb.playingAs", "Du spielst als {name}.", { name: `<b>${esc(data.name)}</b>` })} <button type="button" class="hs-link" data-lb-rename>${t("hs.lb.rename", "Namen ändern")}</button></p>`;
    $("[data-lb-rename]").addEventListener("click", () => { data = { ...data, name: null }; renderMe(); $("[data-lb-name]")?.focus(); });
  }

  function bindName() {
    const input = $("[data-lb-name]");
    const btn = $("[data-lb-save]");
    const msg = $("[data-lb-msg]");
    const sync = () => setWaiting(btn, input.value.trim().length < 2 ? t("hs.lb.nameWait", "Mindestens 2 Zeichen.") : null, input);
    input.addEventListener("input", sync);
    sync();
    const go = async () => {
      if (input.value.trim().length < 2) return;
      btn.disabled = true;
      const name = await saveName(input.value);
      btn.disabled = false;
      if (!name) {
        msg.textContent = t("hs.lb.nameBad", "Dieser Name geht nicht. Nur Buchstaben, Zahlen und Leerzeichen, 2 bis 16 Zeichen.");
        return;
      }
      if (overState === "name") overState = "saved";
      await load();
    };
    btn.addEventListener("click", go);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  function renderOver() {
    if (!overEl || !overState) return;
    const mine = data?.rows?.find((r) => r.ich);
    const link = `<a href="#bestenliste" data-lb-jump>${t("hs.lb.see", "Bestenliste ansehen")}</a>`;
    let html;
    if (overState === "login") html = `${t("hs.lb.overLogin", "Melde dich an, dann kommt diese Runde in die Bestenliste.")} <a href="${LOGIN}">${t("hs.lb.loginBtn", "Anmelden")}</a>`;
    else if (overState === "name") html = `${t("hs.lb.overName", "Gespeichert. Wähl noch einen Namen, dann stehst du in der Bestenliste.")} ${link}`;
    else if (overState === "failed") html = t("hs.lb.overFail", "Die Bestenliste ist gerade nicht erreichbar. Deine Runde wird später gesendet.");
    else if (mine) html = `${zeit === "woche" ? t("hs.lb.placeWeek", "Platz {n} diese Woche", { n: mine.rang }) : t("hs.lb.placeAll", "Platz {n} insgesamt", { n: mine.rang })} · ${link}`;
    else html = `${t("hs.lb.saved", "In der Bestenliste gespeichert.")} ${link}`;
    overEl.innerHTML = html;
    overEl.hidden = false;
    overEl.querySelector("[data-lb-jump]")?.addEventListener("click", (e) => { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  for (const b of el.querySelectorAll("[data-lb-zeit]")) {
    b.addEventListener("click", () => { zeit = b.dataset.lbZeit; load(); });
  }
  onUiText(render); // the dictionary arrives after the board: repaint what script wrote
  flushRuns().then((r) => { if (r) load(); });

  return {
    show(next) {
      cfg = { ...next };
      if (boardKey() !== shownKey) load();
      else render();
    },
    async runOver(run, lineEl) {
      overEl = lineEl;
      overState = null;
      if (overEl) overEl.hidden = true;
      cfg = { stufe: run.stufe, karten: run.karten };
      const res = await submitRun(run);
      overState = res.saved ? (res.needName ? "name" : "saved") : res.waiting && !signedIn() ? "login" : "failed";
      await load();
    },
  };
}
