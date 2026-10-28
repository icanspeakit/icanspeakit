// Ref → the item it names, today (PROBLEM-MELDEN-QA-TIERED-PROMPT.md, Tier 5).
//
//   resolveRef("k:pfand/q3") → { datei, text, loesung, fingerprint } | null
//
// Reads the data files the way the engines and scripts/check-inhalte.mjs do, and computes the
// fingerprint with src/lib/meldungRef.js, so a report's stored fingerprint can be compared with
// the item as it is now ("schon geändert?"). Node only.
import fs from "node:fs";
import path from "node:path";
import { cleanRef, fingerprint, grammarItems, exerciseFingerprint, itemFingerprint } from "../../src/lib/meldungRef.js";
import { byId as lexiconWord } from "../../src/lib/lexicon.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const DATA = path.join(ROOT, "src", "data");
const cache = new Map();
const read = (rel) => {
  if (!cache.has(rel)) cache.set(rel, JSON.parse(fs.readFileSync(path.join(DATA, rel), "utf8")));
  return cache.get(rel);
};
const exists = (rel) => fs.existsSync(path.join(DATA, rel));
const qIndex = (s) => (/^q(\d+)$/.test(s ?? "") ? Number(s.slice(1)) - 1 : -1);
const norm = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const quizItem = (datei, q) => (q ? { datei: `src/data/${datei}`, text: norm(q.prompt), loesung: norm(q.answer), fingerprint: itemFingerprint(q) } : null);

function grammar(datei, data, exPart, itemPart) {
  const ex = data.exercises?.[Number(exPart) - 1];
  if (!ex) return null;
  if (itemPart == null) return { datei, text: `${ex.title ?? ""} (${ex.type})`, loesung: "", fingerprint: exerciseFingerprint(ex) };
  const it = grammarItems(ex).find((x) => String(x.part) === String(itemPart));
  return it ? { datei, text: norm(it.prompt), loesung: norm(Array.isArray(it.answer) ? it.answer.join(" / ") : it.answer), fingerprint: fingerprint(it.prompt, it.answer) } : null;
}

