// „Vokabeln vom Foto“, German side, last resort: a short explanation in simple German for the
// words that neither our lexicon nor Azure's dictionary has a synonym for – mostly phrases
// („eine Pause machen“, „Bescheid sagen“), which the dictionary doesn't look up at all.
//
// Workers AI (binding AI in wrangler.jsonc, free daily allowance), one call per batch. Model
// test 2026-10-23 on eleven words: gpt-oss-120b gave the best learners' German („Rand vom
// Wasser“, „kurz ausruhen“); Llama 3.3 got dishes wrong, Mistral Small only listed keywords,
// gpt-oss-20b echoed the words. The teacher checks the result like every automatic one.

const MODEL = "@cf/openai/gpt-oss-120b";
const SYSTEM = "Du hilfst Deutschlernenden (Niveau A2). Für jedes deutsche Wort oder jede Wendung schreibst du eine kurze Erklärung in einfachem Deutsch: höchstens 8 Wörter, ohne das Wort selbst, kein Satzpunkt am Ende. Antworte nur mit einem JSON-Array von Strings, eine Erklärung pro Eintrag, gleiche Reihenfolge.";

const fold = (s) => s.toLowerCase().replace(/[^\p{L} ]/gu, "").trim();

/**
 * @param {{ run: Function } | undefined} ai  the Workers AI binding
 * @param {string[]} lemmas  at most 80, as on the page („sich freuen“, „eine Pause machen“)
 * @returns {Promise<string[]>} one explanation per lemma, "" where there is none
 */
export async function explainWords(ai, lemmas) {
  const out = lemmas.map(() => "");
  if (!ai || !lemmas.length) return out;
  const res = await ai.run(MODEL, {
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(lemmas) }],
    max_tokens: 3000,
    temperature: 0.2,
    reasoning_effort: "low",
  });
  const text = res?.response ?? res?.choices?.[0]?.message?.content ?? "";
  let list;
  try {
    list = JSON.parse(String(text).match(/\[[\s\S]*\]/)?.[0] ?? "");
  } catch {
    return out;
  }
  if (!Array.isArray(list) || list.length !== lemmas.length) return out;
  return list.map((e, i) => {
    const s = String(e ?? "").replace(/\s+/g, " ").replace(/[.]$/, "").trim();
    // An echo of the word is no explanation; an essay is not what the card side needs.
    if (!s || fold(s) === fold(lemmas[i]) || s.split(" ").length > 12 || s.length > 90) return "";
    return s;
  });
}
