// "Correct my text" on a writing task (/ecriture/[id]).
//
// Two checkers, one result:
//   1. Our own rules, in the browser: what only the task knows, plus what learners of French
//      get wrong all the time: the non-breaking space before ? ! : ;, missing accents on words
//      that always carry one (déjà, très, ça), capitals on days and months, the punctuation of a
//      greeting (a comma), a few fixed gender, contraction and elision errors (à le, je ai),
//      "je suis 30 ans", "je" at the start of every sentence, a greeting and sign-off, the
//      word count the task asks for.
//   2. LanguageTool (api.languagetool.org, language "fr"): spelling and a good share of
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
// explanation language (the text they point at is French).
const T = {
  de: {
    button: "Text korrigieren", again: "Noch einmal korrigieren", busy: "Wird geprüft …",
    grammatik: "Grammatik", ausdruck: "Ausdruck", satzzeichen: "Satzzeichen", rechtschreibung: "Rechtschreibung",
    none: "Keine Fehler gefunden. Gut gemacht!", apply: "Korrektur übernehmen", applyAll: "Alle Korrekturen übernehmen",
    task: "Aufgabe", words: "{n} Wörter", wordsRange: "{n} Wörter — verlangt sind {min}–{max}.",
    ltDown: "Die Rechtschreibprüfung ist gerade nicht erreichbar. Unten stehen nur unsere eigenen Hinweise.",
    empty: "Schreib zuerst ein paar Sätze.", wait: "Einen Moment — gleich kannst du wieder prüfen.",
    points: "Hast du an alles gedacht?", hint: "Hinweis",
    ownOnly: "Das sind Basisprüfungen (geschütztes Leerzeichen vor ? ! : ;, Akzente, Großschreibung, Anrede, Länge), keine vollständige Korrektur. Vergleiche deinen Text auch mit dem Modelltext.",
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
    ownOnly: "These are basic checks (a non-breaking space before ? ! : ;, accents, capitals, greeting, length), not a full correction. Compare your text with the model text too.",
    noneOwn: "The basic checks found nothing.",
  },
  // Spanish of Spain, tú (no French block: the course has no French interface).
  es: {
    button: "Corregir mi texto", again: "Corregir de nuevo", busy: "Comprobando …",
    grammatik: "Gramática", ausdruck: "Expresión", satzzeichen: "Puntuación", rechtschreibung: "Ortografía",
    none: "No hemos encontrado errores. ¡Muy bien!", apply: "Aplicar la corrección", applyAll: "Aplicar todas las correcciones",
    task: "Tarea", words: "{n} palabras", wordsRange: "{n} palabras — la tarea pide {min}–{max}.",
    ltDown: "El corrector ortográfico no está disponible ahora mismo. Abajo solo aparecen nuestras propias indicaciones.",
    empty: "Escribe primero unas cuantas frases.", wait: "Un momento: enseguida podrás volver a comprobarlo.",
    points: "¿Has pensado en todo?", hint: "Indicación",
    ownOnly: "Son comprobaciones básicas (espacio indivisible antes de ? ! : ;, acentos, mayúsculas, saludo, extensión), no una corrección completa. Compara también tu texto con el texto modelo.",
    noneOwn: "Las comprobaciones básicas no han encontrado nada.",
  },
  pt: {
    button: "Corrigir meu texto", again: "Corrigir de novo", busy: "Verificando …",
    grammatik: "Gramática", ausdruck: "Expressão", satzzeichen: "Pontuação", rechtschreibung: "Ortografia",
    none: "Nenhum erro encontrado. Muito bem!", apply: "Aplicar a correção", applyAll: "Aplicar todas as correções",
    task: "Tarefa", words: "{n} palavras", wordsRange: "{n} palavras — a tarefa pede {min}–{max}.",
    ltDown: "O corretor ortográfico não está disponível no momento. Abaixo estão apenas as nossas observações.",
    empty: "Escreva primeiro algumas frases.", wait: "Um momento: logo você poderá verificar de novo.",
    points: "Você pensou em tudo?", hint: "Observação",
    ownOnly: "Estas são verificações básicas (espaço inseparável antes de ? ! : ;, acentos, maiúsculas, saudação, extensão), não uma correção completa. Compare também o seu texto com o texto modelo.",
    noneOwn: "As verificações básicas não encontraram nada.",
  },
  it: {
    button: "Correggi il mio testo", again: "Correggi di nuovo", busy: "Controllo in corso …",
    grammatik: "Grammatica", ausdruck: "Espressione", satzzeichen: "Punteggiatura", rechtschreibung: "Ortografia",
    none: "Nessun errore trovato. Ottimo lavoro!", apply: "Applica la correzione", applyAll: "Applica tutte le correzioni",
    task: "Compito", words: "{n} parole", wordsRange: "{n} parole — il compito ne chiede {min}–{max}.",
    ltDown: "Il controllo ortografico non è raggiungibile in questo momento. Qui sotto trovi solo i nostri suggerimenti.",
    empty: "Prima scrivi qualche frase.", wait: "Un momento: tra poco puoi controllare di nuovo.",
    points: "Hai pensato a tutto?", hint: "Nota",
    ownOnly: "Questi sono controlli di base (spazio unificatore prima di ? ! : ;, accenti, maiuscole, saluto, lunghezza), non una correzione completa. Confronta il tuo testo anche con il testo modello.",
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
  const body = new URLSearchParams({ text, language: "fr", level: "default" });
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

// Only words that make a sentence a question beyond doubt count here.
const QUESTION_START = /^(Est-ce que|Pourquoi|Pouvez-vous|Pourriez-vous|Avez-vous|Auriez-vous|Peux-tu|Pourrais-tu|Où est|Où sont|Quand est|Combien de)(?![\p{L}])/u;
const NBSP = " ";
// Only words with one possible spelling, so the hint can't be wrong: "a/à", "ou/où", "sur/sûr",
// "du/dû" depend on the sentence and are left to a person.
const ALWAYS_ACCENT = {
  deja: "déjà", tres: "très", apres: "après", etre: "être", eleve: "élève", eleves: "élèves", ecole: "école",
  francais: "français", francaise: "française", etudiant: "étudiant", etudiante: "étudiante", etudes: "études",
  probleme: "problème", problemes: "problèmes", systeme: "système", theme: "thème", mere: "mère", pere: "père",
  frere: "frère", meme: "même", cafe: "café", voila: "voilà", bientot: "bientôt", plutot: "plutôt", aout: "août",
  fevrier: "février", decembre: "décembre", ete: "été", numero: "numéro", telephone: "téléphone", prefecture: "préfecture",
  reponse: "réponse", recu: "reçu", lecon: "leçon", garcon: "garçon", dejeuner: "déjeuner", reunion: "réunion",
  quartier: "quartier", appartement: "appartement", resume: "résumé", demenagement: "déménagement", demenager: "déménager",
  adresse: "adresse", cote: "côté", hopital: "hôpital", pret: "prêt", ecrire: "écrire", ecris: "écris", echeance: "échéance",
  eteint: "éteint", electricite: "électricité", memoire: "mémoire", medecin: "médecin", sante: "santé", securite: "sécurité",
  societe: "société", presente: "présente", cordialement: "cordialement", desole: "désolé", desolee: "désolée",
  ca: "ça", a_bientot: "à bientôt",
};
delete ALWAYS_ACCENT.quartier; delete ALWAYS_ACCENT.appartement; delete ALWAYS_ACCENT.adresse;
delete ALWAYS_ACCENT.cordialement; delete ALWAYS_ACCENT.a_bientot;
// "Le Lundi", "en Mars": days and months take a small letter in French. Letter lookarounds,
// because \b counts "é" as a word break.
const CAPITAL_DATE = /(?<=(?<!\p{L})(?:le|ce|du|chaque|prochain)\s)(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)(?!\p{L})|(?<=(?:(?<!\p{L})(?:en|de|mi|début|fin)\s|d'|\d\s|1er\s))(?:Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)(?!\p{L})/gu;
// Fixed errors: wrong in any sentence these words can appear in.
const MASC = "problème|logement|document|appartement|dossier|travail|courriel|bureau|contrat|loyer|titre|chauffage|immeuble|rendez-vous|certificat|justificatif|formulaire";
const FEM = "maison|lettre|demande|réunion|facture|chambre|adresse|attestation|préfecture|mairie|caution|carte|date|candidature|réclamation|réponse|signature|pièce";
const FIXED = [
  [new RegExp(`(?<!\\p{L})(la|une) (${MASC})(?!\\p{L})`, "giu"), (m) => `${m[1].toLowerCase() === "la" ? "le" : "un"} ${m[2]}`, "This noun is masculine."],
  [new RegExp(`(?<!\\p{L})(le|un) (${FEM})(?!\\p{L})`, "giu"), (m) => `${m[1].toLowerCase() === "le" ? "la" : "une"} ${m[2]}`, "This noun is feminine."],
  [/(?<!\p{L})à le(?!\p{L})/giu, () => "au", "“à” + “le” contracts to “au”."],
  [/(?<!\p{L})à les(?!\p{L})/giu, () => "aux", "“à” + “les” contracts to “aux”."],
  [/(?<!\p{L})de le(?!\p{L})/giu, () => "du", "“de” + “le” contracts to “du”."],
  [/(?<!\p{L})de les(?!\p{L})/giu, () => "des", "“de” + “les” contracts to “des”."],
  [/(?<!\p{L})[Jj]e (ai|aime|habite|arrive|écris|attends|espère|étais|essaie|ouvre)(?!\p{L})/gu, (m) => `j'${m[1]}`, "“je” elides before a vowel or mute h: “j'ai”, “j'habite”."],
  [/(?<!\p{L})[Cc]e est(?!\p{L})/gu, () => "c'est", "“ce” + “est” becomes “c'est”."],
  [/(?<!\p{L})[Ss]i (il|ils)(?!\p{L})/gu, (m) => `s'${m[1]}`, "“si” elides before “il”/“ils”: “s'il vous plaît”, “s'ils”."],
  [/(?<!\p{L})que (il|elle|ils|elles|on)(?!\p{L})/giu, (m) => `qu'${m[1]}`, "“que” elides before a vowel: “qu'il”, “qu'elle”."],
  [/(?<!\p{L})([Jj]e|[Ii]l|[Ee]lle|[Oo]n) à (été|fait|eu|dit|reçu|pris|vu)(?!\p{L})/gu, (m) => `${m[1]} a ${m[2]}`, "“a” (from “avoir”) takes no accent: “il a été”."],
  [/(?<!\p{L})[Jj]e suis (\d+) ans(?!\p{L})/gu, (m) => `j'ai ${m[1]} ans`, "French gives age with “avoir”: “j'ai 30 ans”."],
  [/(?<!\p{L})très beaucoup(?!\p{L})/giu, () => "beaucoup", "“Très” does not go with “beaucoup”: say “beaucoup” or “très bien”."],
];
const GREETING = /^(Bonjour|Bonsoir|Salut|Coucou|Madame|Monsieur|Mesdames|Chère?s?|Chères|À l'attention|A l'attention|Objet)(?![\p{L}])/iu;
const SIGN_OFF = /(cordialement|salutations|bien à vous|bien a vous|amicalement|bises?|bisous|à bientôt|a bientot|à très bientôt|à plus|merci|bonne (journée|soirée)|veuillez agréer|je vous prie d'agréer|dans l'attente|amitiés|je t'embrasse|à demain|à samedi|à dimanche)/iu;
const count = (s, ch) => s.split(ch).length - 1;
const keepCase = (src, fix) => (src[0] === src[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix);

function ownRules(text, task) {
  const out = [];
  const add = (cat, offset, length, message, replacements = []) => out.push({ cat, offset, length, message, replacements, source: "own" });

  // A "sentence" here runs to the next end mark, so "M." and "3e" can cut one in two.
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
    // 1. A question that starts like one but has no question mark.
    if (QUESTION_START.test(sentence) && !/[?!]/.test(sentence) && words.length >= 3) {
      add("satzzeichen", endAt - lastWord.length, lastWord.length, "A question ends with “?”, and French puts a non-breaking space before it.", [`${lastWord.replace(/[.,]$/, "")}${NBSP}?`]);
    }
    // 2. The text needs a final mark. A last line of capitalised words is a signature.
    const isLast = start + sentence.length === text.trimEnd().length;
    if (isLast && words.length >= 3 && !/[.!?:,]$/.test(sentence) && words.some((w) => /^\p{Ll}/u.test(w))) {
      add("satzzeichen", endAt - lastWord.length, lastWord.length, "The sentence needs a full stop at the end.", [`${lastWord}.`]);
    }
  }

  // 3. French typography: a space before ? ! ; : (a non-breaking one is the standard; a normal
  //    space is accepted by most readers, no space at all is the mistake English speakers make).
  //    A colon inside a time (10:00) or a web address is left alone.
  for (const m of text.matchAll(/(?<=\p{L}|[)»"0-9])([ ]?)([?!;:])(?=\s|$)/gu)) {
    add("satzzeichen", m.index, m[1].length, "French writes a non-breaking space before ? ! ; and : — “Vous venez ?”, “Attention !”.", [NBSP]);
  }
  // 4. Words that always carry an accent when written correctly.
  for (const m of text.matchAll(/\p{L}+/gu)) {
    const low = m[0].toLowerCase();
    const fix = Object.hasOwn(ALWAYS_ACCENT, low) ? ALWAYS_ACCENT[low] : null;
    if (fix) add("rechtschreibung", m.index, m[0].length, "This word needs its accent. In French it is part of the spelling.", [keepCase(m[0], fix)]);
  }

  // 5. Days and months take a small letter in French.
  for (const m of text.matchAll(CAPITAL_DATE)) {
    add("rechtschreibung", m.index, m[0].length, "Days and months are written with a small letter in French.", [m[0].toLowerCase()]);
  }

  // 6. Fixed errors of gender, contraction, elision and a few verbs.
  for (const [re, fix, msg] of FIXED) {
    for (const m of text.matchAll(re)) add("grammatik", m.index, m[0].length, msg, [keepCase(m[0], fix(m))]);
  }

  // 7. "Je" at the start of three sentences in a row: it reads like a list.
  let run = 0;
  for (const s of sentences) {
    const sentence = s[0].trimStart();
    if (/^(Je|J')(?!\p{L})/u.test(sentence)) {
      run++;
      if (run === 3) add("ausdruck", s.index + (s[0].length - sentence.length), 2, "Three sentences in a row start with “Je”. Vary the start: “Il y a…”, “C'est…”, “Depuis lundi, …”, “Pourriez-vous…”.");
    } else run = 0;
  }

  // 8. A message, email or letter needs a greeting and a sign-off.
  if (["nachricht", "email", "brief"].includes(task?.type)) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    // A letter may open with the sender's address and the date, so the greeting can be a few lines down.
    const greeting = lines.slice(0, 8).find((l) => GREETING.test(l));
    if (lines.length && !greeting) {
      add("ausdruck", 0, 0, "A greeting is missing at the start, e.g. “Bonjour Léa,” or “Madame, Monsieur,”.");
    }
    const tail = lines.slice(-4).join(" ");
    if (lines.length > 1 && !SIGN_OFF.test(tail)) {
      add("ausdruck", text.trimEnd().length, 0, "A sign-off is missing at the end, e.g. “Cordialement,” or “À bientôt,”.");
    }
    // 9. The greeting's punctuation: a comma, not a colon; and no comma at all is a gap.
    if (greeting) {
      const lineAt = text.indexOf(greeting);
      if (/[:;]$/.test(greeting)) {
        add("satzzeichen", lineAt + greeting.length - 1, 1, "In French the greeting of an email or letter ends with a comma, not a colon: “Madame, Monsieur,”.", [","]);
      } else if (task.type !== "nachricht" && greeting.split(/\s+/).length <= 6 && !/[,!?]$/.test(greeting) && /^(Bonjour|Bonsoir|Madame|Monsieur|Mesdames|Chère?s?)/iu.test(greeting)) {
        add("satzzeichen", lineAt + greeting.length, 0, "The greeting ends with a comma: “Bonjour Madame Lefèvre,”.", [","]);
      }
    }
  }
  return out;
}

/** "(30–40 words)" or "(80–100 mots)" in the task situation, or null. */
export function wordRange(task) {
  const m = (task?.situation ?? "").match(/(\d+)\s*[–-]\s*(\d+)\s*(words|mots)/);
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
      ${issues.length ? `<div class="skk-text" lang="fr">${marked}</div>` : `<p class="skk-none">${esc(t(BACKEND.languageTool ? "none" : "noneOwn"))}</p>`}
      ${issues.length ? `<ol class="skk-list">${issues.map((i, k) => {
        const bad = text.slice(i.offset, i.offset + i.length);
        const fix = i.replacements[0];
        return `<li class="skk-item" data-n="${k}">
          <span class="skk-tag skk-${i.cat}">${esc(t(i.cat))}</span>
          <span class="skk-what" lang="fr">${bad.trim() ? `<s>${esc(bad)}</s>` : ""}${fix != null ? ` → <b>${esc(fix.trim() || fix)}</b>` : ""}</span>
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