/** @param {string} raw */
export function resolveRef(raw) {
  const ref = cleanRef(raw);
  if (!ref) return null;
  const [prefix, rest] = [ref.slice(0, ref.indexOf(":")), ref.slice(ref.indexOf(":") + 1)];
  const p = rest.split("/");
  try {
    switch (prefix) {
      case "g": {
        if (p[0] === "quiz") {
          const t = read("grammatik.json").find((x) => x.id === p[1]);
          return quizItem("grammatik.json", t?.questions?.[qIndex(p[2])]);
        }
        if (p[0] === "akkusativ" && p[1]) return quizItem("akkusativ.json", read("akkusativ.json").find((q) => cleanRef(`g:akkusativ/${q.id}`) === ref));
        if (p[0] === "praepositionen" && p[1]) {
          for (const pack of read("praepositionen-trainer.json").packs) {
            const q = (pack.questions ?? []).find((x) => cleanRef(`g:praepositionen/${x.id}`) === ref);
            if (q) return quizItem("praepositionen-trainer.json", q);
          }
          return null;
        }
        if (p[0] === "artikel") return { datei: "src/content/lexicon/*.json", text: p[1], loesung: "", fingerprint: null };
        const file = `grammatik/${p[0]}.json`;
        if (!exists(file)) return null;
        // C1: items live in src/paid/grammatik/ and are merged over the free file at runtime.
        const paidPath = path.join(ROOT, "src", "paid", file);
        if (fs.existsSync(paidPath)) {
          const paid = JSON.parse(fs.readFileSync(paidPath, "utf8"));
          const merged = { ...read(file), exercises: (read(file).exercises ?? []).map((ex, i) => ({ ...ex, ...(paid.exercises?.[i] ?? {}) })) };
          return grammar(`src/paid/${file}`, merged, p[1], p[2]);
        }
        return grammar(`src/data/${file}`, read(file), p[1], p[2]);
      }
      case "k": {
        if (p[0] === "fehler") return quizItem("fehler-nach-sprache.json", read("fehler-nach-sprache.json").quiz?.[qIndex(p[1])]);
        if (p[0] === "insider") {
          const t = read("kultur-insider.json").topics.find((x) => x.id === p[1]);
          return t && p[2] ? quizItem("kultur-insider.json", t.quiz?.[qIndex(p[2])]) : t ? { datei: "src/data/kultur-insider.json", text: t.title, loesung: "", fingerprint: null } : null;
        }
        const t = read("kultur.json").topics.find((x) => x.id === p[0]);
        return t && p[1] ? quizItem("kultur.json", t.quiz?.[qIndex(p[1])]) : t ? { datei: "src/data/kultur.json", text: t.title, loesung: "", fingerprint: null } : null;
      }
      case "h": return quizItem("hoeren.json", read("hoeren.json").texts.find((x) => x.id === p[0])?.questions?.[qIndex(p[1])]);
      case "l": {
        if (p[0] === "ls") return quizItem("lesen.json", read("lesen.json").groups.find((x) => x.id === p[1])?.questions?.[qIndex(p[2])]);
        return quizItem("fertigkeiten/lesen.json", read("fertigkeiten/lesen.json").texts.find((x) => x.id === p[0])?.questions?.[qIndex(p[1])]);
      }
      case "x": {
        if (p[0] === "lid") {
          const lid = read("leben-in-deutschland.json");
          if (p.length === 2) return quizItem("leben-in-deutschland.json", lid.questions[qIndex(p[1])]);
          return quizItem("leben-in-deutschland.json", lid.bundeslaender.find((x) => x.id === p[1])?.stateQuestions?.[qIndex(p[2])]);
        }
        if (p[0] === "einstufung") return quizItem("einstufung.json", read("einstufung.json").levels[p[1].toUpperCase()]?.[qIndex(p[2])]);
        if (p[0] === "telc" && p[1] === "sprachbausteine") {
          const file = `pruefungen/sprachbausteine/${p[2]}.json`;
          if (!exists(file)) {
            // The set id (satz-1) is the file name; fall back to a search by setId.
            const dir = path.join(DATA, "pruefungen", "sprachbausteine");
            const f = fs.readdirSync(dir).find((n) => JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")).setId === p[2]);
            return f ? grammar(`src/data/pruefungen/sprachbausteine/${f}`, read(`pruefungen/sprachbausteine/${f}`), p[3], p[4]) : null;
          }
          return grammar(`src/data/${file}`, read(file), p[3], p[4]);
        }
        if (p[0] === "dtz") return { datei: `src/data/pruefungen/dtz/${p[1]}.json`, text: `Aufgabe ${p[2]}`, loesung: "", fingerprint: null };
        // Übungssätze, Start Deutsch 1, TestDaF: item ids are unique per set.
        const dir = path.join(DATA, "pruefungen", "saetze");
        for (const n of fs.readdirSync(dir)) {
          const set = read(`pruefungen/saetze/${n}`);
          if (set.id !== p[1]) continue;
          for (const m of set.modules ?? []) for (const part of m.parts ?? []) for (const it of part.items ?? []) {
            if (String(it.id).toLowerCase() === p[2]) {
              const ans = it.options?.[it.correct] ?? it.correct;
              return { datei: `src/data/pruefungen/saetze/${n}`, text: norm(it.question ?? it.statement ?? it.prompt), loesung: norm(ans), fingerprint: fingerprint(it.question ?? it.statement ?? it.prompt ?? "", ans) };
            }
          }
        }
        return { datei: `src/data/pruefungen/${p[0]}/…`, text: rest, loesung: "", fingerprint: null };
      }
      case "w": {
        // Wortschatz card: the lexicon id (cleanRef'd), else a Lernset word the lexicon lacks.
        const e = lexiconWord(rest) ?? lexiconWord(p[0]);
        if (!e) return { datei: "(Wortschatz-Set)", text: rest, loesung: "", fingerprint: null };
        return { datei: `src/content/lexicon/${e.level.toLowerCase()}.json`, text: `${e.gender ? `${e.gender} ` : ""}${e.lemma}`, loesung: norm(e.en), fingerprint: fingerprint(e.lemma, e.en ?? "") };
      }
      case "s": return { datei: `src/lib/ (Spiel ${p[0]})`, text: `Spiel ${p[0]} – das Wort steht im Kommentar / in der Momentaufnahme`, loesung: "", fingerprint: null };
      case "f": {
        const q = read("fuehrerschein/fragen.json").questions.find((x) => x.id === p[0]);
        return q ? { datei: "src/data/fuehrerschein/fragen.json", text: norm(q.prompt), loesung: "", fingerprint: null } : null;
      }
    }
  } catch {}
  return null;
}
