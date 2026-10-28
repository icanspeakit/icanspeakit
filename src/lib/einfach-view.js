/* /einfach — the screens.
 *
 * One <div> is handed in and every screen is rendered into it, so there is exactly one
 * thing on the phone at a time and no scroll position to lose between steps. Routing is
 * the hash, purely so Android's back button walks the flow backwards the way a learner
 * expects it to.
 *
 * Rules the prototype is testing, and which every screen below obeys:
 *   1. One decision per screen. Three options is the ceiling; a grid is a failure.
 *   2. A sitting, never a pile. No screen states a total — not 3.375 Wörter, not 28 Themen.
 *   3. Progress is a sentence, not a percent: "Du fragst nach dem Weg."
 *   4. The primary action sits in the thumb zone and there is only ever one of it.
 *
 * Bruno (EINFACH-LERNEN-TIERED-PROMPT.md, Tier 1): a companion that is always in the same spot — just
 * above the action bar in the runner — reacts to the answer, gives a hint when tapped,
 * and walks the progress path. Everything that is only there for the mascots carries
 * `.mascot` or `[data-mascot-part]`, so "Maskottchen anzeigen: aus" removes it and the
 * flow stays complete: verdict text, path, weekly goal and postcards do not depend on him.
 *
 * Einfach lernen, Tier 2: the units are real (src/data/einfach-pfad.json). Heute offers only
 * the next one; "Ich will etwas anderes" leads to at most three choices — the next unit,
 * the mistakes (once there are enough), another situation — and the situation picker
 * shows three at a time.
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

/* Everything Bruno says, in one place. Short (≤ 8 words), easy German, warm, never
   blaming; `en` is what a tap on the bubble shows. No line mentions missed days. */
