// Domino: a closed ring of tiles to cut out. Where two tiles touch, the right half of one
// and the left half of the next belong together: "la | casa", "el libro | los libros",
// "la casa | house, home", and the last tile leads back to the first.
//
// Tile i is [A of item i | B of item i+1], so each joint reads B then A of the same item.
// The tiles print in shuffled order (a ring printed in order is already solved); the
// solution follows on its own page for the teacher.
import { chunk, esc, MEANING_LANGS, rng, sheet, shuffle, tx } from "./common.js";
import { isDrillNoun, pluralArticle } from "../generoDrill.js";

export const DOMINO_TYPES = {
  artikel: { label: "el / la" },
  plural: { label: "Plural" },
  bedeutung: { label: "Word ↔ meaning" },
};

/** The items a ring can be built from, per type, with duplicates on either side removed. */
function itemsFor(words, type, lang) {
  const seenA = new Set();
  const seenB = new Set();
  const out = [];
  for (const w of words) {
    let a;
    let b;
    if (type === "artikel") {
      if (w.pos !== "noun" || !isDrillNoun(w)) continue;
      a = w.lemma;
      b = w.gender;
    } else if (type === "plural") {
      if (w.pos !== "noun" || !isDrillNoun(w) || !w.plural) continue;
      a = `${w.gender} ${w.lemma}`;
      b = `${pluralArticle(w)} ${w.plural}`;
    } else {
      if (!w[lang]) continue;
      a = w.display;
      b = w[lang];
    }
    // Articles repeat by nature (el, la); every other B must be unique, or two
    // tiles would fit the same joint for a reason the game does not intend.
    if (seenA.has(a) || (type !== "artikel" && seenB.has(b))) continue;
    seenA.add(a);
    seenB.add(b);
    out.push({ a, b, lemma: w.lemma });
  }
  return out;
}

/**
 * @returns {{ tiles: {left: string, right: string, from: number, to: number}[], ring: object[], error?: string }}
 */
export function buildDomino(words, { type, count, lang, seed }) {
  const items = itemsFor(words, type, lang);
  if (items.length < 6) return { tiles: [], ring: [], error: "few", available: items.length };
  const k = Math.min(Math.max(12, count), 24, items.length);
  const rand = rng(`domino:${type}:${seed}`);
  const ring = shuffle(items, rand).slice(0, k);
  const tiles = ring.map((it, i) => ({ left: it.a, right: ring[(i + 1) % k].b, from: i, to: (i + 1) % k }));
  return { tiles, ring, order: shuffle(tiles, rand) };
}

/** True when every tile's right half belongs to the next tile's left half, all the way round. */
export function ringCloses(tiles, ring) {
  return tiles.every((t, i) => {
    const next = tiles[(i + 1) % tiles.length];
    return t.to === next.from && t.right === ring[next.from].b && next.left === ring[next.from].a;
  });
}

export function renderDomino(state, data) {
  const type = DOMINO_TYPES[state.type] ? state.type : "artikel";
  const lang = MEANING_LANGS[state.lang] ? state.lang : "en";
  const count = Number(state.count) || 16;
  if (!data.words.length) return { html: "", status: tx("sp.pickSet", "Wähle mindestens ein Lernset."), error: true };

  const { tiles, ring, order, error, available } = buildDomino(data.words, { type, count, lang, seed: state.seed });
  if (error) {
    return {
      html: "",
      error: true,
      status: tx("sp.domino.few", "Zu wenige passende Wörter für diesen Typ ({n}, mindestens 6). Wähle mehr Lernsets oder einen anderen Typ.", { n: available }),
    };
  }
  const rtlB = type === "bedeutung" && MEANING_LANGS[lang].rtl;
  const half = (text, rtl) => `<span class="sp-dom-half"${rtl ? ` dir="rtl" lang="${lang}"` : ""}>${esc(text)}</span>`;
  const tileHtml = (t) => `<div class="sp-dom-tile">${half(t.left)}<span class="sp-dom-mid" aria-hidden="true"></span>${half(t.right, rtlB)}</div>`;

  const label = `${DOMINO_TYPES[type].label}${type === "bedeutung" ? ` (${MEANING_LANGS[lang].label})` : ""} · ${data.level} · ${data.units.filter((u) => data.chosen.includes(u.id)).map((u) => u.title).join(", ")}`;
  const tilePages = chunk(order, 16);
  const pages = tilePages.length + 1;
  const title = "Domino";
  let page = 0;
  const html = [
    ...tilePages.map((list) =>
      sheet(
        `<p class="sp-sheet-sub">${esc(label)} · ${tiles.length} tiles · cut along the dashed lines</p>
         <div class="sp-dom-grid">${list.map(tileHtml).join("")}</div>`,
        { title, page: ++page, pages },
      ),
    ),
    sheet(
      `<h2 class="sp-sheet-h">Answers</h2>
       <p class="sp-sheet-sub">${esc(label)} · The chain closes: the last tile fits the first one again.</p>
       <ol class="sp-dom-solution">${tiles.map((t) => `<li>${half(t.left)} <span class="sp-dom-sep">|</span> ${half(t.right, rtlB)}</li>`).join("")}</ol>`,
      { title, page: ++page, pages },
    ),
  ].join("");

  const closes = ringCloses(tiles, ring);
  return {
    html,
    error: !closes,
    status: closes
      ? tx("sp.domino.ok", "{n} Steine, geschlossene Kette, jeder Stein einmal.", { n: tiles.length })
      : "Internal error: the chain does not close.",
  };
}
