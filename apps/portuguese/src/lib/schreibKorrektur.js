// "Correct my text" on a writing task (/writing/[id]).
//
// Two checkers, one result:
//   1. Our own rules, in the browser: what only the task knows, plus what learners of European
//      Portuguese get wrong all the time: accents on words that always carry one (-ção, -são,
//      também, não …), small letters for months and weekdays after a preposition (1990
//      Orthographic Agreement), the hyphen of a pronoun after the verb, a sentence that starts
//      with an unstressed pronoun, a few fixed gender and contraction errors, "sou cansado",
//      "eu" at the start of every sentence, a greeting and sign-off, the word count the task
//      asks for.
//   2. LanguageTool (api.languagetool.org, language "pt-PT"): spelling and a good share of
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
// explanation language (the text they point at is Portuguese).
const T = {
  de: {
    button: "Text korrigieren", again: "Noch einmal korrigieren", busy: "Wird geprüft …",
    grammatik: "Grammatik", ausdruck: "Ausdruck", satzzeichen: "Satzzeichen", rechtschreibung: "Rechtschreibung",
    none: "Keine Fehler gefunden. Gut gemacht!", apply: "Korrektur übernehmen", applyAll: "Alle Korrekturen übernehmen",
    task: "Aufgabe", words: "{n} Wörter", wordsRange: "{n} Wörter — verlangt sind {min}–{max}.",
    ltDown: "Die Rechtschreibprüfung ist gerade nicht erreichbar. Unten stehen nur unsere eigenen Hinweise.",
    empty: "Schreib zuerst ein paar Sätze.", wait: "Einen Moment — gleich kannst du wieder prüfen.",
    points: "Hast du an alles gedacht?", hint: "Hinweis",
    ownOnly: "Das sind Basisprüfungen (Akzente, Kleinschreibung, Bindestrich beim Pronomen, Anrede, Länge), keine vollständige Korrektur. Vergleiche deinen Text auch mit dem Modelltext.",
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
    ownOnly: "These are basic checks (accents, small letters, hyphen after the verb, greeting, length), not a full correction. Compare your text with the model text too.",
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
    ownOnly: "Ce sont des vérifications de base (accents, minuscules, trait d'union du pronom, formule d'appel, longueur), pas une correction complète. Compare aussi ton texte avec le texte modèle.",
    noneOwn: "Les vérifications de base n'ont rien trouvé.",
  },
  es: {
    button: "Corregir mi texto", again: "Corregir otra vez", busy: "Comprobando …",
    grammatik: "Gramática", ausdruck: "Expresión", satzzeichen: "Puntuación", rechtschreibung: "Ortografía",
    none: "No se han encontrado errores. ¡Muy bien!", apply: "Aplicar la corrección", applyAll: "Aplicar todas las correcciones",
    task: "Tarea", words: "{n} palabras", wordsRange: "{n} palabras — la tarea pide {min}–{max}.",
    ltDown: "El corrector ortográfico no está disponible ahora. Abajo solo ves nuestras indicaciones.",
    empty: "Escribe primero unas frases.", wait: "Un momento: enseguida podrás comprobar de nuevo.",
    points: "¿Has pensado en todo?", hint: "Indicación",
    ownOnly: "Son comprobaciones básicas (acentos, minúsculas, guion del pronombre, saludo, extensión), no una corrección completa. Compara también tu texto con el texto modelo.",
    noneOwn: "Las comprobaciones básicas no han encontrado nada.",
  },
  it: {
    button: "Correggi il mio testo", again: "Correggi di nuovo", busy: "Controllo in corso …",
    grammatik: "Grammatica", ausdruck: "Espressione", satzzeichen: "Punteggiatura", rechtschreibung: "Ortografia",
    none: "Nessun errore trovato. Ottimo lavoro!", apply: "Applica la correzione", applyAll: "Applica tutte le correzioni",
    task: "Compito", words: "{n} parole", wordsRange: "{n} parole — il compito ne chiede {min}–{max}.",
    ltDown: "Il controllo ortografico non è raggiungibile in questo momento. Qui sotto trovi solo i nostri suggerimenti.",
    empty: "Prima scrivi qualche frase.", wait: "Un momento: tra poco puoi controllare di nuovo.",
    points: "Hai pensato a tutto?", hint: "Nota",
    ownOnly: "Questi sono controlli di base (accenti, minuscole, trattino del pronome, saluto, lunghezza), non una correzione completa. Confronta il tuo testo anche con il testo modello.",
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
  const body = new URLSearchParams({ text, language: "pt-PT", level: "default" });
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

// A statement can start with almost anything, so only words that make a sentence a question
// beyond doubt count here.
const QUESTION_START = /^(Onde|Aonde|Quando|Quem|Qual|Quais|Porquê|Quanto|Quantos|Quantas|Podia|Poderia)(?![\p{L}])/u;
// Only words with one possible spelling, so the hint can't be wrong ("é/e", "há/a", "à/a",
// "pôr/por" depend on the sentence and are left to a person).
const withoutMarks = (w) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
const ALWAYS_ACCENT = Object.fromEntries(
  "também além então não você amanhã mãe irmã irmão cidadão número fácil difícil música médico médica rápido útil último único inglês francês português telemóvel residência experiência Finanças licença agência máquina café"
    .split(" ").map((w) => [withoutMarks(w), w]),
);
// JavaScript's \b counts "í" as a word break, so these patterns use letter lookarounds.
// 1990 Orthographic Agreement: months and weekdays take a small letter.
const CAPITAL_DATE = /(?<=(?<!\p{L})(?:na|no|esta|este|próxima|próximo|à|às|ao|aos|de|em|até|desde|para)\s)(?:Segunda|Terça|Quarta|Quinta|Sexta)(?:-feira)?(?!\p{L})|(?<=(?<!\p{L})(?:no|ao|este|próximo|aos|nos|de|em|até|desde|para)\s)(?:Sábado|Domingo)(?!\p{L})|(?<=(?<!\p{L})(?:de|em|até|desde|para)\s)(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)(?!\p{L})/gu;
const SER_ESTAR = { sou: "estou", és: "estás", somos: "estamos" };
const BR_WORDS = [
  [/(?<!\p{L})ônibus(?!\p{L})/giu, "autocarro", "In Portugal it is “autocarro”; “ônibus” is Brazilian."],
  [/(?<!\p{L})trem(?!\p{L})/giu, "comboio", "In Portugal it is “comboio”; “trem” is Brazilian."],
  [/(?<!\p{L})celular(?!\p{L})/giu, "telemóvel", "In Portugal it is “telemóvel”; “celular” is Brazilian."],
  [/(?<!\p{L})café da manhã(?!\p{L})/giu, "pequeno-almoço", "In Portugal it is “pequeno-almoço”; “café da manhã” is Brazilian."],
  [/(?<!\p{L})banheiro(?!\p{L})/giu, "casa de banho", "In Portugal it is “casa de banho”; “banheiro” is Brazilian."],
  [/(?<!\p{L})geladeira(?!\p{L})/giu, "frigorífico", "In Portugal it is “frigorífico”; “geladeira” is Brazilian."],
];
// Fixed errors: wrong in any sentence these words can appear in.
const FIXED = [
  [/(?<!\p{L})a (problema|sistema|tema|idioma|dia|mapa|programa)(?!\p{L})/giu, (m) => `o ${m[1]}`, "This word is masculine, even though it ends in -a."],
  [/(?<!\p{L})uma (problema|sistema|tema|idioma|dia|mapa|programa)(?!\p{L})/giu, (m) => `um ${m[1]}`, "This word is masculine, even though it ends in -a."],
  [/(?<!\p{L})o (mão|foto|moto|noite|classe)(?!\p{L})/giu, (m) => `a ${m[1]}`, "This word is feminine."],
  [/(?<!\p{L})um (mão|foto|moto|noite|classe)(?!\p{L})/giu, (m) => `uma ${m[1]}`, "This word is feminine."],
  [/(?<!\p{L})a o(?!\p{L})/giu, () => "ao", "“a” + “o” contracts to “ao”."],
  [/(?<!\p{L})a os(?!\p{L})/giu, () => "aos", "“a” + “os” contracts to “aos”."],
  [/(?<!\p{L})(chamo|chamas|chama|chamamos|chamam) (me|te|se|nos)(?!\p{L})/giu, (m) => `${m[1]}-${m[2]}`, "In European Portuguese the pronoun follows the verb with a hyphen: “chamo-me”."],
  [/(?<!\p{L})(sou|és|somos) (cansad[oa]s?|doente|doentes|content[oa]s?)(?!\p{L})/giu, (m) => `${SER_ESTAR[m[1].toLowerCase()]} ${m[2]}`, "For a state or feeling, Portuguese uses “estar”, not “ser”."],
  [/(?<!\p{L})muito muito(?!\p{L})/giu, () => "muito", "“Muito” is not doubled; say “muito” or “muitíssimo”."],
];
const GREETING = /^(Olá|Bom dia|Boa tarde|Boa noite|Car[oa]s?|Estimad[oa]s?|Prezad[oa]s?|Exm[oa]s?\.?|Ex\.mo|Ex\.ma|Senhor|Senhora|Sr\.|Sra\.|À atenção|Ao cuidado)(?![\p{L}])/iu;
const SIGN_OFF = /(cumprimentos|atenciosamente|abraços?|beijinhos?|beijos?|até (já|breve|logo|amanhã|sábado|domingo)|obrigad[oa]|agradeço|melhores|grato|grata)/iu;
const keepCase = (src, fix) => (src[0] === src[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix);

function ownRules(text, task) {
  const out = [];
  const add = (cat, offset, length, message, replacements = []) => out.push({ cat, offset, length, message, replacements, source: "own" });

  // A "sentence" here runs to the next end mark, so "Sra." and "3.º" cut one in two.
  const sentences = [...text.matchAll(/[^.!?\n]+[.!?]*/g)];
  for (const s of sentences) {
    const raw = s[0];
    const body = raw.trimEnd();
    const lead = raw.length - raw.trimStart().length;
    const sentence = body.trimStart();
    if (!sentence) continue;
    const start = s.index + lead;
    const endAt = s.index + body.length;
    const words = sentence.split(/\s+/);
    const lastWord = words.at(-1);
    // 1. A question word at the start and no question mark at all.
    if (QUESTION_START.test(sentence) && !/[?!]/.test(sentence) && words.length >= 3) {
      add("satzzeichen", endAt - lastWord.length, lastWord.length, "A question ends with “?”.", [`${lastWord.replace(/[.,]$/, "")}?`]);
    }
    // 2. An unstressed pronoun does not start a sentence in European Portuguese.
    const pron = sentence.match(/^(Me|Te|Lhe|Lhes)(?![\p{L}])/u);
    if (pron && words.length >= 2) {
      add("grammatik", start, pron[0].length, "In European Portuguese a sentence does not start with an unstressed pronoun: put it after the verb, “Chamo-me Ana”, not “Me chamo Ana” (that is Brazilian word order).");
    }
    // 3. The text needs a final mark. A last line of capitalised words is a signature.
    const isLast = start + sentence.length === text.trimEnd().length;
    if (isLast && words.length >= 3 && !/[.!?:,]$/.test(sentence) && words.some((w) => /^\p{Ll}/u.test(w))) {
      add("satzzeichen", endAt - lastWord.length, lastWord.length, "The sentence needs a full stop at the end.", [`${lastWord}.`]);
    }
  }

  // 4. Words that always carry an accent or cedilla, and words ending in -cao/-sao/-coes/-soes.
  for (const m of text.matchAll(/\p{L}+/gu)) {
    const low = m[0].toLowerCase();
    let fix = ALWAYS_ACCENT[low] && ALWAYS_ACCENT[low] !== low ? ALWAYS_ACCENT[low] : null;
    if (!fix && /^.{2,}[cçs]ao$/.test(low)) fix = low.replace(/[cç]ao$/, "ção").replace(/sao$/, "são");
    if (!fix && /^.{2,}[cçs]oes$/.test(low)) fix = low.replace(/[cç]oes$/, "ções").replace(/soes$/, "sões");
    if (fix) add("rechtschreibung", m.index, m[0].length, "This word needs a written accent or cedilla. In Portuguese it is part of the spelling.", [keepCase(m[0], fix)]);
  }

  // 5. Days and months take a small letter (1990 Orthographic Agreement).
  for (const m of text.matchAll(CAPITAL_DATE)) {
    add("rechtschreibung", m.index, m[0].length, "Days and months are written with a small letter in Portuguese.", [m[0].toLowerCase()]);
  }

  // 6. Fixed errors of gender, contraction, pronoun hyphen and ser/estar.
  for (const [re, fix, msg] of FIXED) {
    for (const m of text.matchAll(re)) add("grammatik", m.index, m[0].length, msg, [keepCase(m[0], fix(m))]);
  }

  // 7. Brazilian vocabulary and the Brazilian progressive ("estou fazendo").
  for (const [re, fix, msg] of BR_WORDS) {
    for (const m of text.matchAll(re)) add("ausdruck", m.index, m[0].length, msg, [keepCase(m[0], fix)]);
  }
  for (const m of text.matchAll(/(?<!\p{L})(estou|estás|está|estamos|estão) \p{L}+(?:ando|endo|indo)(?!\p{L})/giu)) {
    add("ausdruck", m.index, m[0].length, "In Portugal the progressive is “estar a” + infinitive: “estou a trabalhar”, not “estou trabalhando” (Brazilian).");
  }

  // 8. "Eu" three times in a row: Portuguese verbs already say who it is.
  let run = 0;
  for (const s of sentences) {
    const sentence = s[0].trimStart();
    if (/^Eu(?!\p{L})/u.test(sentence)) {
      run++;
      if (run === 3) add("ausdruck", s.index + (s[0].length - sentence.length), 2, "Three sentences in a row start with “Eu”. The verb already says who it is, so Portuguese usually leaves it out: “Trabalho…”, not “Eu trabalho…”.");
    } else run = 0;
  }

  // 9. A message, email or letter needs a greeting and a sign-off.
  if (["nachricht", "email", "brief"].includes(task?.type)) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const greeting = lines.slice(0, 6).find((l) => GREETING.test(l));
    if (lines.length && !greeting) {
      add("ausdruck", 0, 0, "A greeting is missing at the start, e.g. “Olá, Catarina,” or “Exma. Senhora Dra. Antunes,”.");
    }
    const tail = lines.slice(-3).join(" ");
    if (lines.length > 1 && !SIGN_OFF.test(tail)) {
      add("ausdruck", text.trimEnd().length, 0, "A sign-off is missing at the end, e.g. “Um abraço,” or “Com os melhores cumprimentos,”.");
    }
    // 10. A comma goes before the person's name: "Olá, Catarina".
    if (greeting) {
      const lineAt = text.indexOf(greeting);
      const ola = greeting.match(/^Olá (?=\p{Lu})/u);
      if (ola) add("satzzeichen", lineAt + ola[0].length - 1, 1, "A comma goes before the person's name: “Olá, Catarina”.", [", "]);
    }
  }
  return out;
}

/** "(30–40 words)" or "(80–100 palavras)" in the task situation, or null. */
export function wordRange(task) {
  const m = (task?.situation ?? "").match(/(\d+)\s*[–-]\s*(\d+)\s*(words|palavras)/);
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
      ${issues.length ? `<div class="skk-text" lang="pt-PT">${marked}</div>` : `<p class="skk-none">${esc(t(BACKEND.languageTool ? "none" : "noneOwn"))}</p>`}
      ${issues.length ? `<ol class="skk-list">${issues.map((i, k) => {
        const bad = text.slice(i.offset, i.offset + i.length);
        const fix = i.replacements[0];
        return `<li class="skk-item" data-n="${k}">
          <span class="skk-tag skk-${i.cat}">${esc(t(i.cat))}</span>
          <span class="skk-what" lang="pt-PT">${bad.trim() ? `<s>${esc(bad)}</s>` : ""}${fix != null ? ` → <b>${esc(fix.trim() || fix)}</b>` : ""}</span>
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