const BRUNO_LINES = {
  right: [
    { de: "Super!", en: "Great!" },
    { de: "Genau so!", en: "Exactly!" },
    { de: "Wuff, richtig!", en: "Woof, right!" },
  ],
  wrong: [
    { de: "Fast! Nochmal ansehen.", en: "Almost! Take another look." },
    { de: "Kein Problem.", en: "No problem." },
    { de: "Das lernen wir zusammen.", en: "We'll learn this together." },
  ],
  first: { de: "Hallo, ich bin Bruno. Hast du zwei Minuten?", en: "Hi, I'm Bruno. Do you have two minutes?" },
  back: { de: "Schön, dass du wieder da bist.", en: "Nice to have you back." },
  hello: [
    { de: "Gassi gehen? Erst Deutsch!", en: "Walkies? German first!" },
    { de: "Auf geht's!", en: "Let's go!" },
    { de: "Ich hab schon auf dich gewartet.", en: "I've been waiting for you." },
  ],
  hintless: { de: "Schau genau hin. Du schaffst das.", en: "Look closely. You can do it." },
  known: { de: "Das kennst du schon!", en: "You know this one!" },
  skipped: { de: "Kein Problem. Ein anderes Mal.", en: "No problem. Another time." },
  spoke: [
    { de: "Schön gesprochen!", en: "Nicely said!" },
    { de: "Gut gemacht!", en: "Well done!" },
  ],
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
    clip = new Audio(src);
    return clip.play().catch(() => text && say(text));
  }
  return text ? say(text) : Promise.resolve();
}
function say(text) {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.9;
  synth.speak(u);
  return Promise.resolve();
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* "Ja" + ", ein bisschen." must not read "Ja , ein bisschen.": no space before punctuation. */
const gapLine = (before, blank, after) =>
  `${before ? esc(before) + " " : ""}${blank}${after ? (/^[.,;:!?]/.test(after) ? "" : " ") + esc(after) : ""}`;
const splitGapView = (prompt) => {
  const i = prompt.indexOf("___");
  return i === -1 ? { before: prompt, after: "" } : { before: prompt.slice(0, i).trim(), after: prompt.slice(i + 3).trim() };
};
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

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
            ? `<button class="el-back" type="button" data-go="${back}" aria-label="Zurück">‹</button>`
            : home
              ? `<a class="el-back el-back--home" href="/" data-to-site aria-label="Zur ganzen Seite" title="Zur ganzen Seite">⌂</a>`
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
    // A bubble is German; a tap shows the English and a second tap goes back.
    root.querySelectorAll("[data-bubble]").forEach((el) =>
      el.addEventListener("click", () => {
        if (!el.dataset.en) return;
        const toEn = el.dataset.lang !== "en";
        el.dataset.lang = toEn ? "en" : "de";
        el.lang = toEn ? "en" : "de";
        el.querySelector("span").textContent = toEn ? el.dataset.en : el.dataset.de;
      })
    );
  }

  /* ------------------------------------------------------------- Bruno */

  function brunoSvg(expr, size) {
    const fade = lastExpr !== null && lastExpr !== expr ? " el-fade" : "";
    lastExpr = expr;
    return mascotSvg({ name: "bruno", expr, size, label: "", className: "el-bruno-svg" + fade });
  }

  /** A speech bubble: real text in the mascot voice, German first, English on tap. */
  function bubble(line, extra = "") {
    if (!line) return `<span class="el-bubble el-bubble--empty" data-mascot-part aria-hidden="true"></span>`;
    const en = line.en ? ` data-en="${esc(line.en)}"` : "";
    return `<button type="button" class="el-bubble ${extra}" data-mascot-part data-bubble data-de="${esc(line.de)}"${en} lang="de"
      aria-live="polite"${line.en ? ` title="Tippen: English"` : ""}><span>${esc(line.de)}</span></button>`;
  }

  /** The runner's companion row: Bruno (a hint button), the skill helper, the bubble. */
  function buddyRow({ expr, line, helper, taskKey }) {
    const hop = helper && hoppedFor !== taskKey ? " el-hop" : "";
    if (helper) hoppedFor = taskKey;
    return `
      <div class="el-buddy-row" data-mascot-part>
        <button type="button" class="mascot el-buddy" data-hint aria-label="Tipp von Bruno">${brunoSvg(expr, 64)}</button>
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
      root.innerHTML = `<p class="el-note" style="padding:24px">Hier gibt es gerade nichts zu üben.</p>`;
      return;
    }
    const away = daysAway(state);
    const first = !state.done.length && !state.greeted;
    const back = away !== null && away >= 3;
    const line = first ? BRUNO_LINES.first : back ? BRUNO_LINES.back : BRUNO_LINES.hello[state.done.length % BRUNO_LINES.hello.length];
    lastExpr = null;

    shell({
      home: true,
      title: "Heute",
      body: `
        <div class="el-greet" data-mascot-part>
          <span class="mascot el-greet-bruno" data-greet-bruno>${mascotSvg({ name: "bruno", expr: back ? "sleepy" : "happy", size: 88, label: "" })}</span>
          ${bubble(line, "el-bubble--big")}
        </div>
        ${first ? `<button class="el-quiet el-quiet--tiny" type="button" data-mascot-part data-mascots-off>Maskottchen ausblenden</button>` : ""}
        ${mascotsOffNote ? `<p class="el-note" role="status">Maskottchen sind aus. Wieder an: <a href="/konto">Konto → Einstellungen</a>.</p>` : ""}

        <p class="el-hello">${state.done.length ? "Weiter geht es." : "Zwei Minuten reichen."}</p>

        <button class="el-offer" type="button" data-go="uebung/${next.id}">
          <span class="el-offer-ic" aria-hidden="true">${next.icon}</span>
          <span class="el-offer-txt">
            <b>${esc(next.title)}</b>
            <i>${next.tasks.length} Aufgaben · ${next.minutes} Minuten${next.level ? ` · ${next.level}` : ""}</i>
          </span>
          <span class="el-offer-go" aria-hidden="true">→</span>
        </button>

        ${cans.length ? "" : `<p class="el-note">Nach der ersten Runde steht hier, was du kannst.</p>`}
        ${mistakeUnit(state) ? `<button class="el-quiet el-quiet--strong" type="button" data-go="uebung/fehler">🔁 Fehler wiederholen</button>` : ""}

        <button class="el-quiet" type="button" data-go="waehlen">Ich will etwas anderes</button>
      `,
      center: true,
      action: `<button class="el-cta" type="button" data-go="uebung/${next.id}">Los — ${next.minutes} Minuten</button>`,
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

     First visit: „Wo fängst du an?" — three answers. The two unsure ones run six quick
     items from einstufung.json, one per screen, no right/wrong shown (it is not a test),
     and end in a sentence, never a level code. */

  function start() {
    shell({
      title: "Einfach lernen",
      home: true,
      body: `
        <div class="el-greet" data-mascot-part>
          <span class="mascot el-greet-bruno">${mascotSvg({ name: "bruno", expr: "happy", size: 88, label: "" })}</span>
          ${bubble(BRUNO_LINES.first, "el-bubble--big")}
        </div>
        <button class="el-quiet el-quiet--tiny" type="button" data-mascot-part data-mascots-off>Maskottchen ausblenden</button>
        ${mascotsOffNote ? `<p class="el-note" role="status">Maskottchen sind aus. Wieder an: <a href="/konto">Konto → Einstellungen</a>.</p>` : ""}
        <p class="el-hello">Wo fängst du an?</p>
        <div class="el-picks">
          <button class="el-pick" type="button" data-place="anfang">
            <span class="el-pick-ic" aria-hidden="true">🌱</span>
            <span class="el-pick-txt"><b>Ganz am Anfang</b><i>Ich lerne gerade die ersten Wörter.</i></span>
          </button>
          <button class="el-pick" type="button" data-place="check">
            <span class="el-pick-ic" aria-hidden="true">🙂</span>
            <span class="el-pick-txt"><b>Ich kann schon etwas</b><i>Sechs kurze Fragen</i></span>
          </button>
          <button class="el-pick" type="button" data-place="check">
            <span class="el-pick-ic" aria-hidden="true">🤔</span>
            <span class="el-pick-txt"><b>Ich weiß es nicht</b><i>Sechs kurze Fragen</i></span>
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
      title: "Kurz schauen",
      body: `
        ${walkPlain(items.length, check.i)}
        <div class="el-task" tabindex="-1">
          <p class="el-kind">Was passt?</p>
          <p class="el-sentence">${gapLine(gap.before, `<span class="el-blank">___</span>`, gap.after)}</p>
          <p class="el-gloss">Rate ruhig. Hier gibt es kein Falsch.</p>
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
      title: "Einfach lernen",
      body: `
        <div class="el-win">
          <span class="el-win-ic" aria-hidden="true">🧭</span>
          <p class="el-win-lead">${esc(placementSentence(right, startId))}</p>
        </div>
      `,
      center: true,
      action: `<button class="el-cta" type="button" data-go="heute">Los geht's</button>`,
    });
  }

  /* The placement check's walk: plain stops, no Bruno walking — it is not a unit. */
  function walkPlain(n, i) {
    const stops = Array.from({ length: n }, (_, k) => `<span class="el-stop ${k < i ? "is-done" : k === i ? "is-now" : ""}"></span>`).join("");
    return `<div class="el-walk" role="progressbar" aria-label="Fortschritt" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${i}">${stops}</div>`;
  }

  /* ------------------------------------------------------------- waehlen

     "Ich will etwas anderes": one question, at most three answers — the next unit, the
     mistakes (only once there are enough to fill a sitting), another situation. No
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
      title: "Was jetzt?",
      body: `
        <p class="el-hello">Worauf hast du Lust?</p>
        <div class="el-picks">
          ${choice({ go: `uebung/${next.id}`, icon: next.icon, title: next.title, sub: `Als Nächstes · ${next.minutes} Minuten` })}
          ${fehler ? choice({ go: "uebung/fehler", icon: fehler.icon, title: fehler.title, sub: "Was noch nicht saß" }) : ""}
          ${others.list.length ? choice({ go: "situationen", icon: "🗺️", title: "Eine andere Situation", sub: "Du suchst aus" }) : ""}
        </div>
        ${capabilities(state).length ? `<button class="el-quiet" type="button" data-go="kannst">Das kannst du schon</button>` : ""}
      `,
    });
  }

  /* Another situation: three at a time, not yet done first. "Andere zeigen" turns the
     page instead of growing a list — a list that scrolls is already one list too many. */
  function situationen(page = 0) {
    const { list, more } = otherUnits(state, page);
    shell({
      back: "waehlen",
      title: "Andere Situation",
      body: `
        <p class="el-hello">Wobei willst du sicherer werden?</p>
        <div class="el-picks">
          ${list
            .map((u) =>
              choice({
                go: `uebung/${u.id}`,
                icon: u.icon,
                title: u.title,
                sub: `${u.minutes} Minuten${state.done.includes(u.id) ? " · schon gemacht" : ""}`,
                done: state.done.includes(u.id),
              })
            )
            .join("")}
        </div>
        ${more ? `<button class="el-quiet" type="button" data-go="situationen/${page + 1}">Andere zeigen</button>` : ""}
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
        ? `<button class="el-cta" type="button" data-next>${run.i + 1 < sitting.tasks.length ? "Weiter" : "Fertig"}</button>`
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
    return `<div class="el-walk" role="progressbar" aria-label="Fortschritt" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${run.i}">${stops}</div>`;
  }

  function isRight(task) {
    if (task.type === "wort") return run.answer === "1";
    if (task.type === "satz") return run.answer === "ok";
    if (task.type === "sprechen") return run.answer === "said";
    return run.answer === task.answer;
  }

  /** "Wort" — plus, on a due item, that the learner has met it before. */
  const kind = (task, label) => `<p class="el-kind">${label}${task.review ? ` · <span class="el-known">kennst du schon</span>` : ""}</p>`;

  function taskBody(task) {
    const open = run.flipped || run.answer !== null;

    if (task.type === "wort") {
      const plural = task.plural ? `<span class="el-card-plural">${esc(task.plural)}</span>` : "";
      return `
        ${kind(task, "Wort")}
        <button class="el-card" type="button" data-flip>
          <span class="el-card-inner ${open && !run.flipAnim ? "is-flipped" : ""}">
            <span class="el-face" ${open ? `aria-hidden="true"` : ""}>
              <b>${esc(task.front)}</b>${plural}
              <span class="el-card-tap">tippen</span>
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
        ${kind(task, "Artikel")}
        <p class="el-sentence"><span class="el-blank ${blankState}">${esc(run.answer || "___")}</span> ${esc(task.noun)}</p>
        ${task.back ? `<p class="el-gloss">${esc(task.back)}</p>` : ""}
      `;
    }

    if (task.type === "luecke") {
      return `
        ${kind(task, "Satz")}
        <p class="el-sentence">${gapLine(task.before, `<span class="el-blank ${blankState}">${esc(run.answer || "___")}</span>`, task.after)}</p>
      `;
    }

    if (task.type === "hoeren") {
      // Replay as often as wanted, no clock. The transcript comes after the answer.
      return `
        ${kind(task, "Hören")}
        <p class="el-listen-title">${esc(task.title)}</p>
        <button class="el-play" type="button" data-play>
          <span aria-hidden="true">▶</span> ${run.played ? "Nochmal anhören" : "Anhören"}
        </button>
        <p class="el-question">${esc(task.prompt)}</p>
        ${
          run.answer !== null
            ? `<details class="el-transcript" open><summary>Das hast du gehört</summary>${task.transcript
                .map((l) => `<p>${esc(l)}</p>`)
                .join("")}</details>`
            : ""
        }
      `;
    }

    if (task.type === "redemittel") {
      return `
        ${kind(task, "Was sagst du?")}
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
        ${kind(task, "Sprechen")}
        <p class="el-sentence el-sentence--speak">${words}</p>
        <button class="el-play" type="button" data-play>
          <span aria-hidden="true">▶</span> Anhören
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
      <p class="el-kind">Bau den Satz</p>
      <div class="el-line ${run.answer ? (run.answer === "ok" ? "is-right" : "is-wrong") : ""}">
        ${
          run.built.map((w, n) => `<button class="el-word" type="button" data-un="${n}">${esc(w)}</button>`).join("") ||
          `<span class="el-line-ph">tippe die Wörter an</span>`
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
             <button class="el-cta el-cta--ghost" type="button" data-know="0">Nochmal</button>
             <button class="el-cta" type="button" data-know="1">Kann ich</button>
           </div>`
        : `<button class="el-cta" type="button" data-flip>Umdrehen</button>`;
    }
    if (task.type === "artikel" || task.type === "luecke") {
      const opts = task.type === "artikel" ? ["der", "die", "das"] : run.opts;
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
      // The mic is only asked for once "Sprechen" is tapped. Not speaking never costs anything.
      const rec = run.speak === "rec" || run.speak === "prep";
      return `<div class="el-two">
          <button class="el-cta el-cta--ghost" type="button" data-skip>Jetzt nicht sprechen</button>
          <button class="el-cta" type="button" data-speak${rec ? " disabled" : ""}>${
            run.speak === "prep" ? "Moment …" : run.speak === "rec" ? "Ich höre zu …" : run.speakMsg ? "Nochmal" : "Sprechen"
          }</button>
        </div>`;
    }
    return `<button class="el-cta" type="button" data-check${run.built.length < task.chips.length ? " disabled" : ""}>Prüfen</button>`;
  }

  /* The verdict text is the source of truth for right/wrong; Bruno's bubble is extra. */
  function verdict(task) {
    if (task.type === "sprechen") {
      if (run.answer === "skip") return `<p class="el-said is-right">Kein Problem. Wir sprechen ein anderes Mal.</p>`;
      const tip = run.result?.tip;
      return `<p class="el-said is-right">${run.result?.good ? "Gut gesprochen." : "Schon gut!"}${
        tip ? `<i>Ein Tipp zu „${esc(tip.word)}“: ${esc(tip.text)}</i>` : ""
      }</p>`;
    }
    const ok = isRight(task);
    const solution = task.type === "satz" ? task.answer.join(" ") + (task.end || "") : task.answer;
    const line =
      task.type === "wort"
        ? ok
          ? "Gemerkt."
          : `Kommt wieder — <b>${esc(task.front)}</b> heißt ${esc(task.back)}.`
        : ok
          ? "Richtig."
          : `Fast. Richtig ist <b>${esc(solution)}</b>${/[.!?…]$/.test(solution) ? "" : "."}`;
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
      run.line = task.hint ? { de: task.hint, en: task.hintEn } : BRUNO_LINES.hintless;
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

  /* Speaking (Quaki): the Aussprache-Check's provider, loaded only when "Sprechen" is
     tapped — so the speech SDK and the mic prompt never happen before that. Friendly per
     word, one tip at most. Anything that goes wrong leaves "Jetzt nicht sprechen" there. */
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
      run.speakMsg = mod ? mod.messageFor(err) : "Sprechen geht gerade nicht. Tippe auf „Jetzt nicht sprechen“.";
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
      ? `Diese Woche: ${week.done} Aufgaben — Wochenziel geschafft.`
      : `Diese Woche: ${week.done} von ${week.goal} Aufgaben.`;
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
      title: "Fertig",
      body: `
        <div class="el-win">
          <span class="el-win-ic" aria-hidden="true">${sitting.icon}</span>
          ${
            sitting.claims.length
              ? `<p class="el-win-lead">Das kannst du jetzt:</p>
                 <ul class="el-claims">${sitting.claims.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
              : `<p class="el-win-lead">Nochmal geübt. Das sitzt jetzt besser.</p>`
          }
          <p class="el-win-sub">${esc(weekSentence(weekProgress()))}</p>
        </div>
        ${sitting.postcard ? postcard(sitting.postcard) : ""}
        ${
          sitting.grammar
            ? `<a class="el-quiet el-quiet--link" href="/${esc(sitting.grammar)}" data-to-site>Mehr dazu im Kurs</a>`
            : ""
        }
        <button class="el-shelf-peek" type="button" data-go="kannst">
          <b>Alles, was du kannst</b>
          <i>Deine Sätze und Postkarten</i>
        </button>
      `,
      action:
        next.id === sitting.id
          ? `<button class="el-cta" type="button" data-go="heute">Zurück</button>`
          : `<button class="el-cta" type="button" data-go="uebung/${next.id}">Noch ${next.minutes} Minuten: ${esc(next.title)}</button>`,
    });
  }

  /* A postcard is content, not decoration: with the mascots off it stays, only the
     "von Bruno" and his little drawing go. */
  function postcard(card) {
    return `
      <article class="el-postcard">
        <span class="el-stamp" aria-hidden="true">✉</span>
        <p class="el-postcard-from">
          <span data-mascot-part>Post von Bruno aus ${esc(card.city)}</span>
          <span class="el-when-off">Postkarte aus ${esc(card.city)}</span>
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
      title: "Das kannst du",
      body: `
        ${
          cans.length
            ? `<ul class="el-claims el-claims--shelf">${cans
                .map((c) => `<li>${esc(c.text)}<i>${esc(c.from)}</i></li>`)
                .join("")}</ul>`
            : `<p class="el-note">Noch nichts — eine Runde reicht für den ersten Satz.</p>`
        }
        ${
          cards.length
            ? `<p class="el-hello el-hello--sm">Deine Postkarten</p>
               <div class="el-cards">${cards
                 .map(
                   (c) => `<div class="el-card-mini"><b>${esc(c.city)}</b><i>${esc(c.fact)}</i></div>`
                 )
                 .join("")}</div>`
            : ""
        }
        ${
          open.length
            ? `<p class="el-hello el-hello--sm">Als Nächstes zu haben:</p>
               <ul class="el-claims el-claims--open">${open.map((s) => `<li>${esc(s.claims[0])}</li>`).join("")}</ul>`
            : `<p class="el-note">Alles auf diesem Weg ist geschafft.</p>`
        }
        <button class="el-quiet" type="button" data-reset>Einfach lernen von vorn</button>
      `,
      center: true,
      action: `<button class="el-cta" type="button" data-go="heute">Zurück</button>`,
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
