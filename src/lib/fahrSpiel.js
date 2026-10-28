// The Fahrspiel (/fuehrerschein/fahrspiel): Quaki drives through the traffic scenes of
// szenen.json, the game stops him at the moment that matters, and the learner decides. The
// answer is then played out — the mistake shown in red when the choice was wrong, the right
// way after it — with the scene's own sentences and the rule in one bold line.
//
// Nothing here draws a road: a scene is cut into segments (the steps between two stops,
// every actor placed where the scene has it at the cut) and each segment is an ordinary
// scene for szeneFigureHtml + mountSzene. The approach to a stop plays without its
// sentences and without the scene's name — „Rechts vor links" over the picture would be
// the answer.
//
// Points: 10 for a right answer, up to 5 more for a quick one (the bar runs out after
// BONUS_MS). Nothing is lost for being slow — the learners read the question in a second
// language, so time only ever adds.
import { statesOf, szeneFigureHtml } from "./fahrSzene.js";
import { mountSzene } from "./fahrSzenePlayer.js";
import { recordAttempt } from "./progress.js";
import { celebrate } from "./mascotCelebrate.js";
import { t } from "./uiText.js";

const ROUNDS = 6;
const BONUS_MS = 12000;
const BEST_KEY = "da-fahrspiel-best";
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** The steps from..to of a scene as a scene of its own, everyone where the scene has them. */
function segment(scene, from, to, { dropFalsch = false, silent = false, tag = "" } = {}) {
  const states = statesOf(scene);
  const lights = Object.fromEntries((scene.props ?? []).map((p) => [p.id, p.state]));
  for (let k = 0; k < from; k++) Object.assign(lights, scene.steps[k].lights ?? {});
  const steps = scene.steps.slice(from, to)
    .filter((s) => !(dropFalsch && s.mark === "falsch"))
    .map((s) => (silent ? { ...s, say: "" } : s));
  return {
    ...scene,
    id: `${scene.id}-${from}-${to}${tag}`,
    title: silent ? t("fs.spiel.situation", "Verkehrssituation") : scene.title,
    actors: scene.actors.map((a) => ({ ...a, ...states[from][a.id] })),
    props: (scene.props ?? []).map((p) => ({ ...p, state: lights[p.id] })),
    steps,
    stillAt: 0,
  };
}

/** Puts a segment on the stage and plays it; resolves when it has finished (or at once). */
function play(stage, seg, { bare = false, approach = false } = {}) {
  stage.classList.toggle("is-approach", approach);
  stage.innerHTML = szeneFigureHtml(seg, { compact: true, bare: bare || !seg.steps.length });
  const fig = stage.querySelector("[data-fahrszene]");
  if (!fig || bare || calm()) return Promise.resolve();
  mountSzene(fig, { autoplay: false });
  return new Promise((resolve) => {
    const mo = new MutationObserver(() => {
      if (fig.classList.contains("is-done") || !fig.isConnected) { mo.disconnect(); resolve(); }
    });
    mo.observe(fig, { attributes: true, attributeFilter: ["class"] });
    fig.querySelector("[data-fz-replay]")?.click();
  });
}

/**
 * @param {HTMLElement} root  the game's box
 * @param {{ rounds: any[], lessons: Record<string, { title: string, href: string }> }} data
 * @param {{ onEnd?: () => void }} [opts]
 */
