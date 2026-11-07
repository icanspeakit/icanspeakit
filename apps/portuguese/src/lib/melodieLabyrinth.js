// Melodie-Labyrinth (/intonation#labyrinth): the melody as height you can see.
// Quaki hops along the words while the sentence plays. At the end the corridor splits into
// three exits by height: up for the question (↗), down for the statement (↘), the deep
// slide for the exclamation (↘!). The learner picks one, Quaki takes it. Then the stones
// float to the real pitch of the recording and Quaki rides the curve in sync with the audio:
// the voice going up or down becomes Quaki going up or down.
//
// The pitch comes from the same analysis as the Melodie-Check (satzmelodie.js), but with
// absolute times kept, so the ride follows audio.currentTime. A line without a recording
// gets a drawn contour for its type instead.
import { decodeToMono, pitchContour } from "./satzmelodie.js";
import { withBase } from "./paths.js";

const NS = "http://www.w3.org/2000/svg";
const MID = 125, X0 = 34, XW = 236, XEND = 330;
const MARK = { aussage: ".", echo: "?", ausruf: "!" };
const OPEN = { aussage: "", echo: "¿", ausruf: "¡" };
const said = (c) => OPEN[c.t] + c.base + MARK[c.t];
const WHY = {
  aussage: "Statement: the voice goes down at the end ↘ – the way down.",
  echo: "Echo question: the voice goes up a lot at the end ↗ – the way up. You're surprised or checking.",
  ausruf: "Exclamation: like a statement, only much stronger – the stressed word goes very high, then the voice falls steeply ↘ – the slide all the way down.",
};
// A drawn contour (time 0..1, semitones) for lines the browser reads.
const SKETCH = {
  aussage: [[0, 0.5], [0.3, 1], [0.6, 0.5], [0.8, 0], [1, -4]],
  echo: [[0, -1], [0.4, -0.5], [0.7, 0], [0.85, 3], [1, 8]],
  ausruf: [[0, 0], [0.3, 1], [0.55, 6], [0.8, -1], [1, -7]],
};

const el = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const yOf = (st) => clamp(MID - st * 9, 22, 228);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Recording → [{ t (s), st }] smoothed, plus the voiced span; null without audio. */
const cache = new Map();
function contourOf(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      const res = await fetch(withBase(url));
      if (!res.ok) return null;
      const { samples, sampleRate } = await decodeToMono(await res.arrayBuffer());
      const raw = pitchContour(samples, sampleRate);
      if (raw.length < 8) return null;
      const hz = raw.map((p) => p.hz).sort((a, b) => a - b);
      const med = hz[Math.floor(hz.length / 2)];
      const st = raw.map((p) => 12 * Math.log2(p.hz / med));
      // 5-point median: one octave jump of the tracker is not a melody.
      const pts = raw.map((p, i) => {
        const w = st.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b);
        return { t: p.t, st: w[Math.floor(w.length / 2)] };
      });
      return { pts, t0: pts[0].t, t1: pts[pts.length - 1].t };
    })().catch(() => null));
  }
  return cache.get(url);
}
function sketchOf(type) {
  const s = SKETCH[type];
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    const k = s.findIndex(([px]) => px >= x);
    const [ax, ay] = s[Math.max(0, k - 1)], [bx, by] = s[k];
    pts.push({ t: x, st: bx === ax ? by : ay + ((by - ay) * (x - ax)) / (bx - ax) });
  }
  return { pts, t0: 0, t1: 1, sketch: true };
}
/** Point on the contour at time t (s), linear between frames. */
function stAt(c, t) {
  const p = c.pts;
  if (t <= p[0].t) return p[0].st;
  if (t >= p[p.length - 1].t) return p[p.length - 1].st;
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; (p[m].t <= t ? (lo = m) : (hi = m)); }
  const a = p[lo], b = p[hi];
  return a.st + ((b.st - a.st) * (t - a.t)) / (b.t - a.t || 1);
}

/**
 * @param {object} o
 * @param {HTMLElement} o.panel   the tab panel
 * @param {{ base: string, src: Record<string,string> }[]} o.quiz
 * @param {HTMLAudioElement} o.audio  the page's player (for currentTime)
 * @param {(line: {text:string,src:string,type:string}) => Promise<void>} o.play
 * @param {() => void} o.stop
 * @param {() => number} o.runId  the page's playback counter, to notice a stop
 */
