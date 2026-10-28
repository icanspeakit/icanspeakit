// Bildwörter: house-style pictures for the Bildkarten (/wissen/bildwoerterbuch) and
// for the word prints on /merch. Our own drawings (no OpenMoji, no stock), so they can go on
// a shirt or a mug. Same world as the crew (src/lib/mascots.js) and the Mini-Crew
// (src/lib/minis.js): the crew's ink colour as a thick round outline, flat fills, one white
// highlight. No faces — these are things, not characters, so they never compete with the crew.
//
//   bildSvg("apfel", { size: 96 })
//
// 100×100 grid, keyed by lexicon id. Which words are cards: src/data/bildkarten.json. The
// first twelve (food, dishes) are kept here although only Apfel, Brot and Glas are cards.
import { NOMEN_A } from "./bildkarten/nomen-a.js";
import { NOMEN_B } from "./bildkarten/nomen-b.js";
import { VERBEN } from "./bildkarten/verben.js";
import { ADJEKTIVE } from "./bildkarten/adjektive.js";
import { ADVERBIEN } from "./bildkarten/adverbien.js";
import { PRAEPOSITIONEN } from "./bildkarten/praepositionen.js";

const INK = "#1a2230";
const HI = `stroke="#fff" fill="none" stroke-width="4" opacity=".85"`;

