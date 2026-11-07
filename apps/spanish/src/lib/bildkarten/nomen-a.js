// Bildkarten: nomen-a. Bodies on the 100×100 grid, keyed by lexicon id; see kit.js for the style.
import { HI, INK, miniAt } from "./kit.js";

export const NOMEN_A = {
  haus: `
    <rect x="62" y="16" width="10" height="20" fill="#b45309" />
    <path d="M20 46 L80 46 L80 88 L20 88 Z" fill="#fde68a" />
    <path d="M10 50 L50 14 L90 50 Z" fill="#ef4444" />
    <rect x="42" y="62" width="16" height="26" rx="2" fill="#d97706" />
    <circle cx="54" cy="76" r="2.2" fill="#facc15" stroke-width="2" />
    <rect x="26" y="58" width="12" height="12" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="64" y="58" width="12" height="12" fill="#7dd3fc" stroke-width="2.5" />
    <path d="M24 82 L24 58" ${HI} />`,
  geld: `
    <g transform="rotate(-10 46 40)">
      <rect x="12" y="20" width="68" height="40" rx="4" fill="#86efac" />
      <rect x="18" y="26" width="56" height="28" rx="2" fill="none" stroke-width="2.5" opacity=".5" />
      <path d="M55 33 A11 11 0 1 0 55 49" fill="none" stroke="#15803d" stroke-width="3.5" />
      <path d="M36 38.5 L50 38.5 M36 44 L50 44" fill="none" stroke="#15803d" stroke-width="3" />
    </g>
    <ellipse cx="66" cy="82" rx="20" ry="7" fill="#d97706" />
    <path d="M46 82 L46 74 A20 7 0 0 0 86 74 L86 82" fill="#d97706" />
    <ellipse cx="66" cy="74" rx="20" ry="7" fill="#facc15" />
    <path d="M46 74 L46 66 A20 7 0 0 0 86 66 L86 74" fill="#d97706" />
    <ellipse cx="66" cy="66" rx="20" ry="7" fill="#facc15" />
    <ellipse cx="66" cy="66" rx="12" ry="4" fill="none" stroke-width="2.5" opacity=".5" />
    <circle cx="30" cy="78" r="13" fill="#facc15" />
    <circle cx="30" cy="78" r="8" fill="none" stroke-width="2.5" opacity=".5" />
    <path d="M22 74 Q24 69 29 68" ${HI} />`,
  musik: `
    <path d="M38 72 L38 22 L80 12 L80 62" fill="none" stroke-width="5" />
    <path d="M38 26 L80 16" fill="none" stroke-width="11" stroke-linecap="butt" />
    <ellipse cx="28" cy="74" rx="12" ry="9" transform="rotate(-20 28 74)" fill="#0d9488" />
    <ellipse cx="70" cy="64" rx="12" ry="9" transform="rotate(-20 70 64)" fill="#0d9488" />
    <path d="M21 72 Q23 67 28 66" ${HI} />
    <path d="M63 62 Q65 57 70 56" ${HI} />`,
  nacht: `
    <path d="M60 14 A38 38 0 1 0 86 70 A30 30 0 1 1 60 14 Z" fill="#facc15" />
    <path d="M20 56 Q22 40 34 30" ${HI} />
    <path d="M74 14 L76.5 20 L83 20.5 L78 24.5 L79.5 31 L74 27.5 L68.5 31 L70 24.5 L65 20.5 L71.5 20 Z" fill="#fde68a" stroke-width="2.5" />
    <path d="M86 40 L87.6 44 L92 44.3 L88.6 47 L89.6 51.3 L86 49 L82.4 51.3 L83.4 47 L80 44.3 L84.4 44 Z" fill="#fde68a" stroke-width="2.5" />
    <circle cx="62" cy="44" r="2.6" fill="#fde68a" stroke-width="2" />`,
  uhr: `
    <circle cx="50" cy="52" r="38" fill="#ef4444" />
    <circle cx="50" cy="52" r="30" fill="#fff" />
    <path d="M50 26 L50 31 M50 73 L50 78 M24 52 L29 52 M71 52 L76 52" fill="none" stroke-width="3" />
    <path d="M50 52 L50 34" fill="none" stroke-width="4.5" />
    <path d="M50 52 L64 60" fill="none" stroke-width="4.5" />
    <circle cx="50" cy="52" r="3.5" fill="#ef4444" stroke-width="2.5" />
    <path d="M22 40 Q26 28 36 22" ${HI} />`,
  tuer: `
    <path d="M22 92 L22 10 L78 10 L78 92" fill="#cbd5e1" />
    <rect x="28" y="16" width="44" height="76" rx="2" fill="#d97706" />
    <rect x="35" y="23" width="30" height="26" rx="2" fill="#b45309" stroke-width="2.5" />
    <rect x="35" y="57" width="30" height="27" rx="2" fill="#b45309" stroke-width="2.5" />
    <circle cx="64" cy="53" r="4" fill="#facc15" />
    <path d="M14 92 L86 92" fill="none" />
    <path d="M32 26 L32 84" ${HI} />`,
  auto: `
    <path d="M10 70 L10 56 Q10 50 18 48 L28 46 L38 30 Q40 27 45 27 L66 27 Q70 27 73 31 L82 46 Q90 48 90 56 L90 70 Q90 72 87 72 L13 72 Q10 72 10 70 Z" fill="#ef4444" />
    <path d="M33 46 L42 32 L52 32 L52 46 Z" fill="#7dd3fc" stroke-width="2.5" />
    <path d="M58 46 L58 32 L66 32 Q68 32 70 35 L76 46 Z" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="80" y="54" width="10" height="5" fill="#facc15" stroke-width="2.5" />
    <circle cx="28" cy="72" r="10" fill="#334155" />
    <circle cx="28" cy="72" r="4" fill="#cbd5e1" stroke-width="2.5" />
    <circle cx="72" cy="72" r="10" fill="#334155" />
    <circle cx="72" cy="72" r="4" fill="#cbd5e1" stroke-width="2.5" />
    <path d="M16 62 Q16 55 22 53" ${HI} />`,
  hand: `
    <path d="M36 92 L32 70 L16 54 Q11 48 16 44 Q21 40 27 46 L35 54 L35 24 Q35 17 41 17 Q47 17 47 24 L47 46 L47 15 Q47 8 53 8 Q59 8 59 15 L59 46 L59 19 Q59 12 65 12 Q71 12 71 19 L71 48 L71 31 Q71 25 77 25 Q83 25 83 31 L83 64 Q83 80 72 88 L70 92 Z" fill="#fbc79a" />
    <path d="M44 72 Q52 76 62 70" fill="none" stroke-width="2.5" opacity=".45" />
    <path d="M39 50 L39 26" ${HI} />`,
  wasser: `
    <path d="M50 10 C44 22 22 44 22 62 C22 78 35 90 50 90 C65 90 78 78 78 62 C78 44 56 22 50 10 Z" fill="#38bdf8" />
    <path d="M33 62 Q33 50 41 40" ${HI} />
    <path d="M38 72 Q44 77 50 72 Q56 67 62 72" fill="none" stroke="#e0f2fe" stroke-width="3" />
    <path d="M14 26 C12 30 9 34 9 37 A5 5 0 0 0 19 37 C19 34 16 30 14 26 Z" fill="#7dd3fc" stroke-width="2.5" />
    <path d="M86 32 C84 36 81 40 81 43 A5 5 0 0 0 91 43 C91 40 88 36 86 32 Z" fill="#7dd3fc" stroke-width="2.5" />`,
  bett: `
    <path d="M10 88 L10 34 Q10 26 18 26 Q26 26 26 34 L26 88" fill="#d97706" />
    <path d="M80 88 L80 54 Q80 48 85 48 Q90 48 90 54 L90 88" fill="#d97706" />
    <rect x="26" y="68" width="54" height="9" fill="#b45309" />
    <rect x="26" y="54" width="54" height="14" fill="#fff" />
    <path d="M28 54 Q27 40 37 40 L46 41 Q53 42 52 54 Z" fill="#e0f2fe" />
    <path d="M54 49 Q54 45 58 45 L84 45 Q87 45 87 49 L87 70 Q70 74 54 70 Z" fill="#0d9488" />
    <path d="M60 51 L80 51" ${HI} />`,
  schule: `
    <path d="M50 4 L50 18" fill="none" />
    <path d="M50 5 L64 9 L50 13 Z" fill="#ef4444" stroke-width="2.5" />
    <rect x="8" y="50" width="84" height="40" fill="#fde68a" />
    <path d="M4 52 L20 38 L80 38 L96 52 Z" fill="#0d9488" />
    <rect x="36" y="32" width="28" height="58" fill="#fde68a" />
    <path d="M32 34 L50 17 L68 34 Z" fill="#0d9488" />
    <circle cx="50" cy="46" r="8" fill="#fff" />
    <path d="M50 46 L50 41 M50 46 L54 48" fill="none" stroke-width="2.5" />
    <path d="M42 90 L42 70 Q42 62 50 62 Q58 62 58 70 L58 90" fill="#d97706" />
    <rect x="14" y="60" width="14" height="12" fill="#7dd3fc" stroke-width="2.5" />
    <rect x="72" y="60" width="14" height="12" fill="#7dd3fc" stroke-width="2.5" />
    <path d="M4 90 L96 90" fill="none" />
    <path d="M12 84 L12 56" ${HI} />`,
  herz: `
    <path d="M50 86 C30 72 10 56 10 36 C10 22 21 13 33 13 C41 13 47 18 50 25 C53 18 59 13 67 13 C79 13 90 22 90 36 C90 56 70 72 50 86 Z" fill="#ef4444" />
    <path d="M22 40 Q22 28 32 25" ${HI} />`,
};
