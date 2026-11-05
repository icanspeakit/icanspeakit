// "Correct my text" on a writing task (/writing/[id]).
//
// Two checkers, one result:
//   1. Our own rules, in the browser: what only the task knows, plus what learners of Spanish
//      get wrong all the time: ¿ and ¡, accents on question words and on words that always
//      carry one, capitals on days and months, the punctuation of a greeting, a few fixed
//      gender and contraction errors, "soy cansado", "yo" at the start of every sentence, a
//      greeting and sign-off, the word count the task asks for.
//   2. LanguageTool (api.languagetool.org, language "es"): spelling and a good share of
//      grammar. Only if BACKEND.languageTool is on, and it is OFF: this site sends nothing
//      anywhere. With it off the panel says these are basic checks, not a full correction.
//      Turning it on also needs schreiben.privacy in en.json to mention it again.
//
// Every finding lands in one of four groups: grammar, expression, punctuation, spelling.
// (The group keys are the old German ones; they are CSS classes and i18n keys.)

import { BACKEND } from "./backend.js";
import { getLang, onLangChange } from "./i18n.js";

const LT_URL = "https://api.languagetool.org/v2/check";
const COOLDOWN_MS = 6000; // a click every few seconds is plenty; LanguageTool allows 20/min

export const CATS = ["grammatik", "ausdruck", "satzzeichen", "rechtschreibung"];

