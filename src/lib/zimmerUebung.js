// "Ein Zimmer einrichten" — exercise type `zimmer` in src/data/grammatik/<topic>.json.
//
// The Wechselpräpositionen partner sheet (Lektion 2, "Wohin sollen die Sachen?") as a
// one-person exercise: a task says where a thing goes ("Das Sofa soll unter das Fenster."),
// the learner drags it into the room — or taps it, then taps the place — and then says it
// twice: Wohin? (stellen/legen/hängen + Akkusativ) and Wo? (stehen/liegen/hängen + Dativ).
// The room fills up round by round, so each placed thing is the reference for later ones.
//
// The rounds (task + the two sentences) are data; the room and the things are drawings,
// so they live here. The sentence syntax is in ./zimmerSaetze.js.
//
// Mobile first: drag works with a finger (pointer events), and tap-tap does the same job for
// anyone who cannot or will not drag, including keyboard users (the places are buttons).

import { waitAttrs } from "./notReady.js";
import { t } from "./uiText.js";
import { mascotHop } from "./mascotCelebrate.js";
import { parseSentence, gapsOf, filled, solved } from "./zimmerSaetze.js";

const W = 400;
const H = 300;

// box = where the thing sits in the room's viewBox [x, y, w, h]; the drawing below has the
// viewBox 0 0 w h. z = drawing order (the plant stands behind the armchair). needs = what
// has to be in the room before its place is offered (the pillows go on the sofa).
const THINGS = {
  vorhaenge: { name: "die Vorhänge", g: "pl", box: [160, 24, 120, 125], z: 1 },
  bild: { name: "das Bild", g: "das", box: [36, 72, 70, 55], z: 2, needs: "bett" },
  spiegel: { name: "der Spiegel", g: "der", box: [352, 110, 28, 50], z: 3 },
  pflanze: { name: "die Pflanze", g: "die", box: [298, 148, 34, 82], z: 4, needs: "sessel" },
  bett: { name: "das Bett", g: "das", box: [6, 180, 124, 72], z: 5 },
  lampe: { name: "die Lampe", g: "die", box: [134, 138, 28, 116], z: 6, needs: "bett" },
  sofa: { name: "das Sofa", g: "das", box: [166, 182, 116, 70], z: 7 },
  kissen: { name: "die Kissen", g: "pl", box: [186, 194, 76, 28], z: 8, needs: "sofa" },
  sessel: { name: "der Sessel", g: "der", box: [288, 196, 52, 56], z: 9, needs: "sofa" },
  teppich: { name: "der Teppich", g: "der", box: [158, 256, 132, 36], z: 10, needs: "sofa" },
};

