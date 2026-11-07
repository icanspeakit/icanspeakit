// Bildkarten: verben. Bodies on the 100×100 grid, keyed by lexicon id; see kit.js for the style.
import { HI, INK, miniAt } from "./kit.js";

/** Extra drawing in a mini's own 100×100 grid, placed like miniAt(…, x, y, size) (closed eyes …). */
const onMini = (x, y, size, body) => {
  const s = size / 100;
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke-width="${(3 / s).toFixed(2)}">${body}</g>`;
};

export const VERBEN = {
  sagen: `
    ${miniAt("schwalbe", 2, 40, 58)}
    <path d="M52 8 L86 8 Q94 8 94 16 L94 38 Q94 46 86 46 L68 46 L54 58 L58 46 L52 46 Q44 46 44 38 L44 16 Q44 8 52 8 Z" fill="#fff" />
    <circle cx="57" cy="27" r="3.6" fill="${INK}" stroke="none" />
    <circle cx="69" cy="27" r="3.6" fill="${INK}" stroke="none" />
    <circle cx="81" cy="27" r="3.6" fill="${INK}" stroke="none" />`,
  fragen: `
    ${miniAt("fisch", 2, 42, 60, { flip: true })}
    <path d="M58 6 L84 6 Q94 6 94 16 L94 38 Q94 48 84 48 L70 48 L54 60 L60 48 L58 48 Q48 48 48 38 L48 16 Q48 6 58 6 Z" fill="#fef9c3" />
    <path d="M62 21 Q62 13 71 13 Q80 13 80 21 Q80 27 71 30 L71 34" fill="none" stroke="#2563eb" stroke-width="5.5" />
    <circle cx="71" cy="41.5" r="3.4" fill="#2563eb" stroke="none" />`,
  denken: `
    ${miniAt("schlange", 2, 40, 58)}
    <circle cx="38" cy="50" r="3" fill="#fff" stroke-width="2.5" />
    <circle cx="45" cy="42" r="4.5" fill="#fff" stroke-width="2.5" />
    <path d="M56 36 Q46 36 46 27 Q46 17 56 18 Q58 8 70 8 Q80 8 83 16 Q94 16 94 26 Q94 36 84 36 Z" fill="#fff" />
    <path d="M64 27 Q60 21 64 16 Q70 11 76 16 Q80 21 76 27 L76 30 L64 30 Z" fill="#fde047" stroke-width="2.5" />
    <path d="M65 32 L75 32" fill="none" stroke-width="2.5" />
    <path d="M70 2 L70 4 M58 6 L59.5 7.5 M82 6 L80.5 7.5" fill="none" stroke-width="2.5" />`,
  warten: `
    ${miniAt("schnecke", 0, 34, 66)}
    <rect x="62" y="12" width="32" height="7" rx="3" fill="#b45309" />
    <rect x="62" y="80" width="32" height="7" rx="3" fill="#b45309" />
    <path d="M66 19 L90 19 Q90 38 80 49.5 Q90 61 90 80 L66 80 Q66 61 76 49.5 Q66 38 66 19 Z" fill="#e0f2fe" />
    <path d="M70 30 L86 30 Q84 40 78 46 Z" fill="#fbbf24" stroke-width="2" />
    <path d="M78 60 L86 79 L70 79 Z" fill="#fbbf24" stroke-width="2" />
    <path d="M78 52 L78 60" fill="none" stroke="#fbbf24" stroke-width="2.5" />`,
  suchen: `
    ${miniAt("ameise", 0, 44, 54)}
    <path d="M50 66 L42 78" fill="none" stroke-width="8" />
    <path d="M50 66 L42 78" fill="none" stroke="#92400e" stroke-width="3.5" />
    <circle cx="66" cy="46" r="20" fill="#e0f2fe" stroke-width="6" />
    <circle cx="66" cy="46" r="20" fill="none" stroke="#475569" stroke-width="2.5" />
    <path d="M55 40 Q57 32 65 30" ${HI} />`,
  schlafen: `
    <rect x="6" y="38" width="10" height="50" rx="4" fill="#92400e" />
    <rect x="86" y="58" width="8" height="30" rx="3" fill="#92400e" />
    <rect x="12" y="62" width="78" height="14" rx="4" fill="#fde68a" />
    <ellipse cx="28" cy="58" rx="14" ry="7" fill="#fff" />
    ${miniAt("katze", 10, 24, 40)}
    ${onMini(10, 24, 40, `<ellipse cx="40" cy="50" rx="6" ry="7" fill="#cbd5e1" stroke="none" /><ellipse cx="60" cy="50" rx="6" ry="7" fill="#cbd5e1" stroke="none" /><path d="M34 50 Q40 56 46 50 M54 50 Q60 56 66 50" fill="none" />`)}
    <path d="M40 54 Q66 48 92 56 L92 74 L40 74 Z" fill="#60a5fa" />
    <path d="M52 60 L52 72 M66 58 L66 72 M80 58 L80 72" fill="none" stroke="#bfdbfe" stroke-width="3" />
    <path d="M56 26 L64 26 L56 34 L64 34" fill="none" stroke-width="3" />
    <path d="M68 14 L78 14 L68 24 L78 24" fill="none" stroke-width="3.5" />
    <path d="M82 2 L94 2 L82 14 L94 14" fill="none" stroke-width="4" />`,
  trinken: `
    <path d="M60 34 L90 34 L86 88 Q85.6 92 81 92 L69 92 Q64.4 92 64 88 Z" fill="#e0f2fe" stroke="none" />
    <path d="M62 50 L88 50 L86 88 Q85.6 92 81 92 L69 92 Q64.4 92 64 88 Z" fill="#fb923c" stroke="none" />
    <path d="M78 84 L78 22 L50 50" fill="none" stroke-width="8" />
    <path d="M78 84 L78 22 L50 50" fill="none" stroke="#f472b6" stroke-width="3.5" />
    <path d="M60 34 L90 34 L86 88 Q85.6 92 81 92 L69 92 Q64.4 92 64 88 Z" fill="none" />
    <path d="M62 50 Q75 54 88 50" fill="none" stroke-width="2.5" />
    <path d="M67 42 L69 82" ${HI} />
    ${miniAt("fisch", 0, 22, 62, { flip: true })}`,
  lesen: `
    ${miniAt("esel", 20, 2, 60)}
    <path d="M50 64 Q30 54 8 60 L8 92 Q30 86 50 94 Q70 86 92 92 L92 60 Q70 54 50 64 Z" fill="#dc2626" />
    <path d="M50 60 Q32 50 12 56 L12 86 Q32 80 50 88 Z" fill="#fff" />
    <path d="M50 60 Q68 50 88 56 L88 86 Q68 80 50 88 Z" fill="#fff" />
    <path d="M20 64 Q30 61 42 65 M20 72 Q30 69 42 73 M58 65 Q70 61 80 64 M58 73 Q70 69 80 72" fill="none" stroke-width="2.5" opacity=".5" />`,
  lernen: `
    <rect x="58" y="78" width="36" height="12" rx="2" fill="#2563eb" />
    <rect x="62" y="66" width="30" height="12" rx="2" fill="#16a34a" />
    <rect x="56" y="54" width="34" height="12" rx="2" fill="#dc2626" />
    <path d="M86 58 L86 62 M88 70 L88 74 M90 82 L90 86" fill="none" stroke="#fff" stroke-width="2.5" />
    ${miniAt("fliege", 0, 30, 62)}
    <path d="M10 30 L34 20 L58 30 L34 40 Z" fill="#334155" />
    <path d="M22 35 L22 44 Q34 50 46 44 L46 35" fill="#334155" />
    <g transform="rotate(40 76 26)"><rect x="71" y="4" width="10" height="34" rx="2" fill="#facc15" /><path d="M71 38 L76 48 L81 38 Z" fill="#fde8cf" /><rect x="71" y="2" width="10" height="6" rx="2" fill="#f9a8d4" /></g>`,
  hoeren: `
    ${miniAt("fink", 8, 28, 64)}
    <path d="M24 64 Q22 26 52 26 Q80 26 76 60" fill="none" stroke-width="6" />
    <rect x="16" y="54" width="14" height="22" rx="6" fill="#dc2626" />
    <rect x="68" y="56" width="12" height="20" rx="5" fill="#dc2626" />
    <path d="M82 18 L82 34 M82 18 L94 14 L94 30" fill="none" stroke-width="3.5" />
    <ellipse cx="78.5" cy="35" rx="4.5" ry="3.5" fill="${INK}" stroke="none" />
    <ellipse cx="90.5" cy="31" rx="4.5" ry="3.5" fill="${INK}" stroke="none" />
    <path d="M14 12 L14 24" fill="none" stroke-width="3.5" />
    <ellipse cx="10.5" cy="25" rx="4.5" ry="3.5" fill="${INK}" stroke="none" />`,
  lieben: `
    ${miniAt("schwalbe", 0, 42, 52)}
    ${miniAt("fink", 48, 42, 52, { flip: true })}
    <path d="M50 38 C38 30 30 22 30 14 C30 6 40 2 50 12 C60 2 70 6 70 14 C70 22 62 30 50 38 Z" fill="#ef4444" />
    <path d="M37 13 Q38 9 42 8" ${HI} />`,
  geben: `
    ${miniAt("fink", 0, 40, 50)}
    ${miniAt("schnecke", 46, 42, 54, { flip: true })}
    <path d="M38 64 Q46 56 50 50" fill="none" stroke-width="7" />
    <path d="M38 64 Q46 56 50 50" fill="none" stroke="#facc15" stroke-width="2.5" />
    <rect x="38" y="20" width="28" height="26" rx="3" fill="#a855f7" />
    <rect x="36" y="16" width="32" height="9" rx="3" fill="#c084fc" />
    <path d="M52 16 L52 46" fill="none" stroke="#facc15" stroke-width="5" />
    <path d="M52 16 Q42 4 40 12 Q40 18 52 16 Q62 4 64 12 Q64 18 52 16" fill="#facc15" stroke-width="2.5" />`,
  kaufen: `
    ${miniAt("schlange", 0, 40, 58)}
    <path d="M60 46 Q60 30 72 30 Q84 30 84 46" fill="none" stroke-width="5" />
    <path d="M52 46 L92 46 L88 92 L56 92 Z" fill="#f97316" />
    <path d="M58 54 L60 84" ${HI} />
    <circle cx="74" cy="66" r="12" fill="#facc15" />
    <path d="M79 60 Q74 56 70 60 Q67 66 70 72 Q74 76 79 72 M66 64 L75 64 M66 68 L75 68" fill="none" stroke-width="2.5" />
`,
  gehen: `
    <ellipse cx="8" cy="90" rx="4" ry="2.5" fill="#cbd5e1" stroke="none" />
    <ellipse cx="18" cy="84" rx="4" ry="2.5" fill="#cbd5e1" stroke="none" />
    <path d="M48 52 L40 70 L34 86" fill="none" stroke-width="5" />
    <path d="M54 52 L60 70 L64 86" fill="none" stroke-width="5" />
    <path d="M26 86 Q26 80 34 81 L40 84 Q40 90 34 90 L28 90 Q26 90 26 86 Z" fill="#dc2626" stroke-width="3" />
    <path d="M60 86 Q60 80 68 81 L74 84 Q74 90 68 90 L62 90 Q60 90 60 86 Z" fill="#dc2626" stroke-width="3" />
    ${miniAt("esel", 24, 0, 56)}`,
  laufen: `
    <path d="M6 30 L22 30 M2 44 L20 44 M8 58 L22 58" fill="none" stroke-width="4" />
    <path d="M44 56 L34 70 L18 74" fill="none" stroke-width="5" />
    <path d="M56 56 L70 66 L64 86" fill="none" stroke-width="5" />
    <path d="M10 70 Q12 66 18 68 L22 74 Q20 80 14 78 Z" fill="#2563eb" stroke-width="3" />
    <path d="M60 86 Q60 80 68 81 L76 84 Q76 90 68 90 L62 90 Q60 90 60 86 Z" fill="#2563eb" stroke-width="3" />
    <path d="M30 82 q-6 2 -10 -2 q2 6 -4 8" fill="none" stroke-width="2.5" opacity=".5" />
    ${miniAt("ziege", 28, 0, 58, { rotate: 12 })}`,
  fahren: `
    ${miniAt("fisch", 22, 0, 60, { flip: true })}
    <path d="M30 54 L36 40 L70 40 L78 54 Z" fill="#e0f2fe" stroke-width="3" />
    <path d="M6 70 Q6 54 20 54 L84 54 Q94 54 94 66 L94 74 Q94 80 88 80 L12 80 Q6 80 6 74 Z" fill="#ef4444" />
    <circle cx="27" cy="80" r="10" fill="#475569" />
    <circle cx="27" cy="80" r="3.5" fill="#e2e8f0" stroke-width="2" />
    <circle cx="73" cy="80" r="10" fill="#475569" />
    <circle cx="73" cy="80" r="3.5" fill="#e2e8f0" stroke-width="2" />
    <rect x="84" y="60" width="8" height="6" rx="2" fill="#fde047" stroke-width="2.5" />
    <path d="M14 62 Q14 58 20 58" ${HI} />`,
  spielen: `
    ${miniAt("katze", 2, 22, 58)}
    <path d="M42 66 Q56 76 60 72" fill="none" stroke-width="7" />
    <path d="M42 66 Q56 76 60 72" fill="none" stroke="#cbd5e1" stroke-width="2.5" />
    <circle cx="74" cy="72" r="18" fill="#fff" />
    <path d="M74 54 Q64 72 74 90 Q84 72 74 54" fill="#ef4444" stroke-width="2.5" />
    <path d="M57 66 Q74 70 91 66 L91 78 Q74 82 57 78 Z" fill="#3b82f6" stroke-width="2.5" />
    <circle cx="74" cy="72" r="18" fill="none" />
    <path d="M64 30 Q74 22 84 30 M68 40 Q76 34 86 42" fill="none" stroke-width="3" opacity=".5" />`,
  essen: `
    <ellipse cx="44" cy="84" rx="40" ry="10" fill="#fff" />
    <ellipse cx="44" cy="82" rx="28" ry="6" fill="#f1f5f9" stroke-width="2.5" />
    <path d="M28 80 Q32 72 40 76 Q46 70 54 76 Q60 72 62 80 Z" fill="#4ade80" stroke-width="2.5" />
    ${miniAt("ziege", 0, 2, 62)}
    <g transform="rotate(35 70 54)">
      <rect x="66" y="52" width="8" height="40" rx="4" fill="#cbd5e1" />
      <path d="M60 30 L64 30 L64 44 L68 44 L68 30 L72 30 L72 44 L76 44 L76 30 L80 30 L80 46 Q80 54 70 54 Q60 54 60 46 Z" fill="#cbd5e1" stroke-width="2.5" />
      <circle cx="70" cy="24" r="9" fill="#ef4444" />
    </g>`,
  sehen: `
    ${miniAt("fliege", 10, 22, 72)}
    <path d="M44 62 L56 62" fill="none" stroke-width="7" />
    <circle cx="36" cy="54" r="15" fill="#334155" />
    <circle cx="64" cy="54" r="15" fill="#334155" />
    <circle cx="36" cy="54" r="9" fill="#7dd3fc" stroke-width="2.5" />
    <circle cx="64" cy="54" r="9" fill="#7dd3fc" stroke-width="2.5" />
    <path d="M31 51 Q32 47 36 46 M59 51 Q60 47 64 46" stroke="#fff" fill="none" stroke-width="3" />
    <path d="M18 14 L26 24 M50 6 L50 18 M82 14 L74 24" fill="none" stroke-width="3.5" />`,
  helfen: `
    <path d="M54 54 L94 54 L94 94 L54 94 Z" fill="#a8a29e" />
    <path d="M54 54 L94 54 L94 60 L54 60 Z" fill="#4ade80" />
    <path d="M54 70 L74 70 M74 70 L74 94 M62 82 L94 82" fill="none" stroke-width="2.5" opacity=".5" />
    ${miniAt("katze", 52, 6, 46, { flip: true })}
    ${miniAt("ameise", 0, 46, 48, { rotate: -50 })}
    <path d="M60 40 Q46 44 38 54" fill="none" stroke-width="7" />
    <path d="M60 40 Q46 44 38 54" fill="none" stroke="#cbd5e1" stroke-width="2.5" />
    <circle cx="37" cy="55" r="5" fill="#b45309" />`,
};
