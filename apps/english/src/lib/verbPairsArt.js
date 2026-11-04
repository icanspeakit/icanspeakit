// Our own drawings of the six verb pairs of the Wechselpräpositionen (stellen/stehen …):
// a movement verb (Wohin? + Akkusativ) beside its position verb (Wo? + Dativ), with a person
// for the reflexive ones and an object for the others. Plain SVG strings, so the rule on the
// page (src/pages/[id].astro, concept.pictures "verbpaare") and the grammar PDF
// (scripts/generate-grammatik-pdf.mjs, rasterised with sharp) draw the same pictures.
// Motion lines mark the moment of moving; the position panel is still.

const BG = "#0f766e";
const SURF = "#13897f";
const INK = "#ffffff";
const SKIN = "#f2c9a0";
const HAIR = "#2b2b2b";
const SHIRT = "#f8fafc";
const PANTS = "#3b4252";
const SLEEVE = "#f97316";
const CHAIR = "#e4572e";
const WOHIN = "#fdba74";
const WO = "#99f6e4";

/** The pairs in reading order: [Wohin verb, Wo verb, kind]. */
export const VERB_PAIRS = [
  ["sich legen", "liegen", "person-lie"],
  ["legen", "liegen", "book"],
  ["sich stellen", "stehen", "person-stand"],
  ["stellen", "stehen", "bottle"],
  ["sich setzen", "sitzen", "person-sit"],
  ["hängen", "hängen", "line"],
];

const motion = (x, y, r = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${r})" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".85"><path d="M0 0 q6 -6 0 -12"/><path d="M9 2 q7 -8 0 -16"/></g>`;
const head = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="${SKIN}"/><path d="M${x - 9} ${y - 1} q1 -12 11 -11 q8 1 8 10 q-5 -6 -11 -4 q-5 1 -8 5z" fill="${HAIR}"/>`;
const limb = (d, color, w = 7) => `<path d="${d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

/** A person lying, head left at (x, y). */
function lying(x, y) {
  return limb(`M${x + 10} ${y + 2} L${x + 46} ${y + 2}`, SHIRT, 13)
    + limb(`M${x + 46} ${y + 2} L${x + 82} ${y}`, PANTS, 9)
    + limb(`M${x + 46} ${y + 6} L${x + 80} ${y + 8}`, PANTS, 9)
    + limb(`M${x + 18} ${y - 3} L${x + 6} ${y - 14}`, SKIN, 5)
    + head(x, y);
}
/** A person standing, feet at (x, y). */
function standing(x, y, step = 0) {
  return limb(`M${x - 4} ${y - 34} L${x - 5 - step} ${y}`, PANTS, 8)
    + limb(`M${x + 4} ${y - 34} L${x + 5 + step} ${y}`, PANTS, 8)
    + limb(`M${x} ${y - 62} L${x} ${y - 34}`, SHIRT, 18)
    + limb(`M${x - 8} ${y - 58} L${x - 13} ${y - 36}`, SKIN, 5)
    + limb(`M${x + 8} ${y - 58} L${x + 13} ${y - 36}`, SKIN, 5)
    + head(x, y - 74);
}
const chair = (x, y) => `<path d="M${x} ${y} v-34 h7 v20 h28 v14 M${x + 31} ${y - 14} v14" stroke="${CHAIR}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
/** A person sitting on a chair whose seat front is at (x, y); `low` bends further (sitting down). */
function sitting(x, y, down = false) {
  if (down) {
    // Half-way down: hips above the seat, knees bent, back leaning forward.
    const hx = x + 8, hy = y - 30;
    return chair(x - 6, y + 28)
      + limb(`M${hx} ${hy} L${hx + 24} ${hy + 10} L${hx + 26} ${y + 28}`, PANTS, 8)
      + limb(`M${hx} ${hy} L${hx + 14} ${hy - 26}`, SHIRT, 16)
      + limb(`M${hx + 12} ${hy - 20} L${hx + 26} ${hy + 4}`, SKIN, 5)
      + head(hx + 20, hy - 40);
  }
  const hip = [x + 6, y - 16];
  return chair(x - 6, y + 28)
    + limb(`M${hip[0]} ${hip[1]} L${hip[0] + 24} ${hip[1] + 2} L${hip[0] + 26} ${y + 28}`, PANTS, 8)
    + limb(`M${hip[0]} ${hip[1]} L${hip[0]} ${hip[1] - 28}`, SHIRT, 16)
    + limb(`M${hip[0] + 2} ${hip[1] - 22} L${hip[0] + 16} ${hip[1] - 4}`, SKIN, 5)
    + head(hip[0] + 1, hip[1] - 40);
}
const table = `<path d="M10 118 L190 118 L190 140 L10 140 Z" fill="${SURF}"/><path d="M10 118 L190 118" stroke="#0b5f58" stroke-width="2"/>`;
/** An arm reaching in from the right, the hand at (x, y), the elbow towards (x + dx, y + dy). */
const arm = (x, y, dx = 48, dy = -22) => limb(`M${x + 6} ${y} L${x + dx} ${y + dy} L${x + dx + 30} ${y + dy - 6}`, SLEEVE, 11) + `<circle cx="${x}" cy="${y}" r="7" fill="${SKIN}"/>`;
const book = (x, y, tilt = 0) => `<g transform="translate(${x} ${y}) rotate(${tilt})"><rect x="-26" y="-8" width="52" height="10" rx="2" fill="#1f2937"/><rect x="-24" y="-1" width="48" height="3" fill="#f8fafc"/></g>`;
const bottle = (x, y) => `<path d="M${x - 9} ${y} v-34 q0 -8 6 -12 v-12 h6 v12 q6 4 6 12 v34 z" fill="#d1fae5" opacity=".9" stroke="#ecfeff" stroke-width="1.5"/>`;
const line = `<path d="M8 40 Q100 52 192 40" stroke="#ecfeff" stroke-width="2" fill="none"/>`;
const sock = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-6 0 h12 v26 q0 8 -8 8 h-12 q-6 0 -4 -6 q2 -4 8 -4 h4 z" fill="#f8fafc"/><rect x="-7" y="-4" width="5" height="8" rx="1" fill="${CHAIR}"/></g>`;
const shirt = (x, y) => `<path d="M${x - 20} ${y} l-12 12 l8 7 l6 -5 v30 h36 v-30 l6 5 l8 -7 l-12 -12 z" fill="#f8fafc"/><rect x="${x - 3}" y="${y - 4}" width="5" height="8" rx="1" fill="${CHAIR}"/>`;