// UI strings in the UI language. The findings stay English on purpose: English is the course's
// explanation language (the text they point at is Spanish).
const T = {
  de: {
    button: "Text korrigieren", again: "Noch einmal korrigieren", busy: "Wird geprüft …",
    grammatik: "Grammatik", ausdruck: "Ausdruck", satzzeichen: "Satzzeichen", rechtschreibung: "Rechtschreibung",
    none: "Keine Fehler gefunden. Gut gemacht!", apply: "Korrektur übernehmen", applyAll: "Alle Korrekturen übernehmen",
    task: "Aufgabe", words: "{n} Wörter", wordsRange: "{n} Wörter — verlangt sind {min}–{max}.",
    ltDown: "Die Rechtschreibprüfung ist gerade nicht erreichbar. Unten stehen nur unsere eigenen Hinweise.",
    empty: "Schreib zuerst ein paar Sätze.", wait: "Einen Moment — gleich kannst du wieder prüfen.",
    points: "Hast du an alles gedacht?", hint: "Hinweis",
    ownOnly: "Das sind Basisprüfungen (¿ ¡, Akzente, Großschreibung, Anrede, Länge), keine vollständige Korrektur. Vergleiche deinen Text auch mit dem Modelltext.",
    noneOwn: "Die Basisprüfungen haben nichts gefunden.",
  },
  en: {
    button: "Correct my text", again: "Correct again", busy: "Checking …",
    grammatik: "Grammar", ausdruck: "Expression", satzzeichen: "Punctuation", rechtschreibung: "Spelling",
    none: "No mistakes found. Well done!", apply: "Apply correction", applyAll: "Apply all corrections",
    task: "Task", words: "{n} words", wordsRange: "{n} words — the task asks for {min}–{max}.",
    ltDown: "The spelling check is not reachable right now. Only our own hints are shown below.",
    empty: "Write a few sentences first.", wait: "One moment — you can check again shortly.",
    points: "Did you cover everything?", hint: "Hint",
    ownOnly: "These are basic checks (¿ ¡, accents, capitals, greeting, length), not a full correction. Compare your text with the model text too.",
    noneOwn: "The basic checks found nothing.",
  },
  fr: {
    button: "Corriger mon texte", again: "Corriger à nouveau", busy: "Vérification …",
    grammatik: "Grammaire", ausdruck: "Expression", satzzeichen: "Ponctuation", rechtschreibung: "Orthographe",
    none: "Aucune erreur trouvée. Bravo !", apply: "Appliquer la correction", applyAll: "Appliquer toutes les corrections",
    task: "Consigne", words: "{n} mots", wordsRange: "{n} mots — la consigne demande {min}–{max}.",
    ltDown: "Le correcteur orthographique n'est pas accessible pour le moment. Seules nos remarques s'affichent ci-dessous.",
    empty: "Écris d'abord quelques phrases.", wait: "Un instant : tu pourras vérifier à nouveau bientôt.",
    points: "As-tu pensé à tout ?", hint: "Remarque",
    ownOnly: "Ce sont des vérifications de base (¿ ¡, accents, majuscules, formule d'appel, longueur), pas une correction complète. Compare aussi ton texte avec le texte modèle.",
    noneOwn: "Les vérifications de base n'ont rien trouvé.",
  },
  pt: {
    button: "Corrigir o meu texto", again: "Corrigir de novo", busy: "A verificar …",
    grammatik: "Gramática", ausdruck: "Expressão", satzzeichen: "Pontuação", rechtschreibung: "Ortografia",
    none: "Não foram encontrados erros. Muito bem!", apply: "Aplicar a correção", applyAll: "Aplicar todas as correções",
    task: "Tarefa", words: "{n} palavras", wordsRange: "{n} palavras — a tarefa pede {min}–{max}.",
    ltDown: "O corretor ortográfico não está acessível neste momento. Abaixo estão apenas as nossas indicações.",
    empty: "Escreve primeiro algumas frases.", wait: "Um momento: já podes verificar de novo.",
    points: "Pensaste em tudo?", hint: "Indicação",
    ownOnly: "Estas são verificações básicas (¿ ¡, acentos, maiúsculas, saudação, extensão), não uma correção completa. Compara também o teu texto com o texto modelo.",
    noneOwn: "As verificações básicas não encontraram nada.",
  },
  it: {
    button: "Correggi il mio testo", again: "Correggi di nuovo", busy: "Controllo in corso …",
    grammatik: "Grammatica", ausdruck: "Espressione", satzzeichen: "Punteggiatura", rechtschreibung: "Ortografia",
    none: "Nessun errore trovato. Bravo!", apply: "Applica la correzione", applyAll: "Applica tutte le correzioni",
    task: "Compito", words: "{n} parole", wordsRange: "{n} parole — il compito ne chiede {min}–{max}.",
    ltDown: "Il controllo ortografico non è raggiungibile in questo momento. Qui sotto trovi solo i nostri suggerimenti.",
    empty: "Prima scrivi qualche frase.", wait: "Un momento: tra poco puoi controllare di nuovo.",
    points: "Hai pensato a tutto?", hint: "Nota",
    ownOnly: "Questi sono controlli di base (¿ ¡, accenti, maiuscole, saluto, lunghezza), non una correzione completa. Confronta il tuo testo anche con il testo modello.",
    noneOwn: "I controlli di base non hanno trovato nulla.",
  },
  uk: {
    button: "Виправити текст", again: "Перевірити ще раз", busy: "Перевіряємо …",
    grammatik: "Граматика", ausdruck: "Вираз", satzzeichen: "Розділові знаки", rechtschreibung: "Правопис",
    none: "Помилок не знайдено. Чудово!", apply: "Прийняти виправлення", applyAll: "Прийняти всі виправлення",
    task: "Завдання", words: "{n} слів", wordsRange: "{n} слів — потрібно {min}–{max}.",
    ltDown: "Перевірка правопису зараз недоступна. Нижче лише наші власні підказки.",
    empty: "Спершу напиши кілька речень.", wait: "Хвилинку — скоро можна перевірити знову.",
    points: "Ти про все подумав(-ла)?", hint: "Підказка",
  },
  ar: {
    button: "صحّح النص", again: "صحّح مرة أخرى", busy: "جارٍ التدقيق …",
    grammatik: "القواعد", ausdruck: "التعبير", satzzeichen: "علامات الترقيم", rechtschreibung: "الإملاء",
    none: "لم يتم العثور على أخطاء. أحسنت!", apply: "اعتمد التصحيح", applyAll: "اعتمد كل التصحيحات",
    task: "المهمة", words: "{n} كلمة", wordsRange: "{n} كلمة — المطلوب {min}–{max}.",
    ltDown: "التدقيق الإملائي غير متاح الآن. تظهر أدناه ملاحظاتنا فقط.",
    empty: "اكتب بعض الجمل أولًا.", wait: "لحظة — يمكنك التدقيق مجددًا بعد قليل.",
    points: "هل تناولت كل النقاط؟", hint: "ملاحظة",
  },
  tr: {
    button: "Metni düzelt", again: "Yeniden düzelt", busy: "Kontrol ediliyor …",
    grammatik: "Dil bilgisi", ausdruck: "Anlatım", satzzeichen: "Noktalama", rechtschreibung: "Yazım",
    none: "Hata bulunamadı. Tebrikler!", apply: "Düzeltmeyi uygula", applyAll: "Tüm düzeltmeleri uygula",
    task: "Görev", words: "{n} kelime", wordsRange: "{n} kelime — istenen {min}–{max}.",
    ltDown: "Yazım denetimine şu an ulaşılamıyor. Aşağıda yalnızca kendi ipuçlarımız var.",
    empty: "Önce birkaç cümle yaz.", wait: "Bir saniye — birazdan yeniden kontrol edebilirsin.",
    points: "Her şeyi düşündün mü?", hint: "İpucu",
  },
};
const t = (key, vars = {}) => {
  const s = (T[getLang()] ?? T.en)[key] ?? T.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
};

