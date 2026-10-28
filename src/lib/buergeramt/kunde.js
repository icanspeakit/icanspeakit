// Brunos Bürgeramt: the customers, drawn like the mascot crew (src/lib/mascots.js): a 200×200
// grid, a thick round #1a2230 outline, flat colours, rosy cheeks, dot eyes. Only head and
// shoulders show above the counter. A look is a handful of small numbers, so the generator
// can pick one from its seed and the ID photo can redraw the same person:
//
//   { form, haut, haar, haarfarbe, brille, bart, kleid, extra }   (all indexes, see below)
//
// Appearance is decoration only. Nothing about it is ever a rule (decision 10).

const LINE = "#1a2230";
export const HAUT = ["#fde2c8", "#f6c9a0", "#e0a878", "#c68652", "#8d5a35", "#5e3a22"];
export const HAARFARBE = ["#2b2118", "#5a3a22", "#a0632f", "#e3b04b", "#b8b8b8", "#c2410c"];
export const KLEID = ["#0d9488", "#f97316", "#3b82f6", "#8b5cf6", "#ef4444", "#f2a900", "#64748b", "#ec4899"];
export const LOOK_ANZAHL = { form: 3, haut: HAUT.length, haar: 9, haarfarbe: HAARFARBE.length, brille: 2, bart: 3, kleid: KLEID.length, extra: 4 };
// hair styles: 0 kurz · 1 lang · 2 Dutt · 3 Locken · 4 Glatze · 5 Zopf · 6 Igel · 7 Bob · 8 Kopftuch
const OHNE_BART = new Set([1, 2, 5, 7, 8]); // styles drawn without a beard, to keep faces readable

/** A random look from rng() (floats in [0,1)). */
export function zufallsLook(rng) {
  const pick = (n) => Math.floor(rng() * n);
  const look = {};
  for (const [k, n] of Object.entries(LOOK_ANZAHL)) look[k] = pick(n);
  if (OHNE_BART.has(look.haar)) look.bart = 0;
  return look;
}

const head = (form, skin) =>
  form === 0 ? `<circle cx="100" cy="92" r="46" fill="${skin}"/>`
  : form === 1 ? `<ellipse cx="100" cy="94" rx="42" ry="50" fill="${skin}"/>`
  : `<rect x="56" y="46" width="88" height="94" rx="34" fill="${skin}"/>`;

function haarHinten(style, c) {
  switch (style) {
    case 1: return `<path d="M52 92 Q50 40 100 38 Q150 40 148 92 L152 160 Q100 172 48 160 Z" fill="${c}"/>`;
    case 5: return `<path d="M140 80 Q170 100 160 150 Q154 162 146 150 Q152 110 132 90 Z" fill="${c}"/>`;
    case 7: return `<path d="M52 96 Q48 40 100 38 Q152 40 148 96 L150 130 Q100 140 50 130 Z" fill="${c}"/>`;
    case 8: return `<path d="M44 100 Q40 30 100 30 Q160 30 156 100 L164 176 Q100 196 36 176 Z" fill="${c}"/>`;
    default: return "";
  }
}

function haarVorne(style, c) {
  switch (style) {
    case 0: return `<path d="M56 82 Q56 44 100 42 Q144 44 144 82 Q130 62 100 64 Q74 64 56 82 Z" fill="${c}"/>`;
    case 1: return `<path d="M56 86 Q58 44 100 44 Q142 44 144 86 Q122 60 100 70 Q80 58 56 86 Z" fill="${c}"/>`;
    case 2: return `<circle cx="100" cy="36" r="16" fill="${c}"/><path d="M56 84 Q56 46 100 46 Q144 46 144 84 Q120 64 100 64 Q78 64 56 84 Z" fill="${c}"/>`;
    case 3: return [60, 76, 92, 108, 124, 140].map((x, i) => `<circle cx="${x}" cy="${56 + (i % 2) * 6 - (i > 0 && i < 5 ? 6 : -10)}" r="15" fill="${c}"/>`).join("");
    case 4: return `<path d="M58 88 Q60 70 66 66" fill="none" stroke="${c}" stroke-width="7"/><path d="M142 88 Q140 70 134 66" fill="none" stroke="${c}" stroke-width="7"/>`;
    case 5: return `<path d="M56 84 Q56 44 100 44 Q144 44 144 84 Q126 60 96 66 Q72 70 56 84 Z" fill="${c}"/>`;
    case 6: return `<path d="M56 78 L62 50 L72 64 L80 42 L90 60 L100 38 L110 60 L120 42 L128 64 L138 50 L144 78 Q100 60 56 78 Z" fill="${c}"/>`;
    case 7: return `<path d="M54 92 Q54 44 100 44 Q146 44 146 92 Q140 66 100 66 Q60 66 54 92 Z" fill="${c}"/>`;
    case 8: return `<path d="M50 104 Q46 42 100 40 Q154 42 150 104 Q142 60 100 58 Q58 60 50 104 Z" fill="${c}"/>`;
    default: return "";
  }
}

