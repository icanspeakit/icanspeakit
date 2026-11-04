// "Problem melden" in the browser (PROBLEM-MELDEN-QA-TIERED-PROMPT.md, Tier 2).
//
// Engines describe an item as a *target* and hand it here:
//   { ref, fingerprint, snapshot: () => object, label?, items?: () => [subtarget + { label, wrong }] }
// `ref` / `fingerprint` come from ./meldungRef.js (docs/problem-melden-tier0-v1.md §2).
// `items` (a whole exercise's sentences) is accepted but no longer asked about: the learner
// names the sentence in the comment if it matters.
//
// Learners: meldenLink(target) is a quiet "⚑ Problem melden" link that opens one shared
// bottom sheet: a comment box, three optional generic chips, Senden. Either is enough. Nothing here ever blocks the exercise.
// Unsent reports wait in localStorage (da_meldung_queue) and go out on the next load/online.
//
// Dev (Edgar): only when this device is internal (?intern=1 / dev server) AND the server says
// the signed-in account is in ADMIN_EMAILS (GET /api/meldung answers 200, not 403). Then:
//   - flagItems(root, selector, el => target) puts a ⚑ on every item; one tap = sent
//     (grund 'flag'), the icon turns green and offers ✎ (add a note); with a note it turns
//     red. Tapping a flagged icon opens its note; Escape or a click away closes it.
//   - F flags the item in focus / last touched / first on screen, Shift+F opens its note.
//   - already flagged items load flagged; the demo dock shows "⚑ N heute".
// The server decides dev; this file only decides whether to show the dev UI.
import { apiFetch } from "./api.js";
import { getLang } from "./i18n.js";
import { isInternalDevice } from "./internal.js";
import { t } from "./uiText.js";
import { waitAttrs } from "./notReady.js";
import { cleanRef } from "./meldungRef.js";
import { dankeHtml, loveBurst } from "./meldungDanke.js";
import "../styles/meldung.css";

const APP = import.meta.env.PUBLIC_TARGET === "app";
const QUEUE_KEY = "da_meldung_queue";
const CLIENT_KEY = "da_meldung_client";
const DEV_KEY = "da_meldung_dev";
const SNAP_MAX = 3800; // bytes of JSON; the server refuses > 4096

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ls = {
  get(k, store = localStorage) { try { return JSON.parse(store.getItem(k) ?? "null"); } catch { return null; } },
  set(k, v, store = localStorage) { try { v == null ? store.removeItem(k) : store.setItem(k, JSON.stringify(v)); } catch {} },
};

// Three generic chips, optional: a comment alone goes in as „sonstiges“.
export const GRUENDE_UI = [
  ["antwort_falsch", "meldung.grund.antwort", "Die Lösung ist falsch"],
  ["unklar", "meldung.grund.unklar", "Die Aufgabe ist unklar"],
  ["technisch", "meldung.grund.technisch", "Technisches Problem"],
];

/* ------------------------------------------------------------- sending ---- */

function clientId() {
  let id = ls.get(CLIENT_KEY);
  if (typeof id !== "string") {
    id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    ls.set(CLIENT_KEY, id);
  }
  return id;
}

/** Cuts a snapshot until its JSON fits: long strings first, then trailing array entries. */
function fitSnapshot(snap) {
  const size = (o) => new TextEncoder().encode(JSON.stringify(o)).length;
  let s = JSON.parse(JSON.stringify(snap ?? {}));
  for (const cap of [400, 160, 60]) {
    if (size(s) <= SNAP_MAX) return s;
    s = JSON.parse(JSON.stringify(s, (_k, v) => (typeof v === "string" && v.length > cap ? v.slice(0, cap) + "…" : v)));
  }
  while (size(s) > SNAP_MAX) {
    const key = Object.keys(s).find((k) => Array.isArray(s[k]) && s[k].length > 1);
    if (!key) return { gekuerzt: true };
    s[key] = s[key].slice(0, Math.floor(s[key].length / 2));
    s.gekuerzt = true;
  }
  return s;
}

