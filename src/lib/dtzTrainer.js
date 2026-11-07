// The mock trainer (registry id "dtz"; DELE A2 for nationality, content-plan §2): nine parts,
// 45 scored items, plus a writing task chosen from two. Driven by the JSON in
// src/data/pruefungen/dtz/ and src/paid/pruefungen/dtz/.
//
// The parts are this trainer's own shape, not the structure of the real DELE A2, and the point
// bands are our own guide. The sets are our own; see their source notes.

import { getLang, loadDict, translate, onLangChange } from "./i18n.js";
import { recordResult } from "./fehler.js";
import { waitAttrs } from "./notReady.js";
import { flagItems, meldenLinkHtml, onMeldenClick } from "./meldung.js";
import { fingerprint } from "./meldungRef.js";
import { PAYWALL, APP, can } from "./access.js";
import { intent } from "./intent.js";
import { withBase } from "./paths.js";
import paidManifest from "../data/pruefungen/paid-manifest.json";

/* Module-level because the renderers here are module functions, not closures inside the
   mount. Everything this trainer paints goes through render(), so filling the dict and
   re-rendering is the whole integration. The exam CONTENT — transcripts, questions,
   options, statements — stays Spanish and carries lang="es": that is the exam being sat. */
let dict = {};
const t = (key, vars) => translate(dict, key, vars);

const STORAGE_PREFIX = "da-dtz-v1:";
const CLOCK_PREFIX = "da-dtz-clock-v1:";
/* Minutes on the clock for each skill in this mock (the table on the practice-set page shows
   the same figures). Our own, not the real exam's timings. */
const GROUP_MINUTES = { "Hören": 25, "Lesen": 45, "Schreiben": 30 };
let clockTick = 0; // one running interval, also when another set is mounted

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ------------------------------------------------------------------ state -- */

function freshState() {
  return { answers: {}, schreiben: { task: null, text: "", selfRate: null } };
}

function loadState(id) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.answers) return { ...freshState(), ...parsed };
  } catch {
    /* private mode or corrupt entry — start fresh */
  }
  return freshState();
}

function saveState(id, state) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(state));
  } catch {
    /* quota or private mode — the session still works, it just won't persist */
  }
}

/* ---------------------------------------------------------------- scoring -- */

/** Every part carries its scored ids under one of three keys. */
export function qidsOfPart(part) {
  if (part.items) return part.items.map((i) => i.id);
  if (part.groups) return part.groups.flatMap((g) => g.questions.map((q) => q.id));
  if (part.texts) return part.texts.flatMap((t) => t.questions.map((q) => q.id));
  return [];
}

export function allQids(data) {
  return data.parts.flatMap(qidsOfPart);
}

/** Our own bands, not a DELE score: listening and reading together, out of 45. */
export function stufeFor(score) {
  if (score >= 33) return { stufe: t("dtz.stufe.b1"), cls: "is-b1" };
  if (score >= 20) return { stufe: t("dtz.stufe.a2"), cls: "is-a2" };
  return { stufe: t("dtz.stufe.low"), cls: "is-low" };
}

