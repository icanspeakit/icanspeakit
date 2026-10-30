/* The generic Übungssatz engine: one renderer per part type, driven by a set file in
 * src/data/pruefungen/saetze/ (shape: src/lib/exam/saetze.js, rules:
 * PRUEFUNGEN-A2-C1-TIERED-PROMPT.md). It sits on the same shell as every other trainer
 * (src/lib/examApp.js): one section per exam part, a result section at the end, answers in
 * "da-exam-v1:<setId>" so /fortschritt reads them like any other exam.
 *
 * Part types
 *   tf        richtig/falsch (or ja/nein via `labels`)       item: { id, statement, correct }
 *   mc        a/b/c(/d)                                     item: { id, question, options[], correct: index }
 *   match     pick from a pool of texts/people (+ "x")      item: { id, prompt, correct: "a" | "x" }
 *   gap-mc    gaps in a text, options per gap               item: { id, options[], correct: index }
 *   gap-bank  gaps in a text, one word bank                 item: { id, correct: "a" }
 *   schreiben tasks with word target, model, checklist      task: { id, … }
 *   sprechen  tasks with prep/speaking timer, model, list   task: { id, … }
 * A scored part may carry `texts[]` (reading) or `clips[]` (Hören, speaker turns). An item
 * with `text`/`clip` is shown under that text or clip; the rest follow the material.
 *
 * The exam CONTENT stays German (it is the exam being sat); the chrome goes through tx().
 */
import { mountExamApp } from "../examApp.js";
import { choiceCard, practiceToggle, sectionHeader, el, escapeHtml } from "./renderHelpers.js";
import { countCorrect, percent } from "./scoring.js";
import { tx } from "./i18n.js";
import { setWaiting } from "../notReady.js";
import { recordAttempt } from "../progress.js";
import { recordResult } from "../fehler.js";
import { idsOfPart, isScored, partsOf } from "./saetze.js";
import { flagElement, meldenLink } from "../meldung.js";
import { fingerprint } from "../meldungRef.js";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const TF_LABELS = { richtig: "Richtig", falsch: "Falsch", ja: "Ja", nein: "Nein", "nicht im text": "Steht nicht im Text" };
// The letter on each answer button; "nicht im Text" is the exams' own "x".
const TF_KEYS = { richtig: "r", falsch: "f", ja: "j", nein: "n", "nicht im text": "x" };

/* A typed short answer counts when it matches one of `accept` after the forgiving
   normalisation a marker would apply: case, spacing, a trailing full stop. */
