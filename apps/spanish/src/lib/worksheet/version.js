// "New version" for a grammar worksheet (/profesores/fichas/gramatica/<slug>).
//
// The page is built once, in the data's order. A version is a number in the URL (?v=4821):
// it reorders the items of every exercise, the right-hand column of a matching task (with
// new letters), the word box and the word tiles, on the sheet and on the answer key alike.
// The order comes from seed.js, so the same number gives the same sheet on every device and
// every build: the number is printed in the footer and in the key's header, and a teacher who
// types the printed URL gets the matching key back. No ?v = the built order, unchanged.
//
// The markup carries what this needs (grammar/[id].astro):
//   [data-ws-sec="<n>"]         an exercise, on the sheet and on the key (same n)
//   [data-ws-items]             the list whose children [data-ws-i="<k>"] are the items
//   [data-ws-right] > [data-ws-r="<pair>"]   a matching task's right column, letter in <b>
//   [data-ws-pair="<pair>"]     a left row (input) or key row (<b data-ws-letter>) of a pair
//   [data-ws-shuffle]           a container whose children are reordered (box, word tiles)
//   [data-ws-ver]               shows the version ("" without one)
//   [data-ws-url]               shows the sheet's address, with ?v when there is one
// Nothing here is needed to print or fill in the sheet: without JavaScript it is version 0.
import { shuffle, LETTERS } from "../arbeitsblatt/seed.js";
import { intent } from "../intent.js";

const MAX = 9999;
const parseV = (s) => {
  const n = Number.parseInt(String(s ?? ""), 10);
  return Number.isFinite(n) && n > 0 && n <= MAX ? n : 0;
};

/** @param {HTMLElement} root  #ab-root */
export function mountVersions(root) {
  // The built order of every reorderable container, kept so any version starts from it.
  const lists = [...root.querySelectorAll("[data-ws-items], [data-ws-shuffle], [data-ws-right]")].map((el) => ({
    el,
    kids: [...el.children],
  }));
  const keyOf = (el) => {
    const sec = el.closest("[data-ws-sec]");
    return sec ? sec.dataset.wsSec : "x";
  };
  // A container's seed: the version, its exercise, its kind and its place among the
  // containers of that kind in the exercise (the n-th word tiles), so it is stable.
  const seedOf = (el, v) => {
    const sec = el.closest("[data-ws-sec]");
    const kind = el.hasAttribute("data-ws-right") ? "right" : "shuffle";
    const same = sec ? [...sec.querySelectorAll(`[data-ws-${kind}]`)] : [el];
    return `${v}:${keyOf(el)}:${kind}:${same.indexOf(el)}`;
  };

  const verEls = [...root.querySelectorAll("[data-ws-ver]")];
  const urlEls = [...root.querySelectorAll("[data-ws-url]")];
  const baseUrl = urlEls[0]?.textContent ?? "";

  function apply(v) {
    for (const { el, kids } of lists) {
      if (!v) {
        kids.forEach((k) => el.appendChild(k));
        continue;
      }
      // Items: sheet and key share one order per exercise (same seed); the key's children
      // carry the same data-ws-i, so its order is looked up by that, not by position.
      if (el.hasAttribute("data-ws-items")) {
        const ids = kids.map((k) => k.dataset.wsI).sort((a, b) => a - b);
        const order = shuffle(ids, `${v}:${keyOf(el)}:items`);
        order.forEach((id) => { const k = kids.find((c) => c.dataset.wsI === id); if (k) el.appendChild(k); });
      } else {
        shuffle(kids.map((_, i) => i), seedOf(el, v)).forEach((i) => el.appendChild(kids[i]));
      }
    }
    // Matching: new letters for the right column's new order, and every answer that names one.
    for (const right of root.querySelectorAll("[data-ws-right]")) {
      const sec = right.closest("[data-ws-sec]");
      const letterOf = {};
      [...right.children].forEach((li, k) => {
        letterOf[li.dataset.wsR] = LETTERS[k];
        const b = li.querySelector("b");
        if (b) b.textContent = `${LETTERS[k]})`;
      });
      const n = sec?.dataset.wsSec;
      root.querySelectorAll(`[data-ws-sec="${n}"] [data-ws-pair]`).forEach((row) => {
        const letter = letterOf[row.dataset.wsPair];
        if (!letter) return;
        const input = row.querySelector("input[data-a]");
        if (input) input.dataset.a = JSON.stringify([letter]);
        const key = row.querySelector("[data-ws-letter]");
        if (key) key.textContent = letter;
      });
    }
    verEls.forEach((el) => {
      el.textContent = v ? (el.dataset.wsVer || "Version {v}").replace("{v}", String(v)) : "";
      el.hidden = !v;
    });
    urlEls.forEach((el) => (el.textContent = v ? `${baseUrl}?v=${v}` : baseUrl));
    // Marks from an online check belong to the old order.
    root.querySelectorAll(".is-right, .is-wrong").forEach((i) => i.classList.remove("is-right", "is-wrong"));
    const score = root.querySelector("[data-ab-score]");
    if (score) score.textContent = "";
    root.dataset.version = String(v);
    root.querySelectorAll("[data-ws-original]").forEach((b) => (b.hidden = !v));
  }

  function setUrl(v) {
    const u = new URL(location.href);
    if (v) u.searchParams.set("v", String(v));
    else u.searchParams.delete("v");
    history.replaceState(null, "", u);
  }

  root.querySelector("[data-ws-new]")?.addEventListener("click", () => {
    const now = parseV(root.dataset.version);
    let v = now;
    while (v === now) v = 1 + Math.floor(Math.random() * MAX);
    apply(v);
    setUrl(v);
    // traffic-baseline: teacher_tool_use. intent() is consent-gated and never blocks.
    intent("teacher_tool_use", { tool: "worksheet_grammar", action: "new_version" });
  });
  root.querySelectorAll("[data-ws-original]").forEach((b) => b.addEventListener("click", () => {
    apply(0);
    setUrl(0);
  }));

  const start = parseV(new URL(location.href).searchParams.get("v"));
  apply(start);
}
