/* The guided run (/grammar/path).
 *
 * The grammar hub is a wall of 27 cards across four levels. That is the right shape for
 * someone who knows what they are looking for, and the wrong shape for everyone else:
 * choosing a topic is itself a skill, and a learner who cannot place themselves on the
 * CEFR scale cannot place a topic on it either. So the hub now asks once — pick for me,
 * or let me pick — and this is the first answer.
 *
 * The run makes exactly one promise: you never choose anything. It walks the syllabus
 * (src/data/grammatik-lehrplan.json) one exercise at a time, says what the topic is when
 * a new one starts, and the only control is "weiter". Where it stopped is remembered, so
 * closing the tab is a pause rather than a loss.
 *
 * It does not grade you into or out of anything by itself. It starts at the beginning,
 * and moving is the learner's own business: the jump control skips a topic when one is
 * too easy, which is a choice they can actually make. The one exception is a level the
 * learner was given (2026-11-14): the placement test's "Start your first lesson" opens
 * /grammar/path?niveau=a2, and the run starts at the first topic of that level. The
 * parameter is then removed from the address, so a reload continues where you are.
 *
 * Each topic is a lesson: when its last exercise is done, a short break says so and names
 * the next one ("Go on" / "Done for today"), instead of running straight into it. Without
 * that, a learner who is not used to teaching themselves never gets a place to stop.
 */
import { recordAttempt } from "./progress.js";
import { withBase } from "./paths.js";
import { mountGrammarWorkspace } from "./grammarWorkspace.js";
import { topicKeyOf } from "./grammarTasks.js";
import { endSet, setRef } from "./versuche.js";
import { t, onUiText, uitHtml } from "./uiText.js";
import { celebrate } from "./mascotCelebrate.js";

// The place used to be a station number (CURSOR_KEY_OLD). Halving the lessons renumbered
// every station, so it is now kept as topic + exercise; an old number is read once and
// translated (loadCursor).
const CURSOR_KEY_OLD = "da-grammatik-lauf";
const CURSOR_KEY = "da-grammatik-lauf-2";

const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
};

/** Every exercise of every topic, flattened — the run's addressable unit is one exercise.
 * `topic.only` (set by lauf.astro for topics split across two levels) limits a topic to
 * some of its exercises; the indexes stay those of the full list, which the engine needs.
 *
 * A lesson in the run is the first half of the topic's exercises (2026-11-15: seven in a
 * row was too much for someone just starting; 7 → 4, 6 → 3, at least two). The first
 * ones are the recognising ones, the topic page keeps all of them. `half: false` gives
 * the full list, for reading an old saved place. */
export function buildStations(topics, { half = true } = {}) {
  const out = [];
  topics.forEach((topic, ti) => {
    let idx = topic.only ?? (topic.exercises ?? []).map((_, i) => i);
    if (half) idx = idx.slice(0, Math.max(Math.min(2, idx.length), Math.ceil(idx.length / 2)));
    idx.forEach((xi, n) => {
      out.push({
        topicIndex: ti,
        exIndex: xi,
        // The learner meets the topic once, at its first exercise. After that the header
        // keeps naming it, but nothing stops the page again.
        first: n === 0,
        last: n === idx.length - 1,
      });
    });
  });
  return out;
}

/** A lesson in the run asks fewer items than the topic page (2026-11-15: eight rows of
 * one table felt like too many). The list fields of each exercise type keep their first
 * 70 % (6 → 4, 10 → 7), at least three. Sentence building, where every sentence has its
 * own Check, keeps three at most. A story is one text and stays whole. The topic page
 * keeps every item. */
const LISTS = ["items", "rows", "pairs", "sentences", "rounds"];
export function shorten(ex) {
  const out = { ...ex };
  for (const k of LISTS) {
    const list = ex[k];
    if (!Array.isArray(list) || list.length <= 3) continue;
    let keep = Math.max(3, Math.round(list.length * 0.7));
    if (k === "sentences") keep = 3;
    out[k] = list.slice(0, keep);
  }
  return out;
}

/** The one sentence a topic opens with. A later level's part of a split topic says that
 * it is the same topic again, one level up. */
function leadOf(topic) {
  if (topic.part) return t("run.partLead", "Dieses Thema kennst du schon. Jetzt kommt der Teil für {level}.", { level: topic.part });
  return topic.subtitleKey ? t(topic.subtitleKey, topic.subtitle ?? "") : topic.subtitle ?? "";
}

