// Onboarding hints at the moments they make sense, for learners who are new here.
//
// A first-time learner finds the trainers from the home page and never learns that two
// things exist: /progress, which already keeps every answer they give, and the
// Karteikarten, which most grammar learners never open. A tour on arrival would be read by
// nobody — they came for an exercise. So the hint waits for a moment where it is the
// obvious next thought:
//
//   karten-progress   a Karteikarten round is finished      → "saved; N words known" → /progress
//   uebung-karten     a grammar round is finished, and the  → "words go best on cards" → /vocabulary
//                     cards have never been opened
//   attempts-progress the 10th graded answer anywhere       → "N answers saved" → /progress
//
// Each hint shows a bounded number of times, one per page view, only in the learner's first
// NEW_DAYS days, and the progress hints stop for good once /progress has been opened —
// at that point the learner knows. Everything lives in this browser (like progress.js).
// Layout.astro loads this module on the first da:round / da:attempt, not on every page.
import { getProgress } from "./progress.js";
import { getLang, loadDict, translate } from "./i18n.js";
import { track } from "./track.js";
import { withBase, currentPath } from "./paths.js";

const KEY = "da-tips-v1";
const NEW_DAYS = 21;
const ATTEMPTS_AT = 10;
const LIMIT = { "karten-progress": 2, "uebung-karten": 1, "attempts-progress": 1 };

const today = () => new Date().toISOString().slice(0, 10);

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v === "object") return { seen: {}, ...v };
  } catch {}
  // A learner who was here before this module existed is not new: their clock starts at
  // the oldest day progress.js still remembers (it keeps 60), not at today.
  let first = today();
  try {
    const days = Object.keys(getProgress().dailyActivity || {}).sort();
    if (days[0] && days[0] < first) first = days[0];
  } catch {}
  return { first, seen: {}, progressSeen: false };
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/** /progress was opened: the progress hints have done their job. */
export function markProgressSeen() {
  const s = read();
  if (!s.progressSeen) { s.progressSeen = true; write(s); }
}

/** Starts the clock on the first visit of any page, so "new" means new to the site. */
export function noteVisit() {
  try { if (localStorage.getItem(KEY) == null) write(read()); } catch {}
}

function isNew(s) {
  const first = Date.parse(s.first || today());
  return Number.isFinite(first) && (Date.now() - first) / 864e5 < NEW_DAYS;
}

let shownThisPage = false;

function pickTip(event, s) {
  const p = getProgress();
  const left = (id) => (s.seen[id] || 0) < LIMIT[id];
  const onProgressPage = currentPath().startsWith("/progress");
  if (event.type === "da:round" && event.detail?.kind === "karten") {
    if (s.progressSeen || onProgressPage || !left("karten-progress")) return null;
    const n = p.vocabMastered.length;
    return {
      id: "karten-progress",
      text: n > 0 ? ["tp.karten.text", { n }] : ["tp.karten.textNone"],
      link: ["tp.progress.link", "/progress"]
    };
  }
  if (event.type === "da:round" && event.detail?.kind === "uebung") {
    if (p.skills.wortschatz || currentPath().startsWith("/vocabulary") || !left("uebung-karten")) return null;
    return { id: "uebung-karten", text: ["tp.uebung.text"], link: ["tp.uebung.link", "/vocabulary"] };
  }
  if (event.type === "da:attempt") {
    const total = event.detail?.total ?? 0;
    if (total < ATTEMPTS_AT || s.progressSeen || onProgressPage || !left("attempts-progress")) return null;
    return { id: "attempts-progress", text: ["tp.attempts.text", { n: total }], link: ["tp.progress.link", "/progress"] };
  }
  return null;
}

// German first, so a hint never shows a key even if the dictionary has not loaded.
const DE = {
  "tp.karten.text": "Gespeichert: {n} Wörter kannst du schon. Alles, was du übst, sammelt sich in deinem Fortschritt.",
  "tp.karten.textNone": "Jede Karte, die du kannst, wird gespeichert. Alles, was du übst, sammelt sich in deinem Fortschritt.",
  "tp.uebung.text": "Gut gemacht! Die Wörter dazu lernst du am besten mit Karteikarten — 25 pro Runde.",
  "tp.uebung.link": "Zu den Karteikarten",
  "tp.attempts.text": "{n} Antworten gespeichert. Sieh nach, wie weit du schon bist.",
  "tp.progress.link": "Mein Fortschritt",
  "tp.close": "Schließen",
};

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function show(tip) {
  const dict = { ...DE, ...(await loadDict(getLang()).catch(() => ({}))) };
  const t = (k, v) => translate(dict, k, v);
  document.querySelector(".tp-toast")?.remove();
  const el = document.createElement("div");
  el.className = "tp-toast";
  el.setAttribute("role", "status");
  el.dataset.tip = tip.id;
  el.innerHTML = `
    <p class="tp-text">${escapeHtml(t(tip.text[0], tip.text[1]))}</p>
    <a class="tp-link" href="${withBase(tip.link[1])}">${escapeHtml(t(tip.link[0]))} <span aria-hidden="true">${document.documentElement.dir === "rtl" ? "←" : "→"}</span></a>
    <button type="button" class="tp-x" aria-label="${escapeHtml(t("tp.close"))}">✕</button>`;
  const close = () => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector(".tp-x").addEventListener("click", () => {
    // Waved away: this one does not come back.
    const s = read();
    s.seen[tip.id] = LIMIT[tip.id];
    write(s);
    close();
  });
  el.querySelector(".tp-link").addEventListener("click", () => {
    track("touchpoint_click", { tip: tip.id });
  });
  document.body.appendChild(el);
  setTimeout(close, 14000);
}

/** Handed every da:round / da:attempt by Layout.astro. */
export function handle(event) {
  if (shownThisPage) return;
  const s = read();
  if (!isNew(s)) return;
  const tip = pickTip(event, s);
  if (!tip) return;
  shownThisPage = true;
  s.seen[tip.id] = (s.seen[tip.id] || 0) + 1;
  write(s);
  // After the round's cheer (mascotCelebrate.js) has had its moment.
  setTimeout(() => show(tip), event.type === "da:round" ? 1800 : 600);
}