// ---- LanguageTool --------------------------------------------------------------------

/** Which of the four groups a LanguageTool match belongs to. issueType first — it is the
 *  finer signal — then the category for what it leaves open. */
function ltCat(m) {
  const it = m.rule?.issueType;
  const cat = m.rule?.category?.id ?? "";
  if (it === "misspelling" || cat === "TYPOS" || cat === "CASING" || cat === "COMPOUNDING") return "rechtschreibung";
  if (it === "typographical" || it === "whitespace" || cat === "PUNCTUATION" || cat === "TYPOGRAPHY" || /COMMA|PUNCT|WHITESPACE/.test(m.rule?.id ?? "")) return "satzzeichen";
  if (it === "grammar" || cat === "GRAMMAR" || cat === "CONFUSED_WORDS") return "grammatik";
  return "ausdruck";
}

async function languageTool(text) {
  const body = new URLSearchParams({ text, language: "es", level: "default" });
  const res = await fetch(LT_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`LanguageTool ${res.status}`);
  const j = await res.json();
  return j.matches
    // Gender-neutral wording hints are a style debate, not a learner's mistake.
    .filter((m) => m.rule?.category?.id !== "GENDER_NEUTRALITY")
    .map((m) => ({
      cat: ltCat(m),
      offset: m.offset,
      length: m.length,
      message: m.shortMessage && m.shortMessage.length > m.message.length / 2 ? m.shortMessage : m.message,
      replacements: m.replacements.slice(0, 3).map((r) => r.value),
      source: "lt",
    }));
}

// ---- Our own rules ------------------------------------------------------------------