function payload(target, grund, text) {
  let snapshot = {};
  try { snapshot = fitSnapshot(target.snapshot?.() ?? {}); } catch {}
  let posthog = null;
  try { posthog = window.posthog?.__loaded ? window.posthog.get_session_id?.() ?? null : null; } catch {}
  return {
    ref: cleanRef(target.ref),
    fingerprint: target.fingerprint ?? null,
    grund,
    text: text || null,
    snapshot,
    seite: location.pathname + (location.hash || ""),
    ui_sprache: getLang(),
    posthog_session: posthog,
    client_id: clientId(),
  };
}

async function post(path, body) {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

/** Sends one report; on a network failure it waits in the queue. Never throws. */
export async function sendMeldung(target, grund, text) {
  const body = payload(target, grund, text);
  try {
    const r = await post("/api/meldung", body);
    if (r.ok) return { ok: true, id: r.data?.id };
    // 4xx is final (invalid / rate limit): queueing would only repeat it.
    if (r.status >= 400 && r.status < 500) return { ok: false, status: r.status, message: r.data?.message };
  } catch {}
  ls.set(QUEUE_KEY, [...(ls.get(QUEUE_KEY) ?? []), body].slice(-20));
  return { ok: true, queued: true };
}

let flushing = false;
async function flushQueue() {
  const q = ls.get(QUEUE_KEY);
  if (flushing || !Array.isArray(q) || !q.length || !navigator.onLine) return;
  flushing = true;
  const left = [];
  for (const body of q) {
    try {
      const r = await post("/api/meldung", body);
      if (!r.ok && r.status >= 500) left.push(body);
    } catch { left.push(body); }
  }
  ls.set(QUEUE_KEY, left.length ? left : null);
  flushing = false;
}

/* --------------------------------------------------------------- sheet ---- */

let dlg = null;
let current = null; // { target, item, grund, note: {id} | null }

function ensureSheet() {
  if (dlg) return dlg;
  dlg = document.createElement("dialog");
  dlg.className = "mf-sheet";
  dlg.setAttribute("aria-labelledby", "mf-title");
  document.body.append(dlg);
  // Click away closes. Measured against the box rather than e.target === dlg, so a press
  // that starts on the backdrop counts however the dialog's padding is laid out.
  dlg.addEventListener("pointerdown", (e) => {
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  // Escape closes too, even if a page handler swallowed the native one.
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dlg.open) dlg.close(); }, true);
  // Typing a "p" or a space in the comment must not drive a game underneath (window listeners).
  dlg.addEventListener("keydown", (e) => e.stopPropagation());
  dlg.addEventListener("close", () => { current = null; });
  return dlg;
}

function sheetHtml() {
  const { note } = current;
  const head = note
    ? t("meldung.notiz.titel", "Notiz zum Flag")
    : t("meldung.titel", "Was stimmt hier nicht?");
  const reasons = note
    ? ""
    : `<div class="mf-chips">${GRUENDE_UI.map(([g, key, de]) => `<button type="button" class="mf-chip${current.grund === g ? " is-on" : ""}" data-grund="${g}" aria-pressed="${current.grund === g}">${esc(t(key, de))}</button>`).join("")}</div>`;
  return `
    <form method="dialog" class="mf-form">
      <div class="mf-head">
        <h2 id="mf-title">${esc(head)}</h2>
        <button type="button" class="mf-x" data-close aria-label="${esc(t("meldung.schliessen", "Schließen"))}">×</button>
      </div>
      <label class="mf-label" for="mf-text">${esc(note ? t("meldung.notiz", "Was ist falsch?") : t("meldung.kommentar", "Was ist dir aufgefallen?"))}</label>
      <textarea id="mf-text" class="mf-text" maxlength="1000" rows="4">${esc(note?.text ?? "")}</textarea>
      ${reasons}
      <p class="mf-msg" role="status"></p>
      <div class="mf-actions">
        ${note ? `<button type="button" class="mf-link" data-unflag>${esc(t("meldung.entfernen", "Flag entfernen"))}</button>` : ""}
        <button type="submit" class="mf-send"${waitAttrs(note || current.grund || current.hasText ? null : t("meldung.textFirst", "Schreib kurz, was nicht stimmt – oder tippe auf eine Auswahl."), ".mf-text")}>${esc(note ? t("meldung.speichern", "Speichern") : t("meldung.senden", "Senden"))}</button>
      </div>
    </form>`;
}

