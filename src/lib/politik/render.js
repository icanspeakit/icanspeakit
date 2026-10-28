// Build-time helpers for /politik: text with glossary terms, and the charts as plain SVG.
//
// The charts are drawn here, on the server, not by a chart library: the page then works
// before its script runs, a screen reader gets a real table next to every chart, and the
// site gains no dependency. The script (seite.js) only adds the filters and tooltips.
// Every number drawn comes in as an argument from src/data/politik/*.json.

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** "Text mit [[id|Begriff]]" → HTML with a tappable glossary term. */
export function rich(text) {
  return esc(text).replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (_, id, word) =>
    `<button type="button" class="pk-term" data-term="${id}" aria-haspopup="dialog">${word}</button>`);
}

/** Both registers of a block: the page shows one, by html.is-leicht (politik.css). */
export function reg(block, tag = "span") {
  if (!block) return "";
  return `<${tag} class="pk-de">${rich(block.de)}</${tag}><${tag} class="pk-le">${rich(block.leicht ?? block.de)}</${tag}>`;
}

/** Plain register pair for attribute-free places (labels inside SVG get only `de`). */
export const plain = (block) => block?.de ?? "";

const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const num = f1;

/* ------------------------------------------------------------- matrix ---- */
// x = lrecon (0 left … 10 right), y = galtan drawn with TAN at the top. Plot area 0…100.
const PAD = { l: 10, r: 4, t: 6, b: 10 };
const W = 100 + PAD.l + PAD.r;
const H = 100 + PAD.t + PAD.b;
export const px = (v) => PAD.l + v * 10;
export const py = (v) => PAD.t + (10 - v) * 10;

/**
 * The party matrix. `parties`: [{ id, country, short, color, x, y }]; `labels`: axis texts.
 * Labels are nudged apart where two parties of one country sit close together.
 */
export function matrixSvg(parties, labels, { you = null } = {}) {
  const grid = [0, 2.5, 5, 7.5, 10]
    .map((v) => `<line x1="${px(v)}" y1="${py(0)}" x2="${px(v)}" y2="${py(10)}" class="pk-grid${v === 5 ? " pk-grid--mid" : ""}"/>
      <line x1="${px(0)}" y1="${py(v)}" x2="${px(10)}" y2="${py(v)}" class="pk-grid${v === 5 ? " pk-grid--mid" : ""}"/>`)
    .join("");
  const ticks = [0, 5, 10].map((v) => `<text x="${px(v)}" y="${py(0) + 4.2}" class="pk-tick" text-anchor="middle">${v}</text>
      <text x="${px(0) - 1.6}" y="${py(v) + 1.2}" class="pk-tick" text-anchor="end">${v}</text>`).join("");
  // The four fields as soft backgrounds, in the colours of the „Vier Felder“ picture above
  // (quadrantSvg). No field names here: the axis labels say the same, and dots would cover them.
  const fields = [["lt", 0, 5], ["rt", 5, 5], ["lg", 0, 0], ["rg", 5, 0]]
    .map(([k, x0, y0]) => `<rect x="${px(x0)}" y="${py(y0 + 5)}" width="50" height="50" class="pk-mq pk-mq--${k}"/>`).join("");
  const placed = placeLabels(parties);
  // „alle": 30-odd parties in one plot. Their labels are placed against every other label and
  // dot (placeLabelsAll); the one-country labels above would pile up there.
  const placedAll = placeLabelsAll(parties);
  const dots = parties
    .map((p, i) => `<g class="pk-dot" data-party="${p.id}" data-country="${p.country}" tabindex="0" role="button" aria-label="${esc(`${p.short} (${p.country}): Wirtschaft ${f1(p.x)}, Gesellschaft ${f1(p.y)}`)}">
        <circle cx="${px(p.x)}" cy="${py(p.y)}" r="4.5" class="pk-hit"/>
        <circle cx="${px(p.x)}" cy="${py(p.y)}" r="2.5" fill="${p.color}" class="pk-dot-c"/>
        <text x="${placed[i].x}" y="${placed[i].y}" class="pk-dot-label pk-dot-label--one" text-anchor="${placed[i].anchor}">${esc(p.short)}</text>
        ${placedAll[i].lead ? `<line x1="${px(p.x)}" y1="${py(p.y)}" x2="${placedAll[i].lx}" y2="${placedAll[i].ly}" class="pk-dot-lead"/>` : ""}
        <text x="${placedAll[i].x}" y="${placedAll[i].y}" class="pk-dot-label pk-dot-label--all" text-anchor="${placedAll[i].anchor}">${esc(p.short)}<tspan class="pk-dot-cc"> ${p.country}</tspan></text>
      </g>`)
    .join("");
  const youDot = `<g class="pk-you" data-you ${you ? "" : "hidden"}><circle cx="${px(you?.x ?? 5)}" cy="${py(you?.y ?? 5)}" r="3" /><text x="${px(you?.x ?? 5)}" y="${py(you?.y ?? 5) - 4.2}" text-anchor="middle" class="pk-you-label">${esc(labels.you)}</text></g>`;
  return `<svg class="pk-matrix" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(labels.aria)}">
    <rect x="${px(0)}" y="${py(10)}" width="100" height="100" class="pk-plot"/>
    ${fields}${grid}${ticks}
    <g class="pk-mitte" aria-hidden="true"><circle cx="${px(5)}" cy="${py(5)}" r="1.1"/><text x="${px(5) + 1.8}" y="${py(5) - 1.6}">Mitte</text></g>
    <text x="${px(0)}" y="${H - 1.2}" class="pk-axis">← ${esc(labels.xLow)}</text>
    <text x="${px(10)}" y="${H - 1.2}" class="pk-axis" text-anchor="end">${esc(labels.xHigh)} →</text>
    <text x="${px(0) + 1.2}" y="${py(10) + 3.6}" class="pk-axis pk-axis--y">↑ ${esc(labels.yHigh)}</text>
    <text x="${px(0) + 1.2}" y="${py(0) - 1.6}" class="pk-axis pk-axis--y">↓ ${esc(labels.yLow)}</text>
    ${dots}${youDot}
  </svg>`;
}