const WOOD = "#8b5a3c";
const ART = {
  bett: `<rect x="0" y="4" width="11" height="66" rx="3" fill="${WOOD}"/>
    <rect x="113" y="30" width="11" height="40" rx="3" fill="${WOOD}"/>
    <rect x="8" y="46" width="110" height="16" rx="2" fill="#a06a47"/>
    <rect x="10" y="36" width="104" height="13" rx="3" fill="#f6f2ea" stroke="#d9d2c3"/>
    <rect x="40" y="31" width="76" height="20" rx="5" fill="#d94b4b"/>
    <rect x="40" y="31" width="76" height="6" rx="3" fill="#e97a6f"/>
    <rect x="13" y="26" width="25" height="13" rx="6" fill="#fff" stroke="#d9d2c3"/>`,
  lampe: `<path d="M6 0H22L28 26H0Z" fill="#f7f0dc" stroke="#cdbf9c"/>
    <rect x="13" y="26" width="2.5" height="84" fill="#8a8f98"/>
    <ellipse cx="14" cy="111" rx="11" ry="4" fill="#6b7078"/>`,
  sofa: `<rect x="10" y="0" width="96" height="40" rx="10" fill="#d9534f"/>
    <rect x="0" y="18" width="22" height="42" rx="9" fill="#c94541"/>
    <rect x="94" y="18" width="22" height="42" rx="9" fill="#c94541"/>
    <rect x="18" y="34" width="80" height="20" rx="5" fill="#e0625d"/>
    <line x1="58" y1="35" x2="58" y2="53" stroke="#c94541" stroke-width="1.5"/>
    <rect x="6" y="56" width="104" height="6" rx="2" fill="#b33c38"/>
    <rect x="10" y="62" width="5" height="8" fill="#5b3a29"/><rect x="101" y="62" width="5" height="8" fill="#5b3a29"/>`,
  kissen: `<rect x="0" y="6" width="28" height="22" rx="8" fill="#f2c94c" stroke="#d4a92c"/>
    <rect x="24" y="2" width="30" height="24" rx="8" fill="#7fb3e0" stroke="#5a92c4"/>
    <rect x="50" y="6" width="26" height="22" rx="8" fill="#a8d5a2" stroke="#7fb27a"/>`,
  vorhaenge: `<rect x="0" y="2" width="120" height="4" rx="2" fill="#6b7280"/>
    <path d="M3 6H34Q27 60 36 125H2Z" fill="#6ba368"/>
    <path d="M9 8V122M18 8V123M27 8Q22 60 30 124" stroke="#4f8a4d" stroke-width="1.5" fill="none"/>
    <path d="M117 6H86Q93 60 84 125H118Z" fill="#6ba368"/>
    <path d="M111 8V122M102 8V123M93 8Q98 60 90 124" stroke="#4f8a4d" stroke-width="1.5" fill="none"/>`,
  teppich: `<ellipse cx="66" cy="18" rx="65" ry="17" fill="#4f7cac"/>
    <ellipse cx="66" cy="18" rx="52" ry="12" fill="none" stroke="#e8d9a8" stroke-width="2"/>
    <ellipse cx="66" cy="18" rx="30" ry="6" fill="#6b95c2"/>`,
  bild: `<rect x="0" y="0" width="70" height="55" rx="2" fill="#7a5230"/>
    <rect x="6" y="6" width="58" height="43" fill="#cfe8f7"/>
    <path d="M6 49L26 24L38 36L48 27L64 45V49Z" fill="#5f9e6e"/>
    <circle cx="52" cy="15" r="5" fill="#f2c94c"/>`,
  spiegel: `<rect x="0" y="0" width="28" height="50" rx="4" fill="#5b3a29"/>
    <rect x="4" y="4" width="20" height="42" rx="2" fill="#dfe9f0"/>
    <path d="M8 18L18 8M8 28L20 16" stroke="#fff" stroke-width="2"/>`,
  sessel: `<rect x="8" y="0" width="38" height="36" rx="9" fill="#e46b2e"/>
    <rect x="0" y="18" width="14" height="30" rx="6" fill="#cf5a20"/>
    <rect x="40" y="18" width="14" height="30" rx="6" fill="#cf5a20"/>
    <rect x="10" y="30" width="34" height="16" rx="5" fill="#ef7f45"/>
    <rect x="4" y="46" width="46" height="4" rx="2" fill="#b84d1b"/>
    <rect x="7" y="50" width="4" height="6" fill="#5b3a29"/><rect x="43" y="50" width="4" height="6" fill="#5b3a29"/>`,
  pflanze: `<path d="M17 62C10 40 2 30 4 14C12 26 15 40 17 62Z" fill="#3f8f4f"/>
    <path d="M17 62C24 40 32 30 30 12C22 26 19 40 17 62Z" fill="#4fa35e"/>
    <path d="M17 62C14 36 12 18 17 0C22 18 20 36 17 62Z" fill="#2f7a40"/>
    <path d="M7 62H27L24 82H10Z" fill="#c8643b"/>`,
};

// The room itself: wall with window and door, floor. Fixed, never dragged.
const ROOM = `
  <defs>
    <pattern id="zi-stripes" width="16" height="10" patternUnits="userSpaceOnUse">
      <rect width="16" height="10" fill="#eef4e6"/><rect width="5" height="10" fill="#e3ecd7"/>
    </pattern>
    ${Object.entries(ART).map(([k, a]) => `<symbol id="zi-${k}" viewBox="0 0 ${THINGS[k].box[2]} ${THINGS[k].box[3]}">${a}</symbol>`).join("")}
  </defs>
  <rect width="${W}" height="216" fill="url(#zi-stripes)"/>
  <rect y="216" width="${W}" height="${H - 216}" fill="#e2c9a0"/>
  <path d="M0 240H400M0 268H400M60 216L40 300M150 216L140 300M250 216L260 300M340 216L360 300" stroke="#d3b98d" stroke-width="1"/>
  <rect y="211" width="${W}" height="6" fill="#f7f3ea" stroke="#d8d0bf" stroke-width=".8"/>
  <g>
    <rect x="170" y="34" width="100" height="96" fill="#fff" stroke="#9aa5b1" stroke-width="1.5"/>
    <rect x="177" y="41" width="40" height="82" fill="#bfe0f5"/><rect x="223" y="41" width="40" height="82" fill="#bfe0f5"/>
    <path d="M177 72H217M223 72H263" stroke="#fff" stroke-width="3"/>
    <rect x="166" y="128" width="108" height="5" fill="#f2efe8" stroke="#9aa5b1" stroke-width=".8"/>
  </g>
  <g>
    <rect x="340" y="80" width="52" height="152" fill="#c8a27a" stroke="#9c7a55" stroke-width="1.5"/>
    <rect x="347" y="90" width="38" height="58" rx="2" fill="none" stroke="#b18c63"/>
    <rect x="347" y="160" width="38" height="62" rx="2" fill="none" stroke="#b18c63"/>
    <circle cx="384" cy="156" r="3" fill="#6b5338"/>
  </g>`;