function renderSheet() {
  const keepText = dlg.querySelector("#mf-text")?.value;
  dlg.innerHTML = sheetHtml();
  const ta = dlg.querySelector("#mf-text");
  if (keepText != null) ta.value = keepText;
  dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
  // A second tap on the chosen chip lets it go again: the chips are optional.
  dlg.querySelectorAll("[data-grund]").forEach((b) => b.addEventListener("click", () => { current.grund = current.grund === b.dataset.grund ? null : b.dataset.grund; renderSheet(); }));
  // Typing makes Senden ready without a re-render, which would drop the caret.
  ta.addEventListener("input", () => {
    const has = ta.value.trim().length > 0;
    if (has === Boolean(current?.hasText)) return;
    current.hasText = has;
    const pos = [ta.selectionStart, ta.selectionEnd];
    renderSheet();
    const nt = dlg.querySelector("#mf-text");
    nt.focus();
    nt.setSelectionRange(...pos);
  });
  dlg.querySelector("[data-unflag]")?.addEventListener("click", () => unflag(current.note.el));
  dlg.querySelector("form").addEventListener("submit", onSubmit);
}

/** Opens the learner sheet for a target. */
export function openMeldung(target) {
  ensureSheet();
  current = { target, item: -1, grund: null, note: null };
  renderSheet();
  if (!dlg.open) dlg.showModal();
  dlg.querySelector("#mf-text")?.focus();
}

async function onSubmit(e) {
  e.preventDefault();
  const send = dlg.querySelector(".mf-send");
  const msg = dlg.querySelector(".mf-msg");
  const text = dlg.querySelector("#mf-text").value.trim();
  send.disabled = true;

  if (current.note) {
    const { el, id } = current.note;
    const r = await post("/api/meldung-notiz", { id, text }).catch(() => ({ ok: false }));
    if (r.ok) { flagState.get(el) && (flagState.get(el).text = text); paintFlag(el); dlg.close(); }
    else { msg.textContent = t("meldung.fehler", "Das hat nicht geklappt. Bitte versuch es noch einmal."); send.disabled = false; }
    return;
  }

  const { target, grund } = current;
  if (!grund && !text) { send.disabled = false; return; }
  const r = await sendMeldung(target, grund ?? "sonstiges", text);
  if (r.ok) {
    // Thank them properly: a „Danke!" card in the sheet, hearts and balloons from the button.
    loveBurst(send);
    dlg.innerHTML = dankeHtml(t("meldung.danke", "Danke, wir schauen es uns an."), esc);
    dlg.classList.add("is-sent");
    setTimeout(() => dlg.open && dlg.close(), 2600);
    setTimeout(() => dlg.classList.remove("is-sent"), 2800);
  } else {
    msg.textContent = r.message || t("meldung.fehler", "Das hat nicht geklappt. Bitte versuch es noch einmal.");
    send.disabled = false;
  }
}

/** The same link as markup, for engines that render with innerHTML; pair with onMeldenClick(). */
export function meldenLinkHtml(dataAttrs = "") {
  return `<div class="mf-row"><button type="button" class="mf-link-melden" ${dataAttrs}><span aria-hidden="true">⚑</span> <span data-i18n="meldung.link">${esc(t("meldung.link", "Problem melden"))}</span></button></div>`;
}

/** Delegated click for meldenLinkHtml() links inside `root`; `getTarget(button)` → target. Wired once per root. */
export function onMeldenClick(root, getTarget) {
  root._mfGetTarget = getTarget;
  if (root._mfWired) return;
  root._mfWired = true;
  root.addEventListener("click", (e) => {
    const b = e.target.closest?.(".mf-link-melden");
    if (!b || !root.contains(b)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = root._mfGetTarget?.(b);
    if (target?.ref) openMeldung(target);
  });
}

/** The quiet learner link. Click → sheet. */
export function meldenLink(getTarget, { className = "" } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `mf-link-melden ${className}`.trim();
  b.innerHTML = `<span aria-hidden="true">⚑</span> <span data-i18n="meldung.link">${esc(t("meldung.link", "Problem melden"))}</span>`;
  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = typeof getTarget === "function" ? getTarget() : getTarget;
    if (target?.ref) openMeldung(target);
  });
  return b;
}

