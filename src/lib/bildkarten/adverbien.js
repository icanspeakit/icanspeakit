// Bildkarten: adverbien. Bodies on the 100×100 grid, keyed by lexicon id; see kit.js for the style.
import { HI, INK, miniAt } from "./kit.js";

// ---- helpers ------------------------------------------------------------------------------

/** A flat block arrow from (x1,y1) to (x2,y2); outline comes from the wrapping group. */
function arrow(x1, y1, x2, y2, { fill = "#ef4444", w = 5, head = 13, hw = 11 } = {}) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const bx = x2 - ux * head, by = y2 - uy * head;
  const p = [
    [x1 + nx * w, y1 + ny * w], [bx + nx * w, by + ny * w], [bx + nx * hw, by + ny * hw], [x2, y2],
    [bx - nx * hw, by - ny * hw], [bx - nx * w, by - ny * w], [x1 - nx * w, y1 - ny * w],
  ];
  return `<path d="M${p.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L")} Z" fill="${fill}" />`;
}

/** A map pin whose tip sits on (cx, tip), h tall. */
function pin(cx, tip, h, fill = "#ef4444") {
  const r = h * 0.36, cy = tip - h + r;
  return `<path d="M${cx} ${tip} C${cx - r * 0.3} ${tip - r * 0.9} ${cx - r} ${cy + r * 0.7} ${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} C${cx + r} ${cy + r * 0.7} ${cx + r * 0.3} ${tip - r * 0.9} ${cx} ${tip} Z" fill="${fill}" />
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.4).toFixed(1)}" fill="#fff" />
    <path d="M${cx - r * 0.62} ${cy - r * 0.15} Q${cx - r * 0.55} ${cy - r * 0.6} ${cx - r * 0.15} ${cy - r * 0.68}" ${HI} stroke-width="${(r * 0.18).toFixed(1)}" />`;
}

/** A purple question bubble centred on (cx, cy); tail points down-left (or down-right). */
function qBubble(cx, cy, r = 15, { tail = "left" } = {}) {
  const s = r / 15, t = tail === "left" ? -1 : 1;
  return `<path d="M${cx + t * 6 * s} ${cy + 13 * s} L${cx + t * 13 * s} ${cy + 22 * s} L${cx + t * 12 * s} ${cy + 9 * s} Z" fill="#8b5cf6" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#8b5cf6" />
    <path d="M${cx + t * 6 * s} ${cy + 12 * s} L${cx + t * 11 * s} ${cy + 9 * s}" fill="none" stroke="#8b5cf6" stroke-width="${5 * s}" />
    <path d="M${cx - 5.5 * s} ${cy - 4.5 * s} Q${cx - 5.5 * s} ${cy - 10.5 * s} ${cx} ${cy - 10.5 * s} Q${cx + 6 * s} ${cy - 10.5 * s} ${cx + 6 * s} ${cy - 5 * s} Q${cx + 6 * s} ${cy - 1 * s} ${cx + 1.5 * s} ${cy + 1 * s} Q${cx} ${cy + 2 * s} ${cx} ${cy + 4.5 * s}" fill="none" stroke="#fff" stroke-width="${4.6 * s}" />
    <circle cx="${cx}" cy="${cy + 10 * s}" r="${2.7 * s}" fill="#fff" stroke="none" />`;
}

/** A small flag on a pole standing at (x, y). */
function flag(x, y, h = 26, fill = "#ef4444") {
  return `<path d="M${x} ${y} L${x} ${y - h}" fill="none" />
    <path d="M${x} ${y - h} L${x + h * 0.62} ${y - h * 0.8} L${x} ${y - h * 0.56} Z" fill="${fill}" />`;
}

/** Signpost with a big arrow board; dir = -1 (left) or 1 (right). */
function signpost(dir) {
  const tip = dir < 0 ? 8 : 92, back = dir < 0 ? 84 : 16, neck = dir < 0 ? 28 : 72;
  return `<path d="M50 44 L50 92" fill="none" stroke-width="6" />
    <path d="M50 44 L50 92" fill="none" stroke="#a16207" stroke-width="2.5" />
    <path d="M${back} 18 L${neck} 18 L${neck} 8 L${tip} 31 L${neck} 54 L${neck} 44 L${back} 44 Z" fill="#facc15" />
    <path d="M${dir < 0 ? 78 : 22} 24 L${dir < 0 ? 40 : 60} 24" ${HI} />`;
}