export function wordCount(s) {
  const t = (s || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/* ------------------------------------------------------------------ clock -- */

/* One countdown per skill, like pruefungEngine's moduleTimer: optional, it survives a reload
   and it never blocks. At 0 it says so and the learner decides. Moving to another skill pauses
   the one you left. */
function mountClock(box, setId, groupOf) {
  clearInterval(clockTick);
  if (!box) return { paint() {}, clear() {} };
  const key = CLOCK_PREFIX + setId;
  let all = {};
  try { all = JSON.parse(localStorage.getItem(key)) || {}; } catch { /* start fresh */ }
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(all)); } catch { /* still works */ } };
  const slot = (g) => (all[g] ??= { left: GROUP_MINUTES[g] * 60, since: null });
  const leftNow = (c) => Math.max(0, c.since ? c.left - Math.floor((Date.now() - c.since) / 1000) : c.left);
  const stop = (c) => { c.left = leftNow(c); c.since = null; };

  box.innerHTML = `<div class="ps-timer"><span class="ps-timer-label"></span><span class="ps-timer-clock"></span><button type="button" class="ps-timer-btn"></button><button type="button" class="ps-timer-reset"></button></div>`;
  const [label, clock, btn, reset] = box.firstChild.children;
  let shown = null;

  function paint() {
    const g = groupOf();
    if (shown && shown !== g && slot(shown).since) { stop(slot(shown)); persist(); }
    shown = g;
    const c = slot(g);
    const total = GROUP_MINUTES[g] * 60;
    const left = leftNow(c);
    if (left === 0 && c.since) { stop(c); persist(); }
    label.textContent = t("ps.timer.label", { m: t(SKILL_KEY[g]), n: GROUP_MINUTES[g] });
    clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    clock.classList.toggle("is-out", left === 0);
    btn.textContent = t(c.since ? "ps.timer.pause" : left === total ? "ps.timer.start" : left === 0 ? "ps.timer.again" : "ps.timer.resume");
    reset.textContent = t("ps.timer.reset");
  }
  btn.addEventListener("click", () => {
    const g = groupOf();
    const c = slot(g);
    if (c.since) stop(c);
    else {
      if (leftNow(c) === 0) c.left = GROUP_MINUTES[g] * 60;
      c.since = Date.now();
    }
    persist();
    paint();
  });
  reset.addEventListener("click", () => {
    delete all[groupOf()];
    persist();
    paint();
  });
  clockTick = setInterval(() => { if (box.isConnected) paint(); }, 1000);
  return {
    paint,
    clear() { all = {}; persist(); paint(); },
  };
}

/* --------------------------------------------------------------- renderers -- */

function optionRow(qid, options, given, solved, correctIdx) {
  return options
    .map((opt, i) => {
      const picked = given === String(i);
      let cls = "";
      if (solved) {
        if (i === correctIdx) cls = "is-solved";
        else if (picked) cls = "is-wrongpick";
      } else if (picked) cls = "is-selected";
      return `<button type="button" class="dtz-opt ${cls}" lang="es" data-q="${qid}" data-v="${i}" ${solved ? "disabled" : ""}><strong>${"abc"[i]}</strong>${escapeHtml(opt)}</button>`;
    })
    .join("");
}

function tfRow(qid, given, solved, correct) {
  return ["richtig", "falsch"]
    .map((v) => {
      const picked = given === v;
      let cls = "";
      if (solved) {
        if (v === correct) cls = "is-solved";
        else if (picked) cls = "is-wrongpick";
      } else if (picked) cls = "is-selected";
      return `<button type="button" class="dtz-opt dtz-opt--tf ${cls}" data-q="${qid}" data-v="${v}" ${solved ? "disabled" : ""}>${escapeHtml(t(v === "richtig" ? "dtz.tf.true" : "dtz.tf.false"))}</button>`;
    })
    .join("");
}

/* The JSON stores each part as one string, "Hören · Teil 1", because that is what the
   exam calls it. Rather than restructure the data — which several people are editing —
   the two words that are chrome are recovered here and translated; anything that does not
   match the shape is left exactly as authored. */
const PART_LABEL_RE = /^(Hören|Lesen|Schreiben) *· *Teil *([0-9]+)$/;
const SKILL_KEY = { "Hören": "skill.hoeren", "Lesen": "skill.lesen", "Schreiben": "skill.schreiben" };
/* A part's title ("Ansagen am Telefon … verstehen") says what the part tests — exam
   information, so it is translated; the key is derived from the German title itself
   ("dtz.pt.<hash>"), so the data files stay as authored. The instruction under it is the
   exam's own German rubric and is left alone. */
function hashKey(prefix, s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return prefix + h.toString(16);
}
function tOr(key, fallback, vars) {
  return dict[key] != null ? translate(dict, key, vars) : fallback;
}
function partTitle(title) {
  return title ? tOr(hashKey("dtz.pt.", title), title) : "";
}
function partLabel(label) {
  const m = PART_LABEL_RE.exec(label || "");
  if (!m) return label;
  return t("dtz.tab.part", { skill: t(SKILL_KEY[m[1]]), n: m[2] });
}