// A statement can start with almost anything, and "Qué alegría." or "Cuánto me alegro." are
// exclamations, so only words that make a sentence a question beyond doubt count here.
const QUESTION_START = /^(Dónde|Adónde|Cuándo|Quién(?:es)?|Cuál(?:es)?|Por qué|Podrías)(?![\p{L}])/u;
// Question words that need their accent straight after ¿. "¿Por qué" has its own rule below.
const QUESTION_WORD = { que: "qué", como: "cómo", donde: "dónde", adonde: "adónde", cuando: "cuándo", quien: "quién", quienes: "quiénes", cual: "cuál", cuales: "cuáles", cuanto: "cuánto", cuanta: "cuánta", cuantos: "cuántos", cuantas: "cuántas" };
// Only words with one possible spelling, so the hint can't be wrong: "esta/está", "si/sí", "tu/tú",
// "el/él", "mi/mí", "hablo/habló" depend on the sentence and are left to a person.
const withoutAcute = (w) => w.normalize("NFD").replace(/́/g, "").normalize("NFC");
const ALWAYS_ACCENT = Object.fromEntries(
  "también aquí allí así además después adiós más días sábado miércoles teléfono móvil número fácil difícil música médica rápido según quizás lápiz árbol país ningún algún común autobús avión camión jardín inglés francés alemán portugués japonés"
    .split(" ").map((w) => [withoutAcute(w), w]),
);
// JavaScript's \b counts "í" as a word break ("mejoraría el" would look like "a el"), so these
// patterns use letter lookarounds instead.
const CAPITAL_DATE = /(?<=(?<!\p{L})(?:el|los|este|cada|del|próximo)\s)(?:Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)(?!\p{L})|(?<=(?<!\p{L})(?:de|en|hasta|desde)\s)(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)(?!\p{L})/gu;
// Fixed errors: wrong in any sentence these words can appear in. "a el" and "de el" keep a
// small "el", because "de El País" is correct.
const SER_ESTAR = { soy: "estoy", eres: "estás", somos: "estamos", sois: "estáis" };
const FIXED = [
  [/(?<!\p{L})la (problema|sistema|tema|idioma|día|mapa)(?!\p{L})/giu, (m) => `el ${m[1]}`, "This word is masculine, even though it ends in -a."],
  [/(?<!\p{L})una (problema|sistema|tema|idioma|día|mapa)(?!\p{L})/giu, (m) => `un ${m[1]}`, "This word is masculine, even though it ends in -a."],
  [/(?<!\p{L})el (mano|foto|moto|gente|noche|calle|clase|leche)(?!\p{L})/giu, (m) => `la ${m[1]}`, "This word is feminine."],
  [/(?<!\p{L})un (mano|foto|moto|gente|noche|calle|clase|leche)(?!\p{L})/giu, (m) => `una ${m[1]}`, "This word is feminine."],
  [/(?<!\p{L})[Aa] el(?!\p{L})/gu, () => "al", "“a” + “el” contracts to “al”."],
  [/(?<!\p{L})[Dd]e el(?!\p{L})/gu, () => "del", "“de” + “el” contracts to “del”."],
  [/(?<!\p{L})muy mucho(?!\p{L})/giu, () => "muchísimo", "“Muy” does not go with “mucho”: say “mucho” or “muchísimo”."],
  [/(?<!\p{L})(soy|eres|somos|sois) (cansad[oa]s?|enferm[oa]s?|content[oa]s?)(?!\p{L})/giu, (m) => `${SER_ESTAR[m[1].toLowerCase()]} ${m[2]}`, "For a state or feeling, Spanish uses “estar”, not “ser”."],
];
const GREETING = /^(Hola|Buen[oa]s|Estimad[oa]s?|Querid[oa]s?|Señor|Señora|Sr\.|Sra\.|Muy señor|A quien corresponda|A la atención)(?![\p{L}])/iu;
const SIGN_OFF = /(saludos?|atentamente|cordialmente|abrazos?|besos?|besitos|hasta (pronto|luego|mañana)|nos vemos|gracias|cuídate)/iu;
const count = (s, ch) => s.split(ch).length - 1;
const keepCase = (src, fix) => (src[0] === src[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix);

function ownRules(text, task) {
  const out = [];
  const add = (cat, offset, length, message, replacements = []) => out.push({ cat, offset, length, message, replacements, source: "own" });

  // A "sentence" here runs to the next end mark, so "Sra." and "3.º" cut one in two: the marks
  // are compared over the whole line, never inside one piece.
  const sentences = [...text.matchAll(/[^.!?\n]+[.!?]*/g)];
  for (const s of sentences) {
    const raw = s[0];
    const body = raw.trimEnd();
    const lead = raw.length - raw.trimStart().length;
    const sentence = body.trimStart();
    if (!sentence) continue;
    const start = s.index + lead;
    const endAt = s.index + body.length;
    const last = sentence.at(-1);
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const lineSoFar = text.slice(lineStart, endAt);
    const restOfLine = text.slice(start).split("\n")[0];

    // 1. ¿ and ¡ open what ? and ! close. A clause may open mid-sentence ("Hola, ¿qué tal?").
    if (last === "?" && count(lineSoFar, "¿") < count(lineSoFar, "?")) add("satzzeichen", start, 0, "Spanish opens a question with “¿”.", ["¿"]);
    if (last === "!" && count(lineSoFar, "¡") < count(lineSoFar, "!")) add("satzzeichen", start, 0, "Spanish opens an exclamation with “¡”.", ["¡"]);
    if (sentence.includes("¿") && !restOfLine.includes("?")) add("satzzeichen", endAt - 1, 1, "A question that opens with “¿” closes with “?”.", [`${last === "." ? "" : last}?`]);
    if (sentence.includes("¡") && !restOfLine.includes("!")) add("satzzeichen", endAt - 1, 1, "An exclamation that opens with “¡” closes with “!”.", [`${last === "." ? "" : last}!`]);

    const words = sentence.split(/\s+/);
    const lastWord = words.at(-1);
    // 2. An accented question word with no question marks at all.
    if (QUESTION_START.test(sentence) && !/[?!]/.test(sentence) && words.length >= 3) {
      add("satzzeichen", endAt - lastWord.length, lastWord.length, "A question ends with “?” and opens with “¿”.", [`${lastWord.replace(/[.,]$/, "")}?`]);
    }
    // 3. The text needs a final mark. A last line of capitalised words is a signature.
    const isLast = start + sentence.length === text.trimEnd().length;
    if (isLast && words.length >= 3 && !/[.!?:,]$/.test(sentence) && words.some((w) => /^\p{Ll}/u.test(w))) {
      add("satzzeichen", endAt - lastWord.length, lastWord.length, "The sentence needs a full stop at the end.", [`${lastWord}.`]);
    }
  }

  // 4. Accents on question words after ¿.
  for (const m of text.matchAll(/¿\s*(\p{L}+)/gu)) {
    const fix = QUESTION_WORD[m[1].toLowerCase()];
    if (fix) add("rechtschreibung", m.index + m[0].length - m[1].length, m[1].length, "Question words carry a written accent.", [keepCase(m[1], fix)]);
  }
  for (const m of text.matchAll(/¿\s*por que(?!\p{L})/giu)) {
    add("rechtschreibung", m.index + m[0].length - 3, 3, "“¿Por qué?” is two words, with an accent.", ["qué"]);
  }

  // 5. Words that always carry an accent, and every word ending in -cion or -sion.
  for (const m of text.matchAll(/\p{L}+/gu)) {
    const low = m[0].toLowerCase();
    const fix = ALWAYS_ACCENT[low] !== low && ALWAYS_ACCENT[low]
      ? ALWAYS_ACCENT[low]
      : /.[cs]ion$/.test(low) ? low.replace(/ion$/, "ión") : null;
    if (fix) add("rechtschreibung", m.index, m[0].length, "This word needs a written accent. In Spanish it is part of the spelling.", [keepCase(m[0], fix)]);
  }

  // 6. Days and months take a small letter in Spanish.
  for (const m of text.matchAll(CAPITAL_DATE)) {
    add("rechtschreibung", m.index, m[0].length, "Days and months are written with a small letter in Spanish.", [m[0].toLowerCase()]);
  }

  // 7. Fixed errors of gender, contraction and ser/estar.
  for (const [re, fix, msg] of FIXED) {
    for (const m of text.matchAll(re)) add("grammatik", m.index, m[0].length, msg, [keepCase(m[0], fix(m))]);
  }

  // 8. "Yo" three times in a row: Spanish verbs already say who it is.
  let run = 0;
  for (const s of sentences) {
    const sentence = s[0].trimStart();
    if (/^Yo(?!\p{L})/u.test(sentence)) {
      run++;
      if (run === 3) add("ausdruck", s.index + (s[0].length - sentence.length), 2, "Three sentences in a row start with “Yo”. The verb already says who it is, so Spanish usually leaves it out: “Trabajo…”, not “Yo trabajo…”.");
    } else run = 0;
  }

  // 9. A message, email or letter needs a greeting and a sign-off.
  if (["nachricht", "email", "brief"].includes(task?.type)) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    // A letter may open with the sender's address, so the greeting can be a few lines down.
    const greeting = lines.slice(0, 6).find((l) => GREETING.test(l.replace(/^¡/, "")));
    if (lines.length && !greeting) {
      add("ausdruck", 0, 0, "A greeting is missing at the start, e.g. “¡Hola, Lucía!” or “Estimada señora Ortega:”.");
    }
    const tail = lines.slice(-3).join(" ");
    if (lines.length > 1 && !SIGN_OFF.test(tail)) {
      add("ausdruck", text.trimEnd().length, 0, "A sign-off is missing at the end, e.g. “Un abrazo,” or “Un saludo,”.");
    }
    // 10. The greeting's punctuation: a comma before the name, and a colon in emails and letters.
    if (greeting) {
      const lineAt = text.indexOf(greeting);
      const hola = greeting.match(/^¡?Hola (?=\p{Lu})/u);
      if (hola) add("satzzeichen", lineAt + hola[0].length - 1, 1, "A comma goes before the person's name: “Hola, Lucía”.", [", "]);
      if (task.type !== "nachricht" && /^(Estimad[oa]s?|Querid[oa]s?|Buen[oa]s|Hola)(?!\p{L}).*,$/iu.test(greeting) && greeting.split(/\s+/).length <= 6) {
        add("satzzeichen", lineAt + greeting.length - 1, 1, "In Spanish, the greeting of an email or letter ends with a colon, not a comma.", [":"]);
      }
    }
  }
  return out;
}

