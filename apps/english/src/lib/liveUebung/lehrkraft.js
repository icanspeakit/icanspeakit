// Live üben, the teacher's side: a panel over the topic page with the QR code and the PIN,
// and the board – one row per phone, one cell per exercise (right / answered of all). Above
// the board, step one: which of the page's exercises the class gets, as a checklist with
// their titles (left-out ones are greyed on the page underneath too). The panel folds into a
// chip – inside the lesson bar while a lesson runs, so there is one place to look – and the
// first fold says where it went.
// See protocol.js for how the two sides talk.
//
// One room per lesson rather than per page: the PIN is kept (localStorage, a few hours), so
// "Live üben" on the next topic reuses it, and the phones follow the teacher there.
import QRCode from "qrcode";
import { createBrowserSupabase } from "../supabase/browser.js";
import { t } from "../uiText.js";
import { topicPath } from "../routes.js";
import { withBase } from "../paths.js";
import { openAuswertung, ROOM_KEY } from "./auswertung.js";
import { kontextOf } from "./kontext.js";
import { auswertung, band, channelName, makePin, PIN_RE, pickOf, readWrong, rowOf, totalOf } from "./protocol.js";
import "../../styles/live-uebung.css";

const ROOM_MS = 4 * 60 * 60 * 1000;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function keptPin() {
  try {
    const r = JSON.parse(localStorage.getItem(ROOM_KEY) ?? "null");
    if (r && PIN_RE.test(r.pin) && Date.now() - r.at < ROOM_MS) return r.pin;
  } catch {}
  return null;
}
const keepPin = (pin) => { try { localStorage.setItem(ROOM_KEY, JSON.stringify({ pin, at: Date.now() })); } catch {} };
const dropPin = () => { try { localStorage.removeItem(ROOM_KEY); } catch {} };
// Which exercises the class gets, per topic: a page with 12 is too much for one practice phase.
const pickKey = (topic) => `da-lu-auswahl:${topic}`;
// The one-time note after the first fold (matches /^da-.*seen/, so the tour reset clears it).
const FOLD_SEEN = "da-lu-fold-seen";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

/**
 * One common mistake as a task: the practice sentence with the right answer in the gap,
 * what the class wrote instead, and a "Why?" to open at the board – the item's own
 * explanation, or the exercise's rule where the data has none. Numbered, so the class can
 * name it ("number 3").
 */
function mistakeHtml(m, a, exercises, nr) {
  const ex = exercises[m.ex];
  const num = `<b class="lu-err-nr">${nr}</b>`;
  const k = kontextOf(ex, m.item, (n) => t("lu.e.gapN", "Gap {n}", { n }));
  const where = `${t("lu.t.exN", "Exercise {n}", { n: m.ex + 1 })}${/^\d+$/.test(m.item) ? ` · ${t("lu.t.taskN", "task {n}", { n: +m.item + 1 })}` : ""}${ex?.title ? ` · ${esc(ex.title)}` : ""}`;
  const given = m.given.slice(0, 4).map(([g, n]) => `<span class="lu-err-g"><s>${esc(g === "(leer)" ? t("lu.e.empty", "(empty)") : g)}</s>${n > 1 ? ` <small>×${n}</small>` : ""}</span>`).join("");
  const n = `<div class="lu-err-n"><b>${m.n}</b><span>${t("lu.e.of", "of {n}", { n: a.count })}</span></div>`;
  if (!k) {
    return `<li>${n}<div class="lu-err-t">
      <p class="lu-err-p">${num}${m.prompt ? esc(m.prompt) : esc(ex?.title ?? "")}</p>
      ${m.expected || given ? `<p class="lu-err-a">${given ? `<span class="lu-err-l">${t("lu.e.written", "written")}</span>${given}` : ""}${m.expected ? `<span class="lu-err-l">${t("lu.e.correct", "correct")}</span><span class="lu-err-e">${esc(m.expected)}</span>` : ""}</p>` : ""}
      <p class="lu-err-w">${where}</p></div></li>`;
  }
  const why = k.why
    ? `<p>${esc(k.why)}</p>`
    : k.hint || k.rule
      ? `${k.hint ? `<p><span class="lu-err-l">${t("lu.e.help", "Hint")}</span> ${esc(k.hint)}</p>` : ""}${k.rule ? `<p><span class="lu-err-l">${t("lu.e.rule", "Rule")}</span> ${esc(k.rule)}</p>` : ""}`
      : "";
  return `<li>${n}<div class="lu-err-t">
    <p class="lu-err-s">${num}${esc(k.before)} <mark class="lu-err-e">${esc(k.gap)}</mark> ${esc(k.after)}</p>
    ${given ? `<p class="lu-err-a"><span class="lu-err-l">${t("lu.e.written", "written")}</span>${given}</p>` : ""}
    ${why ? `<details class="lu-why" open><summary>${t("lu.e.why", "Why?")}</summary>${why}</details>` : ""}
    <p class="lu-err-w">${where}</p></div></li>`;
}

