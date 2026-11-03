// What a teacher can assign as an Aufgabe (KLASSEN-TIERED-PROMPT.md, Tier 4), with the name
// and the page a student opens for it. Build time only; served as /klassen-katalog.json,
// so the teacher's picker and the students' "Aufgaben" card fetch it when they need it,
// instead of every visitor of /exercises carrying it in the HTML.
//
// Only exercises that write an uebung_versuche row with a score or a "geübt" mark can be
// assigned, because "done" is computed from those rows: grammar topics, Lernsets, and the
// scored parts of the Goethe/telc sets. Exam writing and speaking parts are left out: the
// engine grades nothing there. The teacher's own live quizzes (q:) come with Tier 6, when
// a game in class writes rows.
import { grammarCatalog } from "./grammarCatalog.js";
import { topicPath } from "./routes.js";
import { chapterList } from "./liveQuiz/chapters.js";
import { saetze, hrefOf, isScored } from "./exam/saetze.js";
import { planLevels } from "./stundenplanLinks.js";
import { cefrOf, lessonFor } from "./stundenplan.js";
import { DEFAULT, stundeHref, stundeRef } from "./unterricht/lernen.js";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export function aufgabenKatalog() {
  const out = [];
  const chapters = chapterList();

  // Grammar: every topic page, plus the quiz chapters that have their own page
  // (Akkusativ) and so are not in the catalog.
  const grammar = new Map(grammarCatalog.map((t) => [t.key, { name: t.name, level: t.level }]));
  for (const c of chapters) if (c.kind === "grammatik" && c.assign !== false && !grammar.has(c.slug.slice(2))) grammar.set(c.slug.slice(2), { name: c.name, level: c.level });
  for (const [key, t] of grammar) out.push({ ref: `g:${key}`, name: t.name, group: `Grammatik ${t.level ?? ""}`.trim(), level: t.level, href: topicPath(key) });

  for (const c of chapters) {
    if (c.kind !== "wortschatz") continue;
    const id = c.slug.slice(2);
    out.push({ ref: `w:${id}`, name: c.name, group: `Wortschatz ${c.level}`, level: c.level, href: `/vocabulary/${id}` });
  }

  for (const set of saetze) {
    // Paid sets (C1) carry only an outline here (parts is a count, no titles); their
    // parts are not listed until the catalog can read them from src/paid/.
    if (set.paid) continue;
    const exam = set.exam === "telc" ? "telc" : "Goethe";
    for (const m of set.modules) {
      for (const p of m.parts) {
        if (!isScored(p)) continue;
        const key = `${m.key}-${p.teil}`;
        out.push({
          ref: `x:${set.exam}/${set.id}/${key}`,
          name: `${m.name} Teil ${p.teil}${p.title ? `: ${p.title}` : ""}`,
          group: `${exam} ${set.level?.toUpperCase?.() ?? ""} · ${set.title}`,
          level: set.level?.toUpperCase?.(),
          href: `${hrefOf(set)}#${key}`,
        });
      }
    }
  }

  // Stunden of the Stundenplan, walked alone on /lesson (SCHUELER-STUNDE Tier 3): a block as a
  // self-learner gets it, 3 Stunden × 90 min. A teacher's own plan (another count or length)
  // is assigned from /teachers/timetable with its exact key. Done = the Stunde finished
  // (lernseite.js logs one attempt with this ref).
  const levels = planLevels();
  for (const level of levels) {
    level.blocks.forEach((b, bi) => {
      for (let n = 1; n <= DEFAULT.stunden; n++) {
        const key = { niveau: level.id, block: bi + 1, stunden: DEFAULT.stunden, stunde: n, minuten: DEFAULT.minuten };
        const lesson = lessonFor(levels, key)?.lesson;
        if (!lesson) continue;
        out.push({
          ref: stundeRef(key),
          name: `Stunde ${n}: ${lesson.final ? "Anwenden und Wiederholen" : lesson.focus}`,
          group: `Stunden ${level.label} · Block ${bi + 1}: ${b.thema}`,
          level: cefrOf(level.label),
          href: stundeHref(key),
        });
      }
    });
  }

  const rank = (e) => [e.ref.startsWith("st:") ? 3 : e.ref[0] === "x" ? 2 : e.ref[0] === "w" ? 1 : 0, LEVELS.indexOf(e.level)];
  return out.sort((a, b) => {
    const [ka, la] = rank(a), [kb, lb] = rank(b);
    return ka - kb || la - lb || a.group.localeCompare(b.group, "de");
  });
}