/** The recording of a Hören text, where one was generated (dtz/uebungssatz.astro sets `audio`). */
function audioTag(src) {
  return src ? `<audio class="dtz-audio" controls preload="none" src="${escapeHtml(withBase(src))}"></audio>` : "";
}

function transcriptBlock(text, label) {
  return `<details class="dtz-transcript"><summary>${label || t("exam.readTranscript")}</summary><p lang="es">${escapeHtml(text)}</p></details>`;
}

function renderMcAudio(part, state, solved) {
  const ex = part.example
    ? `<div class="dtz-example">
         <span class="badge badge-neutral">${escapeHtml(t("dtz.example"))}</span>
         ${audioTag(part.example.audio)}
         ${transcriptBlock(part.example.transcript)}
         <p class="dtz-q" lang="es">${escapeHtml(part.example.question)}</p>
         <div class="dtz-opts">${part.example.options.map((o, i) => `<span class="dtz-opt ${i === part.example.correct ? "is-solved" : ""}" lang="es"><strong>${"abc"[i]}</strong>${escapeHtml(o)}</span>`).join("")}</div>
       </div>`
    : "";
  const items = part.items
    .map((it) => {
      const a = state.answers[it.id];
      return `<div class="dtz-item">
        <div class="dtz-item-head"><span class="dtz-num">${it.id}</span>${transcriptBlock(it.transcript)}</div>
        ${audioTag(it.audio)}
        <p class="dtz-q" lang="es">${escapeHtml(it.question)}</p>
        <div class="dtz-opts">${optionRow(it.id, it.options, a?.given, solved, it.correct)}</div>
      </div>`;
    })
    .join("");
  return ex + items;
}

function renderDialog(part, state, solved) {
  return part.groups
    .map((g, gi) => {
      const lines = g.dialog.map(([who, said]) => `<p lang="es"><strong>${escapeHtml(who)}:</strong> ${escapeHtml(said)}</p>`).join("");
      const qs = g.questions
        .map((q) => {
          const a = state.answers[q.id];
          const body =
            q.type === "tf"
              ? tfRow(q.id, a?.given, solved, q.correct)
              : optionRow(q.id, q.options, a?.given, solved, q.correct);
          return `<div class="dtz-item">
            <p class="dtz-q" lang="es"><span class="dtz-num">${q.id}</span>${escapeHtml(q.question)}</p>
            <div class="dtz-opts ${q.type === "tf" ? "dtz-opts--tf" : ""}">${body}</div>
          </div>`;
        })
        .join("");
      // With a recording the dialogue is heard first and read after, so it starts folded.
      return `<div class="dtz-group">
        ${audioTag(g.audio)}
        <details class="dtz-transcript" ${gi === 0 && !g.audio ? "open" : ""}><summary>${escapeHtml(tOr("dtz.readDialog", `Read conversation ${gi + 1}`, { n: gi + 1 }))}</summary>${lines}</details>
        ${qs}
      </div>`;
    })
    .join("");
}

function renderStatementMatch(part, state, solved) {
  const keys = Object.keys(part.statements);
  const list = keys
    .map((k) => `<li><strong>${k}</strong> ${escapeHtml(part.statements[k])}</li>`)
    .join("");
  const ex = part.example
    ? `<div class="dtz-example">
         <span class="badge badge-neutral">${escapeHtml(t("dtz.example"))}</span>
         ${audioTag(part.example.audio)}
         ${transcriptBlock(part.example.transcript)}
         <p class="dtz-q" lang="es">${escapeHtml(t("dtz.solution"))} <strong>${part.example.answer}</strong></p>
       </div>`
    : "";
  const items = part.items
    .map((it) => {
      const a = state.answers[it.id];
      const opts = keys
        .map((k) => {
          const picked = a?.given === k;
          let cls = "";
          if (solved) {
            if (k === it.correct) cls = "is-solved";
            else if (picked) cls = "is-wrongpick";
          } else if (picked) cls = "is-selected";
          return `<button type="button" class="dtz-opt dtz-opt--letter ${cls}" data-q="${it.id}" data-v="${k}" ${solved ? "disabled" : ""}>${k}</button>`;
        })
        .join("");
      return `<div class="dtz-item">
        <div class="dtz-item-head"><span class="dtz-num">${it.id}</span>${transcriptBlock(it.transcript, escapeHtml(t("dtz.whatSaid")))}</div>
        ${audioTag(it.audio)}
        <div class="dtz-opts dtz-opts--letters">${opts}</div>
      </div>`;
    })
    .join("");
  return `<div class="dtz-statements" lang="es"><ul>${list}</ul></div>${ex}${items}`;
}

