// Bildkarten: praepositionen. Bodies on the 100×100 grid, keyed by lexicon id; see kit.js for the style.
// One family: the same cardboard box and the same fink, only the position changes. The box
// is drawn in 3/4 view and split into a back part and a front part, so the fink can sit
// between them (in), behind the whole box (hinter) or in front of it (vor).
import { HI, INK, miniAt } from "./kit.js";

const BOX = "#d97706"; // front face
const SIDE = "#b45309"; // right side face
const LID = "#fbbf24"; // closed lid
const FLAP = "#fde68a"; // inner cardboard (open flaps)
const HOLE = "#78350f"; // the dark inside
const RED = "#dc2626";
const SHADOW = `fill="#000" opacity=".13" stroke="none"`;

const r = (n) => Math.round(n * 10) / 10;
const pts = (a) => a.map(([px, py]) => `${r(px)},${r(py)}`).join(" ");

/** The fink by the centre of its round body (radius ≈ 0.27·s). */
function fink(cx, cy, s, opts = {}) {
  return miniAt("fink", r(cx - 0.5 * s), r(cy - 0.54 * s), s, opts);
}

/** A soft shadow on the ground. */
const shadow = (cx, cy, rx, ry = rx * 0.22) => `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(rx)}" ry="${r(ry)}" ${SHADOW} />`;

/** The cardboard box. x,y = top-left of the front face, w = its width. Returns { back, front, all }
    plus the geometry: draw `back`, then whatever sits inside, then `front`. */
function box({ x, y, w, open = false, flaps = true }) {
  const h = w * 0.66;
  const dx = w * 0.32;
  const dy = w * 0.22;
  const fl = [x, y], fr = [x + w, y], bl = [x + dx, y - dy], br = [x + w + dx, y - dy];
  const side = pts([fr, br, [x + w + dx, y + h - dy], [x + w, y + h]]);
  const face = `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${BOX}" />`;
  const hi = `<path d="M${r(x + 5)} ${r(y + 6)} L${r(x + 5)} ${r(y + h - 6)}" ${HI} />`;
  let back = "";
  let front = "";
  if (open) {
    const fh = w * 0.36;
    back += `<polygon points="${pts([fl, fr, br, bl])}" fill="${HOLE}" />`;
    if (flaps) {
      back += `<polygon points="${pts([bl, br, [br[0] + w * 0.08, br[1] - fh], [bl[0] + w * 0.08, bl[1] - fh]])}" fill="${FLAP}" />`;
      back += `<polygon points="${pts([fl, bl, [bl[0] - w * 0.3, bl[1] - w * 0.08], [fl[0] - w * 0.3, fl[1] - w * 0.08]])}" fill="${FLAP}" />`;
    }
    front += face + `<polygon points="${side}" fill="${SIDE}" />`;
    if (flaps) front += `<polygon points="${pts([fr, br, [br[0] + w * 0.3, br[1] - w * 0.02], [fr[0] + w * 0.3, fr[1] - w * 0.02]])}" fill="${FLAP}" />`;
    front += hi;
  } else {
    front += face + `<polygon points="${side}" fill="${SIDE}" />`;
    front += `<polygon points="${pts([fl, fr, br, bl])}" fill="${LID}" />`;
    front += `<path d="M${r(x + dx / 2)} ${r(y - dy / 2)} L${r(x + w + dx / 2)} ${r(y - dy / 2)}" fill="none" stroke-width="2.5" />`;
    front += hi;
  }
  return { back, front, all: back + front, x, y, w, h, dx, dy, top: y - dy, right: x + w + dx, bottom: y + h };
}

/** A curved arrow along a path, with a filled arrow head at the end (ex,ey) pointing at angle deg. */
function head(ex, ey, deg, size = 7, fill = INK) {
  const a = (deg * Math.PI) / 180;
  const p = (ang, len) => [ex + Math.cos(ang) * len, ey + Math.sin(ang) * len];
  const back1 = p(a + Math.PI - 0.5, size);
  const back2 = p(a + Math.PI + 0.5, size);
  return `<polygon points="${pts([[ex, ey], back1, back2])}" fill="${fill}" stroke-width="2" />`;
}

/** Little speed / motion lines. */
const lines = (d) => `<path d="${d}" fill="none" stroke-width="3" opacity=".6" />`;

