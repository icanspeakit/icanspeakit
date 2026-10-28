// The Mini-Crew: small sidekick animals for /zungenbrecher (fish, goat, snail …). They are
// deliberately NOT mascots: a round sticker, a thin outline and no moods, so they never
// compete with Bruno, Regi, Hamsti and Quaki (src/lib/mascots.js). Each one only says the
// sound its animal makes — German onomatopoeia is a small lesson of its own.
//
//   miniSvg("ziege", { size: 48 })
//
// 100×100 grid. Same ink colour as the crew, so they sit in the same world.
const INK = "#1a2230";

const DRAW = {
  fisch: `
    <path d="M70 50 L88 36 L88 64 Z" fill="#fb923c" />
    <ellipse cx="46" cy="50" rx="28" ry="19" fill="#fdba74" />
    <path d="M40 34 Q48 24 56 33" fill="#fb923c" />
    <path d="M56 44 Q62 50 56 56" fill="none" />
    <circle cx="32" cy="46" r="4" fill="${INK}" stroke="none" />
    <circle cx="33.4" cy="44.6" r="1.3" fill="#fff" stroke="none" />
    <path d="M22 56 Q26 58 29 56" fill="none" />`,
  katze: `
    <path d="M26 40 L30 16 L46 32 Z" fill="#cbd5e1" />
    <path d="M74 40 L70 16 L54 32 Z" fill="#cbd5e1" />
    <circle cx="50" cy="54" r="28" fill="#cbd5e1" />
    <path d="M30 20 L40 30" fill="none" stroke="#f9a8d4" stroke-width="3" />
    <path d="M70 20 L60 30" fill="none" stroke="#f9a8d4" stroke-width="3" />
    <ellipse cx="40" cy="50" rx="3.6" ry="5" fill="${INK}" stroke="none" />
    <ellipse cx="60" cy="50" rx="3.6" ry="5" fill="${INK}" stroke="none" />
    <path d="M47 60 L53 60 L50 64 Z" fill="#f9a8d4" stroke-width="2" />
    <path d="M50 64 Q46 69 42 66 M50 64 Q54 69 58 66" fill="none" stroke-width="2.5" />
    <path d="M18 58 L34 60 M18 66 L34 64 M82 58 L66 60 M82 66 L66 64" fill="none" stroke-width="2" />`,
  esel: `
    <path d="M34 34 L26 6 L44 28 Z" fill="#9ca3af" />
    <path d="M62 34 L72 6 L54 28 Z" fill="#9ca3af" />
    <ellipse cx="49" cy="46" rx="21" ry="20" fill="#9ca3af" />
    <ellipse cx="50" cy="70" rx="18" ry="15" fill="#e5e7eb" />
    <circle cx="40" cy="42" r="3.6" fill="${INK}" stroke="none" />
    <circle cx="58" cy="42" r="3.6" fill="${INK}" stroke="none" />
    <circle cx="44" cy="70" r="2.2" fill="${INK}" stroke="none" />
    <circle cx="56" cy="70" r="2.2" fill="${INK}" stroke="none" />
    <path d="M42 78 Q50 82 58 78" fill="none" stroke-width="2.5" />
    <path d="M44 26 Q50 18 56 26" fill="#4b5563" stroke-width="2.5" />`,
  ameise: `
    <path d="M30 56 L18 72 M40 60 L36 78 M52 60 L58 78 M62 56 L76 72" fill="none" stroke-width="3" />
    <circle cx="74" cy="42" r="12" fill="#b45309" />
    <ellipse cx="52" cy="52" rx="10" ry="9" fill="#b45309" />
    <ellipse cx="28" cy="54" rx="15" ry="13" fill="#b45309" />
    <path d="M78 31 Q82 16 90 14 M70 31 Q70 16 64 12" fill="none" stroke-width="3" />
    <circle cx="78" cy="40" r="3" fill="${INK}" stroke="none" />
    <circle cx="79" cy="39" r="1" fill="#fff" stroke="none" />`,
  ziege: `
    <path d="M38 26 Q30 8 22 14" fill="none" stroke-width="5" stroke="#a8a29e" />
    <path d="M62 26 Q70 8 78 14" fill="none" stroke-width="5" stroke="#a8a29e" />
    <path d="M30 38 L12 32 L22 46 Z" fill="#f5f5f4" />
    <path d="M70 38 L88 32 L78 46 Z" fill="#f5f5f4" />
    <path d="M30 34 Q50 20 70 34 L64 70 Q50 80 36 70 Z" fill="#f5f5f4" />
    <path d="M44 74 L50 92 L56 74" fill="#e7e5e4" />
    <ellipse cx="41" cy="46" rx="3.2" ry="4.4" fill="${INK}" stroke="none" />
    <ellipse cx="59" cy="46" rx="3.2" ry="4.4" fill="${INK}" stroke="none" />
    <ellipse cx="50" cy="64" rx="9" ry="6" fill="#fecaca" stroke-width="2.5" />`,
  fliege: `
    <ellipse cx="34" cy="34" rx="16" ry="11" fill="#e0f2fe" opacity=".85" transform="rotate(-30 34 34)" />
    <ellipse cx="66" cy="34" rx="16" ry="11" fill="#e0f2fe" opacity=".85" transform="rotate(30 66 34)" />
    <ellipse cx="50" cy="60" rx="18" ry="20" fill="#334155" />
    <path d="M36 60 L64 60 M38 68 L62 68" fill="none" stroke="#64748b" stroke-width="2.5" />
    <circle cx="40" cy="44" r="8" fill="#dc2626" />
    <circle cx="60" cy="44" r="8" fill="#dc2626" />
    <circle cx="42" cy="42" r="2" fill="#fff" stroke="none" />
    <circle cx="62" cy="42" r="2" fill="#fff" stroke="none" />
    <path d="M34 74 L24 84 M66 74 L76 84 M42 79 L38 90 M58 79 L62 90" fill="none" stroke-width="2.5" />`,
  fink: `
    <path d="M24 66 L10 74 L16 60 Z" fill="#92400e" />
    <circle cx="50" cy="54" r="27" fill="#facc15" />
    <ellipse cx="50" cy="66" rx="16" ry="12" fill="#fef9c3" stroke="none" />
    <path d="M34 50 Q30 68 48 70 Q40 58 34 50 Z" fill="#92400e" stroke-width="2.5" />
    <path d="M74 50 L88 54 L74 60 Z" fill="#fb923c" />
    <circle cx="62" cy="46" r="4" fill="${INK}" stroke="none" />
    <circle cx="63.4" cy="44.6" r="1.3" fill="#fff" stroke="none" />
    <path d="M36 28 Q50 20 64 28" fill="#dc2626" stroke-width="2.5" />`,
  schwalbe: `
    <path d="M28 62 L6 86 L22 64 L10 92 L34 66 Z" fill="#1e3a8a" />
    <ellipse cx="50" cy="52" rx="26" ry="22" fill="#1e3a8a" />
    <ellipse cx="54" cy="62" rx="16" ry="11" fill="#fff" stroke="none" />
    <path d="M58 34 Q68 32 72 40 L66 44 Q60 38 58 34 Z" fill="#b91c1c" stroke="none" />
    <path d="M74 48 L88 50 L74 56 Z" fill="${INK}" />
    <circle cx="64" cy="46" r="3.6" fill="#fff" stroke="none" />
    <circle cx="64.6" cy="46" r="2" fill="${INK}" stroke="none" />`,
  schnecke: `
    <path d="M14 78 Q14 66 30 66 L74 66 Q84 66 84 78 Z" fill="#fde68a" />
    <path d="M70 66 L72 44 M80 66 L86 46" fill="none" stroke-width="3" />
    <circle cx="72" cy="42" r="4" fill="${INK}" stroke="none" />
    <circle cx="86" cy="44" r="4" fill="${INK}" stroke="none" />
    <circle cx="44" cy="50" r="24" fill="#c084fc" />
    <path d="M44 50 m-14 0 a14 14 0 1 1 14 14 a9 9 0 1 1 -9 -9 a4 4 0 1 1 4 4" fill="none" stroke-width="3" />
    <path d="M74 74 Q78 76 82 74" fill="none" stroke-width="2.5" />`,
  schlange: `
    <path d="M14 80 Q14 62 32 62 L58 62 Q74 62 74 48 Q74 34 58 34 L50 34" fill="none" stroke="${INK}" stroke-width="17" />
    <path d="M14 80 Q14 62 32 62 L58 62 Q74 62 74 48 Q74 34 58 34 L50 34" fill="none" stroke="#4ade80" stroke-width="11" />
    <circle cx="10" cy="86" r="5" fill="#fde68a" stroke-width="2.5" />
    <circle cx="16" cy="92" r="4" fill="#fde68a" stroke-width="2.5" />
    <ellipse cx="40" cy="30" rx="16" ry="12" fill="#4ade80" />
    <circle cx="36" cy="26" r="3.2" fill="${INK}" stroke="none" />
    <path d="M24 32 L14 34 M14 34 L9 31 M14 34 L9 38" fill="none" stroke="#dc2626" stroke-width="2.5" />`,
};

