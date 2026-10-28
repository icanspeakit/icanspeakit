/* Einfach lernen (/einfach) — turns the curated path (src/data/einfach-pfad.json) into the
 * task objects the view renders.
 *
 * The path never copies German text. A task names a source item by ref and this file
 * looks it up in the site's own reviewed data:
 *
 *   lex:a1-15/Bahnhof            a word in src/content/lexicon/a1.json (unit id + lemma)
 *   gram:w-fragen/4/0@1a2b3c     item 0 of exercise 4 in src/data/grammatik/w-fragen.json
 *   akk:akk-l4                   an item of src/data/akkusativ.json (it has stable ids)
 *   kultur:pfand#0@9f8e7d        fact 0 of a topic in kultur.json (kultur-insider: too)
 *   hoeren:a1-supermarkt/1@…     question 1 of a listening text in src/data/hoeren.json
 *   aussprache:a1-frage-tee      a sentence of src/data/aussprache-check.json (stable ids)
 *   redemittel:danken#0@…        phrase 0 of a set in src/data/redemittel.json
 *
 * Items without a stable id carry a checksum of their text after "@". If someone edits
 * or reorders the source, the checksum stops matching and resolvePath() reports it —
 * the page build and scripts/check-einfach-pfad.mjs both fail on that, loudly, instead of
 * a unit quietly teaching a different sentence than the one it was written around.
 *
 * Pure: no imports, no fs. The page (build time) and the check script (Node) hand in the
 * same `sources` object, so both resolve exactly the same way.
 */

/** FNV-1a, 6 hex chars. Only a tripwire for edited text, not a security measure. */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 6);
}

const PUNCT = /^[?!.,;:]+$/;

/* The article rules the der/die/das trainer teaches (artikel-packs.json). In easy mode
   Leichte Sprache is on by default, so the hint is built in the leicht register: one
   short sentence naming the ending that decides. */
function articleRuleHint(lemma, gender, rules) {
  const low = lemma.toLowerCase();
  for (const r of rules || []) {
    if (r.article !== gender) continue;
    if (r.names?.includes(lemma)) return "Tage, Monate und Jahreszeiten haben „der“.";
    if (r.maleEr && /er$/.test(low)) return "Ein Mann mit Beruf auf -er? Dann „der“.";
    if (r.notSuffixes?.some((s) => low.endsWith(s))) continue;
    const suf = r.suffixes?.find((s) => low.endsWith(s));
    if (suf) return `Das Wort endet auf -${suf}. Dann sagt man „${gender}“.`;
  }
  return null;
}

/** The source text a checksum is taken over, per kind of item. */
function itemText(ex, item) {
  if (ex.type === "fill") return `${item.prompt}|${[].concat(item.answer).join("/")}`;
  if (ex.type === "table") return `${item.term}|${item.answer}`;
  if (ex.type === "build") return item.correct.join(" ");
  return JSON.stringify(item);
}

function exerciseItems(ex) {
  return ex.type === "fill" ? ex.items : ex.type === "table" ? ex.rows : ex.type === "build" ? ex.sentences : null;
}

/** Split "Ich ___ Lehrerin." into before/after around the gap. */
function splitGap(prompt) {
  const clean = String(prompt).replace(/<[^>]+>/g, "");
  const i = clean.indexOf("___");
  if (i === -1) return null;
  return { before: clean.slice(0, i).trim(), after: clean.slice(i + 3).trim() };
}

/**
 * Look up one ref. Returns { kind, ...data } or throws an Error that says what is wrong.
 */
