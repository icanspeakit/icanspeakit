// The Stundenplan generator (/lehrkraefte/stundenplan): one block of the course plan
// (src/data/kursinhalte.json) → N lessons of M minutes, each split into timed phases with
// an activity and links to what the site has for it. No AI and no randomness: the same
// block, number of lessons and length always give the same plan, so a link to it can be
// shared. Pure functions; the page resolves the links at build time and runs build() in
// the browser.

/**
 * Grammar strings of the course plan → grammar topic pages (keys of grammarCatalog).
 * Written by hand on purpose: the plan's wording ("Perfekt mit haben und sein") and the
 * topic names ("Perfekt: haben oder sein") rarely match word for word. First the specific
 * patterns, then the general ones; a string may hit several topics. grammarKeys() keeps
 * topics up to one level above the block: the site files some topics a level later than
 * the course teaches them (Perfekt is A2 there, A1.2 here), but a B1 group should not be
 * sent to the C1 page on "Nominalstil".
 */
const GRAMMAR_RULES = [
  [/subjektiv/i, ["subjektive-modalverben"]],
  [/Passiv-Ersatz|Passiv-Alternativen|Passivumschreib|sich lassen/, ["passiversatz"]],
  [/Passiv/, ["passiv", "zustandspassiv"]],
  [/Plusquamperfekt|Präteritum/, ["praeteritum-plusquamperfekt"]],
  [/\bPerfekt\b|Partizip II/, ["perfekt"]],
  [/Futur II/, ["futur-2"]],
  [/Futur I\b/, ["futur"]],
  [/als ob|als wenn/, ["irreale-vergleiche"]],
  [/Konjunktiv I\b|indirekte Rede|Redewiedergabe/i, ["konjunktiv-1"]],
  [/Konjunktiv II|Höflichkeitsform|Ratschläge|hätte|würde/, ["konjunktiv2"]],
  [/Personalpronomen/, ["personalpronomen"]],
  [/Possessivartikel/, ["possessivartikel"]],
  [/Präsens|Vokalwechsel|Regelmäßige Verben|^Verb haben/, ["praesens", "konjugation"]],
  [/W-Fragen/, ["w-fragen"]],
  [/Ja\/Nein/, ["ja-nein-fragen"]],
  [/Plural/, ["plural"]],
  [/Artikel der, die, das/, ["artikel"]],
  [/ein \/ kein|Verneinung|nicht \/ kein/, ["negation", "artikel-oder-nicht"]],
  [/Akkusativ/, ["akkusativ"]],
  [/Dativ/, ["dativ"]],
  [/Genitiv: aufgrund|Genitiv: zwecks|mit Genitiv/, ["nominale-praepositionen", "genitiv"]],
  [/Genitiv/, ["genitiv"]],
  [/Trennbare/, ["trennbare-verben"]],
  [/Zeitangaben|im, am, um|am, um/, ["temporale-praepositionen"]],
  [/^Modalverb|Präteritum der Modalverben|^möchten$|mit Modalverben \(hätte/, ["modalverben"]],
  [/Imperativ/, ["imperativ"]],
  [/und, aber, oder, denn/, ["aduso"]],
  [/Komparativ|Superlativ|Vergleiche mit als|je … desto/, ["komparativ-superlativ"]],
  [/Wechselpräpositionen|Positionsverben/, ["wechselpraepositionen"]],
  [/Präpositionen für Richtungen|Präpositionen mit Dativ|Ortsangaben/, ["lokale-praepositionen"]],
  [/weil und dass|wenn \(Bedingung\)/, ["nebensaetze-weil-dass"]],
  [/deshalb|trotzdem|obwohl|zwar … aber|Konzessive/, ["konnektoren-grund-gegengrund"]],
  [/Reflexive/, ["reflexive-verben"]],
  [/wo\(r\)-|da\(r\)-/, ["da-wo-woerter"]],
  [/Verben mit Präpositionen|Verben mit präpositionalen/, ["verben-praepositionen"]],
  [/Adjektive mit Präpositionen/, ["adjektive-mit-praepositionen"]],
  [/Adjektivendungen in allen/, ["adjektivdeklination"]],
  [/Adjektivendungen/, ["adjektivdeklination-a2"]],
  [/Indirekte Fragen/, ["indirekte-fragen"]],
  [/wenn und als/, ["als-oder-wenn"]],
  [/Relativsätze mit wo, was, wer/, ["relativsaetze-was-wo"]],
  [/Relativ/, ["relativpronomen"]],
  [/um … zu|damit/, ["finalsaetze"]],
  [/Infinitiv mit zu|Infinitivsätze|zu \(Es ist|brauchen … zu/, ["infinitiv-mit-zu"]],
  [/nachdem|bevor|seitdem|sobald|während/, ["temporale-nebensaetze"]],
  [/^lassen/, ["lassen"]],
  [/n-Deklination/, ["n-deklination"]],
  [/Zweiteilige Konnektoren|einerseits/, ["zweiteilige-konnektoren"]],
  [/Konnektoren und Nebensätze/, ["konnektoren-grund-gegengrund", "nebensaetze-weil-dass", "temporale-nebensaetze"]],
  [/Partizipialattribut/, ["partizipialattribute"]],
  [/Partizip I und II als Adjektiv|Partizipien als Nomen/, ["partizip-als-adjektiv"]],
  [/Nominalstil|Nominalisierung|Nomen aus Verben/, ["nominalisierung", "verben-als-nomen"]],
  [/Nomen-Verb|Funktionsverbgefüge/, ["nomen-verb-verbindungen"]],
  [/Modalpartikeln/, ["modalpartikeln"]],
  [/Präfixe/, ["verbpraefixe"]],
  [/Verb auf Position 2|Zeitangabe auf Position 1/, ["verb-position-2"]],
  [/Satzbau|Position 2|Position 1/, ["satzstellung"]],
  [/Ordnungszahlen/, ["ordinalzahlen"]],
  [/welch-/, ["welcher-dieser"]],
  [/Verb werden/, ["funktionen-von-werden"]],
  [/Vermutungen/, ["futur", "subjektive-modalverben"]],
  [/Mengenangaben/, ["artikel-oder-nicht"]],
  [/^Zahlen bis/, ["zahlen"]],
  [/Adjektive nach sein/, ["adjektive-nach-sein"]],
  [/^gern\b/, ["gern"]],
  [/Präteritum von sein und haben/, ["praeteritum-sein-haben"]],
  [/Berufe mit -in/, ["berufe-mit-in"]],
  [/Indefinitpronomen/, ["indefinitpronomen"]],
  [/falls|sofern/, ["konditionalsaetze"]],
  [/sodass|folglich|infolgedessen/, ["konsekutivsaetze"]],
  [/zumal|wohingegen|insofern/, ["zumal-wohingegen"]],
  [/indem|dadurch dass/, ["modalsaetze"]],
  [/Textkohärenz|Verweiswörter/, ["textkohaerenz"]],
  [/Höfliche Bitten|Höflichkeitsform|Ratschläge|würde \+ Infinitiv/, ["konjunktiv2-hoeflich"]],
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
 * A YouTube search for explainer videos on one grammar line, e.g. "Deutsch A1
 * Personalpronomen". A search, not a fixed video: it never goes dead and always offers
 * several explanations to pick from.
 */
export function videoSearch(name, level) {
  const q = `Deutsch ${level} ${name} erklärt`;
  return { name: `Video: ${name}`, href: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, ext: true };
}

/** An exam line of the plan → the page with that exam's practice sets. */
export function examHref(text) {
  if (/DTZ/.test(text)) return "/dtz";
  if (/telc/i.test(text)) return "/telc";
  if (/Goethe/.test(text)) return "/goethe";
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
  einstieg: "Einstieg", wortschatz: "Wortschatz", grammatik: "Grammatik", uebung: "Üben",
  anwendung: "Anwenden", pruefung: "Prüfungstraining", test: "Kurztest", abschluss: "Abschluss",
};

/**
 * The Sozialform of an activity, read off its text, for the plan's table column:
 * EA Einzelarbeit, PA Partnerarbeit, GA Gruppenarbeit, PL Plenum. Several when the
 * activity moves between them ("Einzelarbeit …, danach Vergleich in Paaren" → EA, PA).
 */
export function socialForm(text) {
  const t = text.replace(/„[^“]*“/g, ""); // not the quoted topics and goals ("… an Nachbarn")
  const forms = [];
  if (/Einzelarbeit|jede Person am Handy|Hausaufgabe|Kurzer Text|kurzer Text|Lückensätze/.test(t)) forms.push("EA");
  if (/in Paaren|zu zweit|Kugellager|mit dem Nachbarn|Partner/.test(t)) forms.push("PA");
  if (/Kleingruppe/.test(t)) forms.push("GA");
  if (/Plenum|Gruppe|Tafel|Reihum|Jede Person (nennt|sagt)|Kurz erklären/.test(t)) forms.push("PL");
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
const quote = (s) => `„${s}“`;
// "Perfekt mit haben und sein (gestern)" → "Perfekt mit haben und sein": the examples in
// brackets are for the course page; in running text they make sentences unreadable.
const short = (g) => g.replace(/\s*\([^)]*\)/g, "").trim();
const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs.at(-1)}`);

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
  const quiz = { name: "Live-Quiz starten", href: "/lehrkraefte/quiz" };
  const test = { name: "Thementest per QR-Code", href: "/lehrkraefte/tests" };

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
        ? ["einstieg.wiederholung", `Wiederholung: Die Lernenden erklären sich in Paaren gegenseitig ${andList(block.grammatik.slice(0, 2).map(short).map(quote))} mit je einem eigenen Beispielsatz.`]
        : prev
          ? v([
              ["einstieg.blitzlicht", `Blitzlicht: Jede Person sagt einen Satz mit ${prev.focus}. Fehler sammelst du kommentarlos an der Tafel und besprichst sie danach.`],
              ["einstieg.dreifragen", `Drei Fragen zur letzten Stunde (${prev.focus}), mündlich im Plenum. Dann ein Satz zum heutigen Ziel.`],
            ], i)
          : v([
              ["einstieg.wortigel", `Frage an die Gruppe: Was fällt euch zum Thema ${quote(thema)} ein? Sammelt Wörter an der Tafel (Wortigel).`],
              ["einstieg.bildimpuls", `Bildimpuls: Zeig ein Foto zum Thema ${quote(thema)}. Die Lernenden beschreiben in Paaren, was sie sehen.`],
            ], thema.length),
      wortschatz: i === 0
        ? ["wortschatz.einfuehren", `Neue Wörter einführen: ${block.wortschatz.join(", ")}. Mit Bildern oder Gesten erklären; Artikel und Plural an die Tafel.`]
        : v([
            ["wortschatz.erklaeren", `Wörter wiederholen (${block.wortschatz.join(", ")}): Wörter erklären in Paaren – eine Person erklärt, ohne das Wort zu sagen.`],
            ["wortschatz.kette", `Wortschatz-Kette: Reihum ein Satz mit einem Wort aus ${block.wortschatz.slice(0, 3).join(", ")} …; wer stockt, bekommt Hilfe aus der Gruppe.`],
          ], i),
      grammatik: repeat
        ? ["grammatik.vertiefung", `Vertiefung: ${andList(gNames.map(quote))}. Typische Fehler aus der letzten Stunde an die Tafel; die Gruppe korrigiert gemeinsam.`]
        : v([
            ["grammatik.entdecken", `Regel entdecken: Zeig 4–5 Beispielsätze zu ${andList(gNames.map(quote))}. Die Lernenden finden das Muster selbst, dann haltet ihr die Regel an der Tafel fest.`],
            ["grammatik.erklaeren", `Kurz erklären (höchstens 10 Minuten), dann gelenkte Übung zu ${andList(gNames.map(quote))}: erst Lückensätze, dann eigene Sätze.`],
          ], i),
      uebung: v([
        ["uebung.einzelarbeit", `Einzelarbeit online: Übungen auf der Themenseite, danach Vergleich in Paaren.`],
        ["uebung.partner", `Partnerübung: Auf der Themenseite „Als Partnerübung“ wählen; zu zweit fragen und antworten.`],
        ["uebung.livequiz", `Live-Quiz mit der ganzen Gruppe (QR-Code): kurze Fragen zu ${andList(gNames.map(quote))}.`],
      ], i),
      anwendung: final
        ? ["anwendung.block", `Anwenden, was der Block verspricht: ${goals.map(quote).join(" ")} – Rollenspiel in Paaren oder ein kurzer Text (6–8 Sätze), danach zwei, drei Beispiele im Plenum.`]
        : (([id, task]) => [id, `Lernziel ${goals.map(quote).join(" ")} – ${task}.`])(v([
            ["anwendung.rollenspiel", "Rollenspiel in Paaren"],
            ["anwendung.kugellager", "Kugellager (Innen- und Außenkreis), zwei Runden"],
            ["anwendung.text", "Kurzer Text: 5–6 Sätze, danach Austausch mit dem Nachbarn"],
          ], i)),
      pruefung: ["pruefung", exam.length
        ? `Prüfungstraining: ${exam.join(" · ")}. Mit Zeitlimit wie in der Prüfung, danach die Lösungen besprechen.`
        : ""],
      test: ["test", `Kurztest per QR-Code zu ${andList(block.grammatik.slice(0, 3).map(short).map(quote))}: jede Person am Handy, du siehst die Ergebnisse pro Person.`],
      abschluss: final
        ? ["abschluss.rueckblick", `Rückblick: Was kann ich jetzt? Jede Person nennt ein Lernziel, das sie erreicht hat, und eins, das sie noch üben will.`]
        : ["abschluss.hausaufgabe", `Hausaufgabe: Übungen zu ${andList(gNames.map(quote))} auf der Themenseite${links.words ? " und die Wortliste wiederholen" : ""}.`],
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
      focus: final ? "Anwenden und Wiederholen" : andList(gNames),
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
