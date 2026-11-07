// The live quiz's moments of suspense, shared by the projector and the phones.
//
// The answer used to arrive as a cut: the question screen vanished and the result stood
// there. A game show turns the cards over. So the four options flip one after another,
// the wrong ones come down grey, the right one comes up and pulses, and only then does
// the next screen take over. The Web Animations API rather than CSS classes, because
// the flip changes what the card says halfway through, while it is edge-on and unreadable.
//
// Everything collapses to "no delay" under prefers-reduced-motion: the result is the
// point, the show is not.

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (a) => a.finished.catch(() => {});

const HALF = 170; // ms per half-turn
const STAGGER = 110; // ms between cards

/**
 * Turns the option cards over.
 * @param {HTMLElement[]} cards  in option order
 * @param {number} correct       index of the right option
 * @param {(card: HTMLElement, i: number, right: boolean) => void} turn
 *        called while card i is edge-on — change its content here
 * @returns {Promise<void>} once the last card has landed and the right one has pulsed
 */
export async function flipCards(cards, correct, turn) {
  if (reduced()) {
    cards.forEach((c, i) => turn(c, i, i === correct));
    return;
  }
  // The right card last, so the reveal ends on it rather than on a wrong one.
  const order = cards.map((_, i) => i).filter((i) => i !== correct).concat(correct);
  await Promise.all(order.map(async (i, k) => {
    const card = cards[i];
    if (!card) return;
    await wait(k * STAGGER);
    await done(card.animate([{ transform: "perspective(900px) rotateY(0)" }, { transform: "perspective(900px) rotateY(90deg)" }], { duration: HALF, easing: "ease-in", fill: "forwards" }));
    turn(card, i, i === correct);
    await done(card.animate([{ transform: "perspective(900px) rotateY(-90deg)" }, { transform: "perspective(900px) rotateY(0)" }], { duration: HALF, easing: "ease-out", fill: "forwards" }));
    if (i === correct) {
      await done(card.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-in-out" }));
    }
  }));
}

/** Counts a number up in `el`, e.g. 0 → 965 points. */
export function countUp(el, from, to, ms = 700, fmt = (n) => String(n)) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = fmt(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = fmt(from);
  requestAnimationFrame(step);
}

/**
 * Moves ranking rows from where they stood to where they stand now (FLIP). Each row
 * carries `data-from`: its index in the previous ranking. A row that was lower than the
 * list reaches rises in from below it.
 */
export function slideRanks(list, delay = 350) {
  if (reduced()) return;
  const rows = [...list.children];
  if (!rows.length) return;
  const h = rows[0].getBoundingClientRect().height + parseFloat(getComputedStyle(list).rowGap || "0");
  rows.forEach((row, i) => {
    const from = Math.min(Number(row.dataset.from ?? i), rows.length);
    const dy = (from - i) * h;
    if (!dy) return;
    row.animate(
      [{ transform: `translateY(${dy}px)`, opacity: from >= rows.length ? 0 : 1 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: 650, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
    );
  });
}

export { wait };
