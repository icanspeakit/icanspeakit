// A quiet word from the topic's mascot every so often while someone practises — Quaki in
// Aussprache, Hamsti in Wortschatz, Regi in the grammar exercises.
//
//   import { nudgeStep } from "../lib/mascotNudge.js";
//   nudgeStep({ area: "wortschatz", correct: true, left: 7 });
//
// Not the milestone overlay (mascotCelebrate.js): that is a round finished, this is the
// middle of one, so it stays small, in a corner, and goes by itself.
//
// What it says, and when, is chosen to help rather than to applaud:
//   · Irregular, not every 10th item. A fixed beat becomes background noise within a
//     session; a variable gap (12–20 items) keeps it noticed without being expected.
//   · Rare. At least two minutes apart, at most three per visit — reserved, the way a
//     German teacher would nod rather than cheer.
//   · Concrete. It names what was done ("18 Wörter") instead of judging the person
//     ("Du bist toll!"): praise for effort and amount, not ability.
//   · Close to the end, it says how close ("Noch 4"): the last stretch is where people
//     drop off, and a visible finish line pulls (goal gradient).
//   · After a run of mistakes and then a right answer, it says that is how learning
//     works — the moment someone is most likely to feel bad is the one worth a word.
//   · Once per visit, after a good while, the one tip that actually makes words stay:
//     come back tomorrow (spacing).
//
// Everything is a no-op when the mascots are switched off (mascotPrefs.js). Counts live in
// sessionStorage: a new visit starts fresh. Styles: src/styles/mascot-celebrate.css.
import { mascotSvg } from "./mascots.js";
import { mascotsEnabled } from "./mascotPrefs.js";
import { t } from "./uiText.js";

const KEY = "da-nudge";
const GAP_MS = 2 * 60 * 1000;
const MAX_PER_VISIT = 3;
const SHOW_MS = 4800;
const MASCOT = { aussprache: "quaki", wortschatz: "hamsti", grammatik: "regi" };

// Two ways to say "that many, fine" per area, picked at random: the same sentence twice in
// a visit reads like a machine.
const COUNT = {
  aussprache: [
    ["nudge.count.aussprache.1", "{n} Wörter gehört. Ordentlich."],
    ["nudge.count.aussprache.2", "{n} Wörter. Ruhig weiter so."],
  ],
  wortschatz: [
    ["nudge.count.wortschatz.1", "{n} Karten. Läuft."],
    ["nudge.count.wortschatz.2", "{n} Karten geschafft. Gleichmäßig weiter."],
  ],
  grammatik: [
    ["nudge.count.grammatik.1", "{n} Aufgaben. Sauber gearbeitet."],
    ["nudge.count.grammatik.2", "{n} Aufgaben. Das sitzt langsam."],
  ],
};
const GOAL = ["nudge.goal", "Noch {k}, dann ist das Thema durch."];
const RECOVER = ["nudge.recover", "Erst daneben, dann richtig. Genau so bleibt es hängen."];
const SPACING = ["nudge.spacing", "Morgen kurz wiederholen — dann bleibt es."];
const SPEAK = ["nudge.speak", "Sprich laut mit. Der Mund lernt mit."];

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null") || fresh(); } catch { return fresh(); }
}
function fresh() {
  return { n: 0, per: {}, since: 0, next: gap(), shown: 0, last: 0, wrong: 0, goals: [], spacing: false, speak: false };
}
function save(s) { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
function gap() { return 12 + Math.floor(Math.random() * 9); }

let el = null;
let timer = 0;
function hide() {
  if (!el) return;
  const out = el;
  el = null;
  out.classList.add("mn-leave");
  setTimeout(() => out.remove(), 260);
}

function show(area, [key, de], vars) {
  if (typeof document === "undefined") return;
  clearTimeout(timer);
  el?.remove();
  el = document.createElement("div");
  el.className = "mn-nudge";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `<span class="mn-who" aria-hidden="true">${mascotSvg({ name: MASCOT[area] ?? "bruno", expr: "happy", size: 44, label: "" })}</span><p class="mn-say" data-mascot-part></p>`;
  el.querySelector(".mn-say").textContent = t(key, de, vars);
  el.addEventListener("click", hide);
  document.body.append(el);
  timer = setTimeout(hide, SHOW_MS);
}

/**
 * One item done in a trainer.
 * @param {{ area: "aussprache"|"wortschatz"|"grammatik", correct?: boolean, left?: number, set?: string }} step
 *   `correct` where there is a right and wrong (left out for "heard"), `left` how many are
 *   still to go in this set or topic, `set` which one (the "Noch 4" is said once per set).
 */
export function nudgeStep({ area, correct, left, set = "" } = {}) {
  if (!mascotsEnabled()) return;
  const s = load();
  s.n += 1;
  s.per = s.per || {};
  s.per[area] = (s.per[area] || 0) + 1;
  // What it names is this trainer's count; the pacing (gaps, the cap) is per visit.
  const mine = s.per[area];
  s.since += 1;
  const recovered = correct === true && s.wrong >= 2;
  if (correct === false) s.wrong += 1;
  else if (correct === true) s.wrong = 0;

  const now = Date.now();
  const quiet = s.shown >= MAX_PER_VISIT || now - s.last < GAP_MS;
  let say = null;
  let vars;
  if (!quiet) {
    const goalKey = `${area}:${set}`;
    if (recovered && s.since >= 4) {
      say = RECOVER;
    } else if (typeof left === "number" && left >= 3 && left <= 5 && mine >= 8 && !s.goals.includes(goalKey)) {
      say = GOAL; vars = { k: left };
      s.goals.push(goalKey);
    } else if (s.since >= s.next) {
      if (area === "aussprache" && !s.speak && mine >= 10) { say = SPEAK; s.speak = true; }
      else if (!s.spacing && s.n >= 35) { say = SPACING; s.spacing = true; }
      else { const opts = COUNT[area] ?? COUNT.wortschatz; say = opts[Math.floor(Math.random() * opts.length)]; vars = { n: mine }; }
    }
  }
  if (say) {
    show(area, say, vars);
    s.shown += 1;
    s.last = now;
    s.since = 0;
    s.next = gap();
  }
  save(s);
}