export function lookup(ref, sources) {
  const m = /^(\w[\w-]*):(.+)$/.exec(ref || "");
  if (!m) throw new Error(`unreadable ref "${ref}"`);
  const [, ns, rest] = m;
  const [path, hash] = rest.split("@");

  if (ns === "lex") {
    const [unitId, lemma] = path.split("/");
    const level = unitId.split("-")[0];
    const unit = sources.lexicon?.[level]?.units?.find((u) => u.id === unitId);
    if (!unit) throw new Error(`${ref}: no lexicon unit ${unitId}`);
    const word = unit.words.find((w) => w.lemma === lemma);
    if (!word) throw new Error(`${ref}: "${lemma}" is not in ${unitId}`);
    return { kind: "lex", word };
  }

  if (ns === "akk") {
    const item = (sources.akkusativ || []).find((x) => x.id === path);
    if (!item) throw new Error(`${ref}: no such item in akkusativ.json`);
    return { kind: "akk", item };
  }

  if (ns === "gram") {
    const [topic, exIdx, itemIdx] = path.split("/");
    const t = sources.grammatik?.[topic];
    if (!t) throw new Error(`${ref}: no grammar topic ${topic}`);
    const ex = t.exercises?.[Number(exIdx)];
    const items = ex && exerciseItems(ex);
    if (!items) throw new Error(`${ref}: exercise ${exIdx} of ${topic} is missing or not fill/table/build`);
    const item = items[Number(itemIdx)];
    if (!item) throw new Error(`${ref}: no item ${itemIdx} in exercise ${exIdx} of ${topic}`);
    const sum = checksum(itemText(ex, item));
    if (hash !== sum) throw new Error(`${ref}: checksum is ${sum} — the source item changed or moved (${itemText(ex, item)})`);
    return { kind: "gram", topic: t, ex, item };
  }

  if (ns === "kultur") {
    const [topicId, factIdx] = path.split("#");
    const topic = [...(sources.kultur?.topics || []), ...(sources.kulturInsider?.topics || [])].find((x) => x.id === topicId);
    const fact = topic?.facts?.[Number(factIdx)];
    if (!fact) throw new Error(`${ref}: no fact ${factIdx} in kultur topic ${topicId}`);
    const sum = checksum(fact);
    if (hash !== sum) throw new Error(`${ref}: checksum is ${sum} — the fact changed or moved (${fact})`);
    return { kind: "kultur", fact };
  }

  if (ns === "hoeren") {
    const [textId, qIdx] = path.split("/");
    const text = (sources.hoeren?.texts || []).find((t) => t.id === textId);
    const q = text?.questions?.[Number(qIdx)];
    if (!q) throw new Error(`${ref}: no question ${qIdx} in listening text ${textId}`);
    const sum = checksum(`${q.prompt}|${q.answer}`);
    if (hash !== sum) throw new Error(`${ref}: checksum is ${sum} — the question changed or moved (${q.prompt})`);
    return { kind: "hoeren", text, q };
  }

  if (ns === "aussprache") {
    const sentence = (sources.aussprache?.levels || []).flatMap((l) => l.sentences).find((x) => x.id === path);
    if (!sentence) throw new Error(`${ref}: no such sentence in aussprache-check.json`);
    return { kind: "aussprache", sentence };
  }

  if (ns === "redemittel") {
    const [setId, pIdx] = path.split("#");
    const set = (sources.redemittel?.sets || []).find((x) => x.id === setId);
    const phrase = set?.phrases?.[Number(pIdx)];
    if (!phrase) throw new Error(`${ref}: no phrase ${pIdx} in Redemittel set ${setId}`);
    const sum = checksum(phrase.de);
    if (hash !== sum) throw new Error(`${ref}: checksum is ${sum} — the phrase changed or moved (${phrase.de})`);
    return { kind: "redemittel", set, phrase };
  }

  throw new Error(`${ref}: unknown source "${ns}"`);
}

/**
 * One path task → the object the view renders. Fields written on the path task
 * (`hint`, `options`) win over what the source offers; everything German the learner
 * reads as the exercise itself comes from the source.
 */