export function initLabyrinth({ panel, quiz, audio, play, stop, runId }) {
  const svg = panel.querySelector(".lab-svg");
  const stones = svg.querySelector(".lab-stones");
  const trail = svg.querySelector(".lab-trail");
  const frog = svg.querySelector(".lab-frog");
  const faces = [...frog.querySelectorAll("[data-face]")];
  const say = panel.querySelector(".lab-say");
  const fb = panel.querySelector(".lab-fb");
  const btns = [...panel.querySelectorAll("[data-exit]")];
  const doors = [...svg.querySelectorAll("[data-door]")];
  const exits = Object.fromEntries([...svg.querySelectorAll("[data-route]")].map((p) => [p.dataset.route, p]));
  const playBtn = panel.querySelector(".lab-play");
  const rideBtn = panel.querySelector(".lab-ride");
  const nextBtn = panel.querySelector(".lab-next");
  const scoreR = panel.querySelector(".lab-right"), scoreW = panel.querySelector(".lab-wrong");

  let cur = null, last = -1, answered = false, heard = false, right = 0, wrong = 0, words = [], anim = 0;
  let pos = { x: 14, y: MID };

  const face = (f) => faces.forEach((g) => (g.style.display = g.dataset.face === f ? "" : "none"));
  const place = (x, y, hop = 0) => {
    pos = { x, y };
    frog.setAttribute("transform", `translate(${(x - 20).toFixed(1)} ${(y - 38 - hop).toFixed(1)})`);
  };
  const cancel = () => { anim++; };
  const tween = (ms, step) => new Promise((res) => {
    const id = ++anim, s = performance.now();
    if (reduced()) { step(1); return res(true); }
    const f = (now) => {
      if (id !== anim) return res(false);
      const k = Math.min(1, (now - s) / ms);
      step(k);
      k < 1 ? requestAnimationFrame(f) : res(true);
    };
    requestAnimationFrame(f);
  });
  const hopTo = (x, y, ms = 260) => {
    const a = { ...pos };
    return tween(ms, (k) => place(a.x + (x - a.x) * k, a.y + (y - a.y) * k, Math.sin(Math.PI * k) * 14));
  };
  const walk = (path, ms, upto = 1) => {
    const L = path.getTotalLength();
    return tween(ms, (k) => { const p = path.getPointAtLength(L * k * upto); place(p.x, p.y, Math.abs(Math.sin(k * Math.PI * 4)) * 4); });
  };

  function layoutStones(flat) {
    stones.replaceChildren();
    words = cur.base.split(" ");
    const n = words.length;
    words.forEach((w, i) => {
      const x = X0 + (n === 1 ? 0 : (i * XW) / (n - 1)) - (i === n - 1 ? 8 : 0);
      const g = el("g", { class: "lab-stone" });
      g.style.transform = `translate(${x}px, ${MID}px)`;
      g.dataset.x = String(x);
      g.append(el("ellipse", { cx: 0, cy: 4, rx: 15, ry: 5 }));
      const t = el("text", { x: 0, y: 22, "text-anchor": "middle" });
      t.textContent = w;
      g.append(t);
      stones.append(g);
    });
    if (flat) trail.setAttribute("d", "");
  }
  const stoneXY = (i) => ({ x: Number(stones.children[i].dataset.x), y: MID });

  function reset() {
    cancel(); stop();
    svg.classList.remove("is-melody", "is-done");
    doors.forEach((d) => d.classList.remove("is-right", "is-wrong"));
    Object.values(exits).forEach((p) => p.classList.remove("is-right", "is-wrong"));
    btns.forEach((b) => { b.classList.remove("is-right", "is-wrong"); b.disabled = false; });
    rideBtn.hidden = true;
    fb.textContent = ""; fb.className = "sm-fb lab-fb";
    say.textContent = "Listen – then find the way out!";
    face("happy");
    place(14, MID);
  }

  function newQ() {
    let i; do { i = Math.floor(Math.random() * quiz.length); } while (i === last && quiz.length > 1);
    last = i;
    const t = ["aussage", "echo", "ausruf"][Math.floor(Math.random() * 3)];
    cur = { base: quiz[i].base, t, src: quiz[i].src[t] };
    answered = false; heard = false;
    layoutStones(true);
    reset();
    panel.querySelector(".lab-sent").textContent = cur.base + " …";
  }

  // Listen: Quaki hops word by word with the audio, then waits at the fork.
  async function listen() {
    if (!cur) return;
    if (answered) return ride();
    stop(); cancel();
    face("happy"); place(14, MID);
    say.textContent = "Listen carefully …";
    const id = runId();
    const n = words.length;
    const c = await contourOf(cur.src);
    let k = -1;
    const follow = () => {
      if (id !== runId() || answered) return;
      const d = audio.duration, t = audio.currentTime;
      if (cur.src && d && c) {
        // word by its share of the voiced span (letters stand in for syllables)
        const frac = clamp((t - c.t0) / (c.t1 - c.t0), 0, 0.999);
        const lens = words.map((w) => w.length), sum = lens.reduce((a, b) => a + b, 0);
        let acc = 0, w = 0;
        while (w < n - 1 && (acc + lens[w]) / sum <= frac) acc += lens[w++];
        if (t >= c.t0 && w !== k) { k = w; const p = stoneXY(w); hopTo(p.x, p.y, 200); }
      }
      if (!audio.paused || !audio.currentTime) requestAnimationFrame(follow);
    };
    const playing = play({ text: said(cur), src: cur.src, type: cur.t });
    if (cur.src) requestAnimationFrame(follow);
    else {
      // browser voice: no clock to follow, so an even pace
      (async () => { for (let w = 0; w < n && id === runId(); w++) { const p = stoneXY(w); await hopTo(p.x, p.y); await new Promise((r) => setTimeout(r, 280)); } })();
    }
    await playing;
    if (id !== runId() || answered) return;
    heard = true;
    await hopTo(262, MID, 300);
    face("thinking");
    say.textContent = "Where does the voice go? Up ↗ or down ↘?";
  }

  async function answer(type) {
    if (!cur || answered) return;
    if (!heard) { say.textContent = "Listen first! Tap ▶."; return; }
    answered = true;
    stop(); cancel();
    const ok = type === cur.t;
    ok ? right++ : wrong++;
    scoreR.textContent = String(right); scoreW.textContent = String(wrong);
    btns.forEach((b) => {
      b.disabled = true;
      if (b.dataset.exit === cur.t) b.classList.add("is-right");
      else if (b.dataset.exit === type) b.classList.add("is-wrong");
    });
    panel.querySelector(".lab-sent").textContent = said(cur);
    face("happy");
    place(262, MID);
    if (ok) {
      await walk(exits[type], 700);
      exits[type].classList.add("is-right");
      svg.querySelector(`[data-door="${type}"]`).classList.add("is-right");
      face("celebrate");
      say.textContent = "Correct! That's the way out.";
    } else {
      // up the wrong corridor, bump into the closed door, back to the fork
      await walk(exits[type], 520, 0.8);
      exits[type].classList.add("is-wrong");
      svg.querySelector(`[data-door="${type}"]`).classList.add("is-wrong");
      face("oops");
      say.textContent = "Closed! The way out is somewhere else.";
      await new Promise((r) => setTimeout(r, 650));
      await hopTo(262, MID, 300);
      await walk(exits[cur.t], 700);
      exits[cur.t].classList.add("is-right");
      svg.querySelector(`[data-door="${cur.t}"]`).classList.add("is-right");
      face("happy");
    }
    fb.textContent = (ok ? "Correct! " : "Not quite. ") + WHY[cur.t];
    fb.className = `sm-fb lab-fb ${ok ? "is-ok" : "is-bad"}`;
    rideBtn.hidden = false;
    await new Promise((r) => setTimeout(r, 500));
    showMelody();
  }

  // The stones float to the pitch of the recording, and a trail joins them.
  async function showMelody() {
    const c = (await contourOf(cur.src)) ?? sketchOf(cur.t);
    cur.c = c;
    const n = words.length;
    const lens = words.map((w) => w.length), sum = lens.reduce((a, b) => a + b, 0);
    const xOf = (t) => X0 + ((XEND - X0) * (t - c.t0)) / (c.t1 - c.t0 || 1);
    let acc = 0;
    [...stones.children].forEach((g, i) => {
      const mid = c.t0 + (c.t1 - c.t0) * ((acc + lens[i] / 2) / sum);
      acc += lens[i];
      const x = xOf(mid), y = yOf(stAt(c, mid));
      g.dataset.x = String(x);
      g.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    const step = Math.max(1, Math.ceil(c.pts.length / 140));
    trail.setAttribute("d", c.pts.filter((_, i) => i % step === 0).map((p, i) => `${i ? "L" : "M"}${xOf(p.t).toFixed(1)} ${yOf(p.st).toFixed(1)}`).join(" "));
    trail.dataset.type = cur.t;
    svg.classList.add("is-melody");
    say.textContent = c.sketch ? "This is roughly how the melody goes. Ride along!" : "This is the real melody. Ride along!";
    if (n) place(xOf(c.t1), yOf(stAt(c, c.t1)));
  }

  // Quaki rides the curve, in step with the recording.
  async function ride() {
    if (!cur?.c) return;
    stop(); cancel();
    const c = cur.c, id = runId(), a = ++anim;
    face("happy");
    const xOf = (t) => X0 + ((XEND - X0) * (t - c.t0)) / (c.t1 - c.t0 || 1);
    place(X0, yOf(c.pts[0].st));
    say.textContent = "Up and down, just like the voice!";
    if (cur.src) {
      const f = () => {
        if (id !== runId() || a !== anim) return;
        const t = clamp(audio.currentTime, c.t0, c.t1);
        place(xOf(t), yOf(stAt(c, t)));
        if (!audio.paused) requestAnimationFrame(f);
      };
      const p = play({ text: said(cur), src: cur.src, type: cur.t });
      requestAnimationFrame(f);
      await p;
    } else {
      const p = play({ text: said(cur), src: "", type: cur.t });
      await tween(1800, (k) => { const t = c.t0 + (c.t1 - c.t0) * k; place(xOf(t), yOf(stAt(c, t))); });
      await p;
    }
    if (a === anim) { face("celebrate"); say.textContent = cur.t === "echo" ? "Up at the end ↗!" : "Down at the end ↘!"; }
  }

  playBtn.addEventListener("click", listen);
  rideBtn.addEventListener("click", ride);
  nextBtn.addEventListener("click", () => { newQ(); listen(); });
  btns.forEach((b) => b.addEventListener("click", () => answer(b.dataset.exit)));
  doors.forEach((d) => d.addEventListener("click", () => answer(d.dataset.door)));
  newQ();
  return { stop: () => { cancel(); } };
}
