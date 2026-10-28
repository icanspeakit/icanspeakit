// Draws the wood behind the Wortgeschichte trees (WortTree.astro: the Stammbaum; the
// synonym tree in WortEntry.astro): trunk, branches, roots and a soft canopy as SVG,
// measured from where the HTML chips actually are. The chips carry all the content; this
// only connects them, so a failed draw leaves a readable grid of words.
//
// Redrawn whenever the box changes size (rotation, font load, language switch).
const NS = "http://www.w3.org/2000/svg";

function el(name, attrs) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

/** One piece of wood: a curve from a up to b. The control point sits straight below b, so
 *  a branch leaves the trunk at an angle and grows upright into its column. */
function limb(svg, a, b, width) {
  const c = { x: b.x, y: a.y - (a.y - b.y) * 0.15 };
  svg.append(el("path", {
    class: "wg-bark", fill: "none", "stroke-linecap": "round", "stroke-width": width,
    d: `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`,
  }));
}

function box(node, origin) {
  const r = node.getBoundingClientRect();
  return { x: r.left - origin.left + r.width / 2, top: r.top - origin.top, bottom: r.bottom - origin.top, y: r.top - origin.top + r.height / 2, w: r.width, h: r.height };
}

function roots(svg, x, y) {
  for (const [dx, len, w] of [[-26, 18, 4], [-9, 24, 5], [10, 22, 5], [27, 16, 3.5]]) {
    svg.append(el("path", {
      class: "wg-bark", fill: "none", "stroke-linecap": "round", "stroke-width": w,
      d: `M${x + dx * 0.25},${y - 2} q${dx * 0.5},${len * 0.4} ${dx},${len}`,
    }));
  }
}

function canopy(svg, b) {
  svg.append(el("ellipse", { class: "wg-canopy", cx: b.x, cy: b.y, rx: b.w * 0.62 + 10, ry: b.h * 0.75 + 10 }));
}

/** The Stammbaum. */
function drawStammbaum(fig) {
  const grid = fig.querySelector(".wg-tree-grid");
  const svg = grid?.querySelector(".wg-tree-lines");
  const rootChip = grid?.querySelector(".wg-leaf.is-root");
  if (!grid || !svg || !rootChip) return;
  const o = grid.getBoundingClientRect();
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${o.width} ${o.height}`);
  svg.setAttribute("width", o.width);
  svg.setAttribute("height", o.height);

  const root = box(rootChip, o);
  const branches = [...grid.querySelectorAll(".wg-branch")];
  const names = branches.map((b) => b.querySelector(".wg-branch-name"));
  const nameTop = Math.min(...names.map((n) => (n ? box(n, o).top : root.top)));
  const fork = { x: root.x, y: nameTop + (root.top - nameTop) * 0.62 };

  const canopyLayer = el("g", {});
  const wood = el("g", {});
  svg.append(canopyLayer, wood);

  // Trunk: from the root chip up to the fork, thick.
  limb(wood, { x: root.x, y: root.top + 4 }, fork, 15);
  roots(wood, root.x, root.bottom);

  for (const b of branches) {
    const chips = [...b.querySelectorAll("ol > .wg-leaf")].map((c) => box(c, o));
    if (!chips.length) continue;
    const base = chips[0];
    // Branch: fork → under the oldest word, then up through each word to the newest.
    limb(wood, fork, { x: base.x, y: base.bottom - 4 }, 10);
    for (let i = 1; i < chips.length; i++) {
      limb(wood, { x: chips[i - 1].x, y: chips[i - 1].y }, { x: chips[i].x, y: chips[i].y }, Math.max(4, 8 - 1.5 * i));
    }
    canopy(canopyLayer, chips[chips.length - 1]);
    const twig = b.querySelector(".wg-leaf.is-twig");
    if (twig) {
      const t = box(twig, o);
      const p = el("path", {
        class: "wg-bark wg-bark--twig", fill: "none", "stroke-linecap": "round", "stroke-width": 3,
        d: `M${base.x},${base.y} C${base.x + base.w * 0.55},${base.y - 30} ${t.x + t.w * 0.55},${t.y + 30} ${t.x},${t.y}`,
      });
      wood.append(p);
      canopy(canopyLayer, t);
    }
  }
}

/** The synonym tree: the headword as the trunk, each synonym on its own branch. */
function drawSynonyms(wrap) {
  const svg = wrap.querySelector(".wg-tree-lines");
  const head = wrap.querySelector(".wg-syn-head");
  if (!svg || !head) return;
  const o = wrap.getBoundingClientRect();
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${o.width} ${o.height}`);
  svg.setAttribute("width", o.width);
  svg.setAttribute("height", o.height);
  const h = box(head, o);
  const leaves = [...wrap.querySelectorAll(".wg-syn-leaf")].map((n) => box(n, o));
  const canopyLayer = el("g", {});
  const wood = el("g", {});
  svg.append(canopyLayer, wood);
  const lowest = Math.max(...leaves.map((l) => l.bottom));
  const fork = { x: h.x, y: lowest + (h.top - lowest) * 0.45 };
  limb(wood, { x: h.x, y: h.top + 4 }, fork, 11);
  roots(wood, h.x, h.bottom);
  for (const l of leaves) {
    limb(wood, fork, { x: l.x, y: l.bottom - 3 }, 5);
    canopy(canopyLayer, l);
  }
}

export function drawTrees(scope = document) {
  const figs = [...scope.querySelectorAll("[data-wg-tree]")];
  const syns = [...scope.querySelectorAll("[data-wg-syn]")];
  const all = () => { figs.forEach(drawStammbaum); syns.forEach(drawSynonyms); };
  all();
  if ("ResizeObserver" in window) {
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(all); });
    for (const n of [...figs, ...syns]) ro.observe(n);
  }
  document.fonts?.ready.then(all);
}