/** "(30–40 words)" or "(80–100 palabras)" in the task situation, or null. */
export function wordRange(task) {
  const m = (task?.situation ?? "").match(/(\d+)\s*[–-]\s*(\d+)\s*(words|palabras)/);
  return m ? { min: +m[1], max: +m[2] } : null;
}

/** Overlapping findings: keep LanguageTool's where both flag the same place — it carries
 *  the better suggestion — and ours where only we saw it. */
function merge(lt, own) {
  const overlaps = (a, b) => a.length > 0 && b.length > 0 && a.offset < b.offset + b.length && b.offset < a.offset + a.length;
  return [...lt, ...own.filter((o) => !lt.some((l) => overlaps(l, o)))].sort((a, b) => a.offset - b.offset);
}

export async function korrigieren(text, task) {
  const own = ownRules(text, task);
  let lt = [];
  let ltDown = false;
  if (BACKEND.languageTool) {
    try { lt = await languageTool(text); } catch { ltDown = true; }
  }
  return { issues: merge(lt, own), ltDown };
}

// ---- The panel --------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Apply the first suggestion of each given finding, right to left so offsets stay valid. */
function applyAll(text, issues) {
  let out = text;
  for (const i of [...issues].filter((i) => i.replacements.length).sort((a, b) => b.offset - a.offset)) {
    out = out.slice(0, i.offset) + i.replacements[0] + out.slice(i.offset + i.length);
  }
  return out;
}

