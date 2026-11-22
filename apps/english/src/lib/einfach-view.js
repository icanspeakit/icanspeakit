/* /step-by-step — the screens.
 *
 * One <div> is handed in and every screen is rendered into it, so there is exactly one
 * thing on the phone at a time and no scroll position to lose between steps. Routing is
 * the hash, purely so Android's back button walks the flow backwards the way a learner
 * expects it to.
 *
 * Rules the prototype is testing, and which every screen below obeys:
 *   1. One decision per screen. Three options is the ceiling; a grid is a failure.
 *   2. A sitting, never a pile. No screen states a total — not 3,375 words, not 28 topics.
 *   3. Progress is a sentence, not a percent: "You can ask the way."
 *   4. The primary action sits in the thumb zone and there is only ever one of it.
 *
 * Bruno (EINFACH-LERNEN-TIERED-PROMPT.md, Tier 1): a companion that is always in the same spot — just
 * above the action bar in the runner — reacts to the answer, gives a hint when tapped,
 * and walks the progress path. Everything that is only there for the mascots carries
 * `.mascot` or `[data-mascot-part]`, so "Show mascots: off" removes it and the
 * flow stays complete: verdict text, path, weekly goal and postcards do not depend on him.
 *
 * Step by step (Einfach lernen), Tier 2: the units are real (src/data/einfach-pfad.json).
 * Today offers only the next one; "I want something else" leads to at most three choices —
 * the next unit, the mistakes (once there are enough), another topic — and the topic
 * picker shows three at a time. Screen names in the hash (heute, waehlen, uebung …) stay
 * German until the `routes` item renames them.
 */
import {
  units,
  unitById,
  noteAnswer,
  mistakeUnit,
  otherUnits,
  withReviews,
  loadState,
  saveState,
  resetState,
  completeSitting,
  capabilities,
  nextSitting,
  weekProgress,
  recordTask,
  placementItems,
  placementStart,
  placementSentence,
  daysAway,
  postcards,
} from "./einfach-app.js";
import { mascotSvg } from "./mascots.js";
import { onMascotsChange, setMascotsEnabled } from "./mascotPrefs.js";
import { waitAttrs } from "./notReady.js";
import { BASE_PATH, withBase } from "./paths.js";

/* Everything Bruno says, in one place. Short (≤ 8 words), A1 English, warm, never
   blaming. `text` is what the bubble shows; an optional `help` (a translation into the
   learner's language) is what a tap shows — none of the lines has one yet, so a tap does
   nothing. No line mentions missed days. */
const BRUNO_LINES = {
  right: [{ text: "Great!" }, { text: "Exactly!" }, { text: "Woof! That's right!" }],
  wrong: [{ text: "Almost! Look again." }, { text: "No problem." }, { text: "We'll learn this together." }],
  first: { text: "Hi, I'm Bruno. Have you got two minutes?" },
  back: { text: "Nice to see you again!" },
  hello: [{ text: "A walk? English first!" }, { text: "Let's go!" }, { text: "I was waiting for you!" }],
  hintless: { text: "Look carefully. You can do it." },
  known: { text: "You know this one!" },
  skipped: { text: "No problem. Another time." },
  spoke: [{ text: "Nicely said!" }, { text: "Well done!" }],
};

/** The skill mascot that steps in beside Bruno, by task type. Quaki waits for speaking tasks. */
const HELPER = {
  wort: "hamsti",
  hoeren: "hamsti",
  artikel: "regi",
  luecke: "regi",
  satz: "regi",
  sprechen: "quaki",
  redemittel: "quaki",
};

