// The pictures in the generated PDFs: the mascot crew (Bruno, Regi, Hamsti, Quaki) in a
// few poses, and the round icons that sit in front of section headings. The mascots come
// from src/lib/mascots.js, the same drawings the site uses; the icons are drawn here in the
// logo's teal. Rasterised with sharp — pdfkit places PNGs, not SVGs.
//
// Everything is authored in this repo: no clip art, nothing to license.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { mascotBody } from "../../src/lib/mascots.js";

const TEAL = "#0d9488";
const INK = "#1a2230";

// librsvg has no web fonts, so the little bits of mascot text (Hamsti's „Aa“, Bruno's
// „Zz“) would fall back to a system face. Turn them into outlines from Fredoka instead.
// fontkit arrives with pdfkit; resolve it from there rather than adding a dependency.
const fontkit = createRequire(createRequire(import.meta.url).resolve("pdfkit"))("fontkit");
const FREDOKA = fontkit.openSync(fileURLToPath(new URL("../../public/fonts/fredoka-latin.woff2", import.meta.url)));

function textToPath(svgText) {
  return svgText.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (_, attrs, str) => {
    const num = (k) => Number((attrs.match(new RegExp(`(?:^|\\s)${k}="([\\d.-]+)"`)) || [])[1] || 0);
    const fill = (attrs.match(/\sfill="([^"]+)"/) || [])[1] || INK;
    const size = num("font-size");
    const run = FREDOKA.layout(str);
    const k = size / FREDOKA.unitsPerEm;
    let x = num("x");
    if (/text-anchor="middle"/.test(attrs)) x -= (run.advanceWidth * k) / 2;
    const y = num("y");
    let pen = 0;
    const d = run.glyphs.map((g, i) => {
      const t = `<path transform="translate(${(x + pen * k).toFixed(2)} ${y}) scale(${k.toFixed(4)} ${(-k).toFixed(4)})" d="${g.path.toSVG()}"/>`;
      pen += run.positions[i].xAdvance;
      return t;
    }).join("");
    // The file's default instance is the Light weight; a stroke in the fill colour
    // brings it up to the Bold the pages use.
    return `<g fill="${fill}" stroke="${fill}" stroke-width="70" stroke-linejoin="round">${d}</g>`;
  });
}

/** One mascot on the PDF art's 240 grid: `at` is the top-left corner, `scale` of 200px. */
const place = (opts, { x = 20, y = 20, scale = 1 } = {}) =>
  `<g transform="translate(${x} ${y}) scale(${scale})">${textToPath(mascotBody({ ...opts, font: "Fredoka" }))}</g>`;

const svg = (body, size = 240) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 240 240">${body}</svg>`;

const star = (x, y, r, fill = "#fbbf24") => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
};

// The pose names are what the generators ask for; the cast behind each one follows the
// crew's roles (Bruno coaches, Regi does grammar, Hamsti words, Quaki speaking).
const MASCOTS = {
  // Cover: Bruno, the coach, says hello.
  wave: svg(`${place({ name: "bruno", view: "three" })}`),
  // Tips („Merke“): Regi, the grammar hedgehog, with a light bulb.
  idea: svg(`
    ${place({ name: "regi" }, { x: 10, y: 34, scale: 0.9 })}
    <circle cx="206" cy="40" r="21" fill="#fde68a"/><circle cx="206" cy="40" r="14" fill="#fbbf24"/>
    <rect x="198" y="59" width="16" height="10" rx="3" fill="#94a3b8"/>
    <path d="M206 8 v-4 M180 16 l-5 -5 M232 16 l4 -4" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>`),
  // Exercises: Hamsti with the „Aa“ card and a pencil.
  write: svg(`
    ${place({ name: "hamsti" }, { x: 6, y: 30, scale: 0.95 })}
    <g transform="rotate(35 200 160)">
      <rect x="190" y="110" width="18" height="70" rx="3" fill="#fbbf24" stroke="${INK}" stroke-width="4"/>
      <rect x="190" y="110" width="18" height="12" rx="3" fill="#f7a8a0" stroke="${INK}" stroke-width="4"/>
      <path d="M190 180 L208 180 L199 198 Z" fill="#fde7c3" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    </g>`),
  // Reference pages and the frequency chart: Bruno, thinking it over.
  read: svg(`${place({ name: "bruno", expr: "thinking" }, { x: 20, y: 30 })}`),
  // Level openers and the solutions: Bruno celebrating, Quaki cheering along.
  cheer: svg(`
    ${place({ name: "quaki", view: "three" }, { x: 132, y: 118, scale: 0.52 })}
    ${place({ name: "bruno", expr: "celebrate" }, { x: 0, y: 26, scale: 0.9 })}
    ${star(222, 30, 11)}${star(206, 80, 8, "#5eead4")}`),
  // Word lists (Deutsch für den Beruf): Hamsti, the vocabulary hamster, says hello on the cover.
  words: svg(`${place({ name: "hamsti", view: "three" })}`),
  // …and cheers on the last page.
  wordsCheer: svg(`
    ${place({ name: "hamsti", expr: "celebrate" }, { x: 10, y: 26, scale: 0.9 })}
    ${star(214, 34, 11)}${star(196, 84, 8, "#5eead4")}`),
};