/** Label beside each dot; when two dots of one country are close, the later one flips side or moves down. */
function placeLabels(parties) {
  const out = [];
  parties.forEach((p, i) => {
    let x = px(p.x) + 3, y = py(p.y) + 1.3, anchor = "start";
    if (p.x > 8.2) { x = px(p.x) - 3; anchor = "end"; }
    for (let j = 0; j < i; j++) {
      const q = parties[j], o = out[j];
      if (q.country !== p.country) continue;
      if (Math.abs(o.y - y) < 3.4 && Math.abs(px(q.x) - px(p.x)) < 16) {
        if (anchor === "start" && o.anchor === "start") { x = px(p.x) - 3; anchor = "end"; }
        else y = o.y + 3.6;
      }
    }
    out.push({ x, y, anchor });
  });
  return out;
}

/**
 * Labels for the „alle" view: every label is placed against all dots and all labels already
 * placed. Candidates around the dot, nearest first; the first that is free wins, else the
 * one with the least overlap. A label set further off gets a thin line to its dot.
 * Sizes match politik.css for [data-show="ALL"]: font 2.5, dot radius 1.8.
 */
function placeLabelsAll(parties) {
  const FS = 2.5, CW = FS * 0.6, R = 1.9;
  const dots = parties.map((p) => ({ x: px(p.x), y: py(p.y) }));
  const boxes = [];
  const overlap = (a, b) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const CANDS = [
    [2.6, 0.9, "start"], [-2.6, 0.9, "end"], [0, -2.6, "middle"], [0, 3.7, "middle"],
    [2.2, -1.4, "start"], [-2.2, -1.4, "end"], [2.2, 3.0, "start"], [-2.2, 3.0, "end"],
    [5, 0.9, "start", 1], [-5, 0.9, "end", 1], [0, -5.2, "middle", 1], [0, 6.3, "middle", 1],
    [4.5, -3.6, "start", 1], [-4.5, -3.6, "end", 1], [4.5, 5.2, "start", 1], [-4.5, 5.2, "end", 1],
  ];
  // Crowded dots first: they have the fewest free places.
  const order = parties.map((_, i) => i).sort((a, b) =>
    dots.filter((d) => Math.hypot(d.x - dots[b].x, d.y - dots[b].y) < 9).length - dots.filter((d) => Math.hypot(d.x - dots[a].x, d.y - dots[a].y) < 9).length);
  const out = [];
  for (const i of order) {
    const p = parties[i], d = dots[i];
    const w = (p.short.length + 1 + p.country.length) * CW;
    let best = null;
    for (const [dx, dy, anchor, far] of CANDS) {
      const x = d.x + dx, y = d.y + dy;
      const x1 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
      const box = { x1, x2: x1 + w, y1: y - FS * 0.8, y2: y + FS * 0.25 };
      let cost = 0;
      if (box.x1 < px(0) || box.x2 > px(10) + 3 || box.y1 < py(10) - 3 || box.y2 > py(0)) cost += 1000;
      for (const b of boxes) cost += overlap(box, b) * 10;
      dots.forEach((o, j) => { if (j !== i) cost += overlap(box, { x1: o.x - R, x2: o.x + R, y1: o.y - R, y2: o.y + R }) * 10; });
      cost += far ? 0.5 : 0;
      if (!best || cost < best.cost) best = { x, y, anchor, box, cost, far };
      if (cost === 0) break;
    }
    boxes.push(best.box);
    const lx = Math.max(best.box.x1, Math.min(d.x, best.box.x2)), ly = best.y - FS * 0.3;
    out[i] = { x: best.x, y: best.y, anchor: best.anchor, lead: !!best.far, lx, ly };
  }
  return out;
}