/* ----------------------------------------------------------------- dev ---- */

let devPromise = null;
const flagState = new WeakMap(); // el → { id, text } once flagged
const targets = new WeakMap(); // el → () => target
const known = new Map(); // ref → { id, text } from the server
const asked = new Set(); // refs already asked about, flagged or not
const flagged = new Set(); // elements currently decorated (for F)
let lastTouched = null;
let pending = new Set();
let pendingTimer = 0;

const signedIn = () => APP || /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

/** Resolves true when the dev UI should show. Asked at most once per tab session. */
export function devMode() {
  if (devPromise) return devPromise;
  devPromise = (async () => {
    try {
      if (!isInternalDevice() || !signedIn()) return false;
      const cached = ls.get(DEV_KEY, sessionStorage);
      if (cached === false) return false;
      const res = await apiFetch("/api/meldung?refs=", { credentials: "same-origin" });
      const ok = res.ok;
      ls.set(DEV_KEY, ok, sessionStorage);
      if (ok) {
        document.documentElement.dataset.meldungDev = "";
        const { heute } = await res.json().catch(() => ({}));
        dockCounter(heute ?? 0);
        wireKeys();
      }
      return ok;
    } catch {
      return false;
    }
  })();
  return devPromise;
}

function dockCounter(n) {
  const dock = document.querySelector("[data-demo-dock]");
  if (!dock) return;
  let a = dock.querySelector("[data-meldung-count]");
  if (!a) {
    a = document.createElement("a");
    a.className = "vp-dev-reset";
    a.href = "/intern/meldungen";
    a.dataset.meldungCount = String(n);
    dock.prepend(a);
  }
  a.dataset.meldungCount = String(n);
  a.textContent = `⚑ ${n} heute`;
}
const bumpCounter = (d) => {
  const a = document.querySelector("[data-meldung-count]");
  if (a) dockCounter(Math.max(0, +a.dataset.meldungCount + d));
};

function paintFlag(el) {
  const btn = el.querySelector(":scope > .mf-flag");
  if (!btn) return;
  const st = flagState.get(el);
  btn.classList.toggle("is-on", Boolean(st));
  // Green: flagged, no note yet. Red: flagged with a note.
  btn.classList.toggle("has-note", Boolean(st?.text));
  el.classList.toggle("mf-needs-note", Boolean(st && !st.text));
  btn.title = st ? (st.text ? `Notiz: ${st.text}` : "Geflaggt – tippen für Notiz") : "Flaggen (F)";
  btn.setAttribute("aria-pressed", String(Boolean(st)));
  let n = el.querySelector(":scope > .mf-note");
  if (st && !st.text) {
    if (!n) {
      n = document.createElement("button");
      n.type = "button";
      n.className = "mf-note";
      n.textContent = "✎";
      n.title = n.ariaLabel = "Notiz hinzufügen";
      n.addEventListener("click", (e) => { e.stopPropagation(); openNote(el); });
      btn.after(n);
    }
  } else n?.remove();
}

function openNote(el) {
  const st = flagState.get(el);
  if (!st) return;
  ensureSheet();
  current = { target: targets.get(el)?.(), item: -1, grund: "flag", note: { el, id: st.id, text: st.text } };
  renderSheet();
  if (!dlg.open) dlg.showModal();
  dlg.querySelector("#mf-text")?.focus();
}

async function flag(el) {
  if (flagState.get(el)) return openNote(el);
  const target = targets.get(el)?.();
  if (!target?.ref) return;
  flagState.set(el, { id: null, text: "" });
  paintFlag(el);
  const r = await sendMeldung(target, "flag", "");
  if (r.ok && r.id) {
    flagState.set(el, { id: r.id, text: "" });
    known.set(cleanRef(target.ref), { id: r.id, text: "" });
    bumpCounter(1);
  } else if (!r.queued) flagState.delete(el);
  paintFlag(el);
}

