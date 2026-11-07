// Bildkarten: nomen-b. Bodies on the 100×100 grid, keyed by lexicon id; see kit.js for the style.
import { HI, INK, miniAt } from "./kit.js";

// An outlined tube (legs, tails, bike frame): a thick ink stroke with a coloured stroke on top.
// The ink one inherits the group's stroke, so it turns light on dark fabric like every outline.
const tube = (d, fill, w = 5) =>
  `<path d="${d}" fill="none" stroke-width="${w + 7}" /><path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" />`;

export const NOMEN_B = {
  buch: `
    <path d="M8 34 L8 82 Q30 77 50 86 Q70 77 92 82 L92 34 Z" fill="#2563eb" />
    <path d="M13 24 Q33 18 50 28 L50 80 Q33 70 13 75 Z" fill="#fff" />
    <path d="M87 24 Q67 18 50 28 L50 80 Q67 70 87 75 Z" fill="#fff" />
    <path d="M20 36 Q32 32 43 38 M20 47 Q32 43 43 49 M20 58 Q32 54 43 60" fill="none" stroke-width="2.5" opacity=".45" />
    <path d="M57 38 Q68 32 80 36 M57 49 Q68 43 80 47 M57 60 Q68 54 80 58" fill="none" stroke-width="2.5" opacity=".45" />`,
  kaffee: `
    <ellipse cx="48" cy="80" rx="40" ry="9" fill="#fff" />
    <ellipse cx="48" cy="78" rx="24" ry="4.5" fill="none" stroke-width="2.5" opacity=".35" />
    <path d="M70 50 Q88 48 86 60 Q84 70 66 68" fill="none" stroke-width="5" />
    <path d="M20 44 L76 44 Q76 64 64 74 Q58 78 48 78 Q38 78 32 74 Q20 64 20 44 Z" fill="#fff" />
    <path d="M20 44 L76 44 Q76 50 75 54 L21 54 Q20 50 20 44 Z" fill="#ef4444" stroke="none" />
    <path d="M20 44 L76 44 Q76 64 64 74 Q58 78 48 78 Q38 78 32 74 Q20 64 20 44 Z" fill="none" />
    <ellipse cx="48" cy="44" rx="28" ry="6" fill="#7c2d12" />
    <ellipse cx="48" cy="44" rx="16" ry="3" fill="#b45309" stroke="none" />
    <path d="M28 58 Q30 66 36 71" ${HI} />
    <path d="M40 32 q-5 -6 0 -11 q5 -5 0 -11" fill="none" stroke-width="3" opacity=".55" />
    <path d="M55 32 q-5 -6 0 -11 q5 -5 0 -11" fill="none" stroke-width="3" opacity=".55" />`,
  tee: `
    <path d="M64 40 Q84 38 83 54 Q82 68 62 66" fill="none" stroke-width="5" />
    <path d="M22 26 L70 26 L66 82 Q65.5 88 59 88 L33 88 Q26.5 88 26 82 Z" fill="#fef3c7" stroke="none" />
    <path d="M24.6 44 L67.4 44 L66 82 Q65.5 88 59 88 L33 88 Q26.5 88 26 82 Z" fill="#f59e0b" stroke="none" />
    <path d="M22 26 L70 26 L66 82 Q65.5 88 59 88 L33 88 Q26.5 88 26 82 Z" fill="none" />
    <path d="M25 44 Q46 48 67 44" fill="none" stroke-width="2.5" />
    <rect x="34" y="56" width="18" height="22" rx="3" fill="#b45309" stroke-width="2.5" />
    <path d="M43 56 L43 32 Q43 24 52 22 Q60 20 62 12" fill="none" stroke-width="2" />
    <rect x="56" y="4" width="14" height="13" rx="2" transform="rotate(12 63 10)" fill="#22c55e" stroke-width="2.5" />
    <path d="M30 34 L33 78" ${HI} />`,
  tisch: `
    <rect x="24" y="48" width="7" height="30" fill="#a16207" />
    <rect x="69" y="48" width="7" height="30" fill="#a16207" />
    <path d="M20 30 L80 30 L92 42 L8 42 Z" fill="#fbbf24" />
    <rect x="8" y="42" width="84" height="8" fill="#d97706" />
    <rect x="12" y="50" width="8" height="38" fill="#d97706" />
    <rect x="80" y="50" width="8" height="38" fill="#d97706" />
    <path d="M24 36 L64 36" ${HI} />`,
  fenster: `
    <rect x="16" y="10" width="68" height="74" rx="3" fill="#fff" />
    <rect x="23" y="17" width="23" height="29" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="54" y="17" width="23" height="29" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="23" y="54" width="23" height="23" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="54" y="54" width="23" height="23" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="8" y="84" width="84" height="8" rx="2" fill="#d97706" />
    <path d="M28 36 L36 22" ${HI} />
    <path d="M59 36 L67 22" ${HI} />`,
  auge: `
    <path d="M8 52 Q50 8 92 52 Q50 90 8 52 Z" fill="#fff" />
    <circle cx="50" cy="51" r="17" fill="#0d9488" />
    <circle cx="50" cy="51" r="7.5" fill="${INK}" />
    <circle cx="44" cy="45" r="3.5" fill="#fff" stroke="none" />
    <path d="M22 37 L16 29 M36 28 L32 19 M50 25 L50 15 M64 28 L68 19 M78 37 L84 29" fill="none" />`,
  zug: `
    <path d="M6 88 L94 88" fill="none" />
    <path d="M14 46 L58 46 L58 76 L14 76 Z" fill="#ef4444" />
    <path d="M14 46 L9 52 L9 76 L14 76" fill="#ef4444" />
    <path d="M9 72 L5 84 L16 84 L16 76" fill="#cbd5e1" />
    <rect x="58" y="28" width="30" height="48" fill="#ef4444" />
    <rect x="64" y="34" width="18" height="14" rx="2" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="54" y="20" width="38" height="8" rx="2" fill="#334155" />
    <path d="M20 46 L18 26 L32 26 L30 46 Z" fill="#334155" />
    <path d="M14 60 L58 60" fill="none" stroke-width="2.5" opacity=".45" />
    <circle cx="24" cy="79" r="8" fill="#334155" />
    <circle cx="46" cy="79" r="8" fill="#334155" />
    <circle cx="73" cy="77" r="10" fill="#334155" />
    <circle cx="24" cy="79" r="2.5" fill="#cbd5e1" stroke="none" />
    <circle cx="46" cy="79" r="2.5" fill="#cbd5e1" stroke="none" />
    <circle cx="73" cy="77" r="3" fill="#cbd5e1" stroke="none" />
    <path d="M24 79 L73 77" fill="none" stroke-width="3" />
    <path d="M20 52 L52 52" ${HI} />`,
  tasche: `
    <path d="M32 42 Q32 14 50 14 Q68 14 68 42" fill="none" stroke-width="7" />
    <path d="M32 42 Q32 14 50 14 Q68 14 68 42" fill="none" stroke="#be185d" stroke-width="3" />
    <path d="M20 40 L80 40 Q84 40 85 44 L90 82 Q90 88 84 88 L16 88 Q10 88 10 82 L15 44 Q16 40 20 40 Z" fill="#ec4899" />
    <path d="M16 40 L84 40 L82 58 Q50 66 18 58 Z" fill="#be185d" />
    <rect x="45" y="56" width="10" height="9" rx="2" fill="#facc15" />
    <path d="M18 66 L16 82" ${HI} />`,
  sonne: `
    <path d="M50 8 L50 18 M50 82 L50 92 M8 50 L18 50 M82 50 L92 50 M20 20 L27 27 M73 73 L80 80 M80 20 L73 27 M27 73 L20 80" fill="none" stroke-width="6" />
    <path d="M50 8 L50 18 M50 82 L50 92 M8 50 L18 50 M82 50 L92 50 M20 20 L27 27 M73 73 L80 80 M80 20 L73 27 M27 73 L20 80" fill="none" stroke="#f59e0b" stroke-width="1.5" />
    <circle cx="50" cy="50" r="24" fill="#facc15" />
    <path d="M36 46 Q38 36 47 32" ${HI} />`,
  schluessel: `
    <g transform="rotate(-35 50 50)">
      <path d="M44 44 L88 44 L88 52 L84 52 L84 62 L76 62 L76 52 L70 52 L70 60 L62 60 L62 52 L44 52 Z" fill="#facc15" />
      <path d="M8 48 A18 18 0 1 0 44 48 A18 18 0 1 0 8 48 Z M19 48 A7 7 0 1 1 33 48 A7 7 0 1 1 19 48 Z" fill="#facc15" fill-rule="evenodd" />
      <path d="M14 42 Q16 36 22 33" ${HI} />
    </g>`,
  pferd: `
    ${tube("M64 62 L62 86", "#78350f", 6)}
    ${tube("M36 62 L40 86", "#78350f", 6)}
    <path d="M22 46 Q8 52 10 74 Q18 62 24 54 Z" fill="#78350f" />
    ${tube("M72 60 L74 86", "#a16207", 6)}
    ${tube("M28 60 L26 86", "#a16207", 6)}
    <path d="M20 50 Q22 38 38 38 L58 38 Q64 32 68 16 L69 8 L74 14 Q80 14 88 26 L92 32 Q93 38 87 38 Q82 38 78 33 Q76 40 77 50 Q76 64 64 64 L34 64 Q20 64 20 50 Z" fill="#a16207" />
    <path d="M58 38 Q64 32 68 16 L69 8 Q60 12 58 22 Q54 30 50 38 Z" fill="#78350f" />
    <circle cx="79" cy="24" r="2.4" fill="${INK}" stroke="none" />
    <path d="M28 46 Q32 42 40 42" ${HI} />`,
  hund: `
    ${tube("M64 64 L64 86", "#b45309", 6)}
    ${tube("M34 64 L32 86", "#b45309", 6)}
    <path d="M22 50 Q12 42 12 26 Q18 34 28 44 Z" fill="#d97706" />
    ${tube("M71 62 L72 86", "#d97706", 6)}
    ${tube("M26 62 L24 86", "#d97706", 6)}
    <path d="M18 54 Q18 44 30 44 L60 44 Q62 30 72 26 Q82 22 86 32 L92 36 Q94 44 86 45 L80 45 Q76 50 76 56 Q76 66 64 66 L30 66 Q18 66 18 54 Z" fill="#d97706" />
    <path d="M68 30 Q64 34 64 44 Q68 48 72 44 Q72 36 70 30 Z" fill="#78350f" />
    <circle cx="92" cy="38" r="3" fill="${INK}" stroke="none" />
    <circle cx="79" cy="33" r="2.4" fill="${INK}" stroke="none" />
    <path d="M26 52 Q30 48 38 48" ${HI} />`,
  katze: `
    ${tube("M66 84 Q88 86 86 68 Q85 60 79 56", "#fb923c", 4)}
    <path d="M30 88 Q26 70 36 58 Q50 50 64 58 Q74 70 70 88 Z" fill="#fb923c" />
    <path d="M44 74 L44 88 M56 74 L56 88" fill="none" stroke-width="2.5" />
    <path d="M28 40 Q28 28 33 23 L31 7 L44 17 Q50 15 56 17 L69 7 L67 23 Q72 28 72 40 Q72 55 50 55 Q28 55 28 40 Z" fill="#fb923c" />
    <path d="M46 21 L47 26 M50 20 L50 26 M54 21 L53 26" fill="none" stroke-width="2.5" opacity=".45" />
    <circle cx="41" cy="35" r="2.6" fill="${INK}" stroke="none" />
    <circle cx="59" cy="35" r="2.6" fill="${INK}" stroke="none" />
    <path d="M47.5 41 L52.5 41 L50 44 Z" fill="#f472b6" stroke-width="1.5" />
    <path d="M45 46 Q47.5 49 50 45 Q52.5 49 55 46" fill="none" stroke-width="2" />
    <path d="M36 43 L22 41 M36 46 L23 48 M64 43 L78 41 M64 46 L77 48" fill="none" stroke-width="1.5" opacity=".55" />
    <path d="M34 72 Q34 64 39 60" ${HI} />`,
  baum: `
    <path d="M44 60 L41 90 L59 90 L56 60 Z" fill="#a16207" />
    <path d="M50 10 Q66 8 70 22 Q86 22 86 40 Q92 54 78 62 Q74 72 60 68 Q50 76 40 68 Q26 72 22 60 Q8 54 14 40 Q14 24 30 22 Q34 8 50 10 Z" fill="#22c55e" />
    <path d="M22 44 Q22 32 32 28" ${HI} />`,
  fahrrad: `
    <circle cx="24" cy="66" r="17" fill="none" stroke-width="5" />
    <circle cx="76" cy="66" r="17" fill="none" stroke-width="5" />
    <circle cx="24" cy="66" r="2.5" fill="${INK}" />
    <circle cx="76" cy="66" r="2.5" fill="${INK}" />
    ${tube("M24 66 L42 42 L50 66 Z M42 42 L68 40 L50 66 M68 40 L76 66 M42 42 L40 32 M68 40 L64 28", "#ef4444", 4)}
    <path d="M32 31 L46 31" fill="none" stroke-width="6" />
    <path d="M58 28 L70 26" fill="none" stroke-width="5" />
    <circle cx="50" cy="66" r="5" fill="#cbd5e1" />`,
};