const topicKey = (topic) => `${topic.id}${topic.part ? `:${topic.part}` : ""}`;

/** The saved place as a station index: topic + exercise, or the topic's first station if
 * that exercise is no longer in the lesson. An old station number is read against the
 * full list it was counted in. */
function loadCursor(stations, topics) {
  const find = (key, x) => {
    const inTopic = stations.map((s, i) => [s, i]).filter(([s]) => topicKey(topics[s.topicIndex]) === key);
    if (!inTopic.length) return null;
    return (inTopic.find(([s]) => s.exIndex === x) ?? inTopic[0])[1];
  };
  try {
    const saved = JSON.parse(localStorage.getItem(CURSOR_KEY) ?? "null");
    if (saved?.t) return find(saved.t, saved.x) ?? 0;
    const n = parseInt(localStorage.getItem(CURSOR_KEY_OLD), 10);
    const old = buildStations(topics, { half: false })[n];
    if (Number.isInteger(n) && old) return find(topicKey(topics[old.topicIndex]), old.exIndex) ?? 0;
  } catch {}
  return 0;
}

function saveCursor(n, stations, topics) {
  const s = stations[n];
  try {
    localStorage.setItem(CURSOR_KEY, JSON.stringify(s ? { t: topicKey(topics[s.topicIndex]), x: s.exIndex } : {}));
  } catch {}
}

/** ?niveau=a2 → the first station of the first A2 topic, or null. Read once, then removed
 * from the address (see the header). */
