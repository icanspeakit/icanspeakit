// Motion for the site's jump rows: a row of links to sections of the same page
// (/knowledge/slang "Kurzformen · Alltagswörter …", the tables of contents on
// /politik, /explore/films, /grammar/verbs …). Loaded on every page by Layout.astro.
//
// It finds them itself: every <nav> in <main> whose links all point to an element on this
// page (#id, at least two), and anything marked [data-jumpnav]. [data-jumpnav="off"] opts out.
//
// 1. A tap scrolls smoothly to the section instead of jumping, and the section briefly
//    lights up when it arrives, so the eye finds where it landed.
// 2. The tapped link becomes the active one: in a row of chips the marker of segSwitch.js
//    slides to it (the same pill as every switch on the site).
// 3. While reading, the active link follows the section on screen (scroll-spy); a row that
//    scrolls sideways keeps it in view.
//
// With prefers-reduced-motion the page jumps, nothing slides and nothing lights up; the
// active link still follows.
import "../styles/jump-nav.css";
import { enhanceSwitch } from "./segSwitch.js";

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function targetOf(a) {
  const h = a.getAttribute("href") || "";
  if (!h.startsWith("#") || h.length < 2) return null;
  try { return document.getElementById(decodeURIComponent(h.slice(1))); } catch { return null; }
}

function enhance(nav) {
  if (nav.dataset.jumpnavOn || nav.dataset.jumpnav === "off") return;
  const links = [...nav.querySelectorAll("a[href]")];
  if (links.length < 2) return;
  const pairs = links.map((a) => [a, targetOf(a)]);
  if (pairs.some(([, t]) => !t)) return;
  nav.dataset.jumpnavOn = "1";
  nav.classList.add("jn-nav");
  pairs.forEach(([, t]) => t.classList.add("jn-target"));
  // The sliding pill needs the links as direct children (segSwitch's markup contract);
  // lists of <li><a> get the active look on the link itself.
  const direct = links.every((a) => a.parentElement === nav);
  let pill = false;

  let current = null;
  function setActive(a) {
    if (a === current) return;
    current?.classList.remove("is-active");
    current?.removeAttribute("aria-current");
    current = a;
    if (!a) return;
    a.classList.add("is-active");
    a.setAttribute("aria-current", "location");
    if (direct && !pill) { pill = true; enhanceSwitch(nav, { options: ":scope > a" }); }
    // A row that scrolls sideways: bring the active link into it, without moving the page.
    if (nav.scrollWidth > nav.clientWidth + 1) {
      const left = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
      nav.scrollTo({ left, behavior: still() ? "auto" : "smooth" });
    }
  }

  // Scroll-spy: the last section whose top has passed a line a third down the screen.
  let lockUntil = 0;
  function spy() {
    if (performance.now() < lockUntil) return;
    const line = innerHeight * 0.33;
    let hit = null;
    for (const [a, t] of pairs) {
      const r = t.getBoundingClientRect();
      if (r.top <= line && r.bottom > 0) hit = a;
    }
    setActive(hit);
  }
  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; spy(); });
  }, { passive: true });

  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = targetOf(a);
    if (!t) return;
    e.preventDefault();
    history.replaceState(history.state, "", a.getAttribute("href"));
    setActive(a);
    // The spy waits while the page travels, so the pill goes straight to the tapped link
    // instead of stepping through every section on the way.
    lockUntil = performance.now() + 1500;
    t.scrollIntoView({ behavior: still() ? "auto" : "smooth", block: "start" });
    if (still()) { lockUntil = 0; return; }
    let done = false;
    const arrive = () => {
      if (done) return;
      done = true;
      lockUntil = 0;
      t.classList.remove("jn-arrive");
      void t.offsetWidth; // restart the animation on a second tap
      t.classList.add("jn-arrive");
      t.addEventListener("animationend", () => t.classList.remove("jn-arrive"), { once: true });
    };
    if ("onscrollend" in window) addEventListener("scrollend", arrive, { once: true });
    setTimeout(arrive, 900);
  });

  spy();
}

function scan(root = document) {
  root.querySelectorAll("main nav, [data-jumpnav]").forEach(enhance);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => scan());
else scan();
