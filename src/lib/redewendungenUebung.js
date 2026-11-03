// Practice for /knowledge/idioms (Tier 4 of REDEWENDUNGEN-TIERED-PROMPT.md), on the shared
// choice quiz (src/lib/quiz.js). Three kinds of question, built in the browser from the small
// item list the page embeds (itemsOf in redewendungenItems.js):
//
//   bedeutung  „Was bedeutet das?“   phrase → 4 meanings
//   luecke     „Ergänze“             phrase with its key word gapped → 4 words
//   bild       „Bild oder Bedeutung?“ Quaki's literal picture (props + `bild`) → 4 phrases
//
// Distractors come from the same theme first, so they are near misses, not giveaways. Every
// answer counts in the progress log as wortschatz / redewendungen / <id>.
import { mountQuiz } from "./quiz.js";
import { recordAttempt } from "./progress.js";
import { t } from "./uiText.js";
import { withBase } from "./paths.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Three distinct values of `pick` from other items, same theme first. */
function distractors(item, items, pick) {
  const own = pick(item);
  const seen = new Set([own.toLowerCase()]);
  const out = [];
  for (const pool of [items.filter((o) => o.t === item.t), items]) {
    for (const o of shuffle(pool)) {
      const v = pick(o);
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      out.push(v);
      if (out.length === 3) return out;
    }
  }
  return out;
}

const KIND = {
  bedeutung: (it, items) => ({
    prompt: `<p class="rw-q-kind">${t("rw.q.bedeutung", "Was bedeutet das?")}</p><p class="rw-q-de">${esc(it.de)}</p>`,
    answer: it.bed,
    options: [it.bed, ...distractors(it, items, (o) => o.bed)],
  }),
  luecke: (it, items) => ({
    prompt: `<p class="rw-q-kind">${t("rw.q.luecke", "Ergänze")}</p><p class="rw-q-de">${esc(it.de.replace(it.gap, "___"))}</p>`,
    answer: it.gap,
    options: [it.gap, ...distractors(it, items, (o) => o.gap)],
  }),
  bild: (it, items) => ({
    prompt: `<p class="rw-q-kind">${t("rw.q.bild", "Bild oder Bedeutung? Welche Redewendung ist das?")}</p>
      <p class="rw-q-props" aria-hidden="true">${(it.props ?? []).map((c) => `<img src="${withBase(`/img/openmoji/${c}.svg`)}" alt="" width="52" height="52">`).join("")}</p>
      <p class="rw-q-bild">${esc(it.bild)}</p>`,
    answer: it.de,
    options: [it.de, ...distractors(it, items, (o) => o.de)],
  }),
};

function question(kind, it, items) {
  const q = KIND[kind](it, items);
  return { ...q, id: it.id, options: q.options.map(esc), answer: esc(q.answer) };
}

/**
 * A round: `n` questions over random items, the three kinds in turn. With `focus` (an entry
 * page), that entry's own questions first, then the rest of the round from its theme.
 */
export function buildRound(items, { n = 9, focus = null } = {}) {
  const kinds = ["bedeutung", "luecke", "bild"];
  if (focus) {
    const it = items.find((o) => o.id === focus);
    const rest = shuffle(items.filter((o) => o.t === it.t && o.id !== it.id)).slice(0, Math.max(0, n - 3));
    return [...kinds.map((k) => question(k, it, items)), ...rest.map((o, i) => question(kinds[i % 3], o, items))];
  }
  return shuffle(items).slice(0, n).map((it, i) => question(kinds[i % 3], it, items));
}

/** Mounts the quiz in `root`, with a fresh round on „Nochmal üben“ (quiz.js reuses its set). */
export function mountUebung(root, items, opts = {}) {
  mountQuiz(root, buildRound(items, opts), {
    mode: "choice",
    shuffle: false,
    onAnswer: (ok, q) => recordAttempt({ skill: "wortschatz", topic: "redewendungen", item: q.id, correct: ok }),
  });
}