/**
 * One learner: the share right of what they answered, and – so a high share on half the
 * tasks does not read like the same result as on all of them – a bar over all their tasks
 * (right, wrong, open) with the open ones named.
 */
function personHtml(s) {
  const wrong = s.answered - s.right;
  const open = s.total - s.answered;
  const seg = (n, cls) => (n && s.total ? `<i class="${cls}" style="width:${(n / s.total) * 100}%"></i>` : "");
  const line = !s.answered
    ? t("lu.e.noAnswer", "nothing answered yet")
    : `${t("lu.e.rightOf", "{r} of {a} correct", { r: s.right, a: s.answered })} · ${open ? `<b>${t("lu.e.openN", "{n} open", { n: open })}</b>` : t("lu.e.allDone", "all answered")}`;
  return `<li class="lu-cell--${band(s.right, s.answered)}"><span>${s.ab ? `<i class="lu-ab" title="${esc(t("lu.t.handedTitle", "Handed in"))}">✓</i> ` : ""}${esc(s.name)}</span>
      <b>${s.answered ? `${pct(s.right, s.answered)} %` : "–"}</b>
      <div class="lu-people-bar" aria-hidden="true">${seg(s.right, "r")}${seg(wrong, "f")}</div>
      <small>${line}</small></li>`;
}

/** The results: four numbers, the common mistakes, the exercises, the learners. */
function auswertungHtml(a, exercises = []) {
  if (!a.count) return `<p class="lu-eval-empty">${t("lu.e.nobody", "Nobody took part – there is nothing to evaluate.")}</p>`;
  const help = a.students.filter((s) => s.answered && s.right / s.answered < 0.5).length;
  const idle = a.students.filter((s) => !s.answered).length;
  const kpi = (n, label, cls = "") => `<div class="lu-kpi ${cls}"><b>${n}</b><span>${label}</span></div>`;
  const kpis = `<div class="lu-kpis">
    ${kpi(a.count, a.count === 1 ? t("lu.e.person1", "person taking part") : t("lu.e.personN", "people taking part"))}
    ${kpi(`${pct(a.answered, a.possible)} %`, t("lu.e.kpiAnswered", "of the tasks answered"))}
    ${kpi(`${pct(a.right, a.answered)} %`, t("lu.e.kpiRight", "of those correct"), `lu-cell--${band(a.right, a.answered)}`)}
    ${kpi(help, help === 1 ? t("lu.e.help1", "needs help (below 50 %)") : t("lu.e.helpN", "need help (below 50 %)"), help ? "lu-cell--schwach" : "")}
  </div>`;
  const top = a.mistakes.slice(0, 8);
  const mistakes = top.length
    ? `<ol class="lu-err">${top.map((m, i) => mistakeHtml(m, a, exercises, i + 1)).join("")}</ol>`
    : `<p class="lu-eval-none">${t("lu.e.noMistakes", "No open mistakes – everything that was wrong has been corrected.")}</p>`;
  const exRows = a.exercises.map((e) => {
    const q = pct(e.right, e.answered);
    return `<li><span class="lu-ex-t"><b>${e.index + 1}</b> ${esc(e.title)}</span>
      <span class="lu-ex-bar lu-cell--${band(e.right, e.answered)}"><i style="width:${q}%"></i></span>
      <span class="lu-ex-n">${e.answered ? t("lu.e.qRight", "{q} % correct", { q }) : "–"}<small>${t("lu.e.qAnswered", "{q} % answered", { q: pct(e.answered, e.possible) })}</small></span></li>`;
  }).join("");
  const people = a.students.map(personHtml).join("");
  return `${kpis}
    <div class="lu-eval-cols">
      <section class="lu-eval-box lu-eval-box--err"><h3>${t("lu.e.mistakes", "Common mistakes")}</h3><p class="lu-eval-how">${t("lu.e.mistakesHow", "What is still wrong right now, the most common first – with the sentence from the exercise. Under “Why?” you'll find the explanation for going through it on the board.")}</p>${mistakes}</section>
      <section class="lu-eval-box"><h3>${t("lu.e.exercises", "Exercises")}</h3><ul class="lu-ex">${exRows}</ul></section>
      <section class="lu-eval-box"><h3>${t("lu.e.learners", "Learners")}</h3><p class="lu-eval-how">${t("lu.e.handed", "{handed} of {count} have handed in (✓).", { handed: a.handedIn, count: a.count })} ${t("lu.e.learnersHow", "Those who need help are at the top. The percentages only count what was answered. The bar shows all tasks: green correct, red wrong, grey open.")}${idle ? ` ${t("lu.e.idle", "{n} without an answer.", { n: idle })}` : ""}</p><ul class="lu-people">${people}</ul></section>
    </div>
    <p class="lu-eval-note">${t("lu.e.note", "Reported by the class's own devices and not saved on a server. After “Close”, the button in the bottom right brings the results back as long as this tab is open. To keep them: print them.")}</p>`;
}

