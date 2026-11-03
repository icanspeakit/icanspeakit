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
import { auswertung, band, channelName, makePin, PIN_RE, pickOf, readWrong, rowOf, totalOf } from "./protocol.js";
import { withBase } from "../paths.js";
import "../../styles/live-uebung.css";

const ROOM_KEY = "da-lu-raum";
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
// Which exercises the class gets, per topic: a page with 12 is too much for one Üben phase.
const pickKey = (topic) => `da-lu-auswahl:${topic}`;
// The one-time note after the first fold (matches /^da-.*seen/, so „Tour neu“ resets it).
const FOLD_SEEN = "da-lu-fold-seen";

/**
 * @param data   the topic page's #topic-data (exercises, name, slug)
 * @param topic  the page's URL slug: what the phones open
 */
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

/** The Auswertung: four numbers, the common mistakes, the exercises, the learners. */
function auswertungHtml(a) {
  if (!a.count) return `<p class="lu-eval-empty">Niemand hat mitgemacht – es gibt nichts auszuwerten.</p>`;
  const help = a.students.filter((s) => s.answered && s.right / s.answered < 0.5).length;
  const idle = a.students.filter((s) => !s.answered).length;
  const kpi = (n, label, cls = "") => `<div class="lu-kpi ${cls}"><b>${n}</b><span>${label}</span></div>`;
  const kpis = `<div class="lu-kpis">
    ${kpi(a.count, a.count === 1 ? "person taking part" : "people taking part")}
    ${kpi(`${pct(a.answered, a.possible)} %`, "of the tasks answered")}
    ${kpi(`${pct(a.right, a.answered)} %`, "of those correct", `lu-cell--${band(a.right, a.answered)}`)}
    ${kpi(help, help === 1 ? "braucht Hilfe (unter 50 %)" : "brauchen Hilfe (unter 50 %)", help ? "lu-cell--schwach" : "")}
  </div>`;
  const top = a.mistakes.slice(0, 8);
  const mistakes = top.length
    ? `<ol class="lu-err">${top.map((m) => {
      const ex = a.exercises.find((e) => e.index === m.ex);
      const where = `Exercise ${m.ex + 1}${/^\d+$/.test(m.item) ? ` · task ${+m.item + 1}` : ""}`;
      const given = m.given.slice(0, 4).map(([g, n]) => `<span class="lu-err-g"><s>${esc(g)}</s>${n > 1 ? ` <small>×${n}</small>` : ""}</span>`).join("");
      return `<li>
        <div class="lu-err-n"><b>${m.n}</b><span>of ${a.count}</span></div>
        <div class="lu-err-t">
          <p class="lu-err-p">${m.prompt ? esc(m.prompt) : esc(ex?.title ?? "")}</p>
          ${m.expected || given ? `<p class="lu-err-a">${given ? `<span class="lu-err-l">written</span>${given}` : ""}${m.expected ? `<span class="lu-err-l">correct</span><span class="lu-err-e">${esc(m.expected)}</span>` : ""}</p>` : ""}
          <p class="lu-err-w">${where}</p>
        </div></li>`;
    }).join("")}</ol>`
    : `<p class="lu-eval-none">No open mistakes – everything that was wrong has been corrected.</p>`;
  const exRows = a.exercises.map((e) => {
    const q = pct(e.right, e.answered);
    return `<li><span class="lu-ex-t"><b>${e.index + 1}</b> ${esc(e.title)}</span>
      <span class="lu-ex-bar lu-cell--${band(e.right, e.answered)}"><i style="width:${q}%"></i></span>
      <span class="lu-ex-n">${e.answered ? `${q} % correct` : "–"}<small>${pct(e.answered, e.possible)} % answered</small></span></li>`;
  }).join("");
  const people = a.students.map((s) => `<li class="lu-cell--${band(s.right, s.answered)}"><span>${esc(s.name)}</span>
      <b>${s.answered ? `${pct(s.right, s.answered)} %` : "–"}</b><small>${s.right}/${s.answered} correct</small></li>`).join("");
  return `${kpis}
    <div class="lu-eval-cols">
      <section class="lu-eval-box lu-eval-box--err"><h3>Common mistakes</h3><p class="lu-eval-how">What is still wrong right now, the most common first – good for going through on the board.</p>${mistakes}</section>
      <section class="lu-eval-box"><h3>Exercises</h3><ul class="lu-ex">${exRows}</ul></section>
      <section class="lu-eval-box"><h3>Lernende</h3><p class="lu-eval-how">Wer Hilfe braucht, steht oben.${idle ? ` ${idle} ohne Antwort.` : ""}</p><ul class="lu-people">${people}</ul></section>
    </div>
    <p class="lu-eval-note">Reported by the phones themselves and not saved anywhere: after “Close” the results are gone.</p>`;
}

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
    const link = `${location.origin}${withBase(`/${topic}`)}?live=${pin}`;
    const shown = link.replace(/^https?:\/\//, "");

    // Opened from the lesson (?ut=1): the way back is the first button, not a ↩ in the bar
    // under the panel. The room stays open here; the class keeps practising.
    const fromLesson = new URLSearchParams(location.search).get("ut") === "1";
    const panel = document.createElement("div");
    panel.className = "lu-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Live practice");
    panel.innerHTML = `
      <header class="lu-head">
        <span class="lu-live" aria-hidden="true"></span>
        <div class="lu-head-t"><b>Live practice</b><span>${esc(title)}</span></div>
        ${fromLesson ? `<button type="button" class="lu-btn lu-btn--main" data-lu-lesson>‹ Back to the lesson</button>` : ""}
        <button type="button" class="lu-btn" data-lu-code aria-pressed="false">Smaller code</button>
        <button type="button" class="lu-btn" data-lu-fold>Fold away</button>
        <button type="button" class="lu-btn lu-btn--end" data-lu-end>End</button>
      </header>
      <div class="lu-body">
        <aside class="lu-join">
          <div class="lu-qr" data-lu-qr aria-hidden="true"></div>
          <p class="lu-join-how">Point your phone camera at the code – or open:</p>
          <p class="lu-url">${esc(shown)}</p>
          <p class="lu-pin"><span>PIN</span> <b>${pin.slice(0, 3)} ${pin.slice(3)}</b></p>
        </aside>
        <section class="lu-board" aria-live="polite">
          <p class="lu-count" data-lu-count></p>
          <details class="lu-pick" data-lu-pick-box open>
            <summary class="lu-pick-head">
              <span class="lu-pick-step" aria-hidden="true">1</span>
              <span class="lu-pick-h"><b>What is the class practising?</b><span data-lu-pick-n></span></span>
              <span class="lu-pick-chev" aria-hidden="true"></span>
            </summary>
            <p class="lu-pick-how">Tap what to leave out. The phones only show the exercises with a tick.</p>
            <div class="lu-pick-list" data-lu-pick role="group" aria-label="Exercises for the class"></div>
          </details>
          <div class="lu-table-wrap" data-lu-table></div>
          <p class="lu-legend" data-lu-legend hidden>Columns = the page's exercises. In each cell: correct / tasks; the bar shows how much has been answered.
            <span class="lu-cell--gut">80 % correct or more</span> <span class="lu-cell--mittel">50 % or more</span> <span class="lu-cell--schwach">below that</span></p>
        </section>
      </div>`;
    document.body.append(panel);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "lu-chip";
    chip.hidden = true;
    chip.setAttribute("aria-label", "Open live practice");
    document.body.append(chip);
    const $ = (s) => panel.querySelector(s);

    QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((svg) => { $("[data-lu-qr]").innerHTML = svg; })
      .catch(() => {});

    // id → { name, ex, topic, at } from the phones; who is online comes from presence.
    const phones = new Map();
    let pickFolded = false;
    let online = new Set();

    function draw() {
      const here = [...phones.entries()].filter(([, p]) => p.topic === topic)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name, "de"));
      const elsewhere = [...phones.values()].filter((p) => p.topic !== topic && online.has(p.id)).length;
      const n = here.filter(([id]) => online.has(id)).length;
      $("[data-lu-count]").textContent = n
        ? `${n} taking part${elsewhere ? ` · ${elsewhere} still on another page` : ""}`
        : here.length ? "Nobody connected right now." : "Nobody here yet. The class scans the code.";
      let sumR = 0, sumA = 0, sumT = 0;
      const rows = here.map(([id, p]) => {
        const r = rowOf(p.ex, totals, shownIdx());
        sumR += r.right; sumA += r.answered; sumT += r.total;
        const cells = r.cells.map((c) => `<td class="lu-cell lu-cell--${band(c.right, c.answered)}" title="${c.right} correct of ${c.answered} answered (${c.total} tasks)">
            <span class="lu-cell-n">${c.answered ? `${c.right}/${c.total}` : "–"}</span>
            <i style="width:${c.total ? Math.round((c.answered / c.total) * 100) : 0}%"></i></td>`).join("");
        const pct = r.total ? Math.round((r.answered / r.total) * 100) : 0;
        return `<tr class="${online.has(id) ? "" : "lu-off"}"><th scope="row">${esc(p.name)}</th>${cells}
          <td class="lu-sum lu-cell--${band(r.right, r.answered)}"><b>${r.right}</b><span>/${r.total}</span><small>${pct} %</small></td></tr>`;
      }).join("");
      $("[data-lu-table]").innerHTML = here.length ? `<table class="lu-table">
        <thead><tr><th scope="col">Name</th>${shownIdx().map((i) => `<th scope="col" title="${esc(exercises[i]?.title ?? "")}">${i + 1}</th>`).join("")}<th scope="col">Total</th></tr></thead>
        <tbody>${rows}</tbody></table>` : "";
      $("[data-lu-legend]").hidden = !here.length;
      // The first phone in: the checklist folds to its summary line and the board gets the room.
      if (here.length && !pickFolded) { pickFolded = true; $("[data-lu-pick-box]").open = false; }
      const share = sumT ? Math.round((sumA / sumT) * 100) : 0;
      chip.innerHTML = `<span class="lu-live" aria-hidden="true"></span> Live practice · ${n} taking part${here.length ? ` · ${share} %` : ""}`;
    }

    const supabase = createBrowserSupabase();
    const ch = supabase.channel(channelName(pin), { config: { broadcast: { self: false }, presence: { key: "host" } } });
    let helloTimer = 0;
    const hello = () => {
      clearTimeout(helloTimer);
      helloTimer = setTimeout(() => ch.send({ type: "broadcast", event: "hallo", payload: { topic, title, ex: pick } }), 250);
    };
    ch.on("broadcast", { event: "stand" }, ({ payload: p }) => {
      if (!p || typeof p.id !== "string" || typeof p.name !== "string") return;
      phones.set(p.id, { id: p.id, name: p.name.slice(0, 24), ex: p.ex && typeof p.ex === "object" ? p.ex : {}, f: readWrong(p.f), topic: String(p.topic ?? ""), at: Date.now() });
      draw();
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
        await ch.track({ role: "host", topic, title, ex: pick, at: Date.now() });
        hello();
      }
    });

    // The picker: one toggle per exercise, „Alle“ resets. The last one left stays on (it
    // shakes instead). A change goes to the phones at once (presence and "hallo").
    function shownIdx() { return pick ?? countable; }
    function drawPick() {
      const on = new Set(shownIdx());
      const tasks = shownIdx().reduce((n, i) => n + totals[i], 0);
      $("[data-lu-pick-n]").textContent = `${on.size} of ${countable.length} exercises · ${tasks} tasks`;
      $("[data-lu-pick]").innerHTML = `
        ${countable.map((i) => `<button type="button" class="lu-pick-btn" data-lu-ex="${i}" aria-pressed="${on.has(i)}">
          <span class="lu-pick-box" aria-hidden="true"></span><span class="lu-pick-i">${i + 1}</span>
          <span class="lu-pick-title">${esc(exercises[i]?.title ?? `Exercise ${i + 1}`)}</span>
          <span class="lu-pick-c" title="Tasks">${totals[i]}</span></button>`).join("")}
        ${pick ? `<button type="button" class="lu-pick-all" data-lu-all>Select all again</button>` : ""}`;
      // The page underneath shows the same choice: left-out exercises greyed and labelled.
      exercises.forEach((_, i) => {
        const card = document.getElementById(`uebung-${i + 1}`);
        if (card) card.classList.toggle("lu-aus", !on.has(i));
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
        ch.track({ role: "host", topic, title, ex: pick, at: Date.now() });
        hello();
      }, 600);
    }
    let pickTimer = 0;
    $("[data-lu-pick]").addEventListener("click", (e) => {
      if (e.target.closest("[data-lu-all]")) return setPick(null);
      const b = e.target.closest("[data-lu-ex]");
      if (!b) return;
      const i = Number(b.dataset.luEx);
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
      note.innerHTML = `<b>The class is still practising.</b> Open live practice again here: code, exercises and how far everyone is.`;
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
      e.currentTarget.textContent = small ? "Bigger code" : "Smaller code";
    });
    $("[data-lu-end]").addEventListener("click", async () => {
      dropPin();
      try { await ch.send({ type: "broadcast", event: "ende", payload: {} }); } catch {}
      supabase.removeChannel(ch);
      chip.remove();
      document.querySelectorAll(".lu-aus").forEach((el) => el.classList.remove("lu-aus"));
      open = null;
      ended = true;
      showAuswertung();
    });
    // After „Beenden“: the round in numbers, then gone. Nothing is stored – printing it
    // („Drucken / als PDF“) is the way to keep it.
    let ended = false;
    function showAuswertung() {
      const here = [...phones.values()].filter((p) => p.topic === topic);
      const a = auswertung(here, totals, shownIdx(), exercises.map((ex) => ex?.title));
      panel.classList.remove("lu-panel--klein");
      panel.classList.add("lu-panel--eval");
      panel.innerHTML = `
        <header class="lu-head">
          <div class="lu-head-t"><b>Results</b><span>${esc(title)} · ${new Date().toLocaleDateString("en-GB")}</span></div>
          <button type="button" class="lu-btn" data-lu-print>Print / save as PDF</button>
          <button type="button" class="lu-btn${fromLesson ? "" : " lu-btn--main"}" data-lu-close>Close</button>
          ${fromLesson ? `<button type="button" class="lu-btn lu-btn--main" data-lu-lesson>‹ Back to the lesson</button>` : ""}
        </header>
        <div class="lu-eval">${auswertungHtml(a)}</div>`;
      panel.querySelector("[data-lu-print]").addEventListener("click", () => print());
      panel.querySelector("[data-lu-close]").addEventListener("click", () => panel.remove());
      // From the lesson, the round is over and so is this step: back there, the Auswertung
      // gone with it (printing it first is the way to keep it).
      panel.querySelector("[data-lu-lesson]")?.addEventListener("click", () => {
        panel.remove();
        import("../unterricht/zurueck.js").then(({ toLesson }) => toLesson());
      });
      panel.querySelector(fromLesson ? "[data-lu-lesson]" : "[data-lu-close]").focus();
    }
    // Escape folds it (a panel over the page must have a way out from the keyboard); on the
    // Auswertung it closes it.
    panel.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (ended) panel.remove();
      else fold();
    });
    $("[data-lu-fold]").focus();
    return { show };
  }

  return { start };
}