function levelStart(stations, topics) {
  let level = null;
  try {
    const url = new URL(location.href);
    level = (url.searchParams.get("niveau") ?? "").toUpperCase();
    if (url.searchParams.has("niveau")) {
      url.searchParams.delete("niveau");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
  } catch {}
  if (!level) return null;
  const i = stations.findIndex((s) => topics[s.topicIndex].level === level);
  return i >= 0 ? i : null;
}

export function mountGrammarRun(root, topics) {
  if (!root || !topics?.length) return;
  // The language the course teaches, for lang= on its words and sentences (data-run-lang).
  const TARGET_LANG = root.dataset.runLang ?? "";
  const stations = buildStations(topics);
  if (!stations.length) return;

  const $ = (sel) => root.querySelector(sel);
  const bar = $("[data-run-bar]");
  const count = $("[data-run-count]");
  const eyebrow = $("[data-run-eyebrow]");
  const title = $("[data-run-title]");
  const lead = $("[data-run-lead]");
  const intro = $("[data-run-intro]");
  const stage = $("[data-run-stage]");
  const nextBtn = $("[data-run-next]");
  const skipBtn = $("[data-run-skip]");
  const restartBtn = $("[data-run-restart]");
  const doneEl = $("[data-run-done]");
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  // The run labels this button itself ("Skip exercise" / "Next"); i18n.js repainting its
  // static data-i18n would turn a skip back into "Next".
  nextBtn?.removeAttribute("data-i18n");

  // A lesson starts with the few words it uses (lektion-extras.json), so the exercises do
  // not stop on vocabulary. Shown with the topic's one sentence, at its first exercise only.
  const words = document.createElement("div");
  words.className = "run-words";
  words.hidden = true;
  intro?.appendChild(words);
  function paintWords(topic) {
    words.hidden = !topic.words?.length;
    if (!topic.words?.length) return;
    words.innerHTML = `<p class="run-intro-label">${esc(t("run.words", "Words for this lesson"))}</p>
      <ul class="run-words-list">${topic.words.map((w) => `<li><span class="run-word" lang="${esc(TARGET_LANG)}">${esc(w.front)}</span>${
        w.translations ? ` <span class="run-word-tr">${uitHtml(w.translations.en ?? "", w.translations, esc)}</span>` : ""}</li>`).join("")}</ul>`;
  }

  const given = levelStart(stations, topics);
  let cursor = given ?? loadCursor(stations, topics);
  if (given != null) saveCursor(given, stations, topics);
  let answered = false;

  const topicOf = (i) => topics[stations[i].topicIndex];
  const nameOf = (topic) => (topic.part ? `${topic.name} (${topic.part})` : topic.name);

  // Progress is counted small (2026-11-15): the exercise inside this lesson, and the lesson
  // inside this level. The whole path (400+ exercises, 60+ topics) is too far away to feel
  // like progress; "Exercise 2 of 5" is something you finish in one sitting.
  const lessons = [...new Set(stations.map((s) => s.topicIndex))].map((i) => topics[i]);
  function placeOf(i) {
    const ti = stations[i].topicIndex;
    let a = i;
    let b = i;
    while (a > 0 && stations[a - 1].topicIndex === ti) a--;
    while (b + 1 < stations.length && stations[b + 1].topicIndex === ti) b++;
    const topic = topics[ti];
    const sameLevel = lessons.filter((x) => x.level === topic.level);
    return { n: i - a + 1, total: b - a + 1, lesson: sameLevel.indexOf(topic) + 1, lessons: sameLevel.length };
  }

  function paintCounters() {
    const p = placeOf(cursor);
    count.textContent = t("run.exercise", "Aufgabe {n} von {total}", { n: p.n, total: p.total });
    bar.style.width = `${(p.n / p.total) * 100}%`;
    eyebrow.textContent = `${topicOf(cursor).level} · ${t("run.lessonPos", "Lektion {n} von {total}", { n: p.lesson, total: p.lessons })}`;
  }

  // The break between two lessons (see the header). Built here rather than in path.astro,
  // which differs a little per course; it borrows the end screen's look (.run-done).
  const pause = document.createElement("div");
  pause.className = "run-done run-pause";
  pause.hidden = true;
  pause.innerHTML = `
    <h2 data-run-pause-title></h2>
    <div class="run-can-say" data-run-can-say hidden></div>
    <p data-run-pause-next></p>
    <div class="run-done-actions">
      <button type="button" class="quiz-btn quiz-btn--primary" data-run-pause-go></button>
      <a class="quiz-btn" data-run-pause-stop></a>
    </div>`;
  (doneEl ?? stage).insertAdjacentElement("beforebegin", pause);
  const pauseGo = pause.querySelector("[data-run-pause-go]");
  const pauseStop = pause.querySelector("[data-run-pause-stop]");
  // "Done for today" opens the learner's progress page, where the lesson just finished
  // shows up, rather than the home page (2026-11-15, as on deutschacademy).
  pauseStop.href = withBase("/progress");
  /** The station the break leads on to, while it is shown. */
  let pauseAt = null;

  function paintPause() {
    // Crossing into the next level is the bigger milestone, so the break says that instead.
    const done = topicOf(cursor);
    pause.querySelector("[data-run-pause-title]").textContent =
      done.level !== topicOf(pauseAt).level
        ? t("run.levelDone", "{level} geschafft", { level: done.level })
        : t("run.lessonDone", "Lesson done: {topic}", { topic: nameOf(done) });
    // What the lesson was for, in one sentence the learner can now say (lektion-extras.json).
    const canSay = pause.querySelector("[data-run-can-say]");
    canSay.hidden = !done.canSay;
    if (done.canSay) {
      canSay.innerHTML = `<p class="run-can-say-label">${esc(t("run.canSay", "You can now say:"))}</p>
        <p class="run-can-say-front" lang="${esc(TARGET_LANG)}">${esc(done.canSay.front)}</p>
        ${done.canSay.translations ? `<p class="run-can-say-tr">${uitHtml(done.canSay.translations.en ?? "", done.canSay.translations, esc)}</p>` : ""}`;
    }
    pause.querySelector("[data-run-pause-next]").textContent =
      t("run.lessonNext", "Next lesson: {topic}. It continues here whenever you come back.", { topic: nameOf(topicOf(pauseAt)) });
    pauseGo.textContent = t("run.goOn", "Go on");
    pauseStop.textContent = t("run.stopToday", "Done for today");
  }

  function showPause(next) {
    pauseAt = next;
    // Coming back later starts the next lesson, not the one just finished.
    saveCursor(next, stations, topics);
    stage.innerHTML = "";
    intro.hidden = true;
    nextBtn.hidden = true;
    skipBtn.hidden = true;
    pause.hidden = false;
    paintPause();
    root.scrollIntoView({ block: "start", behavior: calm.matches ? "auto" : "smooth" });
  }

  pauseGo.addEventListener("click", () => {
    const n = pauseAt;
    if (n != null) go(n);
  });

  function paint() {
    const station = stations[cursor];
    const topic = topicOf(cursor);
    const ex = topic.exercises[station.exIndex];
    answered = false;

    // A count, not percent: "2 von 5" is a place you can hold in your head, and the bar
    // underneath is the same number drawn.
    paintCounters();
    title.textContent = topic.part ? `${topic.name} (${topic.part})` : topic.name;

    // A new topic gets its one sentence; the exercises inside it do not repeat it.
    intro.hidden = !station.first;
    if (station.first) {
      lead.textContent = leadOf(topic);
      paintWords(topic);
    }

    stage.innerHTML = `
      <p class="run-ex-title">${uitHtml(ex.title ?? "", ex.titleTr, esc)}</p>
      ${ex.hint ? `<p class="run-ex-hint">${uitHtml(ex.hint, ex.hintTr, esc)}</p>` : ""}
      <div data-ex-index="${station.exIndex}"></div>`;

    // The engine pairs [data-ex-index] slots with data.exercises by index, so handing it
    // the whole topic and rendering one slot mounts exactly that exercise.
    // Klassen log: the stations of one topic in a row are one set, under the topic's ref.
    setRef(`g:${topicKeyOf(topic)}`);
    const short = { ...topic, exercises: topic.exercises.map((e, i) => (i === station.exIndex ? shorten(e) : e)) };
    mountGrammarWorkspace(stage, short, {
      meldungRef: `g:${topicKeyOf(topic)}`,
      onAnswer: (ok) => {
        // The URL slug, as on the topic page and on /dashboard. topic.id is the raw id,
        // and for Verben mit Präpositionen ("praepositionen") it collides with the
        // separate /prepositions trainer.
        recordAttempt({ skill: "grammatik", correct: ok, topic: topicKeyOf(topic) });
        // "Weiter" appears once there is something to move on from, rather than sitting
        // there from the start inviting you to skip the exercise you just opened.
        if (!answered) {
          answered = true;
          nextBtn.removeAttribute("data-quiet");
          nextBtn.textContent = nextLabel();
        }
      },
    });

    // Before an answer the same button skips the exercise, and says so: a grey "Weiter"
    // read as switched off. After an answer it is the plain "Weiter".
    nextBtn.textContent = t("run.skipExercise", "Skip exercise");
    nextBtn.setAttribute("data-quiet", "");
    skipBtn.hidden = !!station.last && station.first;
    doneEl.hidden = true;
    root.scrollIntoView({ block: "start", behavior: calm.matches ? "auto" : "smooth" });
  }

  function nextLabel() {
    return cursor === stations.length - 1 ? t("run.finish", "Finish the run") : t("quiz.next", "Next");
  }

  function go(next) {
    pause.hidden = true;
    pauseAt = null;
    if (next >= stations.length) {
      // The end is a real end, not a silent wrap back to station 1.
      endSet();
      doneEl.hidden = false;
      stage.innerHTML = "";
      intro.hidden = true;
      nextBtn.hidden = true;
      skipBtn.hidden = true;
      count.textContent = t("run.allDone", "A1 bis B2 geschafft");
      bar.style.width = "100%";
      celebrate({ title: "Lauf geschafft!", body: t("run.allDone", "A1 bis B2 geschafft") });
      saveCursor(0, stations, topics);
      return;
    }
    cursor = next;
    saveCursor(cursor, stations, topics);
    nextBtn.hidden = false;
    paint();
  }

  // The last exercise of a lesson leads to the break; the very last one to the end screen.
  nextBtn.addEventListener("click", () => {
    if (stations[cursor].last && cursor + 1 < stations.length) showPause(cursor + 1);
    else go(cursor + 1);
  });

  // Skipping a topic, not an exercise: "too easy" is a judgement about the topic, and
  // one exercise at a time would make the learner press it five times to act on it.
  skipBtn.addEventListener("click", () => {
    const ti = stations[cursor].topicIndex;
    let n = cursor;
    while (n < stations.length && stations[n].topicIndex === ti) n++;
    go(n);
  });

  restartBtn?.addEventListener("click", () => {
    saveCursor(0, stations, topics);
    nextBtn.hidden = false;
    go(0);
  });

  paint();

  // A language switch relabels the chrome without remounting the exercise in progress.
  onUiText(() => {
    if (!pause.hidden) {
      paintPause();
      return;
    }
    if (!doneEl.hidden) {
      count.textContent = t("run.allDone", "A1 bis B2 geschafft");
      return;
    }
    const station = stations[cursor];
    const topic = topicOf(cursor);
    paintCounters();
    if (station.first) {
      lead.textContent = leadOf(topic);
      paintWords(topic);
    }
    nextBtn.textContent = answered ? nextLabel() : t("run.skipExercise", "Skip exercise");
  });
}
