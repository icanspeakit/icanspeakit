// The thank-you after a report is sent (src/lib/meldung.js): the sheet turns into a small
// "Thanks!" card with a mascot, and hearts, balloons and sparkles burst out of the Senden
// button and float up over the page. People who report a mistake help everyone; this says so.
//
// The burst is a popover, so it sits in the top layer above the modal sheet (a plain element
// on <body> would be hidden under the dialog's backdrop); without popover support it goes on
// <body> and is seen once the sheet closes. Reduced motion: the card, no burst.
import { mascotSvg } from "./mascots.js";
import { mascotsEnabled } from "./mascotPrefs.js";

const LOVE = ["❤️", "💛", "💚", "💙", "🧡", "💜", "🥰", "✨", "🎉"];
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The card that replaces the form; `line` is the translated "we'll take a look". */
export function dankeHtml(line, esc) {
  const crew = mascotsEnabled()
    ? `<div class="mf-danke-crew" aria-hidden="true">${["hamsti", "bruno", "quaki"].map((n, i) => `<span style="--i:${i}">${mascotSvg({ name: n, expr: "celebrate", size: 64, label: "" })}</span>`).join("")}</div>`
    : `<div class="mf-danke-heart" aria-hidden="true">💛</div>`;
  return `
    <div class="mf-danke" role="status">
      ${crew}
      <h2 id="mf-title">Thanks!</h2>
      <p>${esc(line)} <span aria-hidden="true">💛</span></p>
    </div>`;
}

/** Hearts and sparkles pop out of `from`, balloons drift up past the top of the screen. */
export function loveBurst(from) {
  if (still() || typeof document === "undefined") return;
  const r = from?.getBoundingClientRect?.() ?? { left: innerWidth / 2, top: innerHeight * 0.7, width: 0, height: 0 };
  const x0 = r.left + r.width / 2;
  const y0 = r.top + r.height / 2;

  const layer = document.createElement("div");
  layer.className = "mf-burst";
  layer.setAttribute("aria-hidden", "true");
  const popover = "showPopover" in layer;
  if (popover) layer.popover = "manual";
  document.body.append(layer);
  if (popover) layer.showPopover();

  const add = (glyph, size) => {
    const s = document.createElement("span");
    s.textContent = glyph;
    s.style.cssText = `left:${x0}px;top:${y0}px;font-size:${size}px`;
    layer.append(s);
    return s;
  };
  const anims = [];
  // Hearts and sparkles: a pop in every direction, mostly upwards, then a fade.
  for (let i = 0; i < 26; i++) {
    const s = add(LOVE[i % LOVE.length], 18 + Math.random() * 16);
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
    const d = 90 + Math.random() * 170;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
    anims.push(s.animate([
      { transform: "translate(-50%,-50%) scale(.2)", opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) scale(1.15)`, opacity: 1, offset: 0.35 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - 60}px)) scale(1) rotate(${(Math.random() - 0.5) * 50}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 600, delay: Math.random() * 180, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }));
  }
  // Balloons: slower, swaying, all the way up.
  for (let i = 0; i < 7; i++) {
    const s = add("🎈", 30 + Math.random() * 16);
    const dx = (Math.random() - 0.5) * Math.min(innerWidth, 600);
    const sway = 20 + Math.random() * 25;
    anims.push(s.animate([
      { transform: "translate(-50%,-50%) scale(.3)", opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.3 + sway}px), calc(-50% - ${y0 * 0.35}px)) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${dx * 0.7 - sway}px), calc(-50% - ${y0 * 0.75}px)) scale(1)`, opacity: 1, offset: 0.65 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% - ${y0 + 120}px)) scale(1)`, opacity: 0 },
    ], { duration: 2600 + Math.random() * 900, delay: 150 + Math.random() * 400, easing: "ease-in-out", fill: "both" }));
  }
  Promise.all(anims.map((a) => a.finished)).finally(() => {
    if (popover) try { layer.hidePopover(); } catch {}
    layer.remove();
  });
}