/* One clip at a time: a new play stops the last one. */
let clip = null;
function play(src, text) {
  clip?.pause?.();
  window.speechSynthesis?.cancel();
  clip = null;
  if (src) {
    clip = new Audio(withBase(src));
    return clip.play().catch(() => text && say(text));
  }
  return text ? say(text) : Promise.resolve();
}
function say(text) {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = 0.9;
  synth.speak(u);
  return Promise.resolve();
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* "Yes" + ", a little." must not read "Yes , a little.": no space before punctuation. */
const gapLine = (before, blank, after) =>
  `${before ? esc(before) + " " : ""}${blank}${after ? (/^[.,;:!?]/.test(after) ? "" : " ") + esc(after) : ""}`;
const splitGapView = (prompt) => {
  const i = prompt.indexOf("___");
  return i === -1 ? { before: prompt, after: "" } : { before: prompt.slice(0, i).trim(), after: prompt.slice(i + 3).trim() };
};
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
/* "1 task", "6 tasks": the only counts easy mode shows are small ones, so a plain -s does. */
const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const minutes = (n) => count(n, "minute");
/* English "articles" are a / an / some (content-plan §1.4); a grammar table row brings its own pair. */
const articleOptions = (task) => task.options || ["a", "an", "some"];
/* "a or an?", "a, an or some?" */
const articleQuestion = (task) => {
  const o = articleOptions(task);
  return `${o.slice(0, -1).join(", ")} or ${o[o.length - 1]}?`;
};
const MASCOTS_OFF_NOTE = `<p class="el-note" role="status">The mascots are off. To turn them on again: <a href="${BASE_PATH}/konto">Account → Settings</a>.</p>`;

export function mountEinfach(root) {
  let state = loadState();
  /** The live sitting: null outside the runner. */
  let run = null;
  /** Rotates the right/wrong lines so Bruno does not say the same thing twice running. */
  let lineTurn = 0;
  /** Bruno's last face, so a change can crossfade and a re-render of the same face does not. */
  let lastExpr = null;
  /** The task the helper last hopped in for: it hops once per task, not on every render. */
  let hoppedFor = null;
  let heuteTimer = null;
  /** Set once the learner turns the mascots off here: Heute then says where to turn them on. */
  let mascotsOffNote = false;
  /** The quick placement check in progress: { i, right }. */
  let check = null;
  /** The task + answered state that last got focus, so a re-render does not steal it. */
  let lastFocus = null;
  /** The task last drawn, so only a new one slides in. */
  let lastTask = null;

  /* ------------------------------------------------------------- chrome */

  function shell({ back, home = false, title, body, action, center, buddy = "" }) {
    clearTimeout(heuteTimer);
    root.innerHTML = `
      <header class="el-bar">
        ${
          back
            ? `<button class="el-back" type="button" data-go="${back}" aria-label="Back">‹</button>`
            : home
              ? `<a class="el-back el-back--home" href="/" data-to-site aria-label="To the full site" title="To the full site">⌂</a>`
              : `<span class="el-back el-back--ghost" aria-hidden="true"></span>`
        }
        <span class="el-bar-title">${esc(title)}</span>
      </header>
      <main class="el-body${center ? " el-body--center" : ""}">${body}</main>
      ${action || buddy ? `<footer class="el-foot">${buddy}${action || ""}</footer>` : ""}
    `;
    // Leaving for the full site: remember it, so the homepage offers the full site back.
    root.querySelectorAll("[data-to-site]").forEach((el) =>
      el.addEventListener("click", () => {
        try {
          localStorage.setItem("da-last-mode", "voll");
        } catch {}
      })
    );
    root.querySelectorAll("[data-go]").forEach((el) =>
      el.addEventListener("click", () => {
        location.hash = "#/" + el.dataset.go;
      })
    );
    // A bubble is English; if the line has help text, a tap shows it and a second tap goes back.
    root.querySelectorAll("[data-bubble]").forEach((el) =>
      el.addEventListener("click", () => {
        if (!el.dataset.help) return;
        const toHelp = el.dataset.showing !== "help";
        el.dataset.showing = toHelp ? "help" : "text";
        if (toHelp) el.removeAttribute("lang");
        else el.lang = "en";
        el.querySelector("span").textContent = toHelp ? el.dataset.help : el.dataset.text;
      })
    );
  }

  /* ------------------------------------------------------------- Bruno */

  function brunoSvg(expr, size) {
    const fade = lastExpr !== null && lastExpr !== expr ? " el-fade" : "";
    lastExpr = expr;
    return mascotSvg({ name: "bruno", expr, size, label: "", className: "el-bruno-svg" + fade });
  }

  /** A speech bubble: real text in the mascot voice, English first, help text on tap. */
  function bubble(line, extra = "") {
    if (!line) return `<span class="el-bubble el-bubble--empty" data-mascot-part aria-hidden="true"></span>`;
    const help = line.help ? ` data-help="${esc(line.help)}"` : "";
    return `<button type="button" class="el-bubble ${extra}" data-mascot-part data-bubble data-text="${esc(line.text)}"${help} lang="en"
      aria-live="polite"${line.help ? ` title="Tap: translation"` : ""}><span>${esc(line.text)}</span></button>`;
  }

  /** The runner's companion row: Bruno (a hint button), the skill helper, the bubble. */
  function buddyRow({ expr, line, helper, taskKey }) {
    const hop = helper && hoppedFor !== taskKey ? " el-hop" : "";
    if (helper) hoppedFor = taskKey;
    return `
      <div class="el-buddy-row" data-mascot-part>
        <button type="button" class="mascot el-buddy" data-hint aria-label="A tip from Bruno">${brunoSvg(expr, 64)}</button>
        ${helper ? `<span class="mascot el-helper${hop}">${mascotSvg({ name: helper, view: "three", size: 44, label: "" })}</span>` : ""}
        ${bubble(line)}
      </div>`;
  }

  const nextLine = (kind) => BRUNO_LINES[kind][lineTurn++ % BRUNO_LINES[kind].length];

  /* -------------------------------------------------------------- heute

     The home screen is one card. The alternative underneath is a quiet single
     line, not a menu — a learner who wants to be told what to do can take the
     card without reading anything else on the screen.

     Bruno greets: first visit, back after a break (three days or more — he wakes up,
     and says nothing about the days), or a plain hello.
  */

  function heute() {
    if (!state.placed && placementItems().length) return start();
    const next = nextSitting(state);
    const cans = capabilities(state);
    if (!next) {
      root.innerHTML = `<p class="el-note" style="padding:24px">There is nothing to practise here right now.</p>`;
      return;
    }
    const away = daysAway(state);
    const first = !state.done.length && !state.greeted;
    const back = away !== null && away >= 3;
    const line = first ? BRUNO_LINES.first : back ? BRUNO_LINES.back : BRUNO_LINES.hello[state.done.length % BRUNO_LINES.hello.length];
    lastExpr = null;

    shell({
      home: true,
      title: "Today",
      body: `
        <div class="el-greet" data-mascot-part>
          <span class="mascot el-greet-bruno" data-greet-bruno>${mascotSvg({ name: "bruno", expr: back ? "sleepy" : "happy", size: 88, label: "" })}</span>
          ${bubble(line, "el-bubble--big")}
        </div>
        ${first ? `<button class="el-quiet el-quiet--tiny" type="button" data-mascot-part data-mascots-off>Hide the mascots</button>` : ""}
        ${mascotsOffNote ? MASCOTS_OFF_NOTE : ""}

        <p class="el-hello">${state.done.length ? "Let's carry on." : "Two minutes is enough."}</p>

        <button class="el-offer" type="button" data-go="uebung/${next.id}">
          <span class="el-offer-ic" aria-hidden="true">${next.icon}</span>
          <span class="el-offer-txt">
            <b>${esc(next.title)}</b>
            <i>${count(next.tasks.length, "task")} · ${minutes(next.minutes)}${next.level ? ` · ${next.level}` : ""}</i>
          </span>
          <span class="el-offer-go" aria-hidden="true">→</span>
        </button>

        ${cans.length ? "" : `<p class="el-note">After your first round, you'll see here what you can do.</p>`}
        ${mistakeUnit(state) ? `<button class="el-quiet el-quiet--strong" type="button" data-go="uebung/fehler">🔁 Practise your mistakes</button>` : ""}

        <button class="el-quiet" type="button" data-go="waehlen">I want something else</button>
      `,
      center: true,
      action: `<button class="el-cta" type="button" data-go="uebung/${next.id}">Go — ${minutes(next.minutes)}</button>`,
    });

    root.querySelector("[data-mascots-off]")?.addEventListener("click", () => {
      mascotsOffNote = true;
      setMascotsEnabled(false);
    });
    if (first) {
      state.greeted = true;
      saveState(state);
    }

    // Waking up: a second of sleepy, then happy.
    if (back) {
      heuteTimer = setTimeout(() => {
        const spot = root.querySelector("[data-greet-bruno]");
        if (spot) spot.innerHTML = mascotSvg({ name: "bruno", expr: "happy", size: 88, label: "", className: "el-fade" });
      }, 1000);
    }
  }

  /* ------------------------------------------------------------- start

     First visit: "Where do you want to start?" — three answers. The two unsure ones run six
     quick items from einstufung.json, one per screen, no right/wrong shown (it is not a test),
     and end in a sentence, never a level code. */

  function start() {
    shell({
      title: "Step by step",
      home: true,
      body: `
        <div class="el-greet" data-mascot-part>
          <span class="mascot el-greet-bruno">${mascotSvg({ name: "bruno", expr: "happy", size: 88, label: "" })}</span>
          ${bubble(BRUNO_LINES.first, "el-bubble--big")}
        </div>
        <button class="el-quiet el-quiet--tiny" type="button" data-mascot-part data-mascots-off>Hide the mascots</button>
        ${mascotsOffNote ? MASCOTS_OFF_NOTE : ""}
        <p class="el-hello">Where do you want to start?</p>
        <div class="el-picks">
          <button class="el-pick" type="button" data-place="anfang">
            <span class="el-pick-ic" aria-hidden="true">🌱</span>
            <span class="el-pick-txt"><b>At the very beginning</b><i>I'm learning my first words.</i></span>
          </button>
          <button class="el-pick" type="button" data-place="check">
            <span class="el-pick-ic" aria-hidden="true">🙂</span>
            <span class="el-pick-txt"><b>I know a little</b><i>Six short questions</i></span>
          </button>
          <button class="el-pick" type="button" data-place="check">
            <span class="el-pick-ic" aria-hidden="true">🤔</span>
            <span class="el-pick-txt"><b>I'm not sure</b><i>Six short questions</i></span>
          </button>
        </div>
      `,
    });
    // Bruno's first-ever bubble: the mascot switch is findable right here.
    root.querySelector("[data-mascots-off]")?.addEventListener("click", () => {
      mascotsOffNote = true;
      setMascotsEnabled(false);
    });
    state.greeted = true;
    saveState(state);
    root.querySelectorAll("[data-place]").forEach((el) =>
      el.addEventListener("click", () => {
        if (el.dataset.place === "anfang") {
          state = { ...state, placed: true, start: units()[0]?.id || null };
          saveState(state);
          location.hash = "#/heute";
          render();
        } else {
          check = { i: 0, right: 0 };
          location.hash = "#/check";
        }
      })
    );
  }

  function checkScreen() {
    const items = placementItems();
    if (!check) check = { i: 0, right: 0 };
    if (check.i >= items.length) return checkResult();
    const q = items[check.i];
    const gap = splitGapView(q.prompt);
    shell({
      back: "heute",
      title: "Quick check",
      body: `
        ${walkPlain(items.length, check.i)}
        <div class="el-task" tabindex="-1">
          <p class="el-kind">What fits?</p>
          <p class="el-sentence">${gapLine(gap.before, `<span class="el-blank">___</span>`, gap.after)}</p>
          <p class="el-gloss">Just guess. Nothing is wrong here.</p>
        </div>
      `,
      action: `<div class="el-opts">${q.options
        .map((o) => `<button class="el-opt" type="button" data-pick="${esc(o)}">${esc(o)}</button>`)
        .join("")}</div>`,
    });
    root.querySelector(".el-task")?.focus({ preventScroll: true });
    root.querySelectorAll("[data-pick]").forEach((el) =>
      el.addEventListener("click", () => {
        if (el.dataset.pick === q.answer) check.right++;
        check.i++;
        checkScreen();
      })
    );
  }

  function checkResult() {
    const right = check?.right || 0;
    const startId = placementStart(right);
    state = { ...state, placed: true, start: startId };
    saveState(state);
    check = null;
    shell({
      title: "Step by step",
      body: `
        <div class="el-win">
          <span class="el-win-ic" aria-hidden="true">🧭</span>
          <p class="el-win-lead">${esc(placementSentence(right, startId))}</p>
        </div>
      `,
      center: true,
      action: `<button class="el-cta" type="button" data-go="heute">Let's start</button>`,
    });
  }

  /* The placement check's walk: plain stops, no Bruno walking — it is not a unit. */
  function walkPlain(n, i) {
    const stops = Array.from({ length: n }, (_, k) => `<span class="el-stop ${k < i ? "is-done" : k === i ? "is-now" : ""}"></span>`).join("");
    return `<div class="el-walk" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${i}">${stops}</div>`;
  }

  /* ------------------------------------------------------------- waehlen

     "I want something else": one question, at most three answers — the next unit, the
     mistakes (only once there are enough to fill a sitting), another topic. No
     levels, no counts.
  */

  function choice({ go, icon, title, sub, done = false }) {
    return `
      <button class="el-pick ${done ? "is-done" : ""}" type="button" data-go="${go}">
        <span class="el-pick-ic" aria-hidden="true">${icon}</span>
        <span class="el-pick-txt"><b>${esc(title)}</b><i>${esc(sub)}</i></span>
      </button>`;
  }

  function waehlen() {
    const next = nextSitting(state);
    const fehler = mistakeUnit(state);
    const others = otherUnits(state);
    shell({
      back: "heute",
      title: "What next?",
      body: `
        <p class="el-hello">What would you like to do?</p>
        <div class="el-picks">
          ${choice({ go: `uebung/${next.id}`, icon: next.icon, title: next.title, sub: `Next · ${minutes(next.minutes)}` })}
          ${fehler ? choice({ go: "uebung/fehler", icon: fehler.icon, title: fehler.title, sub: "Things you got wrong before" }) : ""}
          ${others.list.length ? choice({ go: "situationen", icon: "🗺️", title: "Another topic", sub: "You choose" }) : ""}
        </div>
        ${capabilities(state).length ? `<button class="el-quiet" type="button" data-go="kannst">What you can do</button>` : ""}
      `,
    });
  }

  /* Another topic: three at a time, not yet done first. "Show others" turns the
     page instead of growing a list — a list that scrolls is already one list too many. */
  function situationen(page = 0) {
    const { list, more } = otherUnits(state, page);
    shell({
      back: "waehlen",
      title: "Another topic",
      body: `
        <p class="el-hello">What do you want to get better at?</p>
        <div class="el-picks">
          ${list
            .map((u) =>
              choice({
                go: `uebung/${u.id}`,
                icon: u.icon,
                title: u.title,
                sub: `${minutes(u.minutes)}${state.done.includes(u.id) ? " · done" : ""}`,
                done: state.done.includes(u.id),
              })
            )
            .join("")}
        </div>
        ${more ? `<button class="el-quiet" type="button" data-go="situationen/${page + 1}">Show others</button>` : ""}
      `,
    });
  }

  /* ------------------------------------------------------------- uebung */

  function uebung(id) {
    // The unit is frozen into the run: the mistakes sitting changes as it is answered.
    if (!run || run.id !== id) {
      const base = id === "fehler" ? mistakeUnit(state) : unitById(id);
      if (!base) {
        location.hash = "#/heute";
        return;
      }
      // Up to two due items ride along in a normal unit (Tier 3: mistakes come back).
      const unit = id === "fehler" ? base : withReviews(state, base);
      run = { id, unit, i: 0, right: 0, answer: null, flipped: false, built: [], pool: null, line: null, opts: null, speak: null };
      lastExpr = null;
    }
    const sitting = run.unit;
    const task = sitting.tasks[run.i];
    const answered = run.answer !== null;
    const ok = answered && isRight(task);
    // A due item is announced by Bruno; the label under it says the same without him.
    if (!answered && task.review && !run.line) run.line = BRUNO_LINES.known;
    // Choices are shuffled once per task — the path lists the right answer first.
    if (!run.opts && task.options) run.opts = shuffle(task.options.slice());
    const focusKey = `${sitting.id}:${run.i}:${answered}`;

    shell({
      back: "heute",
      title: sitting.title,
      body: `
        ${walk(sitting)}
        <div class="el-task" data-kind="${task.type}" tabindex="-1">${taskBody(task)}</div>
        <div class="el-verdict" aria-live="polite">${answered ? verdict(task) : ""}</div>
      `,
      buddy: buddyRow({
        expr: answered ? (ok || run.answer === "skip" ? "happy" : "oops") : run.speak === "rec" ? "happy" : "thinking",
        line: run.line,
        helper: HELPER[task.type],
        taskKey: `${sitting.id}:${run.i}`,
      }),
      action: answered
        ? `<button class="el-cta" type="button" data-next>${run.i + 1 < sitting.tasks.length ? "Next" : "Finish"}</button>`
        : taskAction(task),
    });

    wire(sitting, task);

    // The screen is rebuilt with innerHTML, so the card arrives unturned and turns a frame
    // later — otherwise it would already sit at its end rotation and snap (as in Wortschatz).
    if (run.flipAnim) {
      run.flipAnim = false;
      const inner = root.querySelector(".el-card-inner");
      if (inner) {
        void inner.offsetWidth;
        inner.classList.add("is-flipped");
      }
    }
    // A new task slides in; a re-render of the same task stays put.
    const taskKey = `${sitting.id}:${run.i}`;
    if (taskKey !== lastTask) {
      if (lastTask?.startsWith(sitting.id + ":")) root.querySelector(".el-task")?.classList.add("el-swap");
      lastTask = taskKey;
    }

    // Keyboard and screen reader: a new task takes focus; after an answer, "Weiter" does,
    // so Enter walks on. The verdict itself is announced by its live region.
    if (focusKey !== lastFocus) {
      lastFocus = focusKey;
      const target = answered ? root.querySelector("[data-next]") : root.querySelector(".el-task");
      target?.focus({ preventScroll: true });
    }
  }

  /* The progress walk: one stop per task, Bruno standing on the current one, done stops
     filled. No numbers. With the mascots off a plain marker stands there instead. */
  function walk(sitting) {
    const n = sitting.tasks.length;
    const stops = sitting.tasks
      .map((_, k) => {
        const cls = k < run.i ? "is-done" : k === run.i ? "is-now" : "";
        const here =
          k === run.i
            ? `<span class="el-walker">${mascotSvg({ name: "bruno", expr: "happy", view: "three", size: 30, label: "" })}<span class="el-walk-marker" aria-hidden="true"></span></span>`
            : "";
        return `<span class="el-stop ${cls}">${here}</span>`;
      })
      .join("");
    return `<div class="el-walk" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${run.i}">${stops}</div>`;
  }

  function isRight(task) {
    if (task.type === "wort") return run.answer === "1";
    if (task.type === "satz") return run.answer === "ok";
    if (task.type === "sprechen") return run.answer === "said";
    return run.answer === task.answer;
  }

  /** "Word" — plus, on a due item, that the learner has met it before. */
  const kind = (task, label) => `<p class="el-kind">${label}${task.review ? ` · <span class="el-known">you know this</span>` : ""}</p>`;

  function taskBody(task) {
    const open = run.flipped || run.answer !== null;

    if (task.type === "wort") {
      const plural = task.plural ? `<span class="el-card-plural">${esc(task.plural)}</span>` : "";
      return `
        ${kind(task, "Word")}
        <button class="el-card" type="button" data-flip>
          <span class="el-card-inner ${open && !run.flipAnim ? "is-flipped" : ""}">
            <span class="el-face" ${open ? `aria-hidden="true"` : ""}>
              <b>${esc(task.front)}</b>${plural}
              <span class="el-card-tap">tap</span>
            </span>
            <span class="el-face el-face--back" ${open ? "" : `aria-hidden="true"`}>
              <b>${esc(task.front)}</b>${plural}
              <span class="el-card-back">${esc(task.back)}<i>${esc(task.hint || "")}</i></span>
            </span>
          </span>
        </button>
      `;
    }

    const blankState = run.answer ? (run.answer === task.answer ? "is-right" : "is-wrong") : "";

    if (task.type === "artikel") {
      return `
        ${kind(task, articleQuestion(task))}
        <p class="el-sentence"><span class="el-blank ${blankState}">${esc(run.answer || "___")}</span> ${esc(task.noun)}</p>
        ${task.back ? `<p class="el-gloss">${esc(task.back)}</p>` : ""}
      `;
    }

    if (task.type === "luecke") {
      return `
        ${kind(task, "Sentence")}
        <p class="el-sentence">${gapLine(task.before, `<span class="el-blank ${blankState}">${esc(run.answer || "___")}</span>`, task.after)}</p>
      `;
    }

    if (task.type === "hoeren") {
      // Replay as often as wanted, no clock. The transcript comes after the answer.
      return `
        ${kind(task, "Listen")}
        <p class="el-listen-title">${esc(task.title)}</p>
        <button class="el-play" type="button" data-play>
          <span aria-hidden="true">▶</span> ${run.played ? "Listen again" : "Listen"}
        </button>
        <p class="el-question">${esc(task.prompt)}</p>
        ${
          run.answer !== null
            ? `<details class="el-transcript" open><summary>What you heard</summary>${task.transcript
                .map((l) => `<p>${esc(l)}</p>`)
                .join("")}</details>`
            : ""
        }
      `;
    }

    if (task.type === "redemittel") {
      return `
        ${kind(task, "What do you say?")}
        <p class="el-situation">${esc(task.situation)}</p>
        ${run.answer ? `<p class="el-sentence el-sentence--sm"><span class="el-blank ${blankState}">${esc(run.answer)}</span></p>` : ""}
      `;
    }

    if (task.type === "sprechen") {
      const res = run.result;
      const words = res
        ? res.words.map((w) => `<span class="el-spoken el-spoken--${w.band}">${esc(w.display)}</span>`).join(" ")
        : esc(task.text);
      return `
        ${kind(task, "Speak")}
        <p class="el-sentence el-sentence--speak">${words}</p>
        <button class="el-play" type="button" data-play>
          <span aria-hidden="true">▶</span> Listen
        </button>
        ${run.speakMsg ? `<p class="el-speak-msg" role="status">${esc(run.speakMsg)}</p>` : ""}
      `;
    }

    // satz — build the line by tapping chips; tapping a placed word takes it back.
    if (!run.pool) run.pool = shuffle(task.chips.slice());
    const placed = run.built.slice();
    const rest = run.pool.filter((w) => {
      const n = placed.indexOf(w);
      if (n === -1) return true;
      placed.splice(n, 1);
      return false;
    });
    return `
      <p class="el-kind">Build the sentence</p>
      <div class="el-line ${run.answer ? (run.answer === "ok" ? "is-right" : "is-wrong") : ""}">
        ${
          run.built.map((w, n) => `<button class="el-word" type="button" data-un="${n}">${esc(w)}</button>`).join("") ||
          `<span class="el-line-ph">tap the words</span>`
        }${task.end && run.built.length ? `<span class="el-line-end" aria-hidden="true">${esc(task.end)}</span>` : ""}
      </div>
      <div class="el-pool">
        ${rest.map((w) => `<button class="el-word el-word--pool" type="button" data-add="${esc(w)}">${esc(w)}</button>`).join("")}
      </div>
    `;
  }

  function taskAction(task) {
    if (task.type === "wort") {
      return run.flipped
        ? `<div class="el-two">
             <button class="el-cta el-cta--ghost" type="button" data-know="0">Again</button>
             <button class="el-cta" type="button" data-know="1">I know it</button>
           </div>`
        : `<button class="el-cta" type="button" data-flip>Turn over</button>`;
    }
    if (task.type === "artikel" || task.type === "luecke") {
      const opts = task.type === "artikel" ? articleOptions(task) : run.opts;
      return `<div class="el-opts">${opts
        .map((o) => `<button class="el-opt" type="button" data-pick="${esc(o)}">${esc(o)}</button>`)
        .join("")}</div>`;
    }
    if (task.type === "hoeren" || task.type === "redemittel") {
      // Whole phrases: one per row, so a long answer never wraps into its neighbour.
      return `<div class="el-opts el-opts--stack">${run.opts
        .map((o) => `<button class="el-opt" type="button" data-pick="${esc(o)}">${esc(o)}</button>`)
        .join("")}</div>`;
    }
    if (task.type === "sprechen") {
      // The mic is only asked for once "Speak" is tapped. Not speaking never costs anything.
      const rec = run.speak === "rec" || run.speak === "prep";
      return `<div class="el-two">
          <button class="el-cta el-cta--ghost" type="button" data-skip>Not now</button>
          <button class="el-cta" type="button" data-speak${rec ? " disabled" : ""}>${
            run.speak === "prep" ? "One moment …" : run.speak === "rec" ? "I'm listening …" : run.speakMsg ? "Try again" : "Speak"
          }</button>
        </div>`;
    }
    // Not ready yet: still tappable, and it says what is missing (src/lib/notReady.js).
    const left = task.chips.length - run.built.length;
    const why = left > 0 ? `Tap ${left === 1 ? "one more word" : `${left} more words`} first.` : "";
    return `<button class="el-cta" type="button" data-check${waitAttrs(why, ".el-word--pool")}>Check</button>`;
  }

  /* The verdict text is the source of truth for right/wrong; Bruno's bubble is extra. */
  function verdict(task) {
    if (task.type === "sprechen") {
      if (run.answer === "skip") return `<p class="el-said is-right">No problem. We'll speak another time.</p>`;
      const tip = run.result?.tip;
      return `<p class="el-said is-right">${run.result?.good ? "Well said." : "Good try!"}${
        tip ? `<i>A tip for “${esc(tip.word)}”: ${esc(tip.text)}</i>` : ""
      }</p>`;
    }
    const ok = isRight(task);
    const solution = task.type === "satz" ? task.answer.join(" ") + (task.end || "") : task.answer;
    const line =
      task.type === "wort"
        ? ok
          ? "Got it."
          : `This one comes back — <b>${esc(task.front)}</b>: ${esc(task.back)}${/[.!?…]$/.test(task.back) ? "" : "."}`
        : ok
          ? "Right."
          : `Almost. The answer is <b>${esc(solution)}</b>${/[.!?…]$/.test(solution) ? "" : "."}`;
    const why = task.why && !ok ? `<i>${esc(task.why)}</i>` : "";
    return `<p class="el-said ${ok ? "is-right" : "is-wrong"}">${line}${why}</p>`;
  }

  function wire(sitting, task) {
    const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener("click", () => fn(el)));
    const again = () => uebung(sitting.id);
    const answeredNow = () => {
      const ok = isRight(task);
      run.line = nextLine(ok ? "right" : "wrong");
      // A miss goes into box 1 and comes back; a right answer on a due item moves it on.
      state = noteAnswer(state, task.ref, ok);
      // …and the answer counts on the dashboard, like one given anywhere else on the site.
      recordTask(task, ok);
      saveState(state);
      again();
    };

    on("[data-play]", () => {
      run.played = true;
      play(task.audio, task.type === "sprechen" ? task.text : null);
      if (task.type === "hoeren") again();
    });
    on("[data-skip]", () => {
      run.answer = "skip";
      run.line = BRUNO_LINES.skipped;
      again();
    });
    on("[data-speak]", () => speakTask(task, again));

    // Tapping Bruno: a hint for this task. Free — it changes nothing in the score.
    on("[data-hint]", () => {
      if (run.answer !== null) return;
      run.line = task.hint ? { text: task.hint, help: task.hintEn } : BRUNO_LINES.hintless;
      again();
    });
    on("[data-flip]", () => {
      if (run.flipped) return;
      run.flipped = true;
      run.flipAnim = true;
      again();
    });
    on("[data-know]", (el) => {
      run.answer = el.dataset.know;
      if (el.dataset.know === "1") run.right++;
      answeredNow();
    });
    on("[data-pick]", (el) => {
      run.answer = el.dataset.pick;
      if (run.answer === task.answer) run.right++;
      answeredNow();
    });
    on("[data-add]", (el) => {
      run.built.push(el.dataset.add);
      again();
    });
    on("[data-un]", (el) => {
      run.built.splice(Number(el.dataset.un), 1);
      again();
    });
    on("[data-check]", () => {
      const ok = run.built.join(" ") === task.answer.join(" ");
      run.answer = ok ? "ok" : "no";
      if (ok) run.right++;
      answeredNow();
    });
    on("[data-next]", () => {
      if (run.i + 1 < sitting.tasks.length) {
        run.i++;
        run.answer = null;
        run.flipped = false;
        run.built = [];
        run.pool = null;
        run.line = null;
        run.opts = null;
        run.played = false;
        run.speak = null;
        run.speakMsg = null;
        run.result = null;
        again();
      } else {
        // The weekly goal is the site's one goal now: progress.js raises the milestone the
        // moment an answer reaches it, and the overlay (mascotCelebrate.js) cheers once.
        state = completeSitting(state, sitting.id);
        saveState(state);
        location.hash = "#/fertig/" + sitting.id;
      }
    });
  }

  /* Speaking (Quaki): the Aussprache-Check's provider, loaded only when "Speak" is
     tapped — so the speech SDK and the mic prompt never happen before that. Friendly per
     word, one tip at most. Anything that goes wrong leaves "Not now" there. */
  async function speakTask(task, again) {
    if (run.speak) return;
    run.speak = "prep";
    run.speakMsg = null;
    again();
    const who = run;
    let mod = null;
    try {
      mod = await import("./einfach-sprechen.js");
      const result = await mod.assessSentence(task, {
        onListening: () => {
          if (run !== who) return;
          run.speak = "rec";
          again();
        },
      });
      if (run !== who) return;
      run.result = result;
      run.answer = "said";
      recordTask(task, true);
      run.right++;
      run.line = BRUNO_LINES.spoke[lineTurn++ % BRUNO_LINES.spoke.length];
    } catch (err) {
      if (run !== who) return;
      run.speakMsg = mod ? mod.messageFor(err) : "Speaking doesn't work right now. Tap “Not now”.";
    } finally {
      if (run === who) {
        run.speak = null;
        again();
      }
    }
  }

  /** The one number easy mode shows: the site's weekly goal, the same one as the dashboard. */
  function weekSentence(week) {
    return week.reached
      ? `This week: ${count(week.done, "task")} — weekly goal reached.`
      : `This week: ${week.done} of ${count(week.goal, "task")}.`;
  }

  /* ------------------------------------------------------------- fertig

     The payoff screen, and the reason the study exists. It does not lead with
     a score — it leads with the sentence the learner just bought, then the
     weekly goal as one small sentence, then a postcard from Bruno.
  */

  function fertig(id) {
    const sitting = id === "fehler" ? run?.unit : unitById(id);
    const next = nextSitting(state);
    run = null;
    if (!sitting) {
      location.hash = "#/heute";
      return;
    }

    shell({
      title: "Done",
      body: `
        <div class="el-win">
          <span class="el-win-ic" aria-hidden="true">${sitting.icon}</span>
          ${
            sitting.claims.length
              ? `<p class="el-win-lead">Now you can:</p>
                 <ul class="el-claims">${sitting.claims.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
              : `<p class="el-win-lead">Practised again. Now you know it better.</p>`
          }
          <p class="el-win-sub">${esc(weekSentence(weekProgress()))}</p>
        </div>
        ${sitting.postcard ? postcard(sitting.postcard) : ""}
        ${
          sitting.grammar
            ? `<a class="el-quiet el-quiet--link" href="/${esc(sitting.grammar)}" data-to-site>More about this in the course</a>`
            : ""
        }
        <button class="el-shelf-peek" type="button" data-go="kannst">
          <b>Everything you can do</b>
          <i>Your sentences and postcards</i>
        </button>
      `,
      action:
        next.id === sitting.id
          ? `<button class="el-cta" type="button" data-go="heute">Back</button>`
          : `<button class="el-cta" type="button" data-go="uebung/${next.id}">${minutes(next.minutes)} more: ${esc(next.title)}</button>`,
    });
  }

  /* A postcard is content, not decoration: with the mascots off it stays, only the
     "from Bruno" and his little drawing go. */
  function postcard(card) {
    return `
      <article class="el-postcard">
        <span class="el-stamp" aria-hidden="true">✉</span>
        <p class="el-postcard-from">
          <span data-mascot-part>A postcard from Bruno in ${esc(card.city)}</span>
          <span class="el-when-off">A postcard from ${esc(card.city)}</span>
        </p>
        <p class="el-postcard-fact">${esc(card.fact)}</p>
        <span class="mascot el-postcard-bruno">${mascotSvg({ name: "bruno", expr: "celebrate", size: 56, label: "" })}</span>
      </article>`;
  }

  /* ------------------------------------------------------------- kannst

     The dashboard, replaced. No bars, no percentages, no per-skill grid — a
     list of things the learner can do, which is the only progress number they
     can actually feel. What is still to come is listed in the same voice, so
     the catalogue reads as a shelf of abilities rather than a pile of topics.
  */

  function kannst() {
    const cans = capabilities(state);
    // What comes next, in the same voice — the next three, not the whole catalogue.
    const open = units().filter((s) => !state.done.includes(s.id)).slice(0, 3);
    const cards = postcards(state);

    shell({
      back: "heute",
      title: "What you can do",
      body: `
        ${
          cans.length
            ? `<ul class="el-claims el-claims--shelf">${cans
                .map((c) => `<li>${esc(c.text)}<i>${esc(c.from)}</i></li>`)
                .join("")}</ul>`
            : `<p class="el-note">Nothing yet — one round is enough for your first sentence.</p>`
        }
        ${
          cards.length
            ? `<p class="el-hello el-hello--sm">Your postcards</p>
               <div class="el-cards">${cards
                 .map(
                   (c) => `<div class="el-card-mini"><b>${esc(c.city)}</b><i>${esc(c.fact)}</i></div>`
                 )
                 .join("")}</div>`
            : ""
        }
        ${
          open.length
            ? `<p class="el-hello el-hello--sm">Coming next:</p>
               <ul class="el-claims el-claims--open">${open.map((s) => `<li>${esc(s.claims[0])}</li>`).join("")}</ul>`
            : `<p class="el-note">You have finished everything on this path.</p>`
        }
        <button class="el-quiet" type="button" data-reset>Start Step by step again</button>
      `,
      center: true,
      action: `<button class="el-cta" type="button" data-go="heute">Back</button>`,
    });

    root.querySelector("[data-reset]")?.addEventListener("click", () => {
      resetState();
      state = loadState();
      run = null;
      if (location.hash === "#/kannst") render();
      else location.hash = "#/kannst";
    });
  }

  /* -------------------------------------------------------------- router */

  function render() {
    const [screen, arg] = (location.hash.replace(/^#\/?/, "") || "heute").split("/");
    if (screen === "waehlen") return waehlen();
    if (screen === "situationen") return situationen(Number(arg) || 0);
    if (screen === "uebung") return uebung(arg);
    if (screen === "fertig") return fertig(arg);
    if (screen === "kannst") return kannst();
    if (screen === "check") return checkScreen();
    return heute();
  }

  // The mode the learner used last: the homepage and the nav offer it on return.
  try {
    localStorage.setItem("da-last-mode", "einfach");
  } catch {}

  addEventListener("hashchange", render);
  // Switching the mascots on or off re-renders, so nothing is left half-drawn.
  onMascotsChange(() => render());
  render();
}
