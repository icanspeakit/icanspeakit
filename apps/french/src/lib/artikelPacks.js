// The packs of the le / la trainer ("By topic" and "By rule"), worked out at build time from the
// lexicon and src/data/artikel-packs.json.
//
// Topic packs group the lexicon's own unit topics. A noun can carry more than one topic; it
// belongs to the pack of its first, so every noun sits in exactly one pack and the packs of a
// level add up to the level.
//
// Rule packs are gender patterns: the ending of the noun's first word (-tion → la, -age → le). A
// noun joins one only when it matches the pattern AND its real gender is the pack's (an elided
// noun, l'école, counts by its genus and is asked with un / une: generoDrill.js). The ones that
// match and break the rule (la plage, le musée, l'eau) are returned as exceptions: they are what a
// rule pack must never teach, and together they make the "Exceptions" pack (id "ausnahmen").
//
// Also importable from plain `node`, like lexicon.js — scripts can print the stats.
import config from "../data/artikel-packs.json" with { type: "json" };
import { drillChoice, drillGenus } from "./generoDrill.js";
export const PACK_CONFIG = config;
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

/** The word that decides the article: la carte de séjour, le permis de conduire. */
export const headWord = (lemma) => lemma.split(" ")[0].toLowerCase();

/**
 * Which rule a noun's form points at, whatever its real article: `{ rule, why }`, or null
 * when no pattern applies. `why` names the matched pattern, for the exception list.
 */
export function ruleMatch(noun) {
  // la CAF, le RIB: an acronym takes the article of the word behind it, not of its last letters.
  if (/^\p{Lu}{2,}/u.test(noun.lemma) || config.noRule?.includes(noun.lemma)) return null;
  const L = headWord(noun.lemma);
  // le porte-monnaie, le rez-de-chaussée: a compound's gender comes from how it is built, not
  // from the ending of its last part.
  if (L.includes("-")) return null;
  for (const r of config.rules) {
    if (r.names?.includes(L)) return { rule: r, why: r.name };
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
    const ruleGenus = m.rule.article === "la" ? "f" : "m";
    if (ruleGenus === drillGenus(n)) { nounRule[n.id] = m.rule.id; continue; }
    // What the learner is asked: le / la, or un / une for an elided noun (the rule then says
    // "usually une", "it takes un").
    const { answer, kind } = drillChoice(n) ?? { answer: n.gender, kind: "def" };
    const ruleArticle = kind === "indef" ? (ruleGenus === "f" ? "une" : "un") : m.rule.article;
    exceptions.push({ id: n.id, level: n.level, lemma: n.lemma, gender: answer, rule: m.rule.id, ruleArticle, why: m.why });
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
      // `min` lets a small but useful rule through (-ée, -isme, -oir have few nouns).
      .filter((r) => r.ids.length >= (r.min ?? config.minPack));
    const exc = exceptions.filter((e) => upTo.has(e.level));
    if (exc.length >= 5) {
      rules.push({
        id: "ausnahmen", article: null, name: "Exceptions",
        rule: "These words look as if a rule applies, and break it: la plage, le musée, le lycée, la peau, une eau (l'eau). Learn them one by one.",
        ruleLeicht: "These words do not follow the rule. Learn each word with le or la.",
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
  return pack.ids.slice(0, n).map((id) => byId.get(id)).filter(Boolean).map((q) => q.change ?? `${q.answer} ${q.lemma}`);
}
