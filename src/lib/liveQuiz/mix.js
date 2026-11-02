// Wortschatz + Grammatik in one round (/teachers/quiz): the teacher picks a Lernset on
// the left and a grammar chapter on the right, and half the questions come from each,
// taking turns. Used by the projector (host.js) and by „Solo spielen" (player.js).
//
// The grammar questions are the chapter's ready-made items, the same file the quiz
// builder loads (/teachers/quiz-chapters/g-<key>.json, see chapters.js): German on both
// sides, so they are asked as mode "custom" whatever the vocabulary mode is.

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Up to `n` questions from the picked grammar: one chapter (g-<key>) or a whole level as a
 * comma list of them, in the projector's shape. Several chapters are drawn in rotation.
 */
export async function grammarQuestions(pick, n) {
  const slugs = String(pick).split(",").filter((s) => /^g-[a-z0-9-]+$/.test(s));
  if (!slugs.length || n < 1) return [];
  const files = await Promise.all(slugs.map(async (slug) => {
    const res = await fetch(`/teachers/quiz-chapters/${slug}.json`);
    if (!res.ok) throw new Error(`quiz-kapitel/${slug} → ${res.status}`);
    return res.json();
  }));
  // Several chapters (a whole level, Zufallsmix): take them in turn, each in a new
  // random order, so one long chapter does not fill the round and two questions in a
  // row rarely come from the same topic.
  const decks = shuffle(files.map((f) => shuffle((f.groups ?? []).flatMap((g) => g.items ?? []).filter((q) => q?.t === "mc"))))
    .filter((d) => d.length);
  const picked = [];
  for (let i = 0; picked.length < n && decks.some((d) => i < d.length); i++) {
    for (const d of decks) if (d[i] && picked.length < n) picked.push(d[i]);
  }
  return picked
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return {
        prompt: { de: q.prompt },
        options: order.map((i) => ({ de: q.options[i] })),
        correct: order.indexOf(q.correct),
        mode: "custom",
        kind: q.kind ?? null,
      };
    });
}

/**
 * A round of `count` with grammar mixed in: the grammar half first (a chapter can have
 * fewer items than asked), the vocabulary fills the rest, then they take turns.
 * `buildVocab(n)` returns (or resolves to) n vocabulary questions.
 */
export async function mixedQuestions(count, pick, buildVocab) {
  const grammar = await grammarQuestions(pick, Math.floor(count / 2));
  const vocab = await buildVocab(count - grammar.length);
  const out = [];
  for (let i = 0; i < Math.max(vocab.length, grammar.length); i++) {
    if (vocab[i]) out.push(vocab[i]);
    if (grammar[i]) out.push(grammar[i]);
  }
  return out;
}