export function mountFahrSpiel(root, data, { onEnd } = {}) {
  let run = 0;

  function start() {
    const me = ++run;
    const rounds = shuffle(data.rounds).slice(0, ROUNDS);
    const total = rounds.reduce((n, r) => n + r.stops.length, 0);
    const res = { points: 0, right: 0, done: 0, streak: 0, missed: [] };

    root.innerHTML = `
      <div class="fsp-hud" aria-live="polite">
        <span class="fsp-hud-round" data-round></span>
        <span class="fsp-hud-streak" data-streak hidden></span>
        <span class="fsp-hud-points" data-points></span>
      </div>
      <div class="fsp-stage" data-stage></div>
      <div class="fsp-panel" data-panel></div>`;
    const stage = root.querySelector("[data-stage]");
    const panel = root.querySelector("[data-panel]");
    const hud = {
      round: root.querySelector("[data-round]"),
      points: root.querySelector("[data-points]"),
      streak: root.querySelector("[data-streak]"),
    };
    const paintHud = (i) => {
      hud.round.textContent = t("fs.spiel.round", "Situation {i} von {n}", { i: i + 1, n: rounds.length });
      hud.points.textContent = t("fs.spiel.points", "{n} Punkte", { n: res.points });
      hud.streak.hidden = res.streak < 2;
      hud.streak.textContent = `🔥 ${res.streak}`;
    };

    async function round(i) {
      if (me !== run) return;
      if (i >= rounds.length) return finish();
      const r = rounds[i];
      paintHud(i);
      panel.innerHTML = `<p class="fsp-wait" data-i18n="fs.spiel.watch">${esc(t("fs.spiel.watch", "Schau hin: Quaki fährt los …"))}</p>`;
      await play(stage, segment(r.scene, 0, r.stops[0].at, { silent: true, tag: "a" }), { approach: true });
      if (me !== run) return;
      stop(i, 0);
    }

    function stop(i, k) {
      const r = rounds[i];
      const s = r.stops[k];
      const opts = shuffle(s.options);
      const t0 = performance.now();
      panel.innerHTML = `
        <p class="fsp-ask" lang="de">${esc(s.ask)}</p>
        <div class="fsp-timer" aria-hidden="true"><span style="animation-duration:${BONUS_MS}ms"></span></div>
        <div class="fsp-opts" role="group">
          ${opts.map((o, n) => `<button type="button" class="fsp-opt" data-n="${n}"><span class="fsp-key" aria-hidden="true">${n + 1}</span><span lang="de">${esc(o.text)}</span></button>`).join("")}
        </div>`;
      const btns = [...panel.querySelectorAll(".fsp-opt")];
      const keys = (e) => {
        const n = Number(e.key) - 1;
        if (n >= 0 && n < btns.length && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); btns[n].click(); }
      };
      addEventListener("keydown", keys);
      btns.forEach((b) => b.addEventListener("click", () => {
        removeEventListener("keydown", keys);
        answer(i, k, opts[Number(b.dataset.n)], opts, performance.now() - t0, b);
      }, { once: true }));
      btns[0]?.focus({ preventScroll: true });
    }

    async function answer(i, k, chosen, opts, ms, btn) {
      const r = rounds[i];
      const s = r.stops[k];
      const ok = !!chosen.ok;
      const bonus = ok ? Math.max(0, Math.ceil(5 * (1 - ms / BONUS_MS))) : 0;
      res.done++;
      if (ok) { res.right++; res.streak++; res.points += 10 + bonus; }
      else { res.streak = 0; res.missed.push({ rule: s.rule, topic: r.topic }); }
      recordAttempt({ skill: "fuehrerschein", correct: ok, topic: `fuehrerschein-${r.topic}`, item: `fahrspiel-${r.scene.id}-${s.at}` });
      paintHud(i);

      // The choices stay as the record of what was asked: the right one green, a wrong pick red.
      panel.querySelector(".fsp-timer")?.classList.add("is-stopped");
      panel.querySelectorAll(".fsp-opt").forEach((b) => {
        const o = opts[Number(b.dataset.n)];
        b.disabled = true;
        if (o.ok) b.classList.add("is-right");
        else if (b === btn) b.classList.add("is-wrong");
      });
      const last = k === r.stops.length - 1;
      const isEnd = last && i === rounds.length - 1;
      const verdict = ok
        ? `${esc(t("fs.spiel.right", "Richtig!"))} <b class="fsp-plus">+${10 + bonus}</b>`
        : esc(t("fs.spiel.wrong", "Nicht ganz – schau, was passiert."));
      panel.insertAdjacentHTML("beforeend", `
        <div class="fsp-feedback ${ok ? "is-right" : "is-wrong"}" role="status">
          <p class="fsp-verdict">${verdict}</p>
          <p class="fsp-rule" lang="de">${esc(s.rule)}</p>
        </div>
        <button type="button" class="quiz-btn quiz-btn--primary fsp-next">${esc(isEnd ? t("fs.spiel.result", "Zum Ergebnis") : t("fs.spiel.next", "Weiter"))}</button>`);
      const next = panel.querySelector(".fsp-next");
      next.addEventListener("click", () => {
        if (!last) {
          // Straight to the next stop: the learner has seen the way there (or skipped it).
          const at = r.stops[k + 1].at;
          play(stage, segment(r.scene, at, at, { tag: "s" }), { bare: true });
          stop(i, k + 1);
        } else round(i + 1);
      }, { once: true });
      next.focus({ preventScroll: true });

      const to = last ? r.scene.steps.length : r.stops[k + 1].at;
      await play(stage, segment(r.scene, s.at, to, { dropFalsch: ok, tag: ok ? "r" : "w" }));
    }

    function finish() {
      let best = 0;
      try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch {}
      const isBest = res.points > best;
      if (isBest) { try { localStorage.setItem(BEST_KEY, String(res.points)); } catch {} }
      const seen = new Set();
      const missed = res.missed.filter((m) => !seen.has(m.rule) && seen.add(m.rule));
      root.innerHTML = `
        <div class="fsp-end">
          <p class="fsp-end-score">${res.points}</p>
          <p class="fsp-end-line">${esc(t("fs.spiel.score", "{r} von {n} richtig · {p} Punkte", { r: res.right, n: total, p: res.points }))}</p>
          <p class="fsp-end-best">${esc(isBest && best > 0 ? t("fs.spiel.newBest", "Neuer Bestwert!") : t("fs.spiel.best", "Bestwert: {n} Punkte", { n: Math.max(best, res.points) }))}</p>
          ${missed.length ? `
            <h3 class="fsp-end-h">${esc(t("fs.spiel.missed", "Diese Regeln schau dir nochmal an"))}</h3>
            <div class="fsp-end-rules">
              ${missed.map((m) => {
                const l = data.lessons[m.topic];
                return `<a class="fsp-rulecard" href="${esc(l?.href ?? "/fuehrerschein")}">
                  <span class="fsp-rulecard-rule" lang="de">${esc(m.rule)}</span>
                  <span class="fsp-rulecard-topic" lang="de">${esc(l?.title ?? "")}</span></a>`;
              }).join("")}
            </div>`
            : `<p class="fsp-end-all">${esc(t("fs.spiel.allRight", "Alles richtig – gute Fahrt!"))}</p>`}
          <div class="fsp-end-btns">
            <button type="button" class="quiz-btn quiz-btn--primary" data-again>${esc(t("fs.spiel.again", "Nochmal fahren"))}</button>
            <a class="quiz-btn" href="/fuehrerschein">${esc(t("fs.spiel.toRules", "Alle Regeln"))}</a>
          </div>
        </div>`;
      root.querySelector("[data-again]").addEventListener("click", start);
      if (res.right === total) celebrate({ title: t("fs.spiel.allRight", "Alles richtig – gute Fahrt!"), body: t("fs.spiel.points", "{n} Punkte", { n: res.points }), lead: "quaki", crew: ["bruno", "regi", "hamsti"] });
      onEnd?.();
    }

    round(0);
  }

  return { start };
}
