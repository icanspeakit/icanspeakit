// Bildkarten: adjektive. Bodies on the 100×100 grid, keyed by lexicon id; see kit.js for the style.
// Most come as opposite pairs drawn with the same actor and props (schnell/langsam, alt/neu …),
// so the contrast is the only thing that changes.
import { HI, INK, miniAt } from "./kit.js";

// --- small helpers (local to this file) ---------------------------------------------------
/** Draw `body` in a mini's own 100×100 coordinates, placed like miniAt(name, x, y, s): for
    faces painted over a mini (tears, closed eyes, open mouth). */
const on = (x, y, s, body) =>
  `<g transform="translate(${x} ${y}) scale(${s / 100})" stroke-width="${(300 / s).toFixed(2)}">${body}</g>`;
/** Four-point sparkle. */
const spark = (x, y, r, fill = "#facc15") =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${fill}" stroke-width="2" />`;
/** Heart, k = scale (1 ≈ 12 units wide). */
const heart = (x, y, k, fill = "#f43f5e") =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M0 5 C-9 -1 -7 -9 0 -5 C7 -9 9 -1 0 5 Z" fill="${fill}" stroke-width="${(2.5 / k).toFixed(2)}" />`;
/** Drop (sweat, tear, water), k = scale (1 ≈ 8 units tall). */
const drop = (x, y, k, fill = "#7dd3fc") =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M0 -6 Q4 -1 4 2 A4 4 0 0 1 -4 2 Q-4 -1 0 -6 Z" fill="${fill}" stroke-width="${(2.2 / k).toFixed(2)}" />`;
/** Snowflake. */
const flake = (x, y, r) =>
  `<path d="M${x} ${y - r} L${x} ${y + r} M${x - r * 0.87} ${y - r / 2} L${x + r * 0.87} ${y + r / 2} M${x - r * 0.87} ${y + r / 2} L${x + r * 0.87} ${y - r / 2}" fill="none" stroke="#60a5fa" stroke-width="3" />`;
/** Thermometer standing at x (left edge), mercury top at `level`. */
const thermo = (x, level, fill) => `
    <rect x="${x}" y="14" width="11" height="66" rx="5.5" fill="#fff" />
    <rect x="${x + 3.5}" y="${level}" width="4" height="${80 - level}" fill="${fill}" stroke="none" />
    <circle cx="${x + 5.5}" cy="82" r="8" fill="${fill}" />
    <path d="M${x + 11} 26 h4 M${x + 11} 38 h4 M${x + 11} 50 h4 M${x + 11} 62 h4" fill="none" stroke-width="2.5" />`;

// Katze face pieces, in the cat's own coordinates (fur #cbd5e1, eyes at 40/60,50, mouth ~50,64).
const FUR = "#cbd5e1";
const coverEyes = `<ellipse cx="40" cy="50" rx="6" ry="7" fill="${FUR}" stroke="none" /><ellipse cx="60" cy="50" rx="6" ry="7" fill="${FUR}" stroke="none" />`;
const coverMouth = `<path d="M38 59 L62 59 L62 72 L38 72 Z" fill="${FUR}" stroke="none" />`;
const nose = `<path d="M47 60 L53 60 L50 64 Z" fill="#f9a8d4" stroke-width="3" />`;

// Pencil, lying from x0 to x1 (tip on the right) between y 60 and 76.
const pencil = (x0, x1) => `
    <path d="M${x0 + 12} 56 L${x1 - 18} 56 L${x1} 68 L${x1 - 18} 80 L${x0 + 12} 80 Z" fill="#facc15" />
    <path d="M${x1 - 18} 56 L${x1} 68 L${x1 - 18} 80 Z" fill="#f5d0a9" />
    <path d="M${x1 - 6} 64 L${x1} 68 L${x1 - 6} 72 Z" fill="${INK}" stroke="none" />
    <path d="M${x0 + 12} 64 L${x1 - 18} 64 M${x0 + 12} 72 L${x1 - 18} 72" fill="none" stroke-width="2" opacity=".45" />
    <rect x="${x0 + 5}" y="55" width="8" height="26" fill="#cbd5e1" />
    <path d="M${x0 + 5} 55 L${x0 + 5} 81 L${x0 + 2} 81 Q${x0 - 3} 68 ${x0 + 2} 55 Z" fill="#f9a8d4" />`;