/** A red-and-white ball (mit / ohne). */
const ball = (cx, cy, rad) => `
  <circle cx="${cx}" cy="${cy}" r="${rad}" fill="#fff" />
  <path d="M${cx - rad} ${cy} A${rad} ${rad} 0 0 1 ${cx + rad} ${cy} Z" fill="#ef4444" />
  <path d="M${cx} ${cy - rad} Q${cx - rad * 0.55} ${cy} ${cx} ${cy + rad}" fill="none" stroke-width="2.5" />
  <path d="M${cx - rad * 0.55} ${cy - rad * 0.45} Q${cx - rad * 0.3} ${cy - rad * 0.75} ${cx} ${cy - rad * 0.8}" ${HI} />`;

/** A five-point crash star. */
function star(cx, cy, ro, ri, fill = "#fde047") {
  const p = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? ri : ro;
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return `<polygon points="${pts(p)}" fill="${fill}" />`;
}

const scene = () => {
  const out = {};

  // in: the fink peeks out of the open box.
  {
    const b = box({ x: 22, y: 52, w: 48, open: true });
    out.in = shadow(55, b.bottom, 38) + b.back + fink(48, 39, 60) + b.front;
  }

  // auf: sitting on the closed lid.
  {
    const b = box({ x: 18, y: 58, w: 54 });
    out.auf = shadow(57, b.bottom, 42) + b.all + fink(52, 36, 54);
  }

  // ueber: flying above the closed box, its shadow on the lid.
  {
    const b = box({ x: 18, y: 62, w: 54 });
    out.ueber =
      shadow(57, b.bottom, 42) + b.all +
      `<ellipse cx="54" cy="${r(b.y - b.dy / 2)}" rx="13" ry="3.4" ${SHADOW} />` +
      fink(52, 22, 46) +
      lines("M30 14 L22 12 M30 22 L20 22 M30 30 L22 32");
  }

  // unter: under the box that stands on four legs.
  {
    const b = box({ x: 12, y: 22, w: 62 });
    const legs = (lx, ly, len) => `<rect x="${r(lx)}" y="${r(ly)}" width="6" height="${r(len)}" fill="${SIDE}" />`;
    const g = 90;
    out.unter =
      shadow(56, g, 44) +
      legs(b.right - 9, b.bottom - b.dy - 2, g - b.bottom + b.dy - 2) +
      fink(42, 72, 48) +
      legs(b.x + 1, b.bottom - 2, g - b.bottom) + legs(b.x + b.w - 7, b.bottom - 2, g - b.bottom) +
      b.all;
  }

  // neben: standing next to the box on the same ground.
  {
    const b = box({ x: 48, y: 52, w: 40 });
    out.neben = shadow(70, b.bottom, 28) + b.all + shadow(22, b.bottom, 16) + fink(22, b.bottom - 14, 48);
  }

  // hinter: behind the closed box, only the head and a bit of the body show.
  {
    const b = box({ x: 12, y: 52, w: 56 });
    out.hinter = shadow(52, b.bottom, 44) + fink(68, 36, 56) + b.all;
  }

  // vor: in front of the box, overlapping its front face.
  {
    const b = box({ x: 26, y: 34, w: 50 });
    out.vor = shadow(60, b.bottom, 40) + b.all + shadow(44, 90, 22) + fink(44, 72, 56);
  }

  // zwischen: between two boxes.
  {
    const a = box({ x: 2, y: 50, w: 30 });
    const c = box({ x: 64, y: 50, w: 30 });
    out.zwischen = shadow(50, a.bottom + 1, 48) + a.all + c.all + fink(50, a.bottom - 13, 44);
  }

  // an: hanging on the box, feet hooked over the front rim, upside down, off the ground.
  {
    const b = box({ x: 8, y: 36, w: 64 });
    out.an =
      shadow(52, b.bottom, 46) + b.all +
      fink(40, 56, 46, { rotate: 180 }) +
      `<path d="M36 46 L36 36 Q36 32 40 33 M45 46 L45 36 Q45 32 49 33" fill="none" stroke="#fb923c" stroke-width="3" />`;
  }

  // mit: the fink together with its ball.
  {
    out.mit =
      shadow(48, 84, 40) +
      fink(34, 58, 58) +
      ball(72, 66, 16);
  }

  // ohne: the same pair, the ball only a dashed outline, struck out in red.
  {
    out.ohne =
      shadow(40, 84, 30) +
      fink(34, 58, 58) +
      `<circle cx="72" cy="66" r="16" fill="none" stroke-dasharray="5 5" stroke-width="3" opacity=".7" />` +
      `<path d="M58 84 L86 48" fill="none" stroke="${RED}" stroke-width="6" />`;
  }

  // durch: through a hoop, dotted path in and out.
  {
    out.durch =
      `<path d="M50 20 A12 32 0 0 0 50 84" fill="none" stroke="#2563eb" stroke-width="9" />` +
      `<path d="M50 20 A12 32 0 0 0 50 84" fill="none" stroke-width="2" opacity=".5" />` +
      `<path d="M8 66 Q22 56 34 54" fill="none" stroke-dasharray="4 6" stroke-width="3.5" />` +
      fink(54, 52, 44) +
      `<path d="M50 20 A12 32 0 0 1 50 84" fill="none" stroke="#3b82f6" stroke-width="9" />` +
      `<path d="M74 50 Q84 46 90 40" fill="none" stroke-dasharray="4 6" stroke-width="3.5" />` +
      head(93, 37, -35);
  }

  // aus: jumping out of the open box, a curved arrow up and out.
  {
    const b = box({ x: 8, y: 60, w: 46, open: true });
    out.aus =
      shadow(40, b.bottom, 36) + b.back + b.front +
      `<path d="M36 50 Q42 20 64 20" fill="none" stroke-dasharray="4 6" stroke-width="3.5" />` +
      fink(76, 36, 46, { rotate: 15 }) +
      lines("M26 40 L22 32 M34 36 L32 28") +
      "";
  }

  // um: a dotted circle with an arrow running round the box, the fink on it.
  {
    const b = box({ x: 26, y: 50, w: 40 });
    out.um =
      `<path d="M8 64 A44 22 0 0 1 96 64" fill="none" stroke-dasharray="5 6" stroke-width="3.5" />` +
      shadow(56, b.bottom, 30) + b.all +
      `<path d="M96 64 A44 22 0 0 1 22 81" fill="none" stroke-dasharray="5 6" stroke-width="3.5" />` +
      head(10, 58, -100, 9) +
      fink(20, 80, 36, { flip: true });
  }

  // gegen: bumping into the box, a crash star where they meet.
  {
    const b = box({ x: 46, y: 50, w: 40 });
    out.gegen =
      shadow(70, b.bottom, 30) + b.all +
      fink(26, 60, 48, { rotate: 12 }) +
      star(46, 54, 13, 6) +
      lines("M4 46 L12 48 M2 58 L10 58 M4 70 L12 68");
  }

  // zu: walking to the box, the arrow ends at it.
  {
    const b = box({ x: 56, y: 54, w: 34 });
    out.zu =
      shadow(74, b.bottom, 24) + b.all +
      shadow(20, b.bottom, 16) + fink(20, b.bottom - 14, 40) +
      `<path d="M30 40 L50 40" fill="none" stroke-width="5" />` +
      head(57, 40, 0, 10);
  }

  // nach: off to a far place: a road, a signpost and a little town on the horizon.
  {
    out.nach =
      `<path d="M4 90 L58 52 L66 52 L96 90 Z" fill="#e5e7eb" stroke="none" />` +
      `<path d="M58 52 L4 90 M66 52 L96 90" fill="none" stroke-width="2.5" opacity=".5" />` +
      `<rect x="56" y="30" width="8" height="12" fill="#f87171" />` +
      `<path d="M54 31 L60 25 L66 31 Z" fill="${RED}" stroke-width="2.5" />` +
      `<rect x="66" y="34" width="10" height="8" fill="#93c5fd" />` +
      `<rect x="45" y="36" width="9" height="7" fill="#fde68a" />` +
      `<path d="M2 50 L98 50" fill="none" stroke-width="2.5" />` +
      `<rect x="80" y="44" width="5" height="46" fill="#a16207" />` +
      `<polygon points="70,48 92,48 99,55 92,62 70,62" fill="#16a34a" />` +
      `<path d="M74 55 L88 55 M84 51 L88 55 L84 59" fill="none" stroke="#fff" stroke-width="2.5" />` +
      shadow(26, 90, 14) + fink(26, 76, 40);
  }

  return out;
};

export const PRAEPOSITIONEN = scene();
