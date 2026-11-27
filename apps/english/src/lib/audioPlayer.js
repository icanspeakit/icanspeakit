// Our own audio player, since 2026-11-16. Every <audio controls> on a page (written in the
// markup, as an HTML string or created in JS, now or later) gets this instead of the
// browser's: Chrome shows the position dot only on hover, every browser draws its own bar,
// and its ⋮ menu has a second speed setting next to ours. The <audio> element stays
// in place and does the playing, so code that listens to it (ended, playbackRate, play
// counts) works as before; it is only hidden. Opt out with data-native-controls.
//   [▶]  ━━━━━●──────────  0:04 / 0:16
// The bar is a native range input: drag, tap, keyboard (←/→ 5 s, Home/End) and screen
// readers come with it. Styles in audio-player.css.
import "../styles/audio-player.css";
import { retranslate } from "./i18n.js";

const SEL = "audio[controls]:not([data-native-controls])";
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>';

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

function enhance(audio) {
  if (audio.dataset.apDone) return;
  audio.dataset.apDone = "1";
  audio.controls = false;
  // The length belongs on the bar before the first play: metadata is a few KB, not the file.
  if (audio.preload === "none") audio.preload = "metadata";
  // Pages size their <audio> with display:block; without controls it must not take space.
  audio.style.setProperty("display", "none", "important");

  const box = document.createElement("div");
  box.className = "ap";
  box.innerHTML = `
    <button type="button" class="ap-play" aria-pressed="false" aria-label="Abspielen" data-i18n-attr="aria-label:player.play">${ICON_PLAY}${ICON_PAUSE}</button>
    <input type="range" class="ap-bar" min="0" max="1000" step="1" value="0" aria-label="Position im Audio" data-i18n-attr="aria-label:player.seek" />
    <span class="ap-time"><span class="ap-cur">0:00</span> / <span class="ap-dur">0:00</span></span>`;
  audio.after(box);

  const btn = box.querySelector(".ap-play");
  const bar = box.querySelector(".ap-bar");
  const cur = box.querySelector(".ap-cur");
  const dur = box.querySelector(".ap-dur");
  let dragging = false;

  const duration = () => (Number.isFinite(audio.duration) ? audio.duration : 0);
  const paint = () => {
    const d = duration();
    const t = audio.currentTime || 0;
    const p = d ? Math.min(1, t / d) : 0;
    if (!dragging) bar.value = String(Math.round(p * 1000));
    box.style.setProperty("--ap-p", `${(dragging ? Number(bar.value) / 10 : p * 100).toFixed(2)}%`);
    cur.textContent = fmt(dragging ? (Number(bar.value) / 1000) * d : t);
    dur.textContent = fmt(d);
    bar.setAttribute("aria-valuetext", `${cur.textContent} / ${dur.textContent}`);
  };
  const paintState = () => {
    const on = !audio.paused && !audio.ended;
    box.classList.toggle("is-playing", on);
    btn.setAttribute("aria-pressed", String(on));
  };

  btn.addEventListener("click", () => {
    if (audio.paused || audio.ended) audio.play().catch(() => {});
    else audio.pause();
  });

  // With preload="none" the length is unknown until the file is asked for: touching the
  // bar asks for it, and the position is applied once it is known.
  let pending = null;
  const seekTo = (frac) => {
    const d = duration();
    if (d) { audio.currentTime = frac * d; return; }
    pending = frac;
    if (audio.preload === "none") { audio.preload = "metadata"; audio.load(); }
  };
  bar.addEventListener("pointerdown", () => { dragging = true; });
  bar.addEventListener("input", () => { dragging = true; paint(); });
  bar.addEventListener("change", () => { dragging = false; seekTo(Number(bar.value) / 1000); paint(); });
  bar.addEventListener("pointerup", () => { dragging = false; });
  bar.addEventListener("keydown", (e) => {
    const d = duration();
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
    if (step !== undefined) { e.preventDefault(); if (d) audio.currentTime = Math.max(0, Math.min(d, audio.currentTime + step)); return; }
    if (e.key === "Home") { e.preventDefault(); audio.currentTime = 0; }
    if (e.key === "End" && d) { e.preventDefault(); audio.currentTime = d; }
  });

  audio.addEventListener("loadedmetadata", () => {
    if (pending !== null && duration()) { audio.currentTime = pending * duration(); pending = null; }
    paint();
  });
  for (const ev of ["timeupdate", "durationchange", "seeked", "emptied"]) audio.addEventListener(ev, paint);
  for (const ev of ["play", "playing", "pause", "ended", "emptied"]) audio.addEventListener(ev, paintState);
  audio.addEventListener("error", () => { box.classList.add("is-error"); box.classList.remove("is-loading"); });
  // Slow network: after the tap the file is still coming. A turning ring on the button says so,
  // until the sound starts.
  audio.addEventListener("play", () => { if (audio.readyState < 3) box.classList.add("is-loading"); });
  audio.addEventListener("waiting", () => box.classList.add("is-loading"));
  for (const ev of ["playing", "canplay", "pause", "ended", "emptied"]) audio.addEventListener(ev, () => box.classList.remove("is-loading"));
  paint();
  paintState();
  translateSoon();
}

// The labels go through the page's language once per batch of new players.
let queued = false;
function translateSoon() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; retranslate().catch(() => {}); });
}

function scan(root) {
  if (root.matches?.(SEL)) enhance(root);
  root.querySelectorAll?.(SEL).forEach(enhance);
}

scan(document);
new MutationObserver((list) => {
  for (const m of list) {
    for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
    // `controls` switched on later (audio.controls = true after the element is in the page)
    if (m.type === "attributes" && m.target.matches?.(SEL)) enhance(m.target);
  }
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["controls"] });