/** The drawing of one panel (inside a 200 × 150 frame). */
function scene(kind, moving) {
  switch (kind) {
    case "person-lie":
      return `<rect x="34" y="96" width="140" height="22" rx="4" fill="${SURF}"/>`
        + (moving ? `<g transform="rotate(-14 100 96)">${lying(52, 90)}</g>${motion(150, 66, 20)}` : lying(52, 98));
    case "person-stand":
      return `<path d="M10 134 H190" stroke="${SURF}" stroke-width="6"/>` + (moving ? standing(96, 132, 7) + motion(124, 62, 15) : standing(100, 132));
    case "person-sit":
      return `<path d="M10 134 H190" stroke="${SURF}" stroke-width="6"/>` + sitting(82, 104, moving) + (moving ? `<g stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".85"><path d="M70 56 v16"/><path d="M78 50 v16"/></g>` : "");
    case "book":
      return table + (moving ? book(96, 100, -6) + arm(124, 96) + motion(60, 92, -30) : book(100, 116));
    case "bottle":
      return table + (moving ? bottle(96, 106) + arm(104, 62) + motion(70, 92, -30) : bottle(100, 118));
    case "line":
      return line + (moving
        ? sock(70, 46) + sock(130, 46, -6) + arm(140, 52, 30, 30) + motion(108, 74, 0)
        : sock(70, 46) + shirt(130, 47) + sock(176, 44));
    default:
      return "";
  }
}

/** One panel as an SVG string: the verb, the picture, and the question it answers. */
export function verbPanelSvg(verb, kind, moving, { width = 200 } = {}) {
  const [refl, main] = verb.startsWith("sich ") ? ["sich", verb.slice(5)] : [null, verb];
  const q = moving ? ["Wohin?", "+ Akk.", WOHIN] : ["Wo?", "+ Dat.", WO];
  const font = `font-family="Fredoka, 'Noto Sans', Arial, sans-serif"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="${width}" role="img" aria-label="${verb}: ${q[0]} ${moving ? "Akkusativ" : "Dativ"}">`
    + `<rect width="200" height="150" rx="12" fill="${BG}"/>`
    + scene(kind, moving)
    + (refl ? `<text x="14" y="22" ${font} font-size="15" font-weight="600" fill="#ccfbf1">sich</text>` : "")
    + `<text x="14" y="${refl ? 40 : 28}" ${font} font-size="${main.length > 7 ? 18 : 20}" font-weight="700" fill="${INK}">${main}</text>`
    + `<g transform="translate(${200 - 14} 20)"><text text-anchor="end" ${font} font-size="12" font-weight="700" fill="${q[2]}">${q[0]} <tspan font-weight="500">${q[1]}</tspan></text></g>`
    + `</svg>`;
}

/** All twelve panels in one SVG, four across (each pair side by side), for the PDF. */
export function verbPairsSheetSvg() {
  const W = 200, H = 150, G = 10;
  const cells = VERB_PAIRS.flatMap(([a, b, kind]) => [verbPanelSvg(a, kind, true), verbPanelSvg(b, kind, false)]);
  const cols = 4;
  const rows = Math.ceil(cells.length / cols);
  const total = [cols * W + (cols - 1) * G, rows * H + (rows - 1) * G];
  const body = cells.map((svg, i) => {
    const x = (i % cols) * (W + G), y = Math.floor(i / cols) * (H + G);
    return svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${W}" height="${H}" `).replace(/ width="200"/, "");
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total[0]} ${total[1]}" width="${total[0]}" height="${total[1]}">${body}</svg>`;
}
