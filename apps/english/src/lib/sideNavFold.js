/* The side navigation's fold, one behaviour for every page that has one.
 *
 * Folding takes the list away and leaves the rail, so changing level stays one click
 * (decision 3 of "Seitennavigation vereinheitlichen"). The control is the tab on the
 * panel's edge — `[data-nvb-collapse]` — and nothing else: no second button in the
 * toolbar, no chevron in the head.
 *
 * One key for every page (decision 2). A learner who folds the list on der/die/das has
 * said something about how they like to work, and should not have to say it again on
 * Wortschatz. Open on a first visit: the list is how a newcomer finds out what there is.
 *
 * Desktop only. On a phone the list is a bottom sheet, which has its own ✕, and a folded
 * sheet would be a rail with nothing beside it — so below 1001px the class is lifted and
 * put back when the width comes back.
 *
 * A click into the page's empty space also folds it, as the Regel column does
 * (ruleColumn.js, closeOnWorkClick). Stricter than there: only a click that lands on a
 * layout surface itself (the space around and between the cards) counts, because trainer
 * cards here flip and answer on a plain click and must not fold the list on the way.
 *
 * The state is restored before first paint by the inline snippet in SideNavFold.astro;
 * this module takes over from there.
 */
import { t, onUiText } from "./uiText.js";

export const FOLD_KEY = "da-sidenav-fold";
const WIDE = "(min-width: 1001px)";
/** When the fold tab wiggles after the page opens — all inside the first 30 seconds. */
const WIGGLE_AT = [1500, 9000, 20000];
/** The page's layout surfaces: a click right on one of these is a click into empty space. */
const WHITESPACE = "main, .vp-page, .vp-workspace, .vp-col--ex, .vp-ex-grid, .vt-shell, .vt-main, .ap-main, .pr-main, .tr-layout, .ls-layout";

/**
 * @param {HTMLElement} root  the `.nvb` card
 * @param {{ page?: HTMLElement|null }} [opts]  the element whose [data-fold] sizes the grid track
 */
export function mountSideNavFold(root, { page = null } = {}) {
  if (!root) return null;
  const wide = matchMedia(WIDE);
  const btns = () => [...root.querySelectorAll("[data-nvb-collapse]")];

  let folded = false;
  try { folded = localStorage.getItem(FOLD_KEY) === "1"; } catch {}
  // A page opened from a lesson on the projector (?ut=1, /teachers/lesson) starts
  // folded, zen-like, and does not save that: the learner's own choice stays as it was.
  if (new URLSearchParams(location.search).get("ut") === "1") folded = true;

  function paint() {
    const on = folded && wide.matches;
    root.classList.toggle("collapsed", on);
    if (page) page.dataset.fold = on ? "1" : "";
    for (const b of btns()) {
      b.setAttribute("aria-expanded", on ? "false" : "true");
      b.setAttribute("aria-label", on ? t("ap.list.expand", "Liste ausklappen") : t("ap.list.collapse", "Liste einklappen"));
    }
  }

  function set(on, persist = true) {
    folded = on;
    paint();
    if (persist) { try { localStorage.setItem(FOLD_KEY, on ? "1" : "0"); } catch {} }
  }

  // Restored without animating: the slide is feedback for an action, and nobody took one.
  root.classList.add("no-anim");
  paint();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-anim")));

  for (const b of btns()) {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      stopWiggle();
      set(!folded);
    });
  }

  // The tab is easy to miss on its own, so in the first 30 seconds on a page it wiggles a
  // few times, then stays still for good. Not for a learner who has used it before (the
  // fold key exists once it was clicked), and never with reduced motion.
  const timers = [];
  function stopWiggle() { timers.forEach(clearTimeout); timers.length = 0; }
  let used = false;
  try { used = localStorage.getItem(FOLD_KEY) !== null; } catch {}
  if (!used && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const ms of WIGGLE_AT) {
      timers.push(setTimeout(() => {
        if (!wide.matches || document.hidden) return;
        for (const b of btns()) {
          b.removeAttribute("data-wiggle");
          void b.offsetWidth; // restart the animation
          b.setAttribute("data-wiggle", "");
          b.addEventListener("animationend", () => b.removeAttribute("data-wiggle"), { once: true });
        }
      }, ms));
    }
  }
  wide.addEventListener("change", paint);
  onUiText(paint);

  document.addEventListener("click", (e) => {
    if (folded || !wide.matches || e.button !== 0) return;
    const el = e.target;
    if (!(el instanceof Element) || root.contains(el) || !el.matches(WHITESPACE)) return;
    // Selecting text is reading, not dismissing.
    if (String(getSelection?.() ?? "").trim()) return;
    stopWiggle();
    set(true);
  });

  return {
    set,
    get folded() { return folded && wide.matches; },
    /** A rail button was pressed: that is a request to see its list, so a folded list opens. */
    reveal() { if (folded && wide.matches) set(false); },
    /** A rail button was pressed. On the entry whose list is already showing, that is a
     *  request to put the list away: it folds, and `true` tells the caller to leave
     *  everything else as it is (no restarted session). Otherwise as `reveal`. */
    press(btn) {
      if (wide.matches && !folded && btn?.classList.contains("active")) {
        stopWiggle();
        set(true);
        return true;
      }
      if (folded && wide.matches) set(false);
      return false;
    },
  };
}