/** Calendar page at (x,y), w×h, with a digit; hl = highlighted (today-yellow). */
const DIGIT = {
  1: "M-3 -7 L2 -10 L2 10",
  2: "M-6 -5 Q-6 -10 0 -10 Q6 -10 6 -4 Q6 1 -6 10 L7 10",
  3: "M-6 -8 Q0 -13 5 -7 Q7 -2 0 -1 Q8 0 7 5 Q5 12 -6 8",
};
function page(x, y, w, h, digit, hl) {
  const cx = x + w / 2, cy = y + h * 0.62;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${hl ? "#fde68a" : "#fff"}" ${hl ? 'stroke-width="5"' : ""} />
    <path d="M${x} ${y + 11} L${x} ${y + 4} Q${x} ${y} ${x + 4} ${y} L${x + w - 4} ${y} Q${x + w} ${y} ${x + w} ${y + 4} L${x + w} ${y + 11} Z" fill="${hl ? "#ef4444" : "#cbd5e1"}" />
    <path d="M${x + w * 0.3} ${y - 4} L${x + w * 0.3} ${y + 5} M${x + w * 0.7} ${y - 4} L${x + w * 0.7} ${y + 5}" fill="none" />
    <path d="${DIGIT[digit]}" transform="translate(${cx} ${cy}) scale(${w / 24})" fill="none" stroke="#334155" stroke-width="${(3.5 * 24) / w}" />`;
}

/** The time family: three calendar days, the fink always stands on "today" (middle). */
function calendar(which) {
  const hl = { gestern: 0, heute: 1, morgen: 2 }[which];
  const pages = [6, 37.5, 69].map((x, i) => page(x, 42, 25, 40, i + 1, i === hl)).join("");
  let extra = "";
  if (which === "heute") {
    extra = `<circle cx="80" cy="18" r="9" fill="#facc15" />
    <path d="M80 3 L80 6 M80 30 L80 33 M65 18 L68 18 M92 18 L95 18 M69.5 7.5 L71.5 9.5 M88.5 26.5 L90.5 28.5 M90.5 7.5 L88.5 9.5 M71.5 26.5 L69.5 28.5" fill="none" />`;
  } else {
    const d = which === "gestern" ? -1 : 1;
    extra = `<path d="M${50 + d * 16} 22 Q${50 + d * 30} 14 ${50 + d * 31} 33" fill="none" stroke-width="11" />
    <path d="M${50 + d * 16} 22 Q${50 + d * 30} 14 ${50 + d * 31} 33" fill="none" stroke="#0d9488" stroke-width="5.5" />
    <path d="M${50 + d * 24} 29 L${50 + d * 38} 29 L${50 + d * 31} 40 Z" fill="#0d9488" />`;
  }
  return `${extra}${pages}${miniAt("fink", 31, 4, 38)}`;
}

/** The question family: purple "?" bubble over the esel. */
const esel = (x, y, flip = false) => miniAt("esel", x, y, 40, { flip });

// ---- drawings -----------------------------------------------------------------------------

export const ADVERBIEN = {
  // The katze stands right on the red X, a big pin points down at it: HERE.
  hier: `
    <ellipse cx="50" cy="84" rx="40" ry="10" fill="#bbf7d0" />
    <path d="M30 78 L70 92 M70 78 L30 92" fill="none" stroke-width="10" />
    <path d="M30 78 L70 92 M70 78 L30 92" fill="none" stroke="#ef4444" stroke-width="5" />
    ${miniAt("katze", 26, 40, 48)}
    ${pin(50, 37, 32)}`,

  // Same katze up front, the same pin far away on a hill, a dotted path leads there: THERE.
  dort: `
    <path d="M42 64 Q70 26 97 64 Z" fill="#bbf7d0" />
    <ellipse cx="34" cy="86" rx="28" ry="7" fill="#bbf7d0" />
    <path d="M44 84 Q60 76 64 64" fill="none" stroke-dasharray="1 7" stroke-width="4" />
    ${pin(70, 46, 22)}
    ${miniAt("katze", 6, 44, 46)}`,

  // A ladder, the katze at the very top, a big arrow pointing up: UP / ABOVE.
  oben: `
    <path d="M36 94 L36 30 M64 94 L64 30" fill="none" stroke-width="5" />
    <path d="M36 94 L36 30 M64 94 L64 30" fill="none" stroke="#a16207" stroke-width="2" />
    <path d="M36 82 L64 82 M36 68 L64 68 M36 54 L64 54 M36 40 L64 40" fill="none" />
    ${miniAt("katze", 27, -2, 46)}
    ${arrow(86, 90, 86, 22, { fill: "#0d9488", w: 5, head: 14, hw: 11 })}`,

  // Signpost with one big yellow arrow board to the LEFT, katze looking that way.
  links: `
    <ellipse cx="50" cy="92" rx="38" ry="5" fill="#bbf7d0" />
    ${signpost(-1)}
    ${miniAt("katze", 54, 56, 36)}`,

  // Mirror image: the arrow board points RIGHT.
  rechts: `
    <ellipse cx="50" cy="92" rx="38" ry="5" fill="#bbf7d0" />
    ${signpost(1)}
    ${miniAt("katze", 10, 56, 36)}`,

  heute: calendar("heute"),
  gestern: calendar("gestern"),
  "morgen-adv": calendar("morgen"),

  // A meter turned all the way up into the red, plus "!!": VERY.
  sehr: `
    <path d="M10 76 A40 40 0 0 1 30 41.4 L40 58.7 A20 20 0 0 0 30 76 Z" fill="#22c55e" />
    <path d="M30 41.4 A40 40 0 0 1 70 41.4 L60 58.7 A20 20 0 0 0 40 58.7 Z" fill="#facc15" />
    <path d="M70 41.4 A40 40 0 0 1 90 76 L70 76 A20 20 0 0 0 60 58.7 Z" fill="#ef4444" />
    <path d="M50 76 L84 54" fill="none" stroke-width="7" />
    <circle cx="50" cy="76" r="7" fill="${INK}" />
    <path d="M14 90 L86 90" fill="none" />
    <path d="M78 10 L76 32 M90 10 L88 32" fill="none" stroke="#ef4444" stroke-width="7" />
    <circle cx="75.5" cy="40" r="3.5" fill="#ef4444" stroke="none" />
    <circle cx="87.5" cy="40" r="3.5" fill="#ef4444" stroke="none" />
    ${miniAt("katze", 6, 4, 34)}`,

  // "?" over the esel, a map pin beside it: WHERE?
  wo: `
    ${esel(2, 50)}
    ${qBubble(26, 26, 17)}
    ${pin(72, 88, 58)}`,

  // "?" over the esel, a clock beside it: WHEN?
  wann: `
    ${esel(2, 50)}
    ${qBubble(26, 26, 17)}
    <circle cx="70" cy="60" r="24" fill="#7dd3fc" />
    <circle cx="70" cy="60" r="17" fill="#fff" />
    <path d="M70 60 L70 48 M70 60 L79 64" fill="none" stroke-width="4.5" />
    <path d="M70 46 L70 46 M84 60 L84 60 M70 74 L70 74 M56 60 L56 60" fill="none" stroke-width="5" />
    <path d="M56 36 L52 30 M84 36 L88 30" fill="none" stroke-width="5" />`,

  // A house on the left, an arrow comes FROM it to the esel (right): WHERE FROM?
  woher: `
    <path d="M6 54 L24 38 L42 54 L42 86 L6 86 Z" fill="#fde68a" />
    <path d="M2 56 L24 36 L46 56" fill="none" stroke-width="5" />
    <path d="M2 56 L24 36 L46 56" fill="none" stroke="#ef4444" stroke-width="2" />
    <rect x="19" y="66" width="10" height="20" fill="#a16207" />
    ${arrow(36, 76, 62, 76, { fill: "#0d9488", w: 4.5, head: 11, hw: 9 })}
    ${esel(58, 50, true)}
    ${qBubble(74, 24, 17, { tail: "right" })}`,

  // The esel on the left, an arrow goes from it TO a flag: WHERE TO?
  wohin: `
    ${esel(2, 50)}
    ${qBubble(26, 24, 17)}
    ${arrow(40, 76, 66, 76, { fill: "#0d9488", w: 4.5, head: 11, hw: 9 })}
    <ellipse cx="80" cy="88" rx="14" ry="4" fill="#bbf7d0" />
    ${flag(74, 88, 46)}`,
};
