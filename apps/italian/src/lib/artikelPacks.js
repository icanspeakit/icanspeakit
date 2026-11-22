// The packs of the il / lo / la / l' trainer ("By topic" and "By rule"), worked out at build time from
// the lexicon and src/data/artikel-packs.json.
//
// Topic packs group the lexicon's own unit topics. A noun can carry more than one topic; it
// belongs to the pack of its first, so every noun sits in exactly one pack and the packs of a
// level add up to the level.
//
// Rule packs are patterns of the first word. Two kinds:
//   * gender rules (genus "m" or "f"): -zione and -sione → feminine, -ma from Greek → masculine,
//     -o → masculine, -a → feminine. A noun joins one only when its real GENDER matches (the
//     article may be il, lo or l': l'amica is feminine). The nouns that match the ending and
//     break the rule (la mano, il pianeta) are exceptions: what a rule pack must never teach, and
//     together the "Exceptions" pack (id "ausnahmen").
//   * sound rules (`starts`: a regex on the first word): l' before a vowel, lo before z-,
//     s+consonant, gn-, ps-. The article follows from the sound, not from the gender
//     (`onlyGenus: "m"` keeps feminine nouns out of the lo rule: la zia, la scuola).
//     They never produce exceptions.
//
// Also importable from plain `node`, like lexicon.js: scripts can print the stats.
import { withArticle } from "./articles.js";
import config from "../data/artikel-packs.json" with { type: "json" };
export const PACK_CONFIG = config;
/** m or f, from the article (l' carries it in `genus`); null for il/la nouns that take both. */
export const genusOf = (n) => (n.genus === "m" || n.genus === "f" ? n.genus : n.gender === "la" ? "f" : n.gender === "il" || n.gender === "lo" ? "m" : null);
/** Does the noun follow this rule? Gender rules compare the gender, sound rules the article itself. */
export const ruleHolds = (rule, noun) => (rule.genus ? genusOf(noun) === rule.genus : rule.article === noun.gender);
const LEVELS = ["A1", "A2", "B1", "B2"];

const topicPackOf = new Map();
for (const pack of config.topics) for (const t of pack.topics) topicPackOf.set(t, pack.id);

/** The one topic pack a noun belongs to, or null if none of its topics is mapped. */
export function topicPackFor(noun) {
  for (const t of noun.topics ?? []) {
    const id = topicPackOf.get(t);
    if (id) return id;
  }
  return null;
}

/** The word that decides the article: la carta d'identità, il codice fiscale. */
export const headWord = (lemma) => lemma.split(" ")[0].toLowerCase();

/**
 * Which rule a noun's form points at, whatever its real article: `{ rule, why }`, or null
 * when no pattern applies. `why` names the matched pattern, for the exception list.
 */
export function ruleMatch(noun) {
  // il CAP, la TARI: an acronym takes the article of the word behind it, not of its last letter.
  if (/^\p{Lu}{2,}/u.test(noun.lemma) || config.noRule?.includes(noun.lemma)) return null;
  const L = headWord(noun.lemma);
  for (const r of config.rules) {
    if (r.onlyGenus && genusOf(noun) !== r.onlyGenus) continue;
    if (r.starts) {
      const m = L.match(new RegExp(r.starts));
      if (m) return { rule: r, why: r.why ?? `${m[0]}-` };
      continue;
    }
    if (r.names?.includes(L)) return { rule: r, why: "-ma" };
    const suffix = r.suffixes?.find((x) => L.endsWith(x));
    if (suffix) return { rule: r, why: `-${suffix}` };
  }
  return null;
}

/**
 * Every pack for every level, from the trainer's noun pool.
 * @param {Array} lexNouns  lexicon nouns with `gender` (A1–B2)
 */
export function buildArtikelPacks(lexNouns) {
  const nounTopic = {};
  const nounRule = {};
  const exceptions = [];

  for (const n of lexNouns) {
    nounTopic[n.id] = topicPackFor(n);
    const m = ruleMatch(n);
    if (!m) continue;
    if (ruleHolds(m.rule, n)) nounRule[n.id] = m.rule.id;
    else if (!m.rule.starts) exceptions.push({ id: n.id, level: n.level, lemma: n.lemma, gender: n.gender, rule: m.rule.id, ruleArticle: m.rule.article, why: m.why });
  }

  const byLevel = {};
  for (const [i, level] of LEVELS.entries()) {
    const here = lexNouns.filter((n) => n.level === level);
    const topics = config.topics
      // `levels` renames a pack per level: the same lexicon topic holds other nouns at A2.
      .map((p) => ({ id: p.id, name: p.levels?.[level]?.name ?? p.name, icon: p.levels?.[level]?.icon ?? p.icon, ids: here.filter((n) => nounTopic[n.id] === p.id).map((n) => n.id) }))
      .filter((p) => p.ids.length >= config.minPack);
    // A rule is taught with every noun up to this level: a B1 learner still meets the A1 words.
    const upTo = new Set(LEVELS.slice(0, i + 1));
    const reach = lexNouns.filter((n) => upTo.has(n.level));
    const rules = config.rules
      .map((r) => ({
        id: r.id, article: r.article, name: r.name, rule: r.rule, ruleLeicht: r.ruleLeicht, min: r.min,
        ids: reach.filter((n) => nounRule[n.id] === r.id).map((n) => n.id),
      }))
      // `min` lets a small but useful rule through (el + stressed a- has few nouns).
      .filter((r) => r.ids.length >= (r.min ?? config.minPack));
    const exc = exceptions.filter((e) => upTo.has(e.level));
    if (exc.length >= 5) {
      rules.push({
        id: "ausnahmen", article: null, name: "Exceptions",
        rule: "These words look as if a rule applies, and break it: il pianeta, il poeta, la mano, la foto. Learn them one by one.",
        ruleLeicht: "These words do not follow the rule. Learn each word with its article: il, lo, la or l'.",
        ids: exc.map((e) => e.id),
      });
    }
    byLevel[level] = { topics, rules };
  }

  return { byLevel, nounTopic, nounRule, exceptions };
}

/** Two or three real examples for a rule's intro card, from the nouns of its pack. */
export function ruleExamples(pack, pool, n = 3) {
  const byId = new Map(pool.map((q) => [q.id, q]));
  return pack.ids.slice(0, n).map((id) => byId.get(id)).filter(Boolean).map((q) => withArticle(q.answer, q.lemma));
}