// Dimension arrow above the pencil.
const span = (x0, x1) => `
    <path d="M${x0} 36 L${x0} 50 M${x1} 36 L${x1} 50 M${x0 + 2} 43 L${x1 - 2} 43" fill="none" stroke-width="3" />
    <path d="M${x0 + 2} 43 l7 -5 l0 10 Z M${x1 - 2} 43 l-7 -5 l0 10 Z" fill="${INK}" stroke-width="2" />`;

// House for alt/neu: walls 24..76 × 50..88, roof to 50,18.
const house = ({ wall, roof, door, win }) => `
    <rect x="62" y="22" width="9" height="18" fill="${roof}" />
    <path d="M14 52 L50 18 L86 52 Z" fill="${roof}" />
    <rect x="24" y="50" width="52" height="38" fill="${wall}" />
    <rect x="31" y="60" width="16" height="15" fill="${win}" />
    <path d="M39 60 L39 75 M31 67.5 L47 67.5" fill="none" stroke-width="2.5" />
    <path d="M55 88 L55 64 Q62 58 69 64 L69 88 Z" fill="${door}" />`;

export const ADJEKTIVE = {
  // schnell / langsam: a swallow shooting by with speed lines vs a snail with its slime trail.
  schnell: `
    <path d="M6 40 L30 40 M12 52 L34 52 M4 64 L28 64" fill="none" stroke-width="4" />
    <path d="M18 30 L34 30 M20 76 L36 76" fill="none" stroke-width="3" opacity=".5" />
    ${miniAt("schwalbe", 30, 18, 66, { rotate: -8 })}`,
  langsam: `
    <path d="M6 76 Q16 73 26 76 Q34 78 40 76" fill="none" stroke="#a7f3d0" stroke-width="5" />
    ${miniAt("schnecke", 26, 22, 68)}
    <circle cx="14" cy="34" r="12" fill="#fff" />
    <path d="M14 26 L14 34 L20 37" fill="none" stroke-width="3" />
    <path d="M30 22 q4 -3 8 0 M42 18 q4 -3 8 0" fill="none" stroke-width="2.5" opacity=".6" />
    <path d="M6 82 L94 82" fill="none" stroke-width="3" />`,

  // lang / kurz: the same pencil, long and short, with a measuring arrow.
  lang: `${span(8, 92)}${pencil(8, 92)}
    <path d="M26 60 L62 60" ${HI} stroke-width="2.5" />`,
  kurz: `${span(32, 68)}${pencil(32, 68)}`,

  // alt / neu: the same house, worn and cobwebbed vs shiny with sparkles.
  alt: `
    <g transform="rotate(-4 50 88)">
    ${house({ wall: "#d6c7a1", roof: "#8b6b4a", door: "#78716c", win: "#57534e" })}
    <path d="M31 60 L47 75 M47 60 L31 75" fill="none" stroke="#a16207" stroke-width="3.5" />
    <path d="M60 52 L56 58 L61 62 L57 70" fill="none" stroke-width="2.5" />
    <rect x="27" y="78" width="10" height="7" fill="#a8a29e" stroke-width="2.5" />
    <path d="M40 30 L46 26 M58 32 L64 38" fill="none" stroke-width="2.5" />
    </g>
    <path d="M24 50 L24 63 M24 50 L37 50 M24 50 L33 59 M24 56 Q28 56 29 54 Q29 52 31 50 M24 60 Q31 61 32 56 Q34 52 35 50" fill="none" stroke-width="1.6" />
    <path d="M6 90 L94 90" fill="none" stroke-width="3" />`,
  neu: `
    ${house({ wall: "#fde68a", roof: "#ef4444", door: "#0d9488", win: "#7dd3fc" })}
    <path d="M27 54 L27 70" ${HI} stroke-width="3" />
    <path d="M33 63 L36 61" stroke="#fff" fill="none" stroke-width="2.5" />
    ${spark(88, 20, 7)}${spark(12, 30, 5)}${spark(90, 64, 5)}
    <path d="M6 90 L94 90" fill="none" stroke-width="3" />`,

  // gross / klein: the cat next to the same crate, big vs tiny.
  gross: `
    ${miniAt("katze", -2, 30, 70)}
    <rect x="66" y="66" width="24" height="22" fill="#d97706" />
    <path d="M66 77 L90 77 M78 66 L78 88" fill="none" stroke-width="2.5" />
    <path d="M6 88 L94 88" fill="none" stroke-width="3" />`,
  klein: `
    ${miniAt("katze", 36, 66, 27)}
    <rect x="66" y="66" width="24" height="22" fill="#d97706" />
    <path d="M66 77 L90 77 M78 66 L78 88" fill="none" stroke-width="2.5" />
    <path d="M6 88 L94 88" fill="none" stroke-width="3" />`,

  // heiss / kalt: the cat with thermometer — sun, sweat and red cheeks vs snow and a scarf.
  heiss: `
    ${thermo(6, 20, "#ef4444")}
    <circle cx="80" cy="18" r="9" fill="#facc15" />
    <path d="M80 3 L80 6 M95 18 L92 18 M90.6 7.4 L88.5 9.5 M66 10 L68.5 12 M90.6 28.6 L88.5 26.5" fill="none" stroke-width="3" />
    ${miniAt("katze", 26, 30, 64)}
    ${on(26, 30, 64, `<ellipse cx="32" cy="62" rx="6" ry="4" fill="#f87171" stroke="none" opacity=".8" /><ellipse cx="68" cy="62" rx="6" ry="4" fill="#f87171" stroke="none" opacity=".8" />`)}
    ${drop(32, 46, 1.1)}${drop(88, 50, 1.1)}${drop(84, 62, 0.9)}`,
  kalt: `
    ${thermo(6, 66, "#3b82f6")}
    ${flake(80, 16, 8)}${flake(62, 10, 5)}${flake(92, 36, 5)}
    ${miniAt("katze", 26, 30, 64)}
    ${on(26, 30, 64, `
      <circle cx="50" cy="54" r="27" fill="#93c5fd" stroke="none" opacity=".35" />
      <path d="M26 72 Q50 88 74 72 L78 82 Q50 98 22 82 Z" fill="#ef4444" />
      <path d="M60 86 L64 104 L74 102 L68 84" fill="#ef4444" />
      <path d="M34 80 L36 88 M48 84 L48 92 M62 82 L60 90" fill="none" stroke="#fff" stroke-width="3" />`)}
    <path d="M27 50 l-4 -2 M27 56 l-5 0 M27 62 l-4 2" fill="none" stroke-width="2.5" />`,

  // traurig / gluecklich: the cat under a rain cloud with tears vs beaming with hearts.
  traurig: `
    <path d="M30 22 Q28 10 40 10 Q46 2 56 8 Q68 4 70 16 Q78 18 74 24 L32 24 Q26 24 30 22 Z" fill="#94a3b8" />
    <path d="M38 30 l-2 5 M50 30 l-2 5 M62 30 l-2 5" fill="none" stroke="#3b82f6" stroke-width="3" />
    ${miniAt("katze", 18, 32, 64)}
    ${on(18, 32, 64, `
      ${coverMouth}${nose}
      <path d="M40 76 Q50 68 60 76" fill="none" stroke-width="4" />
      <path d="M32 42 L44 38 M68 42 L56 38" fill="none" stroke-width="4" />`)}
    ${drop(37, 74, 1)}${drop(64, 76, 1)}`,
  gluecklich: `
    ${miniAt("katze", 18, 32, 64)}
    ${on(18, 32, 64, `
      ${coverEyes}${coverMouth}${nose}
      <path d="M34 53 Q40 44 46 53 M54 53 Q60 44 66 53" fill="none" stroke-width="4.5" />
      <path d="M38 66 L62 66 Q60 80 50 80 Q40 80 38 66 Z" fill="#7f1d1d" stroke-width="4" />
      <path d="M43 75 Q50 71 57 75 Q54 79 50 79 Q46 79 43 75 Z" fill="#f472b6" stroke="none" />
      <ellipse cx="30" cy="64" rx="6" ry="4" fill="#f9a8d4" stroke="none" />
      <ellipse cx="70" cy="64" rx="6" ry="4" fill="#f9a8d4" stroke="none" />`)}
    ${heart(14, 30, 1.1)}${heart(86, 26, 1.3)}${heart(84, 60, 0.9)}
    ${spark(50, 14, 7)}${spark(20, 62, 5)}`,

  // gut: thumbs up with sparkles.
  gut: `
    <rect x="12" y="50" width="20" height="38" rx="3" fill="#3b82f6" />
    <path d="M32 50 L44 46 L50 30 Q52 12 62 14 Q70 16 66 32 L64 44 L80 44 Q88 44 87 52 Q86 56 84 57 Q89 60 86 66 Q84 69 82 69 Q86 72 83 78 Q81 81 78 81 Q80 86 76 88 L32 88 Z" fill="#fbbf8c" />
    <path d="M64 57 L84 57 M66 69 L82 69 M66 81 L78 81" fill="none" stroke-width="2.5" />
    <path d="M56 22 Q60 20 62 24" ${HI} stroke-width="3" />
    ${spark(84, 18, 8)}${spark(22, 30, 6)}`,

  // schoen: a finch admiring a flower, hearts and sparkles.
  schoen: `
    <path d="M64 50 L64 92" fill="none" stroke="#16a34a" stroke-width="5" />
    <path d="M64 92 L64 50" fill="none" />
    <path d="M64 76 Q76 64 86 70 Q78 82 64 76 Z" fill="#22c55e" />
    <g fill="#f472b6">
      <circle cx="64" cy="22" r="10" /><circle cx="78" cy="32" r="10" /><circle cx="73" cy="48" r="10" />
      <circle cx="55" cy="48" r="10" /><circle cx="50" cy="32" r="10" />
    </g>
    <circle cx="64" cy="36" r="8" fill="#facc15" />
    ${miniAt("fink", 2, 52, 40)}
    ${heart(20, 46, 0.9)}${heart(34, 40, 0.7)}
    ${spark(88, 12, 6)}${spark(40, 16, 5)}${spark(92, 56, 4)}`,

  // schwer: an ant straining under a kettlebell.
  schwer: `
    <path d="M30 28 Q30 8 46 8 Q62 8 62 28" fill="none" stroke-width="8" />
    <path d="M30 28 Q30 8 46 8 Q62 8 62 28" fill="none" stroke="#475569" stroke-width="3" />
    <path d="M26 46 Q26 26 46 26 Q66 26 66 46 Q66 64 56 68 L36 68 Q26 64 26 46 Z" fill="#374151" />
    <text x="46" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="15" fill="#fff" stroke="none">kg</text>
    <path d="M32 40 Q33 34 38 31" ${HI} stroke-width="3" />
    ${miniAt("ameise", 14, 46, 58)}
    ${drop(76, 60, 1)}${drop(86, 70, 0.9)}
    <path d="M14 66 L20 70 M78 50 L74 56" fill="none" stroke-width="2.5" />
    <path d="M6 92 L94 92" fill="none" stroke-width="3" />`,

  // hoch: a steep mountain with the finch and a flag on the peak, cloud below.
  hoch: `
    <path d="M10 92 L50 26 L90 92 Z" fill="#94a3b8" />
    <path d="M38 46 L50 26 L62 46 L56 42 L50 48 L44 42 Z" fill="#fff" />
    <path d="M60 30 L60 4" fill="none" />
    <path d="M60 4 L76 9 L60 14 Z" fill="#ef4444" />
    ${miniAt("fink", 33, 2, 28)}
    <path d="M6 66 Q6 58 14 58 Q16 50 24 52 Q30 48 34 56 Q40 56 40 62 Q40 66 36 66 Z" fill="#fff" />
    <path d="M70 80 L76 66 L82 80 Z" fill="#16a34a" />
    <path d="M4 92 L96 92" fill="none" stroke-width="3" />`,

  // voll: a glass filled over the brim, overflowing into a puddle.
  voll: `
    <ellipse cx="50" cy="90" rx="40" ry="6" fill="#7dd3fc" />
    <path d="M28 20 L72 20 L66 84 Q65.6 88 60 88 L40 88 Q34.4 88 34 84 Z" fill="#7dd3fc" stroke="none" />
    <path d="M28 20 L72 20 L66 84 Q65.6 88 60 88 L40 88 Q34.4 88 34 84 Z" fill="none" />
    <path d="M26 21 Q26 10 50 10 Q74 10 74 21 Z" fill="#7dd3fc" />
    <path d="M27 20 Q20 26 22 40 Q24 46 20 52" fill="none" stroke="#38bdf8" stroke-width="5" />
    <path d="M73 20 Q80 30 78 48 Q76 60 80 70" fill="none" stroke="#38bdf8" stroke-width="5" />
    ${drop(20, 60, 1.2)}${drop(82, 80, 1.1)}
    <path d="M36 28 L40 78" ${HI} />`,

  // krank: the cat green-faced, thermometer in the mouth, ice pack on the head, in bed.
  krank: `
    ${miniAt("katze", 20, 26, 62)}
    ${on(20, 26, 62, `
      <circle cx="50" cy="54" r="26" fill="#86efac" stroke="none" opacity=".55" />
      ${coverEyes}
      <path d="M34 50 L46 50 M54 50 L66 50" fill="none" stroke-width="4.5" />
      <path d="M35 50 Q40 57 45 50 M55 50 Q60 57 65 50" fill="${INK}" stroke-width="3" />
      ${coverMouth}${nose}
      <path d="M42 72 Q46 69 50 72 Q54 75 58 72" fill="none" stroke-width="4" />
      <path d="M30 22 Q50 2 70 22 Q60 30 50 28 Q40 30 30 22 Z" fill="#60a5fa" />
      <path d="M46 10 L50 2 L54 10" fill="#60a5fa" stroke-width="3" />`)}
    <g transform="rotate(-22 52 72)">
      <rect x="52" y="69" width="34" height="6" rx="3" fill="#fff" />
      <rect x="74" y="70.5" width="10" height="3" fill="#ef4444" stroke="none" />
    </g>
    <path d="M4 92 L4 84 Q4 80 10 80 L90 80 Q96 80 96 84 L96 92 Z" fill="#c4b5fd" />
    <path d="M14 86 L86 86" fill="none" stroke="#fff" stroke-width="2.5" />`,

  // laut: the cat shouting, big sound waves.
  laut: `
    ${miniAt("katze", 2, 28, 62)}
    ${on(2, 28, 62, `
      ${coverMouth}${nose}
      <ellipse cx="50" cy="73" rx="10" ry="9" fill="#7f1d1d" stroke-width="4" />
      <path d="M44 78 Q50 74 56 78" fill="none" stroke="#f472b6" stroke-width="4" />
      <path d="M30 38 L44 43 M70 38 L56 43" fill="none" stroke-width="4.5" />`)}
    <path d="M66 50 Q72 60 66 70" fill="none" stroke-width="4" />
    <path d="M74 42 Q84 60 74 78" fill="none" stroke-width="4" />
    <path d="M82 34 Q96 60 82 86" fill="none" stroke-width="4" />
    <path d="M66 14 L70 28 M80 12 L78 26 M54 18 L62 28" fill="none" stroke-width="3.5" />`,

  // muede: the cat yawning with closed eyes, a half moon and Zzz.
  muede: `
    <path d="M16 6 A13 13 0 1 0 30 24 A10 10 0 1 1 16 6 Z" fill="#facc15" />
    ${spark(38, 12, 4)}
    ${miniAt("katze", 18, 32, 62)}
    ${on(18, 32, 62, `
      ${coverEyes}
      <path d="M33 50 Q40 56 47 50 M53 50 Q60 56 67 50" fill="none" stroke-width="4.5" />
      <path d="M36 54 L34 58 M41 55.5 L41 60 M64 54 L66 58 M59 55.5 L59 60" fill="none" stroke-width="3" />
      ${coverMouth}${nose}
      <ellipse cx="50" cy="72" rx="6" ry="7" fill="#7f1d1d" stroke-width="4" />`)}
    <path d="M70 30 h13 l-13 14 h13 M84 15 h9 l-9 10 h9 M93 3 h6 l-6 7 h6" fill="none" stroke-width="3.5" />`,
};
