// Motion for the site's switches: level chips (A1 A2 B1 B2), "Nach Thema / Der Reihe nach",
// tab rows, level rails. One helper instead of one animation per page, and it touches
// nothing a page already does: it watches the switch rather than hooking its clicks.
// Which switches get it is listed in src/lib/switchRegistry.js.
//
//   enhanceSwitch(container, { content })
//
// 1. A marker slides to the chosen option. It copies the look the page gives its active
//    option and takes over from it, so every switch keeps its own design (and a page
//    without JavaScript keeps its normal active state):
//      - a pill for switches whose active option is a filled chip (background, shadow);
//      - a line for tab rows whose active option is underlined (border-bottom, or an
//        underlined label).
//    "Active" is whatever the page already marks: .active, .is-active, .is-on,
//    aria-pressed, aria-selected, aria-checked (role="radio"), or a checked radio inside the option.
// 2. `content` (optional): the element(s) the switch changes. What becomes visible in them,
//    or is newly rendered into them, right after the switch changed, comes in with a short
//    staggered fade from the side the learner switched towards. Only right after a switch:
//    the same areas re-render for other reasons (a timer, a score), and those stay still.
//
// With prefers-reduced-motion nothing moves: the marker jumps and the content just appears.
import "../styles/seg-switch.css";

const ACTIVE = '.active, .is-active, .is-on, [aria-pressed="true"], [aria-selected="true"], [aria-checked="true"]';
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const isActive = (el) => el.matches(ACTIVE) || !!el.querySelector("input:checked");

/**
 * @param {HTMLElement} container
 * @param {{ options?: string, content?: Element[] | null, stagger?: number }} [opts]
 */
export function enhanceSwitch(container, { options = ":scope > button, :scope > a, :scope > label", content = null, stagger = 40 } = {}) {
  if (!container || container.dataset.segSwitch) return;
  const opts = () => [...container.querySelectorAll(options)];
  const active = () => opts().find(isActive) ?? null;
  const first = active();
  // A switch with one option, or none chosen yet, has nothing to slide between.
  if (!first || opts().length < 2) return;
  container.dataset.segSwitch = "1";

  // Copy the page's own active look onto the marker.
  const cs = getComputedStyle(first);
  const other = opts().find((o) => o !== first);
  const ocs = other ? getComputedStyle(other) : null;
  // A filled chip wins: when the active option's background differs from the others', the
  // marker is a pill, even if its border changes too (a gradient chip drops its border).
  const fill = (s) => (s.backgroundImage !== "none" ? s.backgroundImage : s.backgroundColor);
  const clear = (v) => v === "none" || /rgba\(.*,\s*0\)$/.test(v) || v === "transparent";
  const filled = !clear(fill(cs)) && (!ocs || fill(ocs) !== fill(cs));
  const border = parseFloat(cs.borderBottomWidth) || 0;
  const lineFromBorder = !filled && border >= 1 && ocs && ocs.borderBottomColor !== cs.borderBottomColor;
  const lineFromText = !filled && cs.textDecorationLine.includes("underline") && !(ocs?.textDecorationLine.includes("underline"));
  const marker = document.createElement("span");
  marker.className = "seg-pill";
  marker.setAttribute("aria-hidden", "true");
  if (lineFromBorder || lineFromText) {
    container.classList.add("seg-line");
    marker.style.borderBottom = `${lineFromBorder ? border : 2}px solid ${lineFromBorder ? cs.borderBottomColor : cs.color}`;
  } else {
    marker.style.background = cs.backgroundImage !== "none" ? cs.backgroundImage : cs.backgroundColor;
    marker.style.boxShadow = cs.boxShadow;
    marker.style.borderRadius = cs.borderRadius;
  }
  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  container.classList.add("seg-anim");
  const mark = () => opts().forEach((o) => o.classList.add("seg-opt"));
  mark();
  container.prepend(marker);

  function place(animate) {
    // A page that re-renders its buttons with innerHTML takes the marker with them. Put it
    // back: it still holds its last position, so it slides on from there.
    if (!container.contains(marker)) { mark(); container.prepend(marker); }
    const el = active();
    marker.style.opacity = el ? "1" : "0";
    if (!el) return;
    marker.style.transition = animate && !still() ? "" : "none";
    marker.style.width = `${el.offsetWidth}px`;
    marker.style.height = `${el.offsetHeight}px`;
    marker.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
  }
  place(false);

  // Direction: +1 when the new option comes after the old one (by position, so it also
  // holds when the page rebuilt the buttons).
  let lastIndex = opts().indexOf(first);
  let dir = 1;
  let armedUntil = 0;
  const onChange = () => {
    const list = opts();
    const i = list.findIndex(isActive);
    if (i !== -1 && i !== lastIndex) {
      dir = i > lastIndex ? 1 : -1;
      lastIndex = i;
      armedUntil = performance.now() + 700;
    }
    requestAnimationFrame(() => place(true));
  };
  new MutationObserver(onChange).observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "aria-pressed", "aria-selected", "aria-checked", "checked"],
  });
  container.addEventListener("change", onChange);
  new ResizeObserver(() => place(false)).observe(container);

  const targets = (content ?? []).filter(Boolean);
  if (!targets.length) return;
  const queued = new Set();
  let scheduled = false;
  const shown = (el) => el.isConnected && !el.hidden && el.getClientRects().length > 0;
  const flush = () => {
    scheduled = false;
    const els = [...queued].filter(shown);
    queued.clear();
    if (still()) return;
    // The outermost changed elements only: animating a panel and its rows twice looks wrong.
    const top = els.filter((el) => !els.some((o) => o !== el && o.contains(el))).slice(0, 24);
    top.forEach((el, i) =>
      el.animate(
        [{ opacity: 0, transform: `translateX(${24 * dir}px)` }, { opacity: 1, transform: "none" }],
        { duration: 280, delay: Math.min(i, 10) * stagger, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
      ),
    );
  };
  const queue = (el) => {
    if (performance.now() > armedUntil) return;
    queued.add(el);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  };
  for (const target of targets) {
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") r.addedNodes.forEach((n) => n.nodeType === 1 && queue(n));
        else if (!r.target.hidden) queue(r.target);
      }
    }).observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }
}
