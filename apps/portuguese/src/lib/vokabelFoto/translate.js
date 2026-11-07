// „Vokabeln vom Foto“: translations for words our lexicon doesn't have, with Azure AI Translator
// (Text Translation v3, free tier F0: 2 million characters a month). Machine translation, not a
// language model: one word in, its dictionary-style translation out. Words the lexicon knows
// never come here; the page takes theirs from our own data (src/lib/vokabelFoto/page.js).
//
// Env (server only, Cloudflare Worker secrets, read at runtime):
//   AZURE_TRANSLATOR_KEY     key 1 of the Translator resource
//   AZURE_TRANSLATOR_REGION  its region („westeurope“), or „global“ / empty for a global resource

const ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=de";

export const translatorConfigured = () => Boolean(process.env.AZURE_TRANSLATOR_KEY);

export class TranslatorError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {string[]} texts  German words or short phrases (≤ 100 per call)
 * @param {string[]} to     target languages, one call for all (our codes are Azure's: en, ar, uk, fa, kmr, pt …)
 * @returns {Promise<Record<string, string[]>>} per language one translation per text, same order
 */
export async function translateWords(texts, to) {
  const region = String(process.env.AZURE_TRANSLATOR_REGION || "").trim();
  const res = await fetch(`${ENDPOINT}${to.map((l) => `&to=${encodeURIComponent(l)}`).join("")}`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_TRANSLATOR_KEY,
      ...(region && region !== "global" ? { "Ocp-Apim-Subscription-Region": region } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(texts.map((Text) => ({ Text }))),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TranslatorError(`Azure Translator ${res.status}: ${body.slice(0, 200)}`, res.status);
  }
  const data = await res.json();
  const out = Object.fromEntries(to.map((l) => [l, []]));
  for (const d of data) {
    for (const l of to) out[l].push(d?.translations?.find((x) => x.to === l)?.text ?? "");
  }
  return out;
}

// German → German: Azure has no thesaurus, but its bilingual dictionary (Dictionary Lookup,
// same resource and free characters) lists for each English translation the German words that
// translate back to it: „Dorf“ → village → Dorf, Ortschaft. Those back-translations are the
// synonym candidates, ranked by how often they stand for that sense. Own forms („gemütliche“,
// „anzubieten“) and other parts of speech (anbieten → „Angebot“) are dropped here; the page
// prefers candidates our lexicon knows, so the card's German side stays in learners' German.
const LOOKUP = "https://api.cognitive.microsofttranslator.com/dictionary/lookup?api-version=3.0&from=de&to=en";
const FOLD = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
const fold = (s) => s.toLowerCase().replace(/[äöüß]/g, (c) => FOLD[c]);
// Which of Azure's English tags fit our part of speech (OTHER fits everything).
const TAGS = { noun: /NOUN|OTHER/, verb: /VERB|OTHER/, adj: /ADJ|ADV|VERB|OTHER/, adv: /ADJ|ADV|VERB|OTHER/ };
// „behagliche“ → „behaglich“: an inflected adjective back to its dictionary form.
const ADJ_END = /(ig|lich|isch|ell|al|iv|bar|sam|haft|los)(e|en|es|em|er)$/;

function synonymsFrom(entry, lemma, pos) {
  const self = fold(lemma.replace(/^sich\s+/, ""));
  const score = new Map();
  for (const t of entry?.translations ?? []) {
    if (pos && TAGS[pos] && !TAGS[pos].test(t.posTag)) continue;
    const total = t.backTranslations.reduce((n, b) => n + b.frequencyCount, 0) || 1;
    for (const b of t.backTranslations) {
      let w = b.displayText.trim();
      if (!/^\p{L}+$/u.test(w) || /[^a-zäöüß]/i.test(w)) continue; // phrases, mojibake
      const f = fold(w);
      if (f.startsWith(self) || f.replace("zu", "") === self || self.startsWith(f) && f.length > self.length - 3) continue;
      if (pos === "verb" && (/^[A-ZÄÖÜ]/.test(w) || !/(en|ern|eln)$/.test(w))) continue;
      if ((pos === "adj" || pos === "adv") && /^[A-ZÄÖÜ]/.test(w)) continue;
      if (pos === "adj" || pos === "adv" || !pos) w = w.replace(ADJ_END, "$1");
      const share = b.frequencyCount / total;
      if (b.frequencyCount < 20 || share < 0.02) continue;
      w = pos === "noun" ? w[0].toUpperCase() + w.slice(1) : /^[A-ZÄÖÜ]/.test(w) && pos ? w.toLowerCase() : w;
      score.set(w, (score.get(w) ?? 0) + t.confidence * share);
    }
  }
  return [...score].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 5);
}

/**
 * @param {{ lemma: string, pos?: string }[]} words  single words; phrases get no candidates
 * @returns {Promise<string[][]>} per word up to 5 German candidates, best first
 */
export async function germanSynonyms(words) {
  const region = String(process.env.AZURE_TRANSLATOR_REGION || "").trim();
  const out = words.map(() => []);
  const todo = words.map((w, i) => ({ ...w, i })).filter((w) => /^(sich )?\p{L}+$/u.test(w.lemma));
  // Dictionary Lookup takes at most 10 texts per call.
  for (let k = 0; k < todo.length; k += 10) {
    const part = todo.slice(k, k + 10);
    const res = await fetch(LOOKUP, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_TRANSLATOR_KEY,
        ...(region && region !== "global" ? { "Ocp-Apim-Subscription-Region": region } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(part.map((w) => ({ Text: w.lemma.replace(/^sich\s+/, "") }))),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new TranslatorError(`Azure Dictionary ${res.status}: ${body.slice(0, 200)}`, res.status);
    }
    const data = await res.json();
    part.forEach((w, j) => (out[w.i] = synonymsFrom(data[j], w.lemma, w.pos)));
  }
  return out;
}