const MUND = {
  neutral: `<path d="M90 118 Q100 122 110 118" fill="none"/>`,
  froh: `<path d="M86 114 Q100 130 114 114" fill="#fff"/>`,
  wirr: `<path d="M90 120 Q95 116 100 120 Q105 124 110 120" fill="none"/>`,
  genervt: `<path d="M88 122 Q100 114 112 122" fill="none"/>`,
  erleichtert: `<path d="M88 116 Q100 126 112 116" fill="none"/>`,
};
const BRAUEN = {
  neutral: `<path d="M78 80 L90 79"/><path d="M110 79 L122 80"/>`,
  froh: `<path d="M78 78 Q84 74 90 77"/><path d="M110 77 Q116 74 122 78"/>`,
  wirr: `<path d="M78 76 L90 80"/><path d="M110 78 Q116 72 122 76"/>`,
  genervt: `<path d="M78 76 L90 81"/><path d="M110 81 L122 76"/>`,
  erleichtert: `<path d="M78 80 Q84 76 90 79"/><path d="M110 79 Q116 76 122 80"/>`,
};

function bart(n, c) {
  if (n === 1) return `<path d="M84 110 Q100 102 116 110 Q100 114 84 110 Z" fill="${c}"/>`;
  if (n === 2) return `<path d="M60 98 Q62 142 100 146 Q138 142 140 98 Q132 124 116 116 Q100 110 84 116 Q68 124 60 98 Z" fill="${c}"/>`;
  return "";
}

function extra(n, kleid) {
  if (n === 1) return `<path d="M54 64 Q56 30 100 28 Q144 30 146 64 Z" fill="${kleid}"/><path d="M48 66 L152 66" stroke-width="7"/>`;
  if (n === 2) return `<circle cx="54" cy="112" r="5" fill="#f2a900"/><circle cx="146" cy="112" r="5" fill="#f2a900"/>`;
  if (n === 3) return `<path d="M64 150 Q100 166 136 150 L140 166 Q100 182 60 166 Z" fill="#f97316"/>`;
  return "";
}

/** The SVG body of one customer (everything inside <svg>). */
export function kundeBody(look, ausdruck = "neutral", { foto = false } = {}) {
  const skin = HAUT[look.haut] ?? HAUT[0];
  const hc = HAARFARBE[look.haarfarbe] ?? HAARFARBE[0];
  const kleid = KLEID[look.kleid] ?? KLEID[0];
  const mood = foto ? "neutral" : ausdruck;
  const tuch = look.haar === 8;
  return `<g stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    ${haarHinten(look.haar, tuch ? kleid : hc)}
    <path d="M30 200 Q32 152 100 148 Q168 152 170 200 Z" fill="${kleid}"/>
    <path d="M86 132 L86 152 Q100 160 114 152 L114 132 Z" fill="${skin}"/>
    ${tuch ? "" : `<circle cx="54" cy="98" r="9" fill="${skin}"/><circle cx="146" cy="98" r="9" fill="${skin}"/>`}
    ${head(look.form, skin)}
    ${haarVorne(look.haar, tuch ? kleid : hc)}
    <g fill="none">${BRAUEN[mood] ?? BRAUEN.neutral}</g>
    <circle cx="86" cy="94" r="4" fill="${LINE}" stroke="none"/>
    <circle cx="114" cy="94" r="4" fill="${LINE}" stroke="none"/>
    ${look.brille ? `<g fill="none" stroke-width="4"><circle cx="86" cy="94" r="11"/><circle cx="114" cy="94" r="11"/><path d="M97 94 L103 94"/></g>` : ""}
    <ellipse cx="72" cy="110" rx="7" ry="4.5" fill="#f28b82" opacity="0.6" stroke="none"/>
    <ellipse cx="128" cy="110" rx="7" ry="4.5" fill="#f28b82" opacity="0.6" stroke="none"/>
    ${bart(look.bart, hc)}
    ${MUND[mood] ?? MUND.neutral}
    ${extra(look.extra, kleid)}
  </g>`;
}

/** The dog who wants a Hundesteuermarke (Tag 7): a fluffy poodle, not Bruno. */
export function hundBody(ausdruck = "neutral") {
  const froh = ausdruck === "froh" || ausdruck === "erleichtert";
  return `<g stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M40 200 Q44 150 100 146 Q156 150 160 200 Z" fill="#e5e7eb"/>
    <circle cx="56" cy="96" r="22" fill="#f3f4f6"/><circle cx="144" cy="96" r="22" fill="#f3f4f6"/>
    <circle cx="100" cy="92" r="42" fill="#f9fafb"/>
    <circle cx="80" cy="54" r="14" fill="#f3f4f6"/><circle cx="100" cy="46" r="16" fill="#f3f4f6"/><circle cx="120" cy="54" r="14" fill="#f3f4f6"/>
    <ellipse cx="100" cy="112" rx="20" ry="15" fill="#fff"/>
    <ellipse cx="100" cy="104" rx="8" ry="6" fill="${LINE}" stroke="none"/>
    <circle cx="84" cy="88" r="4.5" fill="${LINE}" stroke="none"/><circle cx="116" cy="88" r="4.5" fill="${LINE}" stroke="none"/>
    <path d="M${froh ? "92 116 Q100 126 108 116" : "92 120 Q100 118 108 120"}" fill="none"/>
    ${froh ? `<path d="M98 122 Q100 134 104 122" fill="#f28b82"/>` : ""}
    <path d="M78 150 L122 150" stroke="#ef4444" stroke-width="8"/>
  </g>`;
}

/** A whole <svg>. */
export function kundeSvg(look, ausdruck, { size = 200, foto = false, hund = false, className = "" } = {}) {
  const body = hund ? hundBody(ausdruck) : kundeBody(look, ausdruck, { foto });
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true" class="${className}" style="display:block;overflow:visible">${body}</svg>`;
}