export function resolveTask(task, sources) {
  const src = lookup(task.ref, sources);
  // The full-site topic an answer counts toward in progress.js (the dashboard's bars).
  const topic = src.kind === "gram" ? src.topic.id : src.kind === "akk" ? "akkusativ" : task.type === "artikel" ? "artikel" : null;
  const base = { type: task.type, ref: task.ref, ...(topic ? { topic } : {}) };

  if (task.type === "wort" || task.type === "artikel") {
    if (src.kind !== "lex") throw new Error(`${task.ref}: a ${task.type} task needs a lex: ref`);
    const w = src.word;
    if (task.type === "wort") {
      return {
        ...base,
        front: w.gender ? `${w.gender} ${w.lemma}` : w.lemma,
        plural: w.gender && w.plural ? `die ${w.plural}` : null,
        back: w.en,
        hint: task.hint || w.example,
        audio: w.audio ? `/audio/wortschatz/${w.audio}.mp3` : null,
      };
    }
    if (!w.gender) throw new Error(`${task.ref}: artikel task on a word without gender`);
    return {
      ...base,
      noun: w.lemma,
      answer: w.gender,
      back: w.en,
      hint: task.hint || articleRuleHint(w.lemma, w.gender, sources.articleRules),
      why: `Es heißt: ${w.gender} ${w.lemma}.`,
    };
  }

  if (task.type === "luecke") {
    let before, after, answers, options, hint, why;
    if (src.kind === "akk") {
      const gap = splitGap(src.item.prompt);
      ({ before, after } = gap);
      answers = [src.item.answer];
      options = src.item.options;
      hint = src.item.change ? `${src.item.change}.` : null;
      why = src.item.explain;
    } else if (src.kind === "gram" && src.ex.type === "fill") {
      const gap = splitGap(src.item.prompt);
      if (!gap) throw new Error(`${task.ref}: prompt has no ___`);
      ({ before, after } = gap);
      answers = [].concat(src.item.answer);
      hint = src.item.hint ? `Tipp: ${src.item.hint}` : src.ex.hint;
      why = src.ex.hint;
    } else if (src.kind === "gram" && src.ex.type === "table") {
      const term = src.item.term;
      answers = String(src.item.answer).split(",").map((s) => s.trim());
      const placeholder = src.ex.placeholder || "";
      if (placeholder === "der / die / das") {
        before = "";
        after = term;
      } else if (term.includes(" · ")) {
        // "ich · wohnen" → ich ___ (wohnen)
        const [who, verb] = term.split(" · ");
        before = who;
        after = `(${verb})`;
      } else {
        before = `${term} →`;
        after = "";
      }
      const fromPlaceholder = placeholder.split(" / ").map((s) => s.trim()).filter(Boolean);
      if (fromPlaceholder.length >= 2 && fromPlaceholder.length <= 3) options = fromPlaceholder;
      hint = src.ex.hint;
      why = src.ex.hint;
      if (placeholder === "der / die / das") {
        // An article row is an artikel task, whatever the path calls it: same screen,
        // same helper, labelled "Artikel" instead of "Satz".
        return {
          ...base,
          topic: "artikel",
          type: "artikel",
          noun: term,
          answer: answers[0],
          back: "",
          hint: task.hint || articleRuleHint(term, answers[0], sources.articleRules) || hint,
          why: `Es heißt: ${answers[0]} ${term}.`,
        };
      }
    } else {
      throw new Error(`${task.ref}: a luecke task needs a fill, table or akk item`);
    }
    options = task.options || options;
    if (!options) throw new Error(`${task.ref}: no options — add "options" to the path task`);
    const answer = options.find((o) => answers.includes(o));
    if (!answer) throw new Error(`${task.ref}: none of the options ${JSON.stringify(options)} is a right answer (${answers.join(" / ")})`);
    return { ...base, before, after, options, answer, hint: task.hint || hint, why: task.why || why };
  }

  if (task.type === "satz") {
    if (src.kind !== "gram" || src.ex.type !== "build") throw new Error(`${task.ref}: a satz task needs a build item`);
    // A word in brackets, „(trinken)“, may be left out (grammarWorkspace.js): the path
    // asks the short sentence.
    const words = src.item.correct.filter((w) => !PUNCT.test(w) && !/^\(.+\)$/.test(w));
    const end = src.item.correct.filter((w) => PUNCT.test(w)).join("");
    return {
      ...base,
      chips: words,
      answer: words,
      end,
      hint: task.hint || src.item.hint,
      why: task.why || src.ex.title,
    };
  }

  if (task.type === "hoeren") {
    if (src.kind !== "hoeren") throw new Error(`${task.ref}: a hoeren task needs a hoeren: ref`);
    const { text, q } = src;
    return {
      ...base,
      title: text.title,
      audio: `/audio/hoeren/${text.id}.mp3`,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      transcript: text.script.map((l) => l.text),
      hint: task.hint,
      why: null,
    };
  }

  if (task.type === "sprechen") {
    if (src.kind !== "aussprache") throw new Error(`${task.ref}: a sprechen task needs an aussprache: ref`);
    const x = src.sentence;
    return {
      ...base,
      text: x.text,
      focus: x.focus || [],
      audio: x.audio ? `/audio/aussprache-check/${x.id}.mp3` : null,
      hint: task.hint || "Hör den Satz erst an. Dann sprich langsam nach.",
    };
  }

  if (task.type === "redemittel") {
    if (src.kind !== "redemittel") throw new Error(`${task.ref}: a redemittel task needs a redemittel: ref`);
    if (!task.situation) throw new Error(`${task.ref}: a redemittel task needs a "situation"`);
    const wrong = (task.distractors || []).map((r) => {
      const d = lookup(r, sources);
      if (d.kind !== "redemittel") throw new Error(`${r}: distractor is not a Redemittel phrase`);
      if (d.set.id === src.set.id) throw new Error(`${r}: distractor comes from the same set as the answer`);
      return d.phrase.de;
    });
    if (wrong.length !== 2) throw new Error(`${task.ref}: needs exactly two distractors`);
    return {
      ...base,
      situation: task.situation,
      options: [src.phrase.de, ...wrong],
      answer: src.phrase.de,
      hint: task.hint,
      why: `Das passt zu: ${src.set.name}.`,
    };
  }

  throw new Error(`${task.ref}: unknown task type "${task.type}"`);
}