/**
 * The four fields as an axis cross: Staat ↔ Markt across, Wandel ↔ Tradition up and down,
 * a picture pair and the label in each field, „Mitte" where the axes meet.
 * `q`: { lt, rt, lg, rg } labels („mehr Staat und mehr Tradition" …); `labels`: { x, y, ends, aria }.
 */
const QUAD_ICONS = { lt: ["🏛️", "📜"], rt: ["🛍️", "📜"], lg: ["🏛️", "🔄"], rg: ["🛍️", "🔄"] };
export function quadrantSvg(q, labels) {
  // 120 × 114: fields 54 × 40 around the cross at (60, 53); the axis ends are named at the edges.
  const cell = (k, x, y) => {
    const [a, b] = QUAD_ICONS[k];
    const [l1, l2] = q[k].split(" und ");
    return `<g class="pk-q pk-q--${k}">
      <rect x="${x}" y="${y}" width="54" height="40" rx="5"/>
      <text x="${x + 27}" y="${y + 14}" text-anchor="middle" class="pk-q-icons">${a} ${b}</text>
      <text x="${x + 27}" y="${y + 25}" text-anchor="middle" class="pk-q-t">${esc(l1)}</text>
      ${l2 ? `<text x="${x + 27}" y="${y + 31.5}" text-anchor="middle" class="pk-q-t">und ${esc(l2)}</text>` : ""}
    </g>`;
  };
  const e = labels.ends ?? { left: "mehr Staat", right: "mehr Markt", top: "mehr Tradition", bottom: "mehr Wandel" };
  return `<svg class="pk-quad" viewBox="0 0 120 114" role="img" aria-label="${esc(labels.aria)}">
    <defs><marker id="pk-arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 6 3 0 6z" class="pk-arrhead"/></marker></defs>
    ${cell("lt", 4, 10)}${cell("rt", 62, 10)}${cell("lg", 4, 56)}${cell("rg", 62, 56)}
    <line x1="2" y1="53" x2="118" y2="53" class="pk-q-axis" marker-start="url(#pk-arr)" marker-end="url(#pk-arr)"/>
    <line x1="60" y1="8" x2="60" y2="98" class="pk-q-axis" marker-start="url(#pk-arr)" marker-end="url(#pk-arr)"/>
    <g class="pk-q-mid"><rect x="51" y="49.5" width="18" height="7" rx="3.5"/><text x="60" y="54.4" text-anchor="middle">Mitte</text></g>
    <text x="60" y="5" class="pk-q-end" text-anchor="middle">${esc(e.top)}</text>
    <text x="60" y="104.5" class="pk-q-end" text-anchor="middle">${esc(e.bottom)}</text>
    <text x="3" y="112" class="pk-q-end">← ${esc(e.left)}</text>
    <text x="117" y="112" class="pk-q-end" text-anchor="end">${esc(e.right)} →</text>
  </svg>`;
}

