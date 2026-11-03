// The play buttons of /knowledge/idioms: [data-say] with the text to speak and, when the
// recording exists, its path (data-src, scripts/generate-redewendungen-audio.mjs). Without a
// file, or when it fails to play, the browser's German voice reads the text instead.
import { audioUrl } from "./audioSource.js";
import { withBase } from "./paths.js";

let current = null;

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

export function initSay(root = document) {
  root.querySelectorAll("[data-say]").forEach((btn) =>
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      current?.pause();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      const { src, say } = btn.dataset;
      if (!src) return speak(say);
      current = new Audio(withBase(audioUrl(src)));
      current.play().catch(() => speak(say));
    }),
  );
}