function renderToc(part, state, solved) {
  const toc = part.toc
    // `c`, not `t`: the module-level t() is the translator, and a map parameter named
    // `t` would shadow it inside this template.
    .map((c) => `<li><strong>${c.label ?? t("dtz.chapter", { n: c.n })} — ${escapeHtml(c.title)}</strong><span>${escapeHtml(c.desc)}</span></li>`)
    .join("");
  const ex = part.example
    ? `<div class="dtz-example"><span class="badge badge-neutral">${escapeHtml(t("dtz.example"))}</span><p class="dtz-q" lang="es">${escapeHtml(part.example.question)}</p>
         <div class="dtz-opts">${part.example.options.map((o, i) => `<span class="dtz-opt ${i === part.example.correct ? "is-solved" : ""}" lang="es"><strong>${"abc"[i]}</strong>${escapeHtml(o)}</span>`).join("")}</div></div>`
    : "";
  const items = part.items
    .map((it) => {
      const a = state.answers[it.id];
      return `<div class="dtz-item">
        <p class="dtz-q" lang="es"><span class="dtz-num">${it.id}</span>${escapeHtml(it.question)}</p>
        <div class="dtz-opts">${optionRow(it.id, it.options, a?.given, solved, it.correct)}</div>
      </div>`;
    })
    .join("");
  return `<div class="dtz-toc" lang="es"><p class="dtz-toc-head">${escapeHtml(part.tocHeading)}</p><ol>${toc}</ol></div>${ex}${items}`;
}

function renderAds(part, state, solved) {
  const keys = Object.keys(part.ads);
  const ads = keys
    .map((k) => `<div class="dtz-ad"><span class="dtz-ad-key">${k}</span><strong>${escapeHtml(part.ads[k].title)}</strong><p>${escapeHtml(part.ads[k].body)}</p></div>`)
    .join("");
  // "x" = no matching ad. The real exam always includes one such situation.
  const choices = [...keys, "x"];
  const items = part.items
    .map((it) => {
      const a = state.answers[it.id];
      const opts = choices
        .map((k) => {
          const picked = a?.given === k;
          let cls = "";
          if (solved) {
            if (k === it.correct) cls = "is-solved";
            else if (picked) cls = "is-wrongpick";
          } else if (picked) cls = "is-selected";
          return `<button type="button" class="dtz-opt dtz-opt--letter ${cls}" data-q="${it.id}" data-v="${k}" ${solved ? "disabled" : ""}>${k === "x" ? escapeHtml(t("dtz.none")) : k}</button>`;
        })
        .join("");
      return `<div class="dtz-item">
        <p class="dtz-q" lang="es"><span class="dtz-num">${it.id}</span>${escapeHtml(it.question)}</p>
        <div class="dtz-opts dtz-opts--letters">${opts}</div>
      </div>`;
    })
    .join("");
  return `<div class="dtz-ads" lang="es">${ads}</div>${items}`;
}