const norm = (v) => String(v ?? "").toLowerCase().replace(/[„“"'.,;:!?]+$/g, "").replace(/\s+/g, " ").trim();

const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

/* ------------------------------------------------------------------- timer -- */

/* One countdown per module, like the exam's own clock: it survives switching parts and a
   reload, and it never blocks — at 0 it says so and the learner decides. Modules the exam
   times together (telc: Leseverstehen + Sprachbausteine, A2: Lesen + Schreiben) name the
   same `timer` and share one clock; `timerLabel` says so. */
function moduleTimer(setId, module) {
  const key = `da-exam-timer-v1:${setId}`;
  const all = store.get(key) || {};
  const slot = module.timer ?? module.key;
  const total = module.minutes * 60;
  const saved = all[slot] || { left: total, since: null };
  const leftNow = () => Math.max(0, saved.since ? saved.left - Math.floor((Date.now() - saved.since) / 1000) : saved.left);
  const persist = () => { all[slot] = saved; store.set(key, all); };

  const box = el("div", "ps-timer");
  const clock = el("span", "ps-timer-clock");
  const btn = el("button", "ps-timer-btn");
  btn.type = "button";
  const reset = el("button", "ps-timer-reset", escapeHtml(tx("ps.timer.reset", "Zurücksetzen")));
  reset.type = "button";
  box.append(el("span", "ps-timer-label", escapeHtml(tx("ps.timer.label", "{m} · {n} Min.", { m: module.timerLabel ?? module.name, n: module.minutes }))), clock, btn, reset);

  let tick = 0;
  function paint() {
    const left = leftNow();
    clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    clock.classList.toggle("is-out", left === 0);
    btn.textContent = saved.since ? tx("ps.timer.pause", "Pause") : left === total ? tx("ps.timer.start", "Zeit starten") : tx("ps.timer.resume", "Weiter");
    if (left === 0 && saved.since) { saved.left = 0; saved.since = null; persist(); }
  }
  btn.addEventListener("click", () => {
    if (saved.since) { saved.left = leftNow(); saved.since = null; }
    else { if (leftNow() === 0) saved.left = total; saved.since = Date.now(); }
    persist(); paint();
  });
  reset.addEventListener("click", () => { saved.left = total; saved.since = null; persist(); paint(); });
  paint();
  tick = setInterval(() => { if (!box.isConnected) clearInterval(tick); else paint(); }, 1000);
  return box;
}

/* A plain countdown for Sprechen (preparation, then speaking): not stored, one sitting. */
function countdown(label, minutes) {
  const box = el("div", "ps-timer ps-timer--small");
  const clock = el("span", "ps-timer-clock");
  const btn = el("button", "ps-timer-btn");
  btn.type = "button";
  box.append(el("span", "ps-timer-label", escapeHtml(label)), clock, btn);
  const total = Math.round(minutes * 60);
  let left = total, timer = 0;
  const paint = () => {
    clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    clock.classList.toggle("is-out", left === 0);
    btn.textContent = timer ? tx("ps.timer.pause", "Pause") : left === total ? tx("ps.timer.start", "Zeit starten") : left === 0 ? tx("ps.timer.again", "Nochmal") : tx("ps.timer.resume", "Weiter");
  };
  btn.addEventListener("click", () => {
    if (timer) { clearInterval(timer); timer = 0; paint(); return; }
    if (left === 0) left = total;
    timer = setInterval(() => {
      if (!box.isConnected) { clearInterval(timer); return; }
      left = Math.max(0, left - 1);
      if (left === 0) { clearInterval(timer); timer = 0; }
      paint();
    }, 1000);
    paint();
  });
  paint();
  return box;
}

/* ---------------------------------------------------------------- material -- */

function textBlock(t) {
  const box = el("article", "lese-text ps-text" + (t.kind ? " ps-text--" + t.kind : ""));
  if (t.label) box.appendChild(el("p", "lese-text-label", escapeHtml(t.label)));
  if (t.title) box.appendChild(el("h3", "lese-text-title", escapeHtml(t.title)));
  const body = el("div", "lese-text-body");
  for (const p of t.paras) body.appendChild(el("p", "", escapeHtml(p)));
  box.appendChild(body);
  if (t.source) box.appendChild(el("p", "ps-text-source", escapeHtml(t.source)));
  return box;
}

/* A Hören clip: the player (with the exam's play count as a guide, not a lock) and the
   transcript, which opens only once every item on the clip is answered. */
function clipBlock(set, clip, itemIds, ctx) {
  const box = el("div", "ps-clip");
  if (clip.title) box.appendChild(el("p", "lese-text-label", escapeHtml(clip.title)));
  const plays = clip.plays ?? 1;
  const row = el("div", "ps-clip-row");
  let played = 0;
  if (set.audio?.[clip.id]) {
    const audio = el("audio", "ps-audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = `/audio/pruefungen/${set.id}/${clip.id}.mp3`;
    const count = el("span", "ps-clip-plays");
    const paintCount = () => {
      count.textContent = played < plays
        ? tx("ps.clip.plays", "Im Test: {n}× hören", { n: plays })
        : tx("ps.clip.played", "{n}× gehört — im Test wäre jetzt Schluss", { n: played });
    };
    audio.addEventListener("ended", () => { played++; paintCount(); });
    paintCount();
    row.append(audio, count);
  } else {
    row.appendChild(el("p", "ps-clip-noaudio", escapeHtml(tx("ps.clip.noAudio", "Die Tonaufnahme folgt noch. Lies den Text unten und beantworte dann die Aufgaben."))));
  }
  box.appendChild(row);

  const script = el("details", "ps-transcript");
  script.appendChild(el("summary", "", escapeHtml(tx("exam.readTranscript", "Transkript lesen"))));
  const lines = el("div", "hoer-transcript");
  for (const turn of clip.script) {
    const who = clip.names?.[turn.s] ?? set.speakers?.[turn.s]?.name;
    lines.appendChild(el("p", "", (who ? "<b>" + escapeHtml(who) + ":</b> " : "") + escapeHtml(turn.t)));
  }
  script.appendChild(lines);
  const answered = () => itemIds.every((id) => ctx.state.answers[id]);
  // Without audio the transcript IS the task, so it is open from the start.
  if (!set.audio?.[clip.id]) script.open = true;
  script.hidden = !!set.audio?.[clip.id] && !answered();
  box.appendChild(script);
  box.reveal = () => { if (answered()) script.hidden = false; };
  return box;
}

/* ----------------------------------------------------------------- items -- */

/** Question and readable answers of one item, for "Meine Fehler" (src/lib/fehler.js). */
function fehlerInfo(part, item, given) {
  const type = item.type ?? part.type;
  const pool = part.type === "match" ? part.pool : part.bank;
  const label = (v) => {
    if (v == null) return "";
    if (type === "tf") {
      const k = TF_LABELS[v] ? v : Object.keys(TF_KEYS).find((x) => TF_KEYS[x] === v);
      return TF_LABELS[k] ?? String(v);
    }
    if (type === "mc" || type === "gap-mc") return item.options?.[typeof v === "number" ? v : LETTERS.indexOf(v)] ?? String(v);
    if (pool) return v === "x" ? part.none ?? "x" : `${v}: ${typeof pool[v] === "string" ? pool[v] : pool[v]?.title ?? ""}`;
    return Array.isArray(v) ? v[0] : String(v);
  };
  const expected = type === "write-in" ? item.accept?.[0] : label(item.correct);
  return { prompt: item.statement ?? item.question ?? item.prompt ?? `Lücke ${item.id}`, expected, given: label(given) };
}

/* Does every pool letter fit only once? Explicit `once`, else: no letter is the answer
   twice (the "Wer sagt das?" pools reuse their few people). */
function poolOnce(part) {
  if (part.once != null) return part.once;
  const keys = part.items.map((i) => i.correct).filter((k) => k !== "x");
  return new Set(keys).size === keys.length;
}

function itemCard(part, item, n, ctx, onDone, deferred) {
  const record = (given, correct) => {
    ctx.record(item.id, given, correct);
    recordAttempt({ skill: "pruefungen", correct, item: item.id });
    if (ctx.set) recordResult({ source: ctx.set.id, itemId: item.id, ...fehlerInfo(part, item, given), level: ctx.set.level, topic: `${ctx.set.exam} ${ctx.set.level} · ${ctx.set.title}`, href: `/${ctx.set.exam}/${ctx.set.slug}` }, correct);
    onDone?.();
  };
  const existing = ctx.state.answers[item.id];
  const qLabel = tx("ps.item", "Aufgabe {n}", { n });
  const meldung = ctx.set ? `x:${ctx.set.exam}/${ctx.set.id}/${item.id}`.toLowerCase() : null;
  // A part may mix item types (Goethe B1 Hören Teil 1: richtig/falsch and a/b/c per text).
  const type = item.type ?? part.type;

  if (type === "tf") {
    const labels = item.labels ?? part.labels ?? ["richtig", "falsch"];
    const options = labels.map((k) => ({ key: TF_KEYS[k], label: tx("ps.tf." + TF_KEYS[k], TF_LABELS[k]) }));
    return choiceCard({ qLabel, questionText: item.statement, options, correctKey: TF_KEYS[item.correct], existing, layout: labels.length === 2 ? "grid" : "list", onAnswer: record, meldung });
  }
  if (type === "write-in") return writeInCard(item, qLabel, existing, record, meldung);
  if (type === "mc" || type === "gap-mc") {
    const options = item.options.map((o, i) => ({ key: LETTERS[i], label: o }));
    return choiceCard({ qLabel: type === "gap-mc" ? tx("ps.gap", "Lücke {n}", { n }) : qLabel, questionText: item.question, options, correctKey: LETTERS[item.correct], existing, onAnswer: record, meldung });
  }
  if (type === "match" || type === "gap-bank") {
    const pool = part.type === "match" ? part.pool : part.bank;
    const options = Object.entries(pool).map(([k, v]) => ({ key: k, label: typeof v === "string" ? v : v.title }));
    // The badge already shows the "X", so "x – keine passende Anzeige" loses its own "x –".
    if (part.none) options.push({ key: "x", label: part.none.replace(/^x\s*[–—-]\s*/i, "") });
    return choiceCard({
      qLabel: part.type === "gap-bank" ? tx("ps.gap", "Lücke {n}", { n }) : qLabel,
      questionText: item.prompt,
      options,
      correctKey: item.correct,
      existing,
      // A long pool (telc Lesen 3: 12 ads + x) as full-width rows made every card a screen
      // tall, so the question scrolled away and taps landed in the neighbouring Aufgabe.
      layout: part.type === "gap-bank" ? "wrap" : options.length > 5 ? "pool" : "list",
      onAnswer: record,
      meldung,
      why: item.why,
      ...deferred,
    });
  }
  throw new Error(`pruefungEngine: unbekannter Typ "${part.type}"`);
}

/* A short typed answer (a note to complete, a form field): type, check, then the key. */
function writeInCard(item, qLabel, existing, record, meldung) {
  const card = el("div", "qcard ps-writein");
  card.appendChild(el("div", "qhead", '<span class="qnum">' + escapeHtml(qLabel) + "</span>"));
  if (item.prompt) card.appendChild(el("p", "qtext", escapeHtml(item.prompt)));
  const row = el("div", "ps-writein-row");
  const input = el("input", "form-input");
  input.type = "text";
  input.autocomplete = "off";
  input.setAttribute("aria-label", item.prompt || qLabel);
  const btn = el("button", "ps-timer-btn", escapeHtml(tx("ps.check", "Prüfen")));
  btn.type = "button";
  row.append(input, btn);
  card.appendChild(row);
  const fb = el("div", "feedback");
  fb.hidden = true;
  card.appendChild(fb);
  const lock = (given, ok) => {
    input.value = given;
    input.disabled = btn.disabled = true;
    fb.hidden = false;
    fb.className = "feedback " + (ok ? "correct" : "incorrect");
    fb.innerHTML = ok
      ? escapeHtml(tx("exam.fb.correct", "Richtig."))
      : tx("exam.fb.wrong", "Nicht ganz — richtig ist <b>{a}</b>.", { a: escapeHtml(item.answer ?? item.accept[0]) });
  };
  if (existing) lock(existing.given, existing.correct);
  const submit = () => {
    const given = input.value.trim();
    if (!given || input.disabled) return;
    const ok = item.accept.some((a) => norm(a) === norm(given));
    lock(given, ok);
    record(given, ok);
  };
  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  if (meldung) {
    const target = () => ({
      ref: meldung,
      fingerprint: fingerprint(item.prompt ?? "", item.answer ?? item.accept?.[0] ?? ""),
      snapshot: () => ({ frage: item.prompt, loesung: item.answer ?? item.accept?.[0], akzeptiert: item.accept, antwort: input.value.trim() || null }),
    });
    const mrow = el("div", "mf-row");
    mrow.append(meldenLink(target));
    card.appendChild(mrow);
    flagElement(card, target);
  }
  return card;
}

/* A text with numbered gaps (gap-mc, gap-bank): the text reads through, each gap shows its
   number, or the chosen word once answered. */
function gapText(part, ctx, numberOf) {
  const box = el("article", "lese-text ps-gaptext");
  if (part.textTitle) box.appendChild(el("h3", "lese-text-title", escapeHtml(part.textTitle)));
  const body = el("div", "lese-text-body");
  let para = el("p");
  const byId = Object.fromEntries(part.items.map((i) => [i.id, i]));
  for (const seg of part.segments) {
    if (seg.br) { body.appendChild(para); para = el("p"); continue; }
    if (seg.t != null) { para.appendChild(document.createTextNode(seg.t)); continue; }
    const item = byId[seg.gap];
    const given = ctx.state.answers[seg.gap]?.given;
    // write-in gaps (open cloze, word formation) show what the learner typed.
    const word = given == null ? null : part.type === "write-in" ? given : part.type === "gap-bank" ? (given === "x" ? "—" : part.bank[given]) : item.options[LETTERS.indexOf(given)];
    const gap = el("span", "ps-gap" + (word ? " is-filled" : ""), word ? escapeHtml(word) : "(" + numberOf(seg.gap) + ") ______");
    para.appendChild(gap);
  }
  body.appendChild(para);
  box.appendChild(body);
  return box;
}

function poolBlock(part) {
  const short = Object.values(part.pool).every((v) => typeof v === "string");
  const grid = el("div", "ps-pool" + (part.poolKind === "people" ? " ps-pool--people" : "") + (short ? " ps-pool--short" : ""));
  for (const [k, v] of Object.entries(part.pool)) {
    if (typeof v === "string") { grid.appendChild(el("div", "ps-pool-card ps-pool-card--short", `<b>${k}</b> ${escapeHtml(v)}`)); continue; }
    const card = el("div", "ps-pool-card");
    card.appendChild(el("p", "ps-pool-head", `<b>${k}</b> ${escapeHtml(v.title)}`));
    if (v.body) card.appendChild(el("p", "ps-pool-body", escapeHtml(v.body)));
    grid.appendChild(card);
  }
  return grid;
}

/* ------------------------------------------------------------ scored parts -- */

/* The open picks of a match part: kept per set in localStorage until checked, shown as
   "→ 3" on the other items when each letter fits once, graded together by one button. */
function pickBoard(set, part, ctx, numberOf) {
  const key = `da-exam-pick-v1:${set.id}`;
  const picks = store.get(key) || {};
  const once = poolOnce(part);
  const cards = [];
  let count = null, btn = null;

  const paint = () => {
    const open = cards.filter(({ item }) => !ctx.state.answers[item.id]);
    if (once) {
      for (const { item, card } of cards) {
        const used = {};
        for (const other of part.items) {
          if (other.id === item.id) continue;
          const k = ctx.state.answers[other.id]?.given ?? picks[other.id];
          if (k && k !== "x") used[k] = "→ " + numberOf(other.id);
        }
        card.markUsed(used);
      }
    }
    if (!btn) return;
    const chosen = open.filter(({ item }) => picks[item.id]).length;
    btn.parentElement.hidden = !open.length;
    setWaiting(btn, chosen ? null : tx("ps.pick.none", "Wähle zuerst bei einer Aufgabe eine Antwort."));
    count.textContent = tx("ps.pick.count", "{d} von {n} gewählt", { d: chosen, n: open.length });
  };

  return {
    optsFor: (item) => ({
      deferred: true,
      picked: picks[item.id] ?? null,
      onPick: (k) => {
        if (k) picks[item.id] = k; else delete picks[item.id];
        store.set(key, picks);
        paint();
      },
    }),
    add: (item, card) => { cards.push({ item, card }); },
    bar() {
      const box = el("div", "ps-check");
      box.appendChild(el("p", "ps-check-note", escapeHtml(tx("ps.pick.note", "Du kannst deine Wahl noch ändern. Wenn du fertig bist, prüfe alle zusammen."))));
      const row = el("div", "ps-check-row");
      count = el("span", "ps-check-count");
      btn = el("button", "ps-check-btn", escapeHtml(tx("ps.pick.check", "Antworten prüfen")));
      btn.type = "button";
      btn.addEventListener("click", () => {
        let first = null;
        for (const { item, card } of cards) {
          if (card.check()) { delete picks[item.id]; first ??= card; }
        }
        store.set(key, picks);
        paint();
        first?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
      row.append(count, btn);
      box.appendChild(row);
      queueMicrotask(paint);
      return box;
    },
  };
}

function renderScored(main, set, part, ctx, numberOf) {
  // Hören: each clip, then its items. Lesen: each text, then its items. Leftovers after.
  const shown = new Set();
  // Matching: like on the answer sheet, picks stay open until the learner checks the whole
  // Teil — the first tap no longer gives the solution away for the other items.
  const deferred = part.type === "match" ? pickBoard(set, part, ctx, numberOf) : null;
  const addItems = (items, container, clipBox) => {
    for (const item of items) {
      shown.add(item.id);
      const card = itemCard(part, item, numberOf(item.id), { ...ctx, set }, () => clipBox?.reveal(), deferred?.optsFor(item));
      deferred?.add(item, card);
      container.appendChild(card);
    }
  };

  if (part.pool && part.type === "match" && !part.clips) main.appendChild(poolBlock(part));
  const gapBox = part.segments ? main.appendChild(gapText(part, ctx, numberOf)) : null;

  for (const clip of part.clips ?? []) {
    const items = part.items.filter((i) => i.clip === clip.id);
    const box = clipBlock(set, clip, items.map((i) => i.id), ctx);
    main.appendChild(box);
    if (part.pool && part.type === "match" && clip === part.clips[0]) main.appendChild(poolBlock(part));
    addItems(items, main, box);
  }
  for (const text of part.texts ?? []) {
    main.appendChild(textBlock(text));
    addItems(part.items.filter((i) => i.text === text.id), main);
  }
  addItems(part.items.filter((i) => !shown.has(i.id)), main);
  if (deferred) main.appendChild(deferred.bar());
  // A gap text shows the chosen words: after an answer, swap in a fresh copy of the text.
  // The pane outlives the section, so the one handler is replaced, not stacked, and it does
  // nothing once this section has been painted over.
  main.removeEventListener("click", main.psGapHandler ?? (() => {}));
  main.psGapHandler = null;
  if (gapBox) {
    let shown = gapBox;
    main.psGapHandler = (e) => {
      if (!e.target.closest(".opt") || !shown.isConnected) return;
      setTimeout(() => {
        if (!shown.isConnected) return;
        const fresh = gapText(part, ctx, numberOf);
        shown.replaceWith(fresh);
        shown = fresh;
      }, 50);
    };
    main.addEventListener("click", main.psGapHandler);
  }
}

/* ------------------------------------------------------ Schreiben, Sprechen -- */

function wordCount(s) {
  const t = (s || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function modelAndChecklist(task) {
  const wrap = el("div", "ps-reveal");
  if (task.model) {
    const d = el("details", "ps-fold");
    d.appendChild(el("summary", "", escapeHtml(tx("ps.model", "Musterlösung — erst öffnen, wenn du fertig bist"))));
    const m = el("div", "model-answer");
    for (const p of String(task.model).split("\n")) m.appendChild(el("p", "", escapeHtml(p)));
    d.appendChild(m);
    wrap.appendChild(d);
  }
  if (task.checklist?.length) {
    const d = el("details", "ps-fold");
    d.appendChild(el("summary", "", escapeHtml(tx("ps.checklist", "Worauf die Prüfer achten"))));
    const ul = el("ul", "ps-checklist");
    for (const c of task.checklist) ul.appendChild(el("li", "", escapeHtml(c)));
    d.appendChild(ul);
    wrap.appendChild(d);
  }
  return wrap;
}

function taskHead(card, task, n) {
  card.appendChild(el("div", "qhead", '<span class="qnum">' + escapeHtml(task.title || tx("ps.task", "Aufgabe {n}", { n })) + "</span>"));
  if (task.situation) card.appendChild(el("p", "qtext", escapeHtml(task.situation)));
  if (task.prompt) card.appendChild(el("p", "qtext ps-prompt", escapeHtml(task.prompt)));
  if (task.points?.length) {
    const ul = el("ul", "task-points");
    for (const p of task.points) ul.appendChild(el("li", "", escapeHtml(p)));
    card.appendChild(ul);
  }
}

function renderSchreiben(main, set, part, ctx) {
  const drafts = store.get(`da-exam-draft-v1:${set.id}`) || {};
  part.tasks.forEach((task, i) => {
    const card = el("div", "qcard ps-write");
    taskHead(card, task, i + 1);
    const meta = [];
    if (task.words) meta.push(tx("ps.words.target", "ca. {n} Wörter", { n: task.words }));
    if (task.minutes) meta.push(tx("ps.minutes", "{n} Min.", { n: task.minutes }));
    if (meta.length) card.appendChild(el("p", "qcontext", escapeHtml(meta.join(" · "))));
    const box = el("textarea", "write-box");
    box.rows = 9;
    box.value = drafts[task.id] ?? ctx.state.answers[task.id]?.given ?? "";
    box.setAttribute("aria-label", tx("ps.write.label", "Dein Text"));
    const count = el("p", "word-count");
    const paint = () => {
      const n = wordCount(box.value);
      count.textContent = task.words ? tx("ps.words.count", "{n} von ca. {t} Wörtern", { n, t: task.words }) : tx("ps.words.only", "{n} Wörter", { n });
      count.classList.toggle("is-short", !!task.words && n < task.words * 0.8);
    };
    box.addEventListener("input", () => { drafts[task.id] = box.value; store.set(`da-exam-draft-v1:${set.id}`, drafts); paint(); });
    paint();
    card.append(box, count);
    const done = el("div", "ps-done");
    done.appendChild(practiceToggle({
      existing: ctx.state.answers[task.id],
      onToggle: (on) => {
        if (on) ctx.record(task.id, box.value, null);
        else ctx.forget(task.id);
      },
    }));
    card.appendChild(done);
    card.appendChild(modelAndChecklist(task));
    main.appendChild(card);
  });
}

function renderSprechen(main, set, module, part, ctx) {
  part.tasks.forEach((task, i) => {
    const card = el("div", "qcard ps-speak");
    taskHead(card, task, i + 1);
    if (task.mode) card.appendChild(el("p", "qcontext", escapeHtml(task.mode === "paar" ? tx("ps.speak.pair", "Im Test mit einer Partnerin oder einem Partner. Übe allein: sprich beide Rollen oder lies die Antworten der anderen Person unten.") : tx("ps.speak.solo", "Im Test sprichst du allein vor den Prüfern."))));
    if (task.card) {
      const c = el("div", "ps-card");
      if (task.card.title) c.appendChild(el("p", "ps-card-title", escapeHtml(task.card.title)));
      const ul = el("ul");
      for (const b of task.card.lines ?? []) ul.appendChild(el("li", "", escapeHtml(b)));
      c.appendChild(ul);
      card.appendChild(c);
    }
    if (task.slides?.length) {
      const grid = el("div", "ps-slides");
      task.slides.forEach((s, k) => {
        const slide = el("div", "ps-slide");
        slide.appendChild(el("span", "ps-slide-n", String(k + 1)));
        slide.appendChild(el("p", "ps-slide-title", escapeHtml(s.title)));
        if (s.lines?.length) {
          const ul = el("ul");
          for (const l of s.lines) ul.appendChild(el("li", "", escapeHtml(l)));
          slide.appendChild(ul);
        }
        grid.appendChild(slide);
      });
      card.appendChild(grid);
    }
    const timers = el("div", "ps-timers");
    if (task.prepMinutes) timers.appendChild(countdown(tx("ps.speak.prep", "Vorbereitung"), task.prepMinutes));
    if (task.minutes) timers.appendChild(countdown(tx("ps.speak.talk", "Sprechen"), task.minutes));
    card.appendChild(timers);
    if (task.redemittel?.length) {
      const d = el("details", "ps-fold");
      d.appendChild(el("summary", "", escapeHtml(tx("ps.redemittel", "Redemittel"))));
      const wrap = el("div", "ps-phrases");
      for (const r of task.redemittel) wrap.appendChild(el("span", "ps-phrase", escapeHtml(r)));
      d.appendChild(wrap);
      card.appendChild(d);
    }
    card.appendChild(modelAndChecklist(task));
    const done = el("div", "ps-done");
    done.appendChild(practiceToggle({
      existing: ctx.state.answers[task.id],
      onToggle: (on) => {
        if (on) ctx.record(task.id, "geübt", null);
        else ctx.forget(task.id);
      },
    }));
    card.appendChild(done);
    main.appendChild(card);
  });
}

/* ----------------------------------------------------------------- result -- */

function renderResult(main, set, ctx) {
  sectionHeader(main, { eyebrow: tx("ps.result.eyebrow", "Auswertung"), title: tx("ps.result.title", "Dein Ergebnis"), instruction: escapeHtml(tx("ps.result.lead", "Lesen, Hören und Sprachbausteine werden automatisch ausgewertet. Schreiben und Sprechen bewertest du selbst mit Musterlösung und Checkliste.")) });
  const box = el("div", "exam-result");
  const table = el("table", "exam-breakdown");
  table.innerHTML = `<thead><tr><th>${escapeHtml(tx("ps.result.module", "Teil"))}</th><th>${escapeHtml(tx("ps.result.points", "Punkte"))}</th><th>%</th></tr></thead>`;
  const tbody = el("tbody");
  const pass = set.scoring?.passPct ?? 60;
  let anyScored = false;
  for (const module of set.modules) {
    const scored = module.parts.filter(isScored);
    if (!scored.length) {
      const ids = module.parts.flatMap(idsOfPart);
      const done = ids.filter((id) => ctx.state.answers[id]).length;
      tbody.appendChild(el("tr", "", `<td>${escapeHtml(module.name)}</td><td colspan="2">${escapeHtml(tx("ps.result.selfDone", "{d} von {n} Aufgaben geübt", { d: done, n: ids.length }))}</td>`));
      continue;
    }
    anyScored = true;
    let got = 0, max = 0, answered = 0, total = 0;
    for (const part of scored) {
      const ids = idsOfPart(part);
      got += countCorrect(ids, ctx.state) * (part.points ?? 1);
      max += ids.length * (part.points ?? 1);
      answered += ids.filter((id) => ctx.state.answers[id]).length;
      total += ids.length;
    }
    const pct = percent(got, max);
    const verdict = answered < total
      ? `<span class="ps-verdict">${escapeHtml(tx("ps.result.open", "noch {n} offen", { n: total - answered }))}</span>`
      : `<span class="ps-verdict ${pct >= pass ? "is-pass" : "is-fail"}">${escapeHtml(pct >= pass ? tx("ps.result.pass", "bestanden") : tx("ps.result.fail", "noch nicht"))}</span>`;
    tbody.appendChild(el("tr", "", `<td>${escapeHtml(module.name)} ${verdict}</td><td>${got} / ${max}</td><td>${pct}</td>`));
  }
  table.appendChild(tbody);
  box.appendChild(table);
  if (anyScored) box.appendChild(el("p", "format-note", escapeHtml(tx("ps.result.rule", "Richtwert: ab {p} % der Punkte gilt ein Teil als bestanden.", { p: pass }))));
  if (set.scoring?.note) box.appendChild(el("p", "format-note", escapeHtml(set.scoring.note)));
  const wrong = Object.values(ctx.state.answers ?? {}).filter((a) => a && a.correct === false).length;
  if (wrong) box.appendChild(el("p", "format-note", `<a href="/meine-fehler">${escapeHtml(tx("fehler.saved", "{n} Fehler gespeichert → Meine Fehler", { n: wrong }))}</a>`));
  main.appendChild(box);
}

/* ------------------------------------------------------------------ mount -- */

export function mountPruefung(root, set) {
  // Items are numbered through each module, as on the exam's answer sheet.
  const number = {};
  for (const module of set.modules) {
    let n = 0;
    for (const part of module.parts) for (const id of idsOfPart(part)) number[id] = ++n;
  }
  const numberOf = (id) => number[id];

  const sections = [];
  for (const module of set.modules) {
    for (const part of module.parts) {
      const label = `${module.name} · ${tx("ps.teil", "Teil {n}", { n: part.teil })}`;
      sections.push({
        key: `${module.key}-${part.teil}`,
        label,
        ids: idsOfPart(part),
        render(main, ctx) {
          main.appendChild(moduleTimer(set.id, module));
          sectionHeader(main, { eyebrow: label, title: part.title, instruction: escapeHtml(part.instruction || "") });
          // A Schreiben or Sprechen part may bring material to read first (a press text to
          // present, a letter to answer).
          if (part.type === "schreiben" || part.type === "sprechen") for (const t of part.texts ?? []) main.appendChild(textBlock(t));
          if (part.type === "schreiben") renderSchreiben(main, set, part, ctx);
          else if (part.type === "sprechen") renderSprechen(main, set, module, part, ctx);
          else renderScored(main, set, part, ctx, numberOf);
        },
      });
    }
  }
  sections.push({ key: "ergebnis", label: tx("ps.result.nav", "Ergebnis"), labelKey: "ps.result.nav", ids: null, render: (main, ctx) => renderResult(main, set, ctx) });
  // traffic-baseline: exam_start / exam_finish — score_pct over the auto-scored parts only.
  const scoreIds = () => partsOf(set).filter(({ part }) => isScored(part)).flatMap(({ part }) => idsOfPart(part));
  return mountExamApp(root, { examId: set.id, sections, unit: "Aufgaben", unitKey: "ps.unit", meta: { exam: set.exam, set: set.id, scoreIds } });
}
