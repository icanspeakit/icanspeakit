// The browser half of the traffic scenes: plays a server-rendered FahrSzene (see
// src/lib/fahrSzene.js for the data and the drawing, FahrSzene.astro for the markup).
//
//   mountSzene(figureEl)          — a scene already in the page
//   mountSzenen(root = document)  — every [data-fahrszene] under root not mounted yet
//
// The quiz pages insert scenes after a question is answered, so mounting is a function, not
// a one-off page script. Nothing happens with reduced motion or without IntersectionObserver:
// the still with its numbered arrows and the written steps is the scene.
import { pathOf, pointAt, statesOf, movesOf } from "./fahrSzene.js";

const SPEED = 95; // canvas units per second — slow enough to follow on a phone
const SPEED_OF = { pedestrian: 38, bike: 60 };
const LAMP = { rot: "#ef4444", gelb: "#f59e0b", gruen: "#22c55e" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountSzenen(root = document) {
  root.querySelectorAll("[data-fahrszene]").forEach((el) => mountSzene(el));
}

/** @param {HTMLElement} el  @param {{ autoplay?: boolean }} [opts] */
export function mountSzene(el, { autoplay = true } = {}) {
  if (!el || el.dataset.fzMounted) return;
  el.dataset.fzMounted = "1";
  if (calm() || !("IntersectionObserver" in window) || !("requestAnimationFrame" in window)) return;
  const json = el.querySelector("[data-fz-json]");
  if (!json) return;
  const scene = JSON.parse(json.textContent);
  if (!scene.steps?.length) return;
  const states = statesOf(scene);
  const svg = el.querySelector("svg");
  const actors = new Map();
  svg.querySelectorAll("[data-actor]").forEach((g) => actors.set(g.dataset.actor, g));
  const steps = [...el.querySelectorAll("[data-fz-step]")];
  const dots = [...el.querySelectorAll("[data-fz-dot]")];
  const hls = svg.querySelector(".fz-hls");
  const replay = el.querySelector("[data-fz-replay]");
  const kind = Object.fromEntries(scene.actors.map((a) => [a.id, a.kind ?? "car"]));
  const pos = {};
  let run = 0;
  let hlKey;

  el.classList.add("is-ready");
  const dotRow = el.querySelector("[data-fz-dots]");
  if (dotRow) dotRow.hidden = false;

  const place = (id, p) => {
    pos[id] = { ...p };
    const g = actors.get(id);
    if (!g) return;
    g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(1)})`);
    g.querySelector(".fz-face")?.setAttribute("transform", `rotate(${(-p.rot).toFixed(1)})`);
    if (hlKey === id) {
      const c = hls.firstElementChild;
      c?.setAttribute("cx", p.x.toFixed(1));
      c?.setAttribute("cy", p.y.toFixed(1));
    }
  };
  const lightsAt = (i) => {
    const s = Object.fromEntries((scene.props ?? []).map((p) => [p.id, p.state]));
    for (let k = 0; k < i; k++) Object.assign(s, scene.steps[k].lights ?? {});
    return s;
  };
  const setLights = (s) => {
    for (const [id, state] of Object.entries(s)) {
      svg.querySelectorAll(`[data-prop="${id}"] .fz-lamp`).forEach((c) => {
        const l = c.dataset.lamp;
        const on = state === l || (state === "rotgelb" && (l === "rot" || l === "gelb"));
        c.setAttribute("fill", on ? LAMP[l] : "#334155");
      });
    }
  };
  const highlight = (key) => {
    hls.innerHTML = "";
    hlKey = key;
    if (!key) return;
    let x, y, r = 30;
    if (pos[key]) ({ x, y } = pos[key]);
    else {
      const s = (scene.signs ?? []).find((s) => s.z === key) ?? (scene.props ?? []).find((p) => p.id === key);
      if (!s) return;
      ({ x, y } = s);
      r = 24;
    }
    hls.innerHTML = `<circle class="fz-hl" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#f97316" stroke-width="4"/>`;
  };
  const mark = (i) => {
    steps.forEach((li, k) => { li.classList.toggle("is-on", k === i); li.classList.toggle("is-past", k < i); });
    dots.forEach((d, k) => {
      d.classList.toggle("is-on", k === i);
      d.classList.toggle("is-past", k < i);
      if (k === i) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
    });
    svg.querySelectorAll(".fz-arrow").forEach((a) => a.classList.toggle("is-show", Number(a.dataset.step) === i && a.classList.contains("fz-arrow--falsch")));
  };

  function drive(m, me) {
    const from = pos[m.who];
    const path = pathOf([[from.x, from.y], ...m.move]);
    const dur = Math.max(450, (path.len / (m.speed ?? SPEED_OF[kind[m.who]] ?? SPEED)) * 1000);
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        if (me !== run) return resolve();
        const t = Math.min(1, (now - t0) / dur);
        const p = pointAt(path, ease(t) * path.len);
        place(m.who, { x: p.x, y: p.y, rot: m.slide || p.rot == null ? from.rot : p.rot });
        if (t < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async function play(from = 0) {
    const me = ++run;
    el.classList.add("is-playing");
    el.classList.remove("is-done");
    if (replay) replay.hidden = true;
    for (const [id, p] of Object.entries(states[from])) place(id, p);
    setLights(lightsAt(from));
    actors.forEach((g) => g.classList.remove("is-warn"));
    for (const a of scene.actors) if (a.warn) actors.get(a.id)?.classList.add("is-warn");
    for (let k = 0; k < from; k++) if (scene.steps[k].warn) actors.get(scene.steps[k].warn)?.classList.add("is-warn");
    for (let i = from; i < scene.steps.length; i++) {
      if (me !== run) return;
      const st = scene.steps[i];
      mark(i);
      if (st.lights) setLights(st.lights);
      highlight(st.highlight);
      const blinker = st.blink ? actors.get(st.who) : null;
      blinker?.classList.add(`is-blink-${st.blink}`);
      if (st.warn) actors.get(st.warn)?.classList.add("is-warn");
      await sleep(st.mark === "falsch" ? 300 : 650);
      if (st.mark !== "falsch") await Promise.all(movesOf(st).map((m) => drive(m, me)));
      if (me !== run) return;
      // Time to read the sentence: roughly a slow reader's pace, never under a second.
      await sleep(Math.max(1100, (st.say?.length ?? 0) * 38) + (st.wait ?? 0));
      blinker?.classList.remove(`is-blink-${st.blink}`);
      highlight(undefined);
    }
    if (me !== run) return;
    mark(-1);
    steps.forEach((li) => li.classList.remove("is-past"));
    el.classList.remove("is-playing");
    el.classList.add("is-done");
    if (replay) replay.hidden = false;
  }

  replay?.addEventListener("click", () => play(0));
  dots.forEach((d, i) => d.addEventListener("click", () => play(i)));
  if (!autoplay) { if (replay) replay.hidden = false; return; }

  // Played when the reader has actually scrolled to it (as MascotComic does): most of it in
  // view, or half the screen filled by it on a phone, the bottom 15 % not counting.
  const io = new IntersectionObserver((entries) => {
    const seen = entries.some((e) => e.isIntersecting && (
      e.intersectionRatio >= 0.6 || (e.rootBounds && e.intersectionRect.height >= e.rootBounds.height * 0.5)
    ));
    if (!seen) return;
    io.disconnect();
    play(0);
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20), rootMargin: "0px 0px -15% 0px" });
  io.observe(el);
}