const DRAW = {
  apfel: `
    <path d="M50 30 C38 21 15 25 15 52 C15 75 32 91 43 88 C47 87 53 87 57 88 C68 91 85 75 85 52 C85 25 62 21 50 30 Z" fill="#ef4444" />
    <path d="M50 30 Q49 20 54 11" fill="none" />
    <path d="M54 20 Q64 7 78 13 Q68 27 54 20 Z" fill="#22c55e" />
    <path d="M27 50 Q28 39 37 35" ${HI} />`,
  banane: `
    <path d="M22 26 Q18 66 52 80 Q72 87 86 76 Q86 70 79 70 Q54 74 38 54 Q30 42 31 26 Z" fill="#facc15" />
    <path d="M22 26 L21 17 L30 17 L31 26" fill="#a16207" />
    <path d="M86 76 L91 79" fill="none" stroke-width="5" />
    <path d="M27 32 Q30 58 54 72" fill="none" stroke-width="2.5" opacity=".45" />`,
  brot: `
    <path d="M12 66 Q10 40 33 33 Q50 27 67 33 Q90 40 88 66 Q88 75 79 75 L21 75 Q12 75 12 66 Z" fill="#d97706" />
    <path d="M28 46 Q33 41 38 50 Q33 55 28 46 Z" fill="#fde68a" stroke-width="2.5" />
    <path d="M44 41 Q49 36 54 45 Q49 50 44 41 Z" fill="#fde68a" stroke-width="2.5" />
    <path d="M60 43 Q65 38 70 47 Q65 52 60 43 Z" fill="#fde68a" stroke-width="2.5" />
    <path d="M20 62 Q20 52 26 46" ${HI} />`,
  kaese: `
    <path d="M12 54 L88 46 L88 76 L12 82 Z" fill="#f59e0b" />
    <path d="M12 54 L64 24 L88 46 Z" fill="#fde68a" />
    <ellipse cx="32" cy="68" rx="6" ry="5" fill="#b45309" stroke-width="2.5" />
    <ellipse cx="58" cy="62" rx="4.5" ry="4" fill="#b45309" stroke-width="2.5" />
    <ellipse cx="76" cy="69" rx="3.5" ry="3" fill="#b45309" stroke-width="2.5" />
    <ellipse cx="62" cy="40" rx="5" ry="3" fill="#f59e0b" stroke-width="2.5" />
    <ellipse cx="42" cy="47" rx="3" ry="2" fill="#f59e0b" stroke-width="2.5" />`,
  ei: `
    <path d="M50 12 C30 12 20 46 20 62 C20 80 34 90 50 90 C66 90 80 80 80 62 C80 46 70 12 50 12 Z" fill="#fde8cf" />
    <path d="M32 58 Q32 40 40 28" ${HI} />
    <circle cx="62" cy="70" r="1.8" fill="#d6a77a" stroke="none" />
    <circle cx="56" cy="78" r="1.4" fill="#d6a77a" stroke="none" />
    <circle cx="68" cy="58" r="1.4" fill="#d6a77a" stroke="none" />`,
  kartoffel: `
    <path d="M18 56 C13 37 34 25 54 27 C76 29 89 42 84 59 C80 75 62 82 43 79 C27 77 21 68 18 56 Z" fill="#d4a373" />
    <path d="M44 40 l3 2" fill="none" stroke-width="2.5" />
    <path d="M70 50 l2 3" fill="none" stroke-width="2.5" />
    <path d="M38 66 l3 -1" fill="none" stroke-width="2.5" />
    <circle cx="60" cy="68" r="1.6" fill="#8a5a2b" stroke="none" />
    <circle cx="57" cy="38" r="1.4" fill="#8a5a2b" stroke="none" />
    <circle cx="29" cy="59" r="1.4" fill="#8a5a2b" stroke="none" />
    <path d="M27 50 Q30 40 38 35" ${HI} />`,
  tasse: `
    <ellipse cx="46" cy="83" rx="36" ry="7" fill="#e2e8f0" />
    <path d="M68 44 Q86 42 85 56 Q84 69 65 66" fill="none" stroke-width="5" />
    <path d="M22 38 L70 38 L66 72 Q64 81 56 81 L36 81 Q28 81 26 72 Z" fill="#0d9488" />
    <ellipse cx="46" cy="38" rx="24" ry="5.5" fill="#5eead4" />
    <path d="M30 48 L32 70" ${HI} />
    <path d="M40 27 q-5 -6 0 -11 q5 -5 0 -11" fill="none" stroke-width="3" opacity=".55" />
    <path d="M53 27 q-5 -6 0 -11 q5 -5 0 -11" fill="none" stroke-width="3" opacity=".55" />`,
  loeffel: `
    <g transform="rotate(-35 50 50)">
      <rect x="45.5" y="42" width="9" height="52" rx="4.5" fill="#cbd5e1" />
      <ellipse cx="50" cy="25" rx="14" ry="19" fill="#cbd5e1" />
      <ellipse cx="45" cy="20" rx="3.5" ry="8" fill="#fff" stroke="none" opacity=".9" />
    </g>`,
  gabel: `
    <g transform="rotate(35 50 50)">
      <rect x="45.5" y="44" width="9" height="50" rx="4.5" fill="#cbd5e1" />
      <path d="M36 8 L41.5 8 L41.5 30 L47.3 30 L47.3 8 L52.7 8 L52.7 30 L58.5 30 L58.5 8 L64 8 L64 36 Q64 47 50 49 Q36 47 36 36 Z" fill="#cbd5e1" />
      <path d="M39 38 Q41 44 46 46" stroke="#fff" fill="none" stroke-width="3" opacity=".9" />
    </g>`,
  messer: `
    <g transform="rotate(-35 50 50)">
      <path d="M43 60 L43 12 Q60 16 60 40 L60 60 Z" fill="#e2e8f0" />
      <path d="M48 20 L48 54" stroke="#fff" fill="none" stroke-width="3.5" opacity=".95" />
      <rect x="40" y="58" width="22" height="36" rx="7" fill="#92400e" />
      <circle cx="51" cy="69" r="2.6" fill="#fde68a" stroke-width="2" />
      <circle cx="51" cy="83" r="2.6" fill="#fde68a" stroke-width="2" />
    </g>`,
  teller: `
    <ellipse cx="50" cy="60" rx="42" ry="19" fill="#cbd5e1" />
    <ellipse cx="50" cy="55" rx="42" ry="19" fill="#fff" />
    <ellipse cx="50" cy="55" rx="34" ry="14.5" fill="none" stroke="#5eead4" stroke-width="3" />
    <ellipse cx="50" cy="56" rx="24" ry="9" fill="#f1f5f9" stroke-width="2.5" />`,
  glas: `
    <path d="M27 14 L73 14 L66 84 Q65.6 89 60 89 L40 89 Q34.4 89 34 84 Z" fill="#e0f2fe" stroke="none" />
    <path d="M30.6 44 L69.4 44 L66 84 Q65.6 89 60 89 L40 89 Q34.4 89 34 84 Z" fill="#7dd3fc" stroke="none" />
    <path d="M27 14 L73 14 L66 84 Q65.6 89 60 89 L40 89 Q34.4 89 34 84 Z" fill="none" />
    <path d="M31 44 Q50 49 69 44" fill="none" stroke-width="2.5" />
    <ellipse cx="50" cy="14" rx="23" ry="4" fill="#f0f9ff" />
    <path d="M36 24 L40 78" ${HI} />`,
};

// The 100 Bildkarten (src/data/bildkarten.json): more nouns, and verbs, adjectives and the
// little words acted out by the Mini-Crew. One file per word class in src/lib/bildkarten/.
Object.assign(DRAW, NOMEN_A, NOMEN_B, VERBEN, ADJEKTIVE, ADVERBIEN, PRAEPOSITIONEN);

export const BILD_NAMES = Object.keys(DRAW);
export const hasBild = (name) => name in DRAW;

/** The inner drawing only, on the 100×100 grid, for prints (src/lib/merchMockups.js). On dark
    fabric the outline turns light (`ink`), the fills stay. */
export function bildBody(name, { ink = INK } = {}) {
  const body = DRAW[name];
  return body ? `<g stroke="${ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${body}</g>` : "";
}

/** A complete inline <svg>. Decorative unless a `label` is given (the word is always printed
    beside it, so pages leave the label empty). */
export function bildSvg(name, { size = 96, className = "", label = "" } = {}) {
  const body = DRAW[name];
  if (!body) return "";
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" ${a11y} class="bild ${className}" style="display:block;overflow:visible">${bildBody(name)}</svg>`;
}