/* The whole crew in one picture, wider than the 240 grid: Regi and Quaki at the back, Hamsti
   beside them, Bruno in front. `expr` is everyone's face (the Grammatik-Start cover and back
   page: "celebrate"). */
const crew = (expr) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="260" viewBox="0 0 480 260">
    ${place({ name: "regi", expr }, { x: 0, y: 62, scale: 0.78 })}
    ${place({ name: "quaki", expr, view: "three" }, { x: 330, y: 70, scale: 0.74 })}
    ${place({ name: "hamsti", expr }, { x: 92, y: 92, scale: 0.7 })}
    ${place({ name: "bruno", expr, view: "three" }, { x: 168, y: 18, scale: 1.08 })}
    ${star(458, 40, 13)}${star(24, 36, 10, "#5eead4")}${star(300, 22, 9)}</svg>`;
const CREW = {
  // Grammatik-Start: the crew on the cover, and cheering on the back page.
  crew: crew("happy"),
  crewCheer: crew("celebrate"),
  // A typical mistake: Bruno, caught out.
  oops: svg(`${place({ name: "bruno", expr: "oops" }, { x: 20, y: 30 })}`),
  // The answer key: Bruno dozing — first practise, then look.
  sleepy: svg(`${place({ name: "bruno", expr: "sleepy" }, { x: 20, y: 30 })}`),
};

// Heading icons: a white glyph on a teal disc, 64 × 64.
const icon = (glyph) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="${TEAL}"/><g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;

const ICONS = {
  // Die Regel: a light bulb.
  rule: icon(`<path d="M24 36 a12 12 0 1 1 16 0 c-2 2 -3 4 -3 7 h-10 c0 -3 -1 -5 -3 -7 z"/><path d="M27 49 h10"/>`),
  // Satzbau: three blocks in a row.
  flow: icon(`<rect x="9" y="25" width="12" height="14" rx="3"/><rect x="43" y="25" width="12" height="14" rx="3"/><path d="M26 32 h12 M34 28 l4 4 l-4 4"/>`),
  // A reference table.
  table: icon(`<rect x="15" y="17" width="34" height="30" rx="3"/><path d="M15 27 h34 M15 37 h34 M28 17 v30"/>`),
  // Übung: a pencil.
  pencil: icon(`<path d="M20 44 l3 -10 l19 -19 l7 7 l-19 19 z"/><path d="M37 20 l7 7"/>`),
  // Examples: a speech bubble.
  example: icon(`<path d="M15 20 h34 v20 h-18 l-9 8 v-8 h-7 z"/>`),
  // Merke: an exclamation mark.
  note: icon(`<path d="M32 17 v19"/><circle cx="32" cy="45" r="1.5" fill="#fff"/>`),
};

let cache = null;

/** All pictures as PNG buffers: `{ mascot: { wave, idea, … }, icon: { rule, … } }`. */
export async function loadArt() {
  if (cache) return cache;
  const png = (s, density) => sharp(Buffer.from(s), { density }).png().toBuffer();
  const mascot = {};
  for (const [k, s] of Object.entries({ ...MASCOTS, ...CREW })) mascot[k] = await png(s, 150);
  const icons = {};
  for (const [k, s] of Object.entries(ICONS)) icons[k] = await png(s, 110);
  cache = { mascot, icon: icons };
  return cache;
}

/** Any one mascot with any face, as a PNG: `single("regi", "thinking")`. For the small
    marks beside a box (Regi at a Merke, Hamsti at an exercise), where a pose with props
    would be too busy at 40 px. Cached per name and face. */
const singles = new Map();
export async function single(name, expr = "happy", view = "front") {
  const key = `${name}:${expr}:${view}`;
  if (!singles.has(key)) {
    const s = svg(place({ name, expr, view }, { x: 20, y: 30 }));
    singles.set(key, await sharp(Buffer.from(s), { density: 150 }).png().toBuffer());
  }
  return singles.get(key);
}

/** The raw SVGs, for previewing the art on its own. */
export const svgs = { ...MASCOTS, ...CREW, ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [`icon-${k}`, v])) };