async function unflag(el) {
  const st = flagState.get(el);
  if (!st?.id) return dlg?.close();
  const r = await post("/api/meldung-notiz", { id: st.id, loeschen: true }).catch(() => ({ ok: false }));
  if (r.ok) {
    flagState.delete(el);
    const ref = cleanRef(targets.get(el)?.()?.ref);
    if (ref) known.delete(ref);
    bumpCounter(-1);
    paintFlag(el);
  }
  dlg?.close();
}

function decorate(el, getTarget) {
  targets.set(el, getTarget);
  flagged.add(el);
  if (el.querySelector(":scope > .mf-flag")) return;
  el.classList.add("mf-has-flag");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mf-flag";
  btn.textContent = "⚑";
  btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); flag(el); });
  el.addEventListener("pointerdown", () => { lastTouched = el; }, { passive: true });
  el.append(btn);
  const ref = cleanRef(getTarget()?.ref);
  if (!ref) return;
  const k = known.get(ref);
  if (k) flagState.set(el, { ...k });
  else if (!asked.has(ref)) { asked.add(ref); pending.add(ref); clearTimeout(pendingTimer); pendingTimer = setTimeout(loadFlags, 250); }
  paintFlag(el);
}

async function loadFlags() {
  const refs = [...pending];
  pending = new Set();
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100);
    try {
      const res = await apiFetch(`/api/meldung?refs=${encodeURIComponent(chunk.join(","))}`, { credentials: "same-origin" });
      if (!res.ok) continue;
      const { flags = [] } = await res.json();
      for (const f of flags) known.set(f.ref, { id: f.id, text: f.text ?? "" });
    } catch {}
  }
  for (const el of flagged) {
    if (!el.isConnected) { flagged.delete(el); continue; }
    const ref = cleanRef(targets.get(el)?.()?.ref);
    if (ref && known.has(ref) && !flagState.get(el)) { flagState.set(el, { ...known.get(ref) }); paintFlag(el); }
  }
}

/**
 * Dev only: a ⚑ on every element matching `selector` inside `root`, kept there across the
 * engine's re-renders (a MutationObserver re-decorates after each innerHTML swap).
 * `getTarget(el)` returns the item's target at tap time. Does nothing for learners.
 */
const observers = new WeakMap(); // root → its MutationObserver, so a remount replaces it

export function flagItems(root, selector, getTarget) {
  if (!root) return;
  observers.get(root)?.disconnect();
  const token = {};
  observers.set(root, { disconnect() { token.dead = true; } });
  devMode().then((dev) => {
    if (!dev || token.dead) return;
    const run = () => root.querySelectorAll(selector).forEach((el) => { if (!el.querySelector(":scope > .mf-flag")) decorate(el, () => getTarget(el)); });
    run();
    const mo = new MutationObserver(run);
    mo.observe(root, { childList: true, subtree: true });
    observers.set(root, mo);
  });
}

/** Dev only: a ⚑ on one element that the engine doesn't re-render (e.g. an exercise's link row). */
export function flagElement(el, getTarget) {
  if (!el) return;
  devMode().then((dev) => dev && decorate(el, getTarget));
}

function keyTarget() {
  const live = [...flagged].filter((el) => el.isConnected);
  const focus = document.activeElement?.closest?.(".mf-has-flag");
  if (focus && live.includes(focus)) return focus;
  if (lastTouched?.isConnected) return lastTouched;
  return live.find((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }) ?? null;
}

let keysWired = false;
function wireKeys() {
  if (keysWired) return;
  keysWired = true;
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "f" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]") || dlg?.open) return;
    const el = keyTarget();
    if (!el) return;
    e.preventDefault();
    if (e.shiftKey) {
      if (flagState.get(el)) openNote(el);
      else flag(el).then(() => openNote(el));
    } else if (!flagState.get(el)) flag(el);
  });
}

/* ---------------------------------------------------------------- init ---- */

if (typeof window !== "undefined") {
  addEventListener("online", () => flushQueue());
  setTimeout(() => flushQueue(), 2000);
}