function renderTexts(part, state, solved) {
  return part.texts
    .map((t) => {
      const paras = t.paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      const qs = t.questions
        .map((q) => {
          const a = state.answers[q.id];
          const body =
            q.type === "tf"
              ? tfRow(q.id, a?.given, solved, q.correct)
              : optionRow(q.id, q.options, a?.given, solved, q.correct);
          return `<div class="dtz-item">
            <p class="dtz-q" lang="es"><span class="dtz-num">${q.id}</span>${escapeHtml(q.question)}</p>
            <div class="dtz-opts ${q.type === "tf" ? "dtz-opts--tf" : ""}">${body}</div>
          </div>`;
        })
        .join("");
      return `<div class="dtz-group">
        <div class="dtz-reading ${t.letter ? "dtz-reading--letter" : ""}" lang="es"><h4>${escapeHtml(t.title)}</h4>${paras}</div>
        ${qs}
      </div>`;
    })
    .join("");
}

function renderRegulative(part, state, solved) {
  const paras = part.paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const items = part.items
    .map((it) => {
      const a = state.answers[it.id];
      return `<div class="dtz-item">
        <p class="dtz-q" lang="es"><span class="dtz-num">${it.id}</span>${escapeHtml(it.question)}</p>
        <div class="dtz-opts dtz-opts--tf">${tfRow(it.id, a?.given, solved, it.correct)}</div>
      </div>`;
    })
    .join("");
  return `<div class="dtz-reading" lang="es"><h4>${escapeHtml(part.readingTitle)}</h4>${paras}</div>${items}`;
}

function renderLetterGaps(part, state, solved) {
  const text = part.letterSegments
    .map((seg) => {
      if (seg.text !== undefined) return escapeHtml(seg.text);
      const item = part.items[seg.blank];
      const a = state.answers[item.id];
      const filled = a?.given != null ? item.options[+a.given] : null;
      let cls = "";
      if (solved) cls = +a?.given === item.correct ? "is-correct" : "is-wrong";
      else if (filled) cls = "is-filled";
      return `<span class="dtz-gap ${cls}">${filled ? escapeHtml(filled) : `___ ${item.id} ___`}</span>`;
    })
    .join("");
  const items = part.items
    .map((it) => {
      const a = state.answers[it.id];
      return `<div class="dtz-item dtz-item--inline">
        <span class="dtz-num">${it.id}</span>
        <div class="dtz-opts">${optionRow(it.id, it.options, a?.given, solved, it.correct)}</div>
      </div>`;
    })
    .join("");
  const intro = part.letterIntro ? `<p class="dtz-q" lang="es">${escapeHtml(part.letterIntro)}</p>` : "";
  return `${intro}<div class="dtz-reading dtz-reading--letter dtz-letter" lang="es">${text}</div>${items}`;
}

const RENDERERS = {
  "mc-audio": renderMcAudio,
  dialog: renderDialog,
  "statement-match": renderStatementMatch,
  toc: renderToc,
  ads: renderAds,
  texts: renderTexts,
  regulative: renderRegulative,
  "letter-gaps": renderLetterGaps,
};

/** Correct answer of a question id, in the string form the state stores. */
function correctValue(data, qid) {
  for (const part of data.parts) {
    if (part.items) {
      const it = part.items.find((i) => i.id === qid);
      if (it) return typeof it.correct === "number" ? String(it.correct) : it.correct;
    }
    for (const g of part.groups ?? []) {
      const q = g.questions.find((q) => q.id === qid);
      if (q) return typeof q.correct === "number" ? String(q.correct) : q.correct;
    }
    for (const t of part.texts ?? []) {
      const q = t.questions.find((q) => q.id === qid);
      if (q) return typeof q.correct === "number" ? String(q.correct) : q.correct;
    }
  }
  return null;
}

/** Question text and readable answers of one item, for "Meine Fehler" (src/lib/fehler.js). */
function itemInfo(data, qid, given) {
  for (const part of data.parts) {
    const qs = part.items ?? part.groups?.flatMap((g) => g.questions) ?? part.texts?.flatMap((t) => t.questions) ?? [];
    const q = qs.find((x) => x.id === qid);
    if (!q) continue;
    const label = (v) => {
      if (v == null) return "";
      if (q.options) return q.options[+v] ?? v;
      if (part.ads) return v === "x" ? t("dtz.none") : `${v}: ${part.ads[v]?.title ?? ""}`;
      if (part.statements) return `${v}: ${part.statements[v] ?? ""}`;
      if (v === "richtig" || v === "falsch") return t(v === "richtig" ? "dtz.tf.true" : "dtz.tf.false");
      return v;
    };
    const name = partLabel(part.label);
    const prompt = q.question ?? t(part.type === "statement-match" ? "dtz.item.speaker" : "dtz.item.gap", { n: qid });
    return { prompt: `${name} · ${prompt}`, expected: label(correctValue(data, qid)), given: label(given) };
  }
  return null;
}