// A place is the thing's own box, grown to at least MIN so a finger can hit it.
const MIN = 46;
function placeBox(key) {
  const [x, y, w, h] = THINGS[key].box;
  const pw = Math.max(w, MIN), ph = Math.max(h, MIN);
  return [x - (pw - w) / 2, y - (ph - h) / 2, pw, ph];
}
const pct = (v, of) => `${(v / of) * 100}%`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const L = {
  step: (n, total) => escapeHtml(t("zi.step", "Sache {n} von {total}", { n, total })),
  get drag() { return escapeHtml(t("zi.drag", "Ziehen Sie die Sache ins Zimmer – oder tippen Sie erst die Sache an, dann den Platz. Sie können auch eine andere Sache nehmen.")); },
  get pickPlace() { return escapeHtml(t("zi.pickPlace", "Und jetzt: Tippen Sie auf den Platz im Zimmer.")); },
  get task() { return escapeHtml(t("zi.task", "Auftrag")); },
  later: (name) => t("zi.later", "Erst muss {name} ins Zimmer.", { name }),
  get wrongPlace() { return escapeHtml(t("zi.wrongPlace", "✗ Da nicht. Lesen Sie den Auftrag noch einmal.")); },
  get hintPlace() { return escapeHtml(t("zi.hintPlace", "Der richtige Platz blinkt jetzt.")); },
  get placed() { return escapeHtml(t("zi.placed", "✓ Steht am richtigen Platz. Jetzt sagen Sie es:")); },
  get check() { return `<span data-i18n="quiz.check">${escapeHtml(t("quiz.check", "Prüfen"))}</span>`; },
  get next() { return escapeHtml(t("zi.next", "Nächste Sache")); },
  get finish() { return escapeHtml(t("zi.finish", "Fertig")); },
  get again() { return `<span data-i18n="vp.retry">${escapeHtml(t("vp.retry", "Nochmal"))}</span>`; },
  get correct() { return escapeHtml(t("quiz.correct", "✓ Richtig!")); },
  wrongIs: (a) => escapeHtml(t("vp.wrongIs", "✗ Richtig wäre: „{a}“", { a })),
  done: (n, total) => escapeHtml(t("zi.done", "Das Zimmer ist fertig! {n} von {total} Sätzen richtig.", { n, total })),
  get place() { return t("zi.place", "Platz"); },
  missing: (n) => n === 1
    ? t("zi.missingOne", "Noch 1 Lücke offen – tippen Sie dort ein Wort an.")
    : t("zi.missing", "Noch {n} Lücken offen – tippen Sie in jeder markierten Gruppe ein Wort an.", { n }),
};

