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

const CURSOR_KEY = "da-grammatik-lauf";

const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
};

/** Every exercise of every topic, flattened — the run's addressable unit is one exercise.
 * `topic.only` (set by lauf.astro for topics split across two levels) limits a topic to
 * some of its exercises; the indexes stay those of the full list, which the engine needs. */
export function buildStations(topics) {
  const out = [];
  topics.forEach((topic, ti) => {
    const idx = topic.only ?? (topic.exercises ?? []).map((_, i) => i);
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

/** The one sentence a topic opens with. A later level's part of a split topic says that
 * it is the same topic again, one level up. */
function leadOf(topic) {
  if (topic.part) return t("run.partLead", "Dieses Thema kennst du schon. Jetzt kommt der Teil für {level}.", { level: topic.part });
  return topic.subtitleKey ? t(topic.subtitleKey, topic.subtitle ?? "") : topic.subtitle ?? "";
}

function loadCursor(max) {
  try {
    const n = parseInt(localStorage.getItem(CURSOR_KEY), 10);
    if (Number.isInteger(n) && n >= 0 && n < max) return n;
  } catch {}
  return 0;
}

function saveCursor(n) {
  try { localStorage.setItem(CURSOR_KEY, String(n)); } catch {}
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

  const given = levelStart(stations, topics);
  let cursor = given ?? loadCursor(stations.length);
  if (given != null) saveCursor(given);
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
    <p data-run-pause-next></p>
    <div class="run-done-actions">
      <button type="button" class="quiz-btn quiz-btn--primary" data-run-pause-go></button>
      <a class="quiz-btn" data-run-pause-stop></a>
    </div>`;
  (doneEl ?? stage).insertAdjacentElement("beforebegin", pause);
  const pauseGo = pause.querySelector("[data-run-pause-go]");
  const pauseStop = pause.querySelector("[data-run-pause-stop]");
  pauseStop.href = withBase("/");
  /** The station the break leads on to, while it is shown. */
  let pauseAt = null;

  function paintPause() {
    // Crossing into the next level is the bigger milestone, so the break says that instead.
    const done = topicOf(cursor);
    pause.querySelector("[data-run-pause-title]").textContent =
      done.level !== topicOf(pauseAt).level
        ? t("run.levelDone", "{level} geschafft", { level: done.level })
        : t("run.lessonDone", "Lesson done: {topic}", { topic: nameOf(done) });
    pause.querySelector("[data-run-pause-next]").textContent =
      t("run.lessonNext", "Next lesson: {topic}. It continues here whenever you come back.", { topic: nameOf(topicOf(pauseAt)) });
    pauseGo.textContent = t("run.goOn", "Go on");
    pauseStop.textContent = t("run.stopToday", "Done for today");
  }

  function showPause(next) {
    pauseAt = next;
    // Coming back later starts the next lesson, not the one just finished.
    saveCursor(next);
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
    if (station.first) lead.textContent = leadOf(topic);

    stage.innerHTML = `
      <p class="run-ex-title">${uitHtml(ex.title ?? "", ex.titleTr, esc)}</p>
      ${ex.hint ? `<p class="run-ex-hint">${uitHtml(ex.hint, ex.hintTr, esc)}</p>` : ""}
      <div data-ex-index="${station.exIndex}"></div>`;

    // The engine pairs [data-ex-index] slots with data.exercises by index, so handing it
    // the whole topic and rendering one slot mounts exactly that exercise.
    // Klassen log: the stations of one topic in a row are one set, under the topic's ref.
    setRef(`g:${topicKeyOf(topic)}`);
    mountGrammarWorkspace(stage, topic, {
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
        }
      },
    });

    nextBtn.textContent = cursor === stations.length - 1 ? t("run.finish", "Lauf beenden") : t("quiz.next", "Weiter");
    nextBtn.setAttribute("data-quiet", "");
    skipBtn.hidden = !!station.last && station.first;
    doneEl.hidden = true;
    root.scrollIntoView({ block: "start", behavior: calm.matches ? "auto" : "smooth" });
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
      saveCursor(0);
      return;
    }
    cursor = next;
    saveCursor(cursor);
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
    saveCursor(0);
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
    if (station.first) lead.textContent = leadOf(topic);
    nextBtn.textContent = cursor === stations.length - 1 ? t("run.finish", "Lauf beenden") : t("quiz.next", "Weiter");
  });
}
