// The play buttons of /conocimientos/modismos: [data-say] with the text to speak and, when the
// recording exists, its path (data-src, scripts/generate-redewendungen-audio.mjs). Without a
// file, or when it fails to play, the browser's Spanish voice reads the text instead.
// While it plays the button shows it (.is-playing): a button that looked the same before and
// during playback was tapped over and over.
import { audioUrl } from "./audioSource.js";
import { withBase } from "./paths.js";

let current = null;
let playingBtn = null;

function mark(btn) {
  playingBtn?.classList.remove("is-playing");
  playingBtn = btn;
  btn?.classList.add("is-playing");
}
const done = (btn) => () => { if (playingBtn === btn) mark(null); };

function speak(text, btn) {
  if (!("speechSynthesis" in window)) return mark(null);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = 0.9;
  u.onend = u.onerror = done(btn);
  mark(btn);
  speechSynthesis.speak(u);
  // Some Android voices never fire onend: don't leave the button lit for good.
  setTimeout(done(btn), Math.max(2500, text.length * 120));
}

export function initSay(root = document) {
  root.querySelectorAll("[data-say]").forEach((btn) =>
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      current?.pause();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      const { src, say } = btn.dataset;
      if (!src) return speak(say, btn);
      mark(btn);
      current = new Audio(withBase(audioUrl(src)));
      current.addEventListener("ended", done(btn));
      current.addEventListener("pause", done(btn));
      current.play().catch(() => speak(say, btn));
    }),
  );
}