/**
 * @param {HTMLElement} root     the panel container (empty; filled here)
 * @param {HTMLTextAreaElement} area
 * @param {object} task          the task from schreiben.json
 */
export function mountKorrektur(root, area, task) {
  root.innerHTML = `
    <div class="skk-bar">
      <button type="button" class="sk-btn skk-go" data-skk-go></button>
      <span class="skk-status" data-skk-status aria-live="polite"></span>
    </div>
    <div class="skk-out" data-skk-out hidden></div>`;
  const go = root.querySelector("[data-skk-go]");
  const status = root.querySelector("[data-skk-status]");
  const out = root.querySelector("[data-skk-out]");
  let last = null; // { text, issues, ltDown }
  let lastAt = 0;
  let busy = false;

  const paintButton = () => { go.textContent = busy ? t("busy") : last ? t("again") : t("button"); go.disabled = busy; };

  function render() {
    if (!last) { out.hidden = true; return; }
    const { text, issues, ltDown } = last;
    const counts = Object.fromEntries(CATS.map((c) => [c, issues.filter((i) => i.cat === c).length]));
    // The text with every finding underlined in its group's colour.
    let marked = "";
    let pos = 0;
    issues.forEach((i, n) => {
      if (i.offset < pos || !i.length) return; // overlaps and insertions: the list has them
      marked += esc(text.slice(pos, i.offset));
      const bad = text.slice(i.offset, i.offset + i.length) || " ";
      marked += `<mark class="skk-m skk-${i.cat}" data-n="${n}" title="${esc(i.message)}">${esc(bad)}</mark>`;
      pos = i.offset + i.length;
    });
    marked += esc(text.slice(pos));

    const n = text.trim().split(/\s+/).filter(Boolean).length;
    const range = wordRange(task);
    const wordsLine = range ? t("wordsRange", { n, ...range }) : t("words", { n });
    const wordsOk = !range || (n >= range.min * 0.9 && n <= range.max * 1.2);

    out.innerHTML = `
      ${!BACKEND.languageTool ? `<p class="skk-note">${esc(t("ownOnly"))}</p>` : ltDown ? `<p class="skk-note">${esc(t("ltDown"))}</p>` : ""}
      <div class="skk-chips">${CATS.map((c) => `<span class="skk-chip skk-${c}${counts[c] ? "" : " is-zero"}"><b>${counts[c]}</b> ${esc(t(c))}</span>`).join("")}</div>
      ${issues.length ? `<div class="skk-text" lang="es">${marked}</div>` : `<p class="skk-none">${esc(t(BACKEND.languageTool ? "none" : "noneOwn"))}</p>`}
      ${issues.length ? `<ol class="skk-list">${issues.map((i, k) => {
        const bad = text.slice(i.offset, i.offset + i.length);
        const fix = i.replacements[0];
        return `<li class="skk-item" data-n="${k}">
          <span class="skk-tag skk-${i.cat}">${esc(t(i.cat))}</span>
          <span class="skk-what" lang="es">${bad.trim() ? `<s>${esc(bad)}</s>` : ""}${fix != null ? ` → <b>${esc(fix.trim() || fix)}</b>` : ""}</span>
          <span class="skk-msg" lang="en">${esc(i.message)}</span>
          ${fix != null ? `<button type="button" class="skk-apply" data-apply="${k}">${esc(t("apply"))}</button>` : ""}
        </li>`;
      }).join("")}</ol>
      ${issues.some((i) => i.replacements.length) ? `<p><button type="button" class="sk-btn skk-applyall" data-apply-all>${esc(t("applyAll"))}</button></p>` : ""}` : ""}
      <div class="skk-task">
        <p class="skk-task-h">${esc(t("task"))}</p>
        <p class="skk-words${wordsOk ? "" : " is-off"}">${esc(wordsLine)}</p>
        ${task?.points?.length ? `<p class="skk-task-q">${esc(t("points"))}</p><ul class="skk-points">${task.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      </div>`;
    out.hidden = false;
  }

  function useText(next) {
    area.value = next;
    area.dispatchEvent(new Event("input", { bubbles: true }));
    last = null;
    render();
    paintButton();
    area.focus();
  }

  out.addEventListener("click", (e) => {
    const one = e.target.closest("[data-apply]");
    if (one && last) return useText(applyAll(last.text, [last.issues[+one.dataset.apply]]));
    if (e.target.closest("[data-apply-all]") && last) return useText(applyAll(last.text, last.issues));
    const m = e.target.closest(".skk-m");
    if (m) out.querySelector(`.skk-item[data-n="${m.dataset.n}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  go.addEventListener("click", async () => {
    const text = area.value;
    if (text.trim().split(/\s+/).filter(Boolean).length < 3) { status.textContent = t("empty"); return; }
    if (Date.now() - lastAt < COOLDOWN_MS) { status.textContent = t("wait"); return; }
    status.textContent = "";
    busy = true; lastAt = Date.now(); paintButton();
    try {
      const r = await korrigieren(text, task);
      last = { text, ...r };
      render();
      out.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } finally { busy = false; paintButton(); }
  });

  // Editing after a check makes the underlines point at the wrong letters; drop them.
  area.addEventListener("input", () => { if (last && area.value !== last.text) { last = null; render(); paintButton(); } });
  onLangChange(() => { paintButton(); render(); });
  paintButton();
}