/* Results screen of a free set: one line to the paid sets, when there are any to sell
   (paywall on, web only, not already unlocked). Never on a paid set's own results. */
function upsell(_data) {
  // No payments yet (src/lib/backend.js): nothing to sell.
  return "";
}

/* ------------------------------------------------------------------ mount -- */

export function mountDtzTrainer(root, data, { onAnswer } = {}) {
  const state = loadState(data.id);
  const ids = allQids(data);
  const hoerenIds = ids.filter((i) => i <= 20);
  const lesenIds = ids.filter((i) => i > 20);
  let current = 0; // index into data.parts; data.parts.length === the Schreiben tab
  // A link may open one part: /nationality/dele-a2/practice-set#l5, #schreiben (the cards on /exams/traps).
  const hash = location.hash.slice(1);
  if (hash === "schreiben") current = data.parts.length;
  else if (data.parts.some((p) => p.key === hash)) current = data.parts.findIndex((p) => p.key === hash);
  let solved = false;

  const nav = root.querySelector("[data-dtz-nav]");
  const body = root.querySelector("[data-dtz-body]");
  const summary = root.querySelector("[data-dtz-summary]");
  const clock = mountClock(root.querySelector("[data-dtz-clock]"), data.id, () =>
    current === data.parts.length ? "Schreiben" : data.parts[current].group
  );

  // "Problem melden" (docs/problem-melden-tier0-v1.md): x:dtz/<set>/<n>. The link shows under
  // an item once it is answered (45 links on an open sitting would be clutter); dev: ⚑ per item.
  const meldungTarget = (qid) => {
    const info = itemInfo(data, qid, state.answers[qid]?.given);
    return info
      ? {
          ref: `x:dtz/${data.id}/${qid}`,
          fingerprint: fingerprint(info.prompt, info.expected),
          snapshot: () => ({ frage: info.prompt, loesung: info.expected, antwort: info.given || null }),
        }
      : null;
  };
  const qidOf = (el) => +(el.dataset.mfQ ?? el.querySelector("[data-q]")?.dataset.q);
  onMeldenClick(body, (b) => meldungTarget(+b.dataset.mfQ));
  flagItems(body, ".dtz-item", (el) => meldungTarget(qidOf(el)));

  function answeredCount(list) {
    return list.filter((id) => state.answers[id]).length;
  }
  function correctCount(list) {
    return list.filter((id) => state.answers[id]?.correct).length;
  }

  function renderNav() {
    const tabs = data.parts.map((p, i) => {
      const pids = qidsOfPart(p);
      const done = answeredCount(pids);
      return `<button type="button" class="dtz-tab ${i === current ? "is-active" : ""} ${done === pids.length ? "is-done" : ""}" data-tab="${i}">
        <span class="dtz-tab-label">${escapeHtml(partLabel(p.label))}</span>
        <span class="dtz-tab-count">${done}/${pids.length}</span>
      </button>`;
    });
    tabs.push(`<button type="button" class="dtz-tab ${current === data.parts.length ? "is-active" : ""}" data-tab="${data.parts.length}">
      <span class="dtz-tab-label">${escapeHtml(t("skill.schreiben"))}</span>
      <span class="dtz-tab-count">${state.schreiben.task ? "1/1" : "0/1"}</span>
    </button>`);
    nav.innerHTML = tabs.join("");
    nav.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        current = +b.dataset.tab;
        render();
        body.scrollIntoView({ block: "start", behavior: "smooth" });
      })
    );
  }

  function renderSchreiben() {
    const s = data.schreiben;
    const chosen = state.schreiben.task;
    const task = chosen === "A" ? s.taskA : chosen === "B" ? s.taskB : null;
    const wc = wordCount(state.schreiben.text);
    const picker = ["A", "B"]
      .map((k) => {
        const t = k === "A" ? s.taskA : s.taskB;
        return `<button type="button" class="dtz-opt ${chosen === k ? "is-selected" : ""}" data-task="${k}"><strong>${k}</strong>${escapeHtml(t.prompt.slice(0, 70))}…</button>`;
      })
      .join("");
    return `
      <p class="dtz-instruction">${escapeHtml(s.instruction)}</p>
      <div class="dtz-opts dtz-opts--tasks">${picker}</div>
      ${
        task
          ? `<div class="dtz-reading"><h4>${escapeHtml(task.label)}</h4><p>${escapeHtml(task.prompt)}</p>
               <ul class="dtz-points">${task.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>
             <textarea class="dtz-textarea" data-schreiben placeholder="${escapeHtml(t("dtz.writePlaceholder"))}">${escapeHtml(state.schreiben.text)}</textarea>
             <div class="dtz-wordcount ${wc >= 40 ? "is-ok" : ""}">${escapeHtml(t(wc < 40 ? "dtz.wordcount.under" : "dtz.wordcount.ok", { n: wc }))}</div>
             <p class="dtz-note">${escapeHtml(s.selfRateNote)}</p>
             <details class="dtz-transcript"><summary>${escapeHtml(t("dtz.modelAnswer"))}</summary><div class="dtz-reading dtz-reading--letter dtz-letter" lang="es">${escapeHtml(task.modelAnswer ?? "")}</div></details>
             <details class="dtz-transcript"><summary>${escapeHtml(t("dtz.checklist"))}</summary><ul class="dtz-points">${(task.checklist ?? []).map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul></details>`
          : ""
      }`;
  }

  function renderBody() {
    if (current === data.parts.length) {
      body.innerHTML = `<div class="dtz-part"><h3>${escapeHtml(t("skill.schreiben"))}</h3>${renderSchreiben()}</div>`;
      body.querySelectorAll("[data-task]").forEach((b) =>
        b.addEventListener("click", () => {
          state.schreiben.task = b.dataset.task;
          persist();
          render();
        })
      );
      const ta = body.querySelector("[data-schreiben]");
      ta?.addEventListener("input", (e) => {
        state.schreiben.text = e.target.value;
        // Live word count without re-rendering the textarea (that would eat the caret).
        const el = body.querySelector(".dtz-wordcount");
        const n = wordCount(e.target.value);
        if (el) {
          el.textContent = t(n < 40 ? "dtz.wordcount.under" : "dtz.wordcount.ok", { n });
          el.classList.toggle("is-ok", n >= 40);
        }
        persist();
      });
      return;
    }

    const part = data.parts[current];
    const renderPart = RENDERERS[part.type];
    body.innerHTML = `<div class="dtz-part">
      <div class="dtz-part-head">
        <span class="badge badge-info">${escapeHtml(SKILL_KEY[part.group] ? t(SKILL_KEY[part.group]) : part.group)}</span>
        <h3>${escapeHtml(partTitle(part.title))}</h3>
      </div>
      <p class="dtz-instruction">${escapeHtml(part.instruction)}</p>
      ${renderPart ? renderPart(part, state, solved) : ""}
    </div>`;
    body.querySelectorAll(".dtz-item").forEach((item) => {
      const qid = qidOf(item);
      if (qid && state.answers[qid]) item.insertAdjacentHTML("beforeend", meldenLinkHtml(`data-mf-q="${qid}"`));
    });

    body.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        const qid = +b.dataset.q;
        const given = b.dataset.v;
        // traffic-baseline: exam_start — the first answer of a fresh sitting.
        if (!Object.keys(state.answers).length) intent("exam_start", { exam: "dtz", set: data.id });
        state.answers[qid] = { given, correct: given === correctValue(data, qid) };
        persist();
        if (onAnswer) onAnswer(state.answers[qid].correct);
        const info = itemInfo(data, qid, given);
        if (info) recordResult({ source: `dtz-${data.id}`, itemId: qid, ...info, level: "A2", topic: `${t("dtzSet.heroExam")}: ${data.label}`.trim(), href: "/nationality/dele-a2/practice-set" }, state.answers[qid].correct);
        renderBody();
        renderNav();
        renderSummary();
      })
    );
  }

  function renderSummary() {
    const hAns = answeredCount(hoerenIds);
    const lAns = answeredCount(lesenIds);
    const total = ids.length;
    const answered = hAns + lAns;

    if (!solved) {
      summary.innerHTML = `
        <div class="dtz-progress">
          <div class="dtz-progress-bar"><span style="width:${(answered / total) * 100}%"></span></div>
          <span class="dtz-progress-label">${escapeHtml(t("dtz.progress", { n: answered, t: total }))}</span>
        </div>
        <div class="dtz-actions">
          <button type="button" class="quiz-btn quiz-btn--primary" data-dtz-check${waitAttrs(answered === 0 ? t("dtz.checkNone") : null)}>${escapeHtml(t("dtz.check"))}</button>
          <button type="button" class="vp-link-btn" data-dtz-reset>${escapeHtml(t("dtz.reset"))}</button>
        </div>`;
    } else {
      const h = correctCount(hoerenIds);
      const l = correctCount(lesenIds);
      const score = h + l;
      const { stufe, cls } = stufeFor(score);
      const rows = data.parts
        .map((p) => {
          const pids = qidsOfPart(p);
          return `<tr><td>${escapeHtml(partLabel(p.label))}</td><td>${correctCount(pids)} / ${pids.length}</td></tr>`;
        })
        .join("");
      summary.innerHTML = `
        <div class="dtz-result ${cls}">
          <div class="dtz-result-score"><strong>${score}</strong> / ${total}</div>
          <div class="dtz-result-stufe">${stufe}</div>
          <div class="dtz-result-split">${escapeHtml(t("dtz.split", { h, ht: hoerenIds.length, l, lt: lesenIds.length }))}</div>
        </div>
        <p class="dtz-note">${escapeHtml(t("dtz.scoringNote"))}</p>
        <div class="format-table-wrap">
          <table class="format-table"><thead><tr><th>${escapeHtml(t("dtz.th.part"))}</th><th>${escapeHtml(t("dtz.th.correct"))}</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        ${upsell(data)}
        ${score < total ? `<p class="dtz-note"><a href="${withBase("/my-mistakes")}">${escapeHtml(tOr("fehler.saved", `${total - score} mistakes saved: My mistakes`, { n: total - score }))}</a></p>` : ""}
        <div class="dtz-actions">
          <button type="button" class="vp-link-btn" data-dtz-reset>${escapeHtml(t("dtz.restart"))}</button>
        </div>`;
    }

    summary.querySelector("[data-dtz-check]")?.addEventListener("click", () => {
      solved = true;
      // traffic-baseline: exam_finish — set 1 is free, later sets are the paid mock pack.
      intent("exam_finish", { exam: "dtz", set: data.id, score_pct: Math.round((correctCount(ids) / ids.length) * 100) });
      render();
      summary.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    summary.querySelector("[data-dtz-reset]")?.addEventListener("click", () => {
      Object.assign(state, freshState());
      solved = false;
      persist();
      current = 0;
      clock.clear();
      render();
    });
  }

  function persist() {
    saveState(data.id, state);
  }

  function render() {
    renderNav();
    renderBody();
    renderSummary();
    clock.paint();
  }

  render();
  // The first paint runs before the dictionary lands, so it is repainted once it does and
  // again on every later switch. Built with innerHTML after i18n's applyToDom() pass, so
  // nothing here is reachable by data-i18n.
  loadDict(getLang()).then((d) => { dict = d; render(); });
  onLangChange((code, d) => { dict = d; render(); });
}