/**
 * @param data   the topic page's #topic-data (exercises, name, slug)
 * @param topic  the page's topic: what the phones open
 */
export function createLiveUebung(data, topic) {
  const exercises = data.exercises ?? [];
  const totals = exercises.map(totalOf);
  const title = data.name ?? topic;
  // Only exercises with something to count are offered.
  const countable = totals.map((_, i) => i).filter((i) => totals[i] > 0);
  let pick = null; // null = all
  try { pick = pickOf(JSON.parse(localStorage.getItem(pickKey(topic)) ?? "null"), exercises.length); } catch {}
  let open = null; // the running room (a promise: a second click while it opens waits for it)

  function start() {
    open ??= room();
    open.then((r) => r.show());
  }

  async function room() {
    const pin = keptPin() ?? makePin();
    keepPin(pin);
    const link = `${location.origin}${withBase(topicPath(topic))}?live=${pin}`;
    const shown = link.replace(/^https?:\/\//, "");

    // Opened from the lesson (?ut=1): the way back is the first button, not a ↩ in the bar
    // under the panel. The room stays open here; the class keeps practising.
    const fromLesson = new URLSearchParams(location.search).get("ut") === "1";
    const panel = document.createElement("div");
    panel.className = "lu-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("lu.name", "Live practice"));
    panel.innerHTML = `
      <header class="lu-head">
        <span class="lu-live" aria-hidden="true"></span>
        <div class="lu-head-t"><b>${t("lu.name", "Live practice")}</b><span>${esc(title)}</span></div>
        ${fromLesson ? `<button type="button" class="lu-btn lu-btn--main" data-lu-lesson>${t("lu.t.toLesson", "‹ Back to the lesson")}</button>` : ""}
        <button type="button" class="lu-btn" data-lu-code aria-pressed="false">${t("lu.t.codeSmall", "Smaller code")}</button>
        <button type="button" class="lu-btn" data-lu-fold>${t("lu.t.fold", "Fold away")}</button>
        <button type="button" class="lu-btn lu-btn--end" data-lu-end>${t("lu.t.end", "End and see results")}</button>
      </header>
      <div class="lu-body">
        <aside class="lu-join">
          <div class="lu-qr" data-lu-qr aria-hidden="true"></div>
          <p class="lu-join-how">${t("lu.t.joinHow", "Point your phone camera at the code – or open:")}</p>
          <p class="lu-url">${esc(shown)}</p>
          <p class="lu-pin"><span>PIN</span> <b>${pin.slice(0, 3)} ${pin.slice(3)}</b></p>
        </aside>
        <section class="lu-board" aria-live="polite">
          <p class="lu-count" data-lu-count></p>
          <details class="lu-pick" data-lu-pick-box open>
            <summary class="lu-pick-head">
              <span class="lu-pick-step" aria-hidden="true">1</span>
              <span class="lu-pick-h"><b>${t("lu.t.pickTitle", "What is the class practising?")}</b><span data-lu-pick-n></span></span>
              <span class="lu-pick-chev" aria-hidden="true"></span>
            </summary>
            <p class="lu-pick-how">${t("lu.t.pickHow", "Tap what to leave out. The phones only show the exercises with a tick.")}</p>
            <div class="lu-pick-list" data-lu-pick role="group" aria-label="${t("lu.t.pickAria", "Exercises for the class")}"></div>
          </details>
          <div class="lu-table-wrap" data-lu-table></div>
          <p class="lu-legend" data-lu-legend hidden>${t("lu.t.legend", "Columns = the page's exercises. In each cell: correct / tasks; the bar shows how much has been answered.")}
            <span class="lu-cell--gut">${t("lu.t.good", "80 % correct or more")}</span> <span class="lu-cell--mittel">${t("lu.t.mid", "50 % or more")}</span> <span class="lu-cell--schwach">${t("lu.t.low", "below that")}</span></p>
        </section>
      </div>`;
    document.body.append(panel);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "lu-chip";
    chip.hidden = true;
    chip.setAttribute("aria-label", t("lu.t.openChip", "Open live practice"));
    document.body.append(chip);
    const $ = (s) => panel.querySelector(s);

    QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((svg) => { $("[data-lu-qr]").innerHTML = svg; })
      .catch(() => {});

    // id → { name, ex, topic, ab, at } from the phones; who is online comes from presence.
    const phones = new Map();
    let pickFolded = false;
    let online = new Set();

    function draw() {
      // Who has not handed in stays on top: that is who the teacher is still waiting for.
      const here = [...phones.entries()].filter(([, p]) => p.topic === topic)
        .sort(([, a], [, b]) => Number(a.ab) - Number(b.ab) || a.name.localeCompare(b.name, "en"));
      const handed = here.filter(([, p]) => p.ab).length;
      const elsewhere = [...phones.values()].filter((p) => p.topic !== topic && online.has(p.id)).length;
      const n = here.filter(([id]) => online.has(id)).length;
      $("[data-lu-count]").textContent = n
        ? `${t("lu.t.present", "{n} taking part", { n })} · ${t("lu.t.handed", "{handed} of {all} handed in", { handed, all: here.length })}${elsewhere ? ` · ${t("lu.t.elsewhere", "{n} still on another page", { n: elsewhere })}` : ""}`
        : here.length ? t("lu.t.nobodyNow", "Nobody connected right now.") : t("lu.t.nobodyYet", "Nobody here yet. The class scans the code or opens the link.");
      let sumA = 0, sumT = 0;
      const rows = here.map(([id, p]) => {
        const r = rowOf(p.ex, totals, shownIdx());
        sumA += r.answered; sumT += r.total;
        const cells = r.cells.map((c) => `<td class="lu-cell lu-cell--${band(c.right, c.answered)}" title="${t("lu.t.cellTitle", "{r} correct of {a} answered ({t} tasks)", { r: c.right, a: c.answered, t: c.total })}">
            <span class="lu-cell-n">${c.answered ? `${c.right}/${c.total}` : "–"}</span>
            <i style="width:${c.total ? Math.round((c.answered / c.total) * 100) : 0}%"></i></td>`).join("");
        const share = r.total ? Math.round((r.answered / r.total) * 100) : 0;
        return `<tr class="${online.has(id) ? "" : "lu-off"}"><th scope="row">${p.ab ? `<i class="lu-ab" title="${esc(t("lu.t.handedTitle", "Handed in"))}">✓</i> ` : ""}${esc(p.name)}</th>${cells}
          <td class="lu-sum lu-cell--${band(r.right, r.answered)}"><b>${r.right}</b><span>/${r.total}</span><small>${share} %</small></td></tr>`;
      }).join("");
      $("[data-lu-table]").innerHTML = here.length ? `<table class="lu-table">
        <thead><tr><th scope="col">${t("lu.t.colName", "Name")}</th>${shownIdx().map((i) => `<th scope="col" title="${esc(exercises[i]?.title ?? "")}">${i + 1}</th>`).join("")}<th scope="col">${t("lu.t.colTotal", "Total")}</th></tr></thead>
        <tbody>${rows}</tbody></table>` : "";
      $("[data-lu-legend]").hidden = !here.length;
      // The first phone in: the checklist folds to its summary line and the board gets the room.
      if (here.length && !pickFolded) { pickFolded = true; $("[data-lu-pick-box]").open = false; }
      const share = sumT ? Math.round((sumA / sumT) * 100) : 0;
      chip.innerHTML = `<span class="lu-live" aria-hidden="true"></span> ${t("lu.name", "Live practice")} · ${t("lu.t.present", "{n} taking part", { n })}${here.length ? ` · ${t("lu.t.handedShort", "{handed} handed in", { handed })} · ${share} %` : ""}`;
    }

    const hostState = () => ({ role: "host", topic, title, ex: pick, at: Date.now() });
    const supabase = createBrowserSupabase();
    const ch = supabase.channel(channelName(pin), { config: { broadcast: { self: false }, presence: { key: "host" } } });
    let helloTimer = 0;
    let closing = null; // while "End" waits for the phones' last answers
    const hello = () => {
      clearTimeout(helloTimer);
      helloTimer = setTimeout(() => ch.send({ type: "broadcast", event: "hallo", payload: { topic, title, ex: pick } }), 250);
    };
    ch.on("broadcast", { event: "stand" }, ({ payload: p }) => {
      if (!p || typeof p.id !== "string" || typeof p.name !== "string") return;
      phones.set(p.id, { id: p.id, name: p.name.slice(0, 24), ex: p.ex && typeof p.ex === "object" ? p.ex : {}, f: readWrong(p.f), topic: String(p.topic ?? ""), ab: p.ab === true, at: Date.now() });
      draw();
      closing?.(p.id);
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const next = new Set(Object.keys(state).filter((k) => k !== "host"));
      const joined = [...next].some((id) => !online.has(id) || !phones.has(id));
      online = next;
      if (joined) hello();
      draw();
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track(hostState());
        hello();
      }
    });

    // The picker: one toggle per exercise, "Select all again" resets. The last one left stays
    // on (it shakes instead). A change goes to the phones at once (presence and "hallo").
    function shownIdx() { return pick ?? countable; }
    // "Deselect all": every box empties on this screen only; the class keeps its exercises
    // until the first tap, which then is the whole choice (zero exercises is never sent).
    let leer = false;
    const hier = new Set(); // left-out exercises the teacher opened on this screen anyway
    function drawPick() {
      const on = new Set(shownIdx());
      const tasks = shownIdx().reduce((n, i) => n + totals[i], 0);
      $("[data-lu-pick-n]").textContent = leer
        ? t("lu.t.pickNone", "Tap what the class should practise")
        : t("lu.t.pickN", "{on} of {all} exercises · {tasks} tasks", { on: on.size, all: countable.length, tasks });
      $("[data-lu-pick]").innerHTML = `
        ${countable.map((i) => `<button type="button" class="lu-pick-btn" data-lu-ex="${i}" aria-pressed="${!leer && on.has(i)}">
          <span class="lu-pick-box" aria-hidden="true"></span><span class="lu-pick-i">${i + 1}</span>
          <span class="lu-pick-title">${esc(exercises[i]?.title ?? t("lu.t.exN", "Exercise {n}", { n: i + 1 }))}</span>
          <span class="lu-pick-c" title="${t("lu.t.tasks", "Tasks")}">${totals[i]}</span></button>`).join("")}
        <span class="lu-pick-alls">
          ${pick || leer ? `<button type="button" class="lu-pick-all" data-lu-all>${t("lu.t.pickAll", "Select all again")}</button>` : ""}
          ${leer ? "" : `<button type="button" class="lu-pick-all" data-lu-none>${t("lu.t.pickNoneBtn", "Deselect all")}</button>`}
        </span>`;
      // The page underneath shows the same choice: left-out exercises greyed and labelled.
      exercises.forEach((_, i) => {
        const card = document.getElementById(`uebung-${i + 1}`);
        if (!card) return;
        card.classList.toggle("lu-aus", !on.has(i));
        card.classList.toggle("lu-hier", !on.has(i) && hier.has(i));
        card.dataset.luAus = hier.has(i) ? t("lu.t.onlyHere", "Only on your screen · not in live practice") : t("lu.t.notIn", "Not in live practice");
        // "Practise here anyway": the teacher can still use a left-out exercise on this screen
        // (e.g. to show it); the class still does not get it.
        if (!card.querySelector("[data-lu-hier]")) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "lu-hier-btn";
          b.dataset.luHier = String(i);
          b.textContent = t("lu.t.practiseHere", "Practise here anyway");
          b.addEventListener("click", () => { hier.add(i); drawPick(); });
          card.prepend(b);
        }
      });
    }
    function setPick(next) {
      pick = pickOf(next, exercises.length);
      try { pick ? localStorage.setItem(pickKey(topic), JSON.stringify(pick)) : localStorage.removeItem(pickKey(topic)); } catch {}
      drawPick();
      draw();
      // Once the clicking stops: ten quick toggles are one update, not ten presence calls.
      clearTimeout(pickTimer);
      pickTimer = setTimeout(() => {
        ch.track(hostState());
        hello();
      }, 600);
    }
    let pickTimer = 0;
    $("[data-lu-pick]").addEventListener("click", (e) => {
      if (e.target.closest("[data-lu-all]")) { leer = false; return setPick(null); }
      if (e.target.closest("[data-lu-none]")) { leer = true; return drawPick(); }
      const b = e.target.closest("[data-lu-ex]");
      if (!b) return;
      const i = Number(b.dataset.luEx);
      if (leer) { leer = false; return setPick([i]); }
      const cur = shownIdx();
      if (!cur.includes(i)) return setPick([...cur, i]);
      if (cur.length > 1) return setPick(cur.filter((x) => x !== i));
      b.animate([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], 180);
    });
    drawPick();
    draw();

    // Folding moves the panel into the chip in the corner and back out of it: the board
    // shrinks to where it will be (measured, so it lands on the chip), the chip springs in.
    // Without motion (prefers-reduced-motion) it simply swaps.
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    let moving = false;
    const intoChip = () => {
      const p = panel.getBoundingClientRect();
      const c = chip.getBoundingClientRect();
      return `translate(${c.left - p.left}px, ${c.top - p.top}px) scale(${c.width / p.width}, ${c.height / p.height})`;
    };
    // While a lesson runs the chip sits in its bar (leiste.js keeps a slot for it), else in
    // the corner. Asked at each fold: the bar may have come up after the panel.
    function placeChip() {
      const slot = document.querySelector(".ut-leiste [data-l-extra]");
      if (slot && chip.parentNode !== slot) { slot.append(chip); chip.classList.add("lu-chip--leiste"); }
      else if (!slot && chip.parentNode !== document.body) { document.body.append(chip); chip.classList.remove("lu-chip--leiste"); }
    }
    // The first fold on this device: a note at the chip says the class carries on, and where
    // the panel comes back from.
    function noteOnce() {
      try { if (localStorage.getItem(FOLD_SEEN) === "1") return; localStorage.setItem(FOLD_SEEN, "1"); } catch { return; }
      const note = document.createElement("div");
      note.className = "lu-note";
      note.setAttribute("role", "status");
      note.innerHTML = t("lu.t.foldNote", "<b>The class is still practising.</b> Open live practice again here: code, exercises and how far everyone is.");
      document.body.append(note);
      const c = chip.getBoundingClientRect();
      const w = note.offsetWidth, h = note.offsetHeight;
      const below = c.top < innerHeight / 2;
      note.style.left = Math.max(12, Math.min(c.left + c.width / 2 - w / 2, innerWidth - w - 12)) + "px";
      note.style.top = (below ? c.bottom + 12 : c.top - h - 12) + "px";
      note.style.setProperty("--lu-beak", Math.round(c.left + c.width / 2 - parseFloat(note.style.left) - 6) + "px");
      note.dataset.side = below ? "top" : "bottom";
      const away = () => { note.remove(); removeEventListener("pointerdown", away, true); };
      setTimeout(() => addEventListener("pointerdown", away, true), 0);
      setTimeout(away, 8000);
    }
    async function fold() {
      if (panel.hidden || moving) return;
      placeChip();
      chip.hidden = false;
      if (calm.matches) { panel.hidden = true; noteOnce(); return; }
      moving = true;
      chip.style.visibility = "hidden"; // measured, not seen yet
      panel.style.transformOrigin = "0 0";
      const body = panel.querySelector(".lu-body");
      body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
      await panel.animate(
        [{ transform: "none", borderRadius: "20px", opacity: 1 }, { transform: intoChip(), borderRadius: "999px", opacity: 0.35 }],
        { duration: 380, easing: "cubic-bezier(.4, 0, .2, 1)" },
      ).finished.catch(() => {});
      panel.hidden = true;
      body.getAnimations().forEach((a) => a.cancel());
      chip.style.visibility = "";
      chip.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.22, 1.4, .36, 1)" });
      moving = false;
      noteOnce();
    }
    async function show() {
      if (!panel.hidden || moving) return;
      if (calm.matches) { panel.hidden = false; chip.hidden = true; return; }
      moving = true;
      panel.hidden = false;
      panel.style.transformOrigin = "0 0";
      const from = intoChip();
      chip.hidden = true;
      const body = panel.querySelector(".lu-body");
      body.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 420 });
      await panel.animate(
        [{ transform: from, borderRadius: "999px", opacity: 0.35 }, { transform: "none", borderRadius: "20px", opacity: 1 }],
        { duration: 420, easing: "cubic-bezier(.22, 1, .36, 1)" },
      ).finished.catch(() => {});
      moving = false;
      $("[data-lu-fold]").focus();
    }
    $("[data-lu-fold]").addEventListener("click", fold);
    panel.querySelector("[data-lu-lesson]")?.addEventListener("click", () =>
      import("../unterricht/zurueck.js").then(({ toLesson }) => toLesson()));
    chip.addEventListener("click", show);
    $("[data-lu-code]").addEventListener("click", (e) => {
      const small = panel.classList.toggle("lu-panel--klein");
      e.currentTarget.setAttribute("aria-pressed", String(small));
      e.currentTarget.textContent = small ? t("lu.t.codeBig", "Bigger code") : t("lu.t.codeSmall", "Smaller code");
    });
    $("[data-lu-end]").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = t("lu.t.ending", "Collecting the results …");
      clearTimeout(helloTimer);
      // The phones check what is chosen but not checked and report once more. Whoever does not
      // answer in time (asleep, gone) counts as last heard.
      await new Promise((resolve) => {
        const heard = new Set();
        const timer = setTimeout(resolve, 2500);
        closing = (id) => {
          heard.add(id);
          if ([...online].every((x) => heard.has(x))) { clearTimeout(timer); resolve(); }
        };
        ch.send({ type: "broadcast", event: "abschluss", payload: {} }).catch(() => {});
        if (!online.size) { clearTimeout(timer); resolve(); }
      });
      closing = null;
      dropPin();
      try { await ch.send({ type: "broadcast", event: "ende", payload: {} }); } catch {}
      supabase.removeChannel(ch);
      chip.remove();
      document.querySelectorAll(".lu-aus, .lu-hier").forEach((el) => el.classList.remove("lu-aus", "lu-hier"));
      document.querySelectorAll("[data-lu-hier]").forEach((el) => el.remove());
      open = null;
      // The round in numbers, in its own panel, which the corner button brings back after
      // "Close" (auswertung.js). Nothing is stored on a server: printing is the way to keep it.
      const here = [...phones.values()].filter((p) => p.topic === topic);
      const a = auswertung(here, totals, shownIdx(), exercises.map((ex) => ex?.title));
      panel.remove();
      openAuswertung({ title, date: new Date().toLocaleDateString(document.documentElement.lang || "en"), html: auswertungHtml(a, exercises), pin, topic });
    });
    // Escape folds it: a panel over the page must have a way out from the keyboard.
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") fold(); });
    $("[data-lu-fold]").focus();
    return { show };
  }

  return { start };
}
