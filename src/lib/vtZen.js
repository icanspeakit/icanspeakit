// Zen view for the flashcard trainer (VokabelTrainer.astro): the tabs, the toolbar and the
// card take the whole screen, and everything else — site nav, deck title, the Lernset
// column, share, mascot nudges — is out of sight until the learner leaves again.
//
// Pure CSS state (<html class="vt-zen">, styles in vt-zen.css), so it survives a deck swap
// (deckSwap.js) without the engine knowing about it. The button itself does not survive
// one — the swap replaces the column it sits in — hence a delegated click and a resync on
// da:deck-swap rather than a listener on the element.
//
// Where the browser allows it the page also goes fullscreen, which on a phone is what
// actually hands over the browser's own bars; an iPhone has no element fullscreen and gets
// the CSS view alone. Not remembered across page loads: a learner who lands on a page with
// no site nav has no idea where they are.

const CLASS = "vt-zen";
const BTN = "[data-zen-toggle]";

export function mountZen() {
  const root = document.documentElement;
  const on = () => root.classList.contains(CLASS);
  const sync = () => {
    document.querySelectorAll(BTN).forEach((b) => b.setAttribute("aria-pressed", String(on())));
  };

  // The card sizes itself to its content (fitCardHeight in wortschatz-app.js) and listens
  // for resize, so a synthetic one makes it re-measure at the new size.
  const refit = () => requestAnimationFrame(() => dispatchEvent(new Event("resize")));

  function set(next) {
    if (next === on()) return;
    root.classList.toggle(CLASS, next);
    sync();
    if (next) {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        root.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});
      }
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    refit();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest?.(BTN)) set(!on());
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && on() && !e.defaultPrevented) set(false);
  });
  // Esc in fullscreen is swallowed by the browser and only ends the fullscreen. One Esc
  // should leave Zen altogether, not leave a fullscreen-less Zen behind.
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && on()) set(false);
  });
  addEventListener("da:deck-swap", () => { sync(); if (on()) refit(); });
}
