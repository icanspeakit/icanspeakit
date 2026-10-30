// The Stundenplan generator (/lehrkraefte/stundenplan): one block of the course plan
// (src/data/kursinhalte.json) → N lessons of M minutes, each split into timed phases with
// an activity and links to what the site has for it. No AI and no randomness: the same
// block, number of lessons and length always give the same plan, so a link to it can be
// shared. Pure functions; the page resolves the links at build time and runs build() in
// the browser.

/**
 * Grammar strings of the course plan → grammar topic pages (keys of grammarCatalog).
 * Written by hand on purpose: the plan's wording ("Present perfect: for and since") and the
 * topic names ("Present perfect vs past simple") rarely match word for word. First the
 * specific patterns, then the general ones; a string may hit several topics. grammarKeys()
 * keeps topics up to one level above the block: the site files some topics a level later
 * than the course teaches them (the present perfect is B1 there, A2.1 here), but a B1 group
 * should not be sent to the C1 page on "Nominalisation".
 */
const GRAMMAR_RULES = [
  [/Modal perfects|should have|must have/, ["subjektive-modalverben"]],
  [/Distancing|distancing|is said to|It is said that|it is said that/, ["konjunktiv-1"]],
  [/Inversion/, ["passiversatz"]],
  [/Cleft/, ["es-korrelat"]],
  [/Future continuous|future perfect/, ["futur-2"]],
  [/Unreal past|as if/, ["irreale-vergleiche"]],
  [/Third conditional|\bwish\b/, ["konjunktiv2"]],
  [/Second conditional|first conditional|conditionals/, ["konditionalsaetze"]],
  [/passive: present simple|passive: present and past/, ["passiv-b1"]],
  [/[Pp]assive/, ["passiv"]],
  [/Narrative tenses|past continuous|past perfect/, ["praeteritum-plusquamperfekt"]],
  [/Present perfect continuous/, ["zustandspassiv"]],
  [/Present perfect(?! continuous)/, ["zusammengesetzte-verben"]],
  [/used to/, ["n-deklination"]],
  [/Past of be/, ["praeteritum-sein-haben"]],
  [/Past simple/, ["perfekt"]],
  [/Future forms|going to|will for predictions/, ["futur"]],
  [/[Pp]resent continuous/, ["konjugation"]],
  [/Present simple/, ["praesens"]],
  [/Subject pronouns|be: am, is, are/, ["personalpronomen"]],
  [/Object pronouns/, ["akkusativ"]],
  [/Possessive/, ["possessivartikel"]],
  [/Wh- questions/, ["w-fragen"]],
  [/Yes\/no questions|Short answers/, ["ja-nein-fragen"]],
  [/Word order/, ["verb-position-2"]],
  [/Plural/, ["plural"]],
  [/Articles: a, an, the|^a \/ an/, ["artikel"]],
  [/the or no article/, ["artikel-oder-nicht"]],
  [/There is \/ there are/, ["berufe-mit-in"]],
  [/Adjectives after be/, ["adjektive-nach-sein"]],
  [/Numbers up to|Telling the time/, ["zahlen"]],
  [/Ordinal numbers/, ["ordinalzahlen"]],
  [/this, that, these, those|this \/ that/, ["welcher-dieser"]],
  [/like \/ love \/ hate/, ["gern"]],
  [/Imperatives/, ["imperativ"]],
  [/Prepositions of time/, ["temporale-praepositionen"]],
  [/for and since|for, since, during/, ["temporale-praepositionen-b1"]],
  [/and, but, or, so/, ["aduso"]],
  [/Prepositions of place and movement/, ["wechselpraepositionen"]],
  [/Prepositions of place/, ["lokale-praepositionen"]],
  [/Adverbs of frequency/, ["positionsadverbien"]],
  [/Adverbs of manner/, ["adjektivdeklination-a2"]],
  [/[Cc]omparatives|[Ss]uperlatives|as … as/, ["komparativ-superlativ"]],
  [/can for ability|must and have to|have to \/ don't have to|should for advice|should and shouldn't|could \/ couldn't/, ["modalverben"]],
  [/Polite requests|Suggestions/, ["konjunktiv2-hoeflich"]],
  [/some, any|somebody, nothing/, ["indefinitpronomen"]],
  [/Countable and uncountable|much, many|How much \/ how many/, ["satzstellung"]],
  [/questions and negatives/, ["negation"]],
  [/Two objects/, ["dativ"]],
  [/because, so and that/, ["nebensaetze-weil-dass"]],
  [/Reflexive pronouns|each other/, ["reflexive-verben"]],
  [/Phrasal verbs/, ["trennbare-verben"]],
  [/Reported speech|reported speech/, ["funktionen-von-werden"]],
  [/Indirect questions/, ["indirekte-fragen"]],
  [/-ing or to/, ["infinitiv-mit-zu"]],
  [/Gerunds/, ["verben-als-nomen"]],
  [/make, let, help/, ["infinitiv-ohne-zu"]],
  [/have something done/, ["lassen"]],
  [/Purpose/, ["finalsaetze"]],
  [/Time clauses|time clauses/, ["temporale-nebensaetze"]],
  [/when or if/, ["als-oder-wenn"]],
  [/Contrast|although/, ["konnektoren-grund-gegengrund"]],
  [/'s or of/, ["genitiv"]],
  [/Order of adjectives/, ["adjektivdeklination"]],
  [/-ed and -ing adjectives/, ["partizip-als-adjektiv"]],
  [/Verbs \+ prepositions/, ["verben-praepositionen"]],
  [/Prepositions at the end/, ["da-wo-woerter"]],
  [/make or do/, ["nutzen-benutzen"]],
  [/Confusing verbs/, ["positionsverben"]],
  [/Noun suffixes/, ["wortbildung-nomen"]],
  [/Defining relative clauses/, ["relativpronomen"]],
  [/Non-defining relative|Relative clauses: whose, where/, ["relativsaetze-was-wo"]],
  [/Modals of deduction/, ["modalsaetze"]],
  [/so … that|such … that|too, enough/, ["konsekutivsaetze"]],
  [/Paired conjunctions/, ["zweiteilige-konnektoren"]],
  [/Formal linkers|whereas|Review: distancing and linkers/, ["zumal-wohingegen"]],
  [/Negative words/, ["negationswoerter"]],
  [/-ever words/, ["irgend"]],
  [/Focus adverbs/, ["fokuspartikeln"]],
  [/Discourse markers/, ["modalpartikeln"]],
  [/Adjectives \+ prepositions/, ["adjektive-mit-praepositionen"]],
  [/[Cc]ollocations/, ["nomen-verb-verbindungen"]],
  [/Formal prepositions/, ["nominale-praepositionen"]],
  [/Nominalisation|nominalisation|formal style/, ["nominalisierung"]],
  [/Participle clauses/, ["partizipialattribute"]],
  [/Cohesion/, ["textkohaerenz"]],
  [/Verb prefixes/, ["verbpraefixe"]],
  [/Review: linkers/, ["konnektoren-grund-gegengrund", "temporale-nebensaetze"]],
  [/Linkers for arguments/, ["konnektoren-grund-gegengrund"]],
  [/Reporting and distancing/, ["konjunktiv-1"]],
];

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
/** "B2.1" → "B2". */
export const cefrOf = (label) => label.slice(0, 2);

/**
 * The topic keys for one grammar string: topics that exist, at most one level above `level`.
 * @param {string} text
 * @param {string} level  CEFR level of the block, e.g. "B1"
 * @param {(key: string) => { level: string } | null} lookup  grammarByKey
 */
export function grammarKeys(text, level, lookup) {
  const max = CEFR.indexOf(level) + 1;
  const keys = GRAMMAR_RULES.filter(([re]) => re.test(text)).flatMap(([, ks]) => ks);
  return [...new Set(keys)].filter((k) => {
    const t = lookup(k);
    return t && CEFR.indexOf(t.level) <= max;
  });
}

/**
 * A YouTube search for explainer videos on one grammar line, e.g. "English grammar A1
 * Subject pronouns". A search, not a fixed video: it never goes dead and always offers
 * several explanations to pick from.
 */
export function videoSearch(name, level) {
  const q = `English grammar ${level} ${name} explained`;
  return { name: `Video: ${name}`, href: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, ext: true };
}

/** An exam line of the plan → the page with that exam's practice sets. */
export function examHref(text) {
  // The exam pages keep their old slots until the routes run (docs/content-plan.md §2):
  // Trinity ISE = /telc, Cambridge English = /goethe, IELTS = /testdaf.
  if (/Trinity/.test(text)) return "/telc";
  if (/Cambridge/.test(text)) return "/goethe";
  if (/IELTS/.test(text)) return "/testdaf";
  return null;
}

// Phase shares of a lesson. Rounded to 5 minutes; the remainder goes to the largest phase.
const REGULAR = [
  ["einstieg", 0.1], ["wortschatz", 0.2], ["grammatik", 0.3], ["uebung", 0.2], ["anwendung", 0.15], ["abschluss", 0.05],
];
const FINAL = [
  ["einstieg", 0.15], ["anwendung", 0.35], ["pruefung", 0.25], ["test", 0.2], ["abschluss", 0.05],
];
const FINAL_NO_EXAM = [
  ["einstieg", 0.15], ["anwendung", 0.45], ["test", 0.3], ["abschluss", 0.1],
];
export const PHASE_NAMES = {
  einstieg: "Warm-up", wortschatz: "Vocabulary", grammatik: "Grammar", uebung: "Practice",
  anwendung: "Apply", pruefung: "Exam practice", test: "Short test", abschluss: "Wrap-up",
};

/**
 * The social form of an activity, read off its text, for the plan's table column
 * (codes kept from the German original: EA solo work, PA pair work, GA group work,
 * PL whole class). Several when the activity moves between them
 * ("Solo work …, then compare in pairs" → EA, PA).
 */
export function socialForm(text) {
  const t = text.replace(/“[^”]*”/g, ""); // not the quoted topics and goals ("… with your neighbour")
  const forms = [];
  if (/Solo work|on their phone|Homework|Short text|gap sentences/.test(t)) forms.push("EA");
  if (/in pairs|inner and outer circle|with your neighbour|[Pp]artner/.test(t)) forms.push("PA");
  if (/small group/.test(t)) forms.push("GA");
  if (/whole group|the group|board|in turn|Everyone (names|says)|Explain briefly/.test(t)) forms.push("PL");
  return forms.length ? forms : ["PL"];
}

/** Minutes per phase: multiples of 5 (at least 5), summing to `total`. */
export function split(shares, total) {
  const mins = shares.map(([, s]) => Math.max(5, Math.round((s * total) / 5) * 5));
  let diff = total - mins.reduce((a, b) => a + b, 0);
  const order = mins.map((m, i) => i).sort((a, b) => mins[b] - mins[a]);
  for (let k = 0; diff !== 0 && k < 100; k++) {
    const i = order[k % order.length];
    const step = diff > 0 ? 5 : -5;
    if (mins[i] + step >= 5) { mins[i] += step; diff -= step; }
  }
  return shares.map(([id], i) => ({ id, minutes: mins[i] }));
}

/** Items spread over n slots in order: slot i gets the items whose share falls into it. */
function spread(items, n) {
  const out = Array.from({ length: n }, () => []);
  if (!items.length || !n) return out;
  if (items.length >= n) items.forEach((it, j) => out[Math.floor((j * n) / items.length)].push(it));
  else for (let i = 0; i < n; i++) out[i].push(items[Math.floor((i * items.length) / n)]);
  return out;
}

const pick = (list, i) => list[i % list.length];
const quote = (s) => `“${s}”`;
// "Present perfect (I have been)" → "Present perfect": the examples in
// brackets are for the course page; in running text they make sentences unreadable.
const short = (g) => g.replace(/\s*\([^)]*\)/g, "").trim();
const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/**
 * The plan.
 * @param {{
 *   level: { id: string, label: string },
 *   block: { thema: string, kannZiele: string[], grammatik: string[], wortschatz: string[], pruefung?: string[] },
 *   n: number,            number of lessons (1–6)
 *   minutes: number,      length of one lesson (45, 60, 90 …)
 *   links: {
 *     grammar: Array<Array<{ name: string, href: string }>>,   per grammar string, its topic pages
 *     words?: { name: string, href: string } | null,           the level's Wortliste
 *     game?: { name: string, href: string } | null,            a printable game for the level
 *     videos?: Array<{ name: string, href: string, ext: true }>, free video series for the level
 *   },
 * Links with `ext` go to other sites (YouTube, DW).
 * }} input
 */
export function build({ level, block, n, minutes, links }) {
  const thema = block.thema;
  const exam = block.pruefung ?? [];
  // The last lesson applies what came before — once there are at least two to apply.
  const hasFinal = n >= 2;
  const teach = hasFinal ? n - 1 : 1;
  const grammarIdx = block.grammatik.map((_, j) => j);
  const gPer = spread(grammarIdx, teach);
  const kPer = spread(block.kannZiele, teach);
  const seen = new Set();
  const quiz = { name: "Start a live quiz", href: "/lehrkraefte/quiz" };
  const test = { name: "Topic test by QR code", href: "/lehrkraefte/tests" };

  const lessons = [];
  for (let i = 0; i < n; i++) {
    const final = hasFinal && i === n - 1;
    const gs = final ? grammarIdx : gPer[i];
    const repeat = gs.length > 0 && gs.every((j) => seen.has(j));
    gs.forEach((j) => seen.add(j));
    const gNames = gs.map((j) => short(block.grammatik[j]));
    const gLinks = gs.flatMap((j) => links.grammar[j] ?? []);
    const uniq = [...new Map(gLinks.map((l) => [l.href, l])).values()];
    const goals = final ? block.kannZiele : kPer[i];
    const prev = i > 0 ? lessons[i - 1] : null;

    // Each text with the id of its template (`variant`): the learner's solo version of a
    // phase is written once per template (src/data/lernstunde-texte.json), not per Stunde.
    const v = (list, k) => pick(list, k);
    const parts = {
      einstieg: final
        ? ["einstieg.wiederholung", `Review: in pairs, learners explain ${andList(block.grammatik.slice(0, 2).map(short).map(quote))} to each other, each with an example sentence of their own.`]
        : prev
          ? v([
              ["einstieg.blitzlicht", `Quick round: everyone says one sentence with ${prev.focus}. Collect mistakes on the board without comment and go through them afterwards.`],
              ["einstieg.dreifragen", `Three questions about the last lesson (${prev.focus}), spoken, with the whole group. Then one sentence about today's goal.`],
            ], i)
          : v([
              ["einstieg.wortigel", `Question to the group: What comes to mind when you think of ${quote(thema)}? Collect words on the board (word web).`],
              ["einstieg.bildimpuls", `Photo prompt: show a photo on the topic ${quote(thema)}. Learners describe in pairs what they see.`],
            ], thema.length),
      wortschatz: i === 0
        ? ["wortschatz.einfuehren", `Introduce the new words: ${block.wortschatz.join(", ")}. Explain with pictures or gestures; write a/an/some and the plural on the board.`]
        : v([
            ["wortschatz.erklaeren", `Review the words (${block.wortschatz.join(", ")}): explain words in pairs – one person explains without saying the word.`],
            ["wortschatz.kette", `Word chain: in turn, each person says a sentence with a word from ${block.wortschatz.slice(0, 3).join(", ")} …; anyone who gets stuck is helped by the group.`],
          ], i),
      grammatik: repeat
        ? ["grammatik.vertiefung", `Deeper practice: ${andList(gNames.map(quote))}. Put typical mistakes from the last lesson on the board; the group corrects them together.`]
        : v([
            ["grammatik.entdecken", `Discover the rule: show 4–5 example sentences with ${andList(gNames.map(quote))}. Learners find the pattern themselves, then you write the rule on the board together.`],
            ["grammatik.erklaeren", `Explain briefly (10 minutes at most), then guided practice with ${andList(gNames.map(quote))}: gap sentences first, then their own sentences.`],
          ], i),
      uebung: v([
        ["uebung.einzelarbeit", `Solo work online: exercises on the topic page, then compare in pairs.`],
        ["uebung.partner", `Partner exercise: on the topic page choose “As a partner exercise”; ask and answer in pairs.`],
        ["uebung.livequiz", `Live quiz with the whole group (QR code): short questions on ${andList(gNames.map(quote))}.`],
      ], i),
      anwendung: final
        ? ["anwendung.block", `Apply what the block promises: ${goals.map(quote).join(" ")} – role play in pairs or a short text (6–8 sentences), then two or three examples shared with the whole group.`]
        : (([id, task]) => [id, `Learning goal ${goals.map(quote).join(" ")} – ${task}.`])(v([
            ["anwendung.rollenspiel", "Role play in pairs"],
            ["anwendung.kugellager", "Inner and outer circle, two rounds"],
            ["anwendung.text", "Short text: 5–6 sentences, then swap with your neighbour"],
          ], i)),
      pruefung: ["pruefung", exam.length
        ? `Exam practice: ${exam.join(" · ")}. With a time limit as in the exam, then go through the answers.`
        : ""],
      test: ["test", `Short test by QR code on ${andList(block.grammatik.slice(0, 3).map(short).map(quote))}: everyone on their phone, you see the results per person.`],
      abschluss: final
        ? ["abschluss.rueckblick", `Look back: what can I do now? Everyone names one goal they have reached and one they still want to practise.`]
        : ["abschluss.hausaufgabe", `Homework: exercises on ${andList(gNames.map(quote))} on the topic page${links.words ? " and review the word list" : ""}.`],
    };
    const text = Object.fromEntries(Object.entries(parts).map(([k, [, t]]) => [k, t]));
    const variant = Object.fromEntries(Object.entries(parts).map(([k, [id]]) => [k, id]));

    const material = {
      einstieg: i === 0 ? links.videos ?? [] : [],
      wortschatz: [links.words, i > 0 ? links.game : null].filter(Boolean),
      // `for`: the topic page the video belongs to (the grammar point's first one), so the
      // lesson can show it in that topic's row instead of in a loose list underneath.
      grammatik: [...uniq, ...gs.map((j, k) => ({ ...videoSearch(gNames[k], cefrOf(level.label)), for: links.grammar[j]?.[0]?.href }))],
      uebung: i % 3 === 2 ? [quiz] : uniq,
      anwendung: [],
      pruefung: exam.map((e) => ({ name: e, href: examHref(e) })).filter((l) => l.href),
      test: [test],
      abschluss: final ? [] : [...uniq, links.words].filter(Boolean),
    };

    const shares = final ? (exam.length ? FINAL : FINAL_NO_EXAM) : REGULAR;
    lessons.push({
      n: i + 1,
      final,
      focus: final ? "Use and revise" : andList(gNames),
      // the grammar points one by one (`focus` joins them, and names have commas of their own)
      grammar: gNames,
      goals,
      phases: split(shares, minutes).map((p) => ({
        ...p,
        name: PHASE_NAMES[p.id],
        text: text[p.id],
        variant: variant[p.id],
        social: socialForm(text[p.id]),
        links: material[p.id],
      })),
    });
  }
  return { level: level.label, thema, minutes, lessons };
}

/**
 * The Stunde a lesson session teaches (src/lib/unterricht/), rebuilt from its key, or null
 * when the key no longer fits the course plan. `levels` is what planLevels()
 * (src/lib/stundenplanLinks.js) made at build time.
 */
export function lessonFor(levels, { niveau, block, stunden, stunde, minuten }) {
  const level = levels.find((l) => l.id === niveau);
  const b = level?.blocks[block - 1];
  if (!b || !(stunde >= 1 && stunde <= stunden)) return null;
  const plan = build({ level, block: b, n: stunden, minutes: minuten, links: { grammar: b.grammar, words: level.words, game: level.game, videos: level.videos } });
  return { level, block: b, plan, lesson: plan.lessons[stunde - 1] };
}