/* -------------------------------------------------------------- donut ---- */
/** A half-donut (parliament) of `parties` [{ short, seats, color }], left to right in the given order. */
export function donutSvg(parties, total, aria) {
  const cx = 60, cy = 56, R = 52, r = 30;
  let a0 = Math.PI;
  const arcs = parties.map((p) => {
    const a1 = a0 - (p.seats / total) * Math.PI;
    const pt = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(2)} ${(cy - rad * Math.sin(ang)).toFixed(2)}`;
    const large = a0 - a1 > Math.PI ? 1 : 0;
    const d = `M ${pt(R, a0)} A ${R} ${R} 0 ${large} 1 ${pt(R, a1)} L ${pt(r, a1)} A ${r} ${r} 0 ${large} 0 ${pt(r, a0)} Z`;
    a0 = a1;
    return `<path d="${d}" fill="${p.color}" class="pk-arc" data-short="${esc(p.short)}"><title>${esc(`${p.short}: ${p.seats}`)}</title></path>`;
  });
  return `<svg class="pk-donut" viewBox="0 0 120 62" role="img" aria-label="${esc(aria)}">${arcs.join("")}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="pk-donut-total">${total}</text></svg>`;
}

/* ---------------------------------------------------------- histogram ---- */
/** Bars for shares 0…10 and a normal curve with the same mean and SD. */
export function histogramSvg({ shares, mean, sd }, labels) {
  const max = Math.max(...shares, 45);
  const bx = (i) => 8 + i * 9;
  const by = (v) => 52 - (v / max) * 46;
  const bars = shares.map((s, i) => `<g class="pk-bar"><rect x="${bx(i) + 1}" y="${by(s).toFixed(2)}" width="7" height="${(52 - by(s)).toFixed(2)}"><title>${i}: ${f1(s)} %</title></rect>
      <text x="${bx(i) + 4.5}" y="57.5" text-anchor="middle" class="pk-tick">${i}</text>
      <text x="${bx(i) + 4.5}" y="${(by(s) - 1.2).toFixed(2)}" text-anchor="middle" class="pk-bar-v">${Math.round(s)}</text></g>`).join("");
  // Normal density × 100 (percent per one-point bin), drawn across 0…10.
  const pts = [];
  for (let v = -0.5; v <= 10.5001; v += 0.1) {
    const d = (100 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-((v - mean) ** 2) / (2 * sd * sd));
    pts.push(`${(bx(0) + 4.5 + v * 9).toFixed(2)},${by(d).toFixed(2)}`);
  }
  const mx = bx(0) + 4.5 + mean * 9;
  return `<svg class="pk-hist" viewBox="0 0 112 62" role="img" aria-label="${esc(labels.aria)}">
    <line x1="6" y1="52" x2="108" y2="52" class="pk-grid"/>
    ${bars}
    <polyline points="${pts.join(" ")}" class="pk-gauss"/>
    <line x1="${mx.toFixed(2)}" y1="4" x2="${mx.toFixed(2)}" y2="52" class="pk-mean"/>
    <text x="${(mx + 1).toFixed(2)}" y="7" class="pk-tick pk-mean-label">${esc(labels.mean)}</text>
  </svg>`;
}

/** Heatmap cell shade for 0…10, five steps (the number is always printed too). */
export const shade = (v) => (v == null ? "pk-h-none" : `pk-h${Math.min(4, Math.floor(v / 2))}`);
