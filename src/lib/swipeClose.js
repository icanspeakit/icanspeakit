// Swipe a right-edge drawer back out to the right, on touch screens.
//
// The drawer follows the finger while it moves right; on release it closes if it was
// dragged past a third of its width, or flicked fast, and otherwise springs back. The
// close itself is the caller's (`onClose`), so focus and inert handling stay in one place.
//
// It never fights scrolling: a gesture only becomes a swipe once it is clearly horizontal
// and rightward, and not when it starts inside something that can still scroll left (the
// wide article tables scroll sideways on a phone). Touch events stay passive, so vertical
// scrolling in the drawer body is untouched.

const START = 10; // px of movement before we decide what the gesture is
const CLOSE_FRACTION = 1 / 3;
const FLICK = 0.5; // px per ms

/** @param {Element | null} el */
function scrollsLeft(el, stop) {
  for (let n = el; n && n !== stop; n = n.parentElement) {
    if (n.scrollLeft > 0 && n.scrollWidth > n.clientWidth) return true;
  }
  return false;
}

/**
 * @param {HTMLElement} drawer
 * @param {{ isOpen: () => boolean, onClose: () => void }} opts
 */
export function mountSwipeClose(drawer, { isOpen, onClose }) {
  let x0 = 0, y0 = 0, t0 = 0, dx = 0;
  let mode = /** @type {"idle" | "pending" | "drag" | "ignore"} */ ("idle");

  const reset = () => {
    drawer.style.transition = "";
    drawer.style.transform = "";
  };

  drawer.addEventListener("touchstart", (e) => {
    if (!isOpen() || e.touches.length !== 1) { mode = "ignore"; return; }
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp; dx = 0;
    mode = scrollsLeft(/** @type {Element} */ (e.target), drawer) ? "ignore" : "pending";
  }, { passive: true });

  drawer.addEventListener("touchmove", (e) => {
    if (mode === "idle" || mode === "ignore") return;
    const t = e.touches[0];
    const mx = t.clientX - x0, my = t.clientY - y0;
    if (mode === "pending") {
      if (Math.abs(mx) < START && Math.abs(my) < START) return;
      mode = mx > 0 && Math.abs(mx) > Math.abs(my) * 1.2 ? "drag" : "ignore";
      if (mode !== "drag") return;
      drawer.style.transition = "none";
    }
    dx = Math.max(0, mx);
    drawer.style.transform = `translateX(${dx}px)`;
  }, { passive: true });

  const end = (e) => {
    if (mode !== "drag") { mode = "idle"; return; }
    mode = "idle";
    const speed = dx / Math.max(1, e.timeStamp - t0);
    const close = dx > drawer.offsetWidth * CLOSE_FRACTION || (speed > FLICK && dx > 40);
    // Hand the rest of the slide back to the CSS transition, from where the finger let go.
    drawer.style.transition = "";
    if (close) {
      onClose();
      drawer.style.transform = "";
    } else {
      reset();
    }
  };
  drawer.addEventListener("touchend", end, { passive: true });
  drawer.addEventListener("touchcancel", () => { mode = "idle"; reset(); }, { passive: true });
}