export function mountZimmer(root, ex, notify) {
  const rounds = ex.rounds.map((r) => ({ ...r, parts: { a: parseSentence(r.wohin), b: parseSentence(r.wo) } }));
  // Tray order: by noun, not by round, so the next thing is never simply "the first one".
  const trayOrder = Object.keys(THINGS)
    .filter((k) => rounds.some((r) => r.item === k))
    .sort((a, b) => THINGS[a].name.split(" ")[1].localeCompare(THINGS[b].name.split(" ")[1], "de"));
  const given = {};
  let s;
  const fresh = () => ({ round: 0, placed: new Set(), done: new Set(), phase: "place", picks: { a: [], b: [] }, selected: null, msg: "", msgKind: "", misses: 0, score: 0, pop: null, nudge: false });
  s = fresh();

  const cur = () => rounds[s.round];
  const ready = (k) => !s.placed.has(k) && (!THINGS[k].needs || s.placed.has(THINGS[k].needs));
  const offered = () => trayOrder.filter(ready);
  const roundOf = (k) => rounds.findIndex((r) => r.item === k);
  // The learner picks the order: whichever thing they take up, its task is the one shown.
  // Untouched, the task is the first open round whose thing can go in already.
  const firstOpen = () => rounds.findIndex((r, i) => !s.done.has(i) && ready(r.item));
  function aim(k) {
    const i = roundOf(k);
    if (i < 0 || i === s.round) return;
    s.round = i;
    s.misses = 0;
    s.msg = "";
    s.msgKind = "";
  }

  function sceneHtml() {
    const things = Object.keys(THINGS)
      .filter((k) => s.placed.has(k))
      .sort((a, b) => THINGS[a].z - THINGS[b].z)
      .map((k) => {
        const [x, y, w, h] = THINGS[k].box;
        return `<use href="#zi-${k}" x="${x}" y="${y}" width="${w}" height="${h}" class="zi-thing${s.pop === k ? " is-pop" : ""}"/>`;
      }).join("");
    const places = s.phase === "place"
      ? offered().map((k, i) => {
        const [x, y, w, h] = placeBox(k);
        const hint = s.misses >= 2 && k === cur().item ? " is-hint" : "";
        return `<button type="button" class="zi-place${hint}" data-place="${k}" style="left:${pct(x, W)};top:${pct(y, H)};width:${pct(w, W)};height:${pct(h, H)}" aria-label="${escapeHtml(L.place)} ${i + 1}"></button>`;
      }).join("")
      : "";
    return `<div class="zi-room${s.selected ? " is-aiming" : ""}" data-zi-room>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Zimmer" lang="de">${ROOM}${things}</svg>
      <div class="zi-places">${places}</div>
    </div>`;
  }

  const icon = (k) => `<svg viewBox="0 0 ${THINGS[k].box[2]} ${THINGS[k].box[3]}" aria-hidden="true"><use href="#zi-${k}"/></svg>`;

  function trayHtml() {
    const left = trayOrder.filter((k) => !s.placed.has(k));
    return `<ul class="zi-tray" lang="de">${left.map((k) => `
      <li><button type="button" class="zi-item${s.selected === k || (s.round === roundOf(k)) ? " is-selected" : ""}${ready(k) ? "" : " is-later"}" data-item="${k}" aria-pressed="${s.selected === k}"${ready(k) ? "" : ` disabled title="${escapeHtml(L.later(THINGS[THINGS[k].needs].name))}"`}>
        <span class="zi-item-pic">${icon(k)}</span>
        <span class="zi-item-name"><span class="zi-item-art"><span class="zi-dot zi-dot--${THINGS[k].g}" aria-hidden="true"></span>${escapeHtml(THINGS[k].name.split(" ")[0])}</span>${escapeHtml(THINGS[k].name.split(" ")[1])}</span>
      </button></li>`).join("")}</ul>`;
  }

  function sentenceHtml(key, label) {
    const parts = cur().parts[key];
    const checked = s.phase === "checked";
    let g = 0;
    const body = parts.map((p) => {
      if (!p.gap) return escapeHtml(p.text);
      const idx = g++;
      const val = s.picks[key][idx];
      const pills = p.options.map((o) => {
        const chosen = val === o;
        const ok = o === p.answer;
        const cls = !checked ? (chosen ? "is-chosen" : "") : ok ? (chosen ? "is-correct" : "is-answer") : chosen ? "is-wrong" : "";
        return `<button type="button" class="vp-pill-opt ${cls}" data-pick="${key}:${idx}" data-val="${escapeHtml(o)}" ${checked ? "disabled" : ""}>${escapeHtml(o)}</button>`;
      }).join("");
      // After a tap on an unfinished Prüfen the open gaps stay marked until filled.
      return `<span class="vp-pills zi-gap${!val && !checked ? " is-open" : ""}${s.nudge && !val && !checked ? " is-missing" : ""}">${pills}</span>`;
    }).join("");
    const ok = checked && gapsOf(parts).every((p, i) => s.picks[key][i] === p.answer);
    const fb = checked ? `<span class="vp-feedback ${ok ? "is-correct" : "is-wrong"}">${ok ? L.correct : L.wrongIs(solved(parts))}</span>` : "";
    return `<div class="zi-sent${checked ? (ok ? " is-correct" : " is-wrong") : ""}" data-mitem="${s.round}${key}">
      <span class="zi-q zi-q--${key}">${label}</span>
      <p class="zi-line" lang="de">${body}</p>${fb}</div>`;
  }

  function render() {
    const r = cur();
    const total = rounds.length;
    let lower = "";
    if (s.phase === "done") {
      lower = `<div class="zi-done"><p class="vp-feedback ${s.score === total * 2 ? "is-correct" : ""}" data-zi-summary>${L.done(s.score, total * 2)}</p>
        <button type="button" class="vp-btn-check" data-zi-again>${L.again}</button></div>`;
    } else if (s.phase === "place") {
      lower = trayHtml();
    } else {
      const open = ["a", "b"].reduce((n, k) => n + gapsOf(r.parts[k]).filter((_, i) => !s.picks[k][i]).length, 0);
      const ready = s.phase === "say" && open === 0;
      lower = `<div class="zi-say">
        ${sentenceHtml("a", "Wohin?")}
        ${sentenceHtml("b", "Wo?")}
        <div class="vp-actions">
          ${s.phase === "say"
            // Never disabled: a tap on an unfinished one says what is missing (notReady.js).
            ? `<button type="button" class="vp-btn-check" data-zi-check${waitAttrs(ready ? null : L.missing(open), ".zi-gap.is-open")}>${L.check}</button>`
            : `<button type="button" class="vp-btn-check" data-zi-next>${s.done.size < total ? L.next : L.finish}</button>`}
        </div></div>`;
    }
    const task = s.phase === "done" ? "" : `
      <div class="zi-task" data-zi-task>
        <span class="zi-task-pic">${icon(r.item)}</span>
        <div class="zi-task-body">
          <span class="zi-step">${L.task} · ${L.step(Math.min(s.done.size + 1, total), total)}</span>
          <p class="zi-task-text" lang="de">${escapeHtml(r.task)}</p>
        </div>
      </div>`;
    const msg = s.phase === "place" ? (s.msg || (s.selected ? L.pickPlace : L.drag)) : s.phase === "say" ? L.placed : "";
    root.classList.add("zi");
    root.innerHTML = `${task}${sceneHtml()}
      <p class="zi-msg ${s.msgKind}" role="status"${msg ? "" : " hidden"}>${msg}</p>
      ${lower}`;
    s.pop = null;
    bind();
  }

  function bind() {
    root.querySelectorAll("[data-item]").forEach((b) => b.addEventListener("pointerdown", (e) => startDrag(e, b.dataset.item, b)));
    root.querySelectorAll("[data-item]").forEach((b) => b.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(b.dataset.item); }
    }));
    root.querySelectorAll("[data-place]").forEach((b) => b.addEventListener("click", () => { if (s.selected) drop(s.selected, b.dataset.place); }));
    root.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
      const [key, idx] = b.dataset.pick.split(":");
      s.picks[key][+idx] = b.dataset.val;
      render();
    }));
    root.querySelector("[data-zi-check]")?.addEventListener("click", check);
    root.querySelector("[data-zi-next]")?.addEventListener("click", next);
    root.querySelector("[data-zi-again]")?.addEventListener("click", () => { s = fresh(); render(); });
  }

  function select(k) {
    s.selected = s.selected === k ? null : k;
    if (s.selected) aim(k);
    s.msg = "";
    render();
    if (s.selected) root.querySelector(".zi-place")?.focus({ preventScroll: true });
  }

  /* Drag: a press that moves more than a few pixels is a drag; one that does not is a tap
     (select, then tap a place). The ghost follows the pointer; the room lights its places. */
  function startDrag(e, key, btn) {
    if (e.button !== 0) return;
    const x0 = e.clientX, y0 = e.clientY;
    let ghost = null;
    const room = root.querySelector("[data-zi-room]");
    btn.setPointerCapture?.(e.pointerId);
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        ghost = document.createElement("div");
        ghost.className = "zi-ghost";
        ghost.innerHTML = icon(key);
        document.body.append(ghost);
        room.classList.add("is-aiming");
        btn.classList.add("is-lifted");
        aim(key);
        const task = root.querySelector("[data-zi-task]");
        if (task) {
          task.querySelector(".zi-task-text").textContent = cur().task;
          task.querySelector(".zi-task-pic").innerHTML = icon(key);
          task.animate?.([{ transform: "scale(1.03)" }, { transform: "scale(1)" }], { duration: 200 });
        }
        root.querySelectorAll("[data-item]").forEach((b) => b.classList.toggle("is-selected", b === btn));
        const m = root.querySelector(".zi-msg");
        if (m) { m.className = "zi-msg"; m.textContent = ""; }
      }
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
      const over = placeAt(room, ev.clientX, ev.clientY);
      room.querySelectorAll("[data-place]").forEach((p) => p.classList.toggle("is-over", p.dataset.place === over));
    };
    const up = (ev) => {
      btn.removeEventListener("pointermove", move);
      btn.removeEventListener("pointerup", up);
      btn.removeEventListener("pointercancel", cancel);
      if (!ghost) { select(key); return; }
      ghost.remove();
      const over = placeAt(room, ev.clientX, ev.clientY);
      if (over) drop(key, over);
      else { s.selected = null; render(); }
    };
    const cancel = () => {
      btn.removeEventListener("pointermove", move);
      btn.removeEventListener("pointerup", up);
      btn.removeEventListener("pointercancel", cancel);
      ghost?.remove();
      render();
    };
    btn.addEventListener("pointermove", move);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", cancel);
  }

  /** The offered place under (or nearest to, within a finger's width) a screen point. */
  function placeAt(room, cx, cy) {
    const r = room.getBoundingClientRect();
    if (cx < r.left - 20 || cx > r.right + 20 || cy < r.top - 20 || cy > r.bottom + 20) return null;
    const x = ((cx - r.left) / r.width) * W, y = ((cy - r.top) / r.height) * H;
    let best = null, bestD = 24, bestA = Infinity;
    for (const k of offered()) {
      const [bx, by, bw, bh] = placeBox(k);
      const d = Math.hypot(Math.max(bx - x, 0, x - bx - bw), Math.max(by - y, 0, y - by - bh));
      const a = bw * bh;
      // Inside two places (rare): the smaller one is the one aimed at.
      if (d < bestD || (d === bestD && a < bestA)) { best = k; bestD = d; bestA = a; }
    }
    return best;
  }

  function drop(key, place) {
    const want = cur().item;
    s.selected = null;
    if (key !== want) {
      aim(key);
      return drop(key, place);
    } else if (place !== want) {
      s.misses++;
      s.msg = s.misses >= 2 ? `${L.wrongPlace} ${L.hintPlace}` : L.wrongPlace;
      s.msgKind = "is-wrong";
    } else {
      s.placed.add(key);
      s.pop = key;
      s.phase = "say";
      s.msg = "";
      s.msgKind = "";
    }
    render();
    if (s.phase === "place") {
      const m = root.querySelector(".zi-msg");
      m?.animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
    }
  }

  function check() {
    const r = cur();
    // Not everything picked yet: mark the open gaps and say how many, instead of checking.
    if (["a", "b"].some((k) => gapsOf(r.parts[k]).some((_, i) => !s.picks[k][i]))) return;
    s.nudge = false;
    let all = true;
    for (const key of ["a", "b"]) {
      const parts = r.parts[key];
      const picks = s.picks[key];
      const ok = gapsOf(parts).every((p, i) => picks[i] === p.answer);
      all &&= ok;
      if (ok) s.score++;
      const id = `${s.round}${key}`;
      given[id] = filled(parts, picks);
      notify(ok, { itemId: id, prompt: filled(parts, []), expected: solved(parts), given: given[id] });
    }
    s.phase = "checked";
    s.done.add(s.round);
    render();
    const fb = root.querySelector(".zi-say .vp-actions");
    mascotHop(fb, all, "regi");
  }

  function next() {
    if (s.done.size >= rounds.length) {
      s.phase = "done";
      render();
      const sum = root.querySelector("[data-zi-summary]");
      mascotHop(sum, s.score === rounds.length * 2, "regi");
      return;
    }
    s.round = firstOpen();
    s.phase = "place";
    s.picks = { a: [], b: [] };
    s.nudge = false;
    s.misses = 0;
    s.msg = "";
    s.msgKind = "";
    render();
    root.querySelector("[data-zi-task]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // A tap on the unfinished Prüfen: the open gaps stay marked until they are filled.
  root.addEventListener("da:notready", (e) => {
    if (!e.target.closest("[data-zi-check]")) return;
    s.nudge = true;
    render();
  });

  render();
  return { given: (k) => given[k] ?? "" };
}