/** Every ref a task depends on — its own and its distractors' — for signing and checks. */
export const taskRefs = (t) => [t.ref, ...(t.distractors || [])];

/**
 * The whole path → { units, outline, errors }. `units` are the playable units in path
 * order (draft levels left out); `outline` keeps the draft levels' titles and claims for
 * whoever plans them. Every problem is collected, so one run lists all of them.
 */
export function resolvePath(path, sources) {
  const errors = [];
  const units = [];
  const outline = [];
  for (const level of path.levels || []) {
    for (const unit of level.units || []) {
      if (unit.draft || level.draft) {
        outline.push({ id: unit.id, level: level.level, title: unit.title, claims: unit.claims });
        continue;
      }
      const tasks = [];
      for (const t of unit.tasks || []) {
        try {
          tasks.push(resolveTask(t, sources));
        } catch (e) {
          errors.push(`${unit.id}: ${e.message}`);
        }
      }
      let postcard = null;
      if (unit.postcard) {
        const { city, fact, source } = unit.postcard;
        // "neu": a fact written for this path, not yet checked; "geprüft": written here and checked.
        if (source && source !== "neu" && source !== "geprüft") {
          try {
            postcard = { city, fact: lookup(source, sources).fact, source };
          } catch (e) {
            errors.push(`${unit.id} postcard: ${e.message}`);
          }
        } else {
          postcard = { city, fact, source: source === "geprüft" ? "geprüft" : "neu" };
        }
      }
      units.push({
        id: unit.id,
        icon: unit.icon,
        title: unit.title,
        level: level.level,
        minutes: unit.minutes,
        grammar: unit.grammar || null,
        claims: unit.claims,
        postcard,
        tasks,
      });
    }
  }
  return { units, outline, errors };
}

/** The checks beyond "every ref resolves" — the shape rules of an easy-mode unit. */
export function checkUnits(units) {
  const errors = [];
  units.forEach((u, i) => {
    if (u.tasks.length < 5 || u.tasks.length > 7) errors.push(`${u.id}: ${u.tasks.length} tasks (needs 5–7)`);
    u.tasks.forEach((t) => {
      if (!t.hint) errors.push(`${u.id}: ${t.ref} has no hint for Bruno — add "hint" to the path task`);
    });
    for (const c of u.claims || []) {
      const words = c.split(/\s+/).filter(Boolean).length;
      if (words > 10) errors.push(`${u.id}: claim has ${words} words (max 10): ${c}`);
    }
    if (!u.claims?.length) errors.push(`${u.id}: no claims`);
    if (!u.postcard) errors.push(`${u.id}: no postcard`);
    const prev = units[i - 1];
    if (prev) {
      const before = new Set(prev.tasks.map((t) => t.ref));
      for (const t of u.tasks) if (before.has(t.ref)) errors.push(`${u.id}: ${t.ref} was already in ${prev.id}`);
    }
    const seen = new Set();
    for (const t of u.tasks) {
      if (seen.has(t.ref)) errors.push(`${u.id}: ${t.ref} twice in one unit`);
      seen.add(t.ref);
    }
  });
  return errors;
}