/** The sound each animal makes — the only thing a mini ever says. */
export const MINI_SOUND = {
  fisch: "Blubb!",
  katze: "Miau!",
  esel: "I-aah!",
  ameise: "Krabbel, krabbel!",
  ziege: "Mäh!",
  fliege: "Summ, summ!",
  fink: "Piep!",
  schwalbe: "Zwitscher!",
  schnecke: "Laaangsam …",
  schlange: "Ssss … klapper!",
};

export const MINI_NAMES = Object.keys(DRAW);

/** The inner drawing only, on the 100×100 grid (for prints, src/lib/merchMockups.js). */
export function miniBody(name) {
  const body = DRAW[name];
  return body ? `<g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${body}</g>` : "";
}

/** A mini inside another 100×100 drawing (the Bildkarten scenes, src/lib/bildkarten/): its
    top-left corner at x,y, `size` units wide, mirrored with `flip`, turned by `rotate` degrees.
    No stroke colour of its own, so it takes the ink of the drawing around it (light on dark
    fabric); the outline is scaled back up to about the drawing's own weight. */
export function miniAt(name, x, y, size, { flip = false, rotate = 0 } = {}) {
  const body = DRAW[name];
  if (!body) return "";
  const s = size / 100;
  const turn = rotate ? ` rotate(${rotate} ${size / 2} ${size / 2})` : "";
  const scale = flip ? ` translate(${size} 0) scale(${-s} ${s})` : ` scale(${s})`;
  return `<g transform="translate(${x} ${y})${turn}${scale}" stroke-width="${(3 / s).toFixed(2)}">${body}</g>`;
}

/** A complete inline <svg>, decorative. */
export function miniSvg(name, { size = 48, className = "" } = {}) {
  const body = DRAW[name];
  if (!body) return "";
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" class="mini ${className}" style="display:block;overflow:visible"><g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
}
