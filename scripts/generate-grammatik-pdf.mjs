// Builds the downloadable Grammatik books from the site's own grammar data:
// src/data/grammatik/*.json (the 21 workspaces) plus src/data/grammatik.json (the
// quiz-only topics). One book per level and one complete A1–B2 edition.
//
//   pnpm generate:grammatik-pdf
//
// A reference book with a worksheet in every chapter. Each chapter runs in teaching order —
// rule, sentence shape, tables, Merke, practice — and the practice prints with blank answer
// lines; the answers go to a key at the back, so an exercise is an exercise and not its
// own solution. The book opens with the 30 most frequent German words, which are almost
// all grammar words: the case for the chapters that follow.
//
// Everything here is written by EnglishAcademy. Nothing is scanned, copied or excerpted
// from a Lehrwerk, which is what makes these free to hand out.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createDoc, plain, MUTED, TEAL, TEAL_DARK, TEAL_SOFT, INK, BORDER, MARGIN } from "./lib/pdf-brand.mjs";
import { isReviewed } from "../src/lib/topicStatus.js";
import { loadArt } from "./lib/pdf-art.mjs";
import { langsFor, languageOf } from "../src/lib/languages.js";
import sharp from "sharp";
import QRCode from "qrcode";
import { orderOf } from "../src/lib/grammatikOrder.js";
import { verbPairsSheetSvg } from "../src/lib/verbPairsArt.js";

// Pictures a topic's rule shows (`concept.pictures` in its data), rasterised once: pdfkit
// places PNGs. "verbpaare": the six verb pairs of the Wechselpräpositionen (verbPairsArt.js).
const PICTURES = { verbpaare: await sharp(Buffer.from(verbPairsSheetSvg()), { density: 220 }).png().toBuffer() };
import { all as lexicon } from "../src/lib/lexicon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "downloads");

const LEVELS = ["A1", "A2", "B1", "B2"];
const LEVEL_BLURB = {
  A1: "Erste Sätze",
  A2: "Alltag auf Deutsch",
  B1: "Selbstständig sprechen",
  B2: "Sicher argumentieren",
};

// --- Load -------------------------------------------------------------------

const wsDir = path.join(root, "src", "data", "grammatik");
// Drafts (status "entwurf", see src/lib/topicStatus.js) stay out of the PDFs until checked.
const workspaces = readdirSync(wsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(wsDir, f), "utf8")))
  .filter(isReviewed);

const quizTopics = JSON.parse(readFileSync(path.join(root, "src", "data", "grammatik.json"), "utf8"));
const wsIds = new Set(workspaces.map((w) => w.id));

/** Workspaces first: a level should open with its fullest topic, not with a bare rule. */
const topics = [
  ...workspaces.map((w) => ({ kind: "workspace", ...w })),
  ...quizTopics.filter((t) => !wsIds.has(t.id)).map((t) => ({ kind: "quiz", ...t })),
];

// The rule in the learner's language — the same file the topic pages read
// (src/data/uebersetzungen/grammatik.json), so the site and the PDF never disagree.
const help = JSON.parse(readFileSync(path.join(root, "src", "data", "uebersetzungen", "grammatik.json"), "utf8"));

/* The translated editions: every German explanation is followed by its translation; the
   examples, tables and exercises stay German, because German is the subject. */
const EDITIONS = {
  en: { name: "Englisch", cover: (lv) => `German grammar ${lv} with explanations in English` },
  ar: { name: "Arabisch", rtl: true, cover: (lv) => `قواعد اللغة الألمانية ${lv} مع الشرح باللغة العربية` },
  uk: { name: "Ukrainisch", cover: (lv) => `Граматика німецької мови ${lv} з поясненнями українською` },
  tr: { name: "Türkisch", cover: (lv) => `${lv} Almanca dilbilgisi, Türkçe açıklamalarla` },
  es: { name: "Spanisch", cover: (lv) => `Gramática alemana ${lv} con explicaciones en español` },
  pt: { name: "Portugiesisch", cover: (lv) => `Gramática alemã ${lv} com explicações em português` },
  vi: { name: "Vietnamesisch", cover: (lv) => `Ngữ pháp tiếng Đức ${lv}, giải thích bằng tiếng Việt` },
  hi: { name: "Hindi", cover: (lv) => `जर्मन व्याकरण ${lv}, हिन्दी में व्याख्या के साथ` },
  id: { name: "Indonesisch", cover: (lv) => `Tata bahasa Jerman ${lv} dengan penjelasan dalam bahasa Indonesia` },
  tl: { name: "Tagalog", cover: (lv) => `Gramatika ng German ${lv}, ipinaliwanag sa Tagalog` },
};
// The editions built: the help languages of the registry that have a cover line above.
// `--lang=es,pt` builds only those editions (no German book).
const ONLY = process.argv.find((a) => a.startsWith("--lang="))?.slice(7).split(",") ?? null;
const EDITION_LANGS = langsFor("help").filter((c) => EDITIONS[c] && (!ONLY || ONLY.includes(c)));

/* The cover and the contents page of a translated edition, in the reader's language. The
   reader chose this file because they want the help in their language; a cover that tells
   them what is inside in German is the one page they may not be able to read yet.
   Chapter content keeps its German headings — German is the subject. */
const ukPlural = (n, one, few, many) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
const COVER_UI = {
  en: {
    explained: "Every rule explained in English; examples and tables stay in German",
    draft: "The English explanations are a machine draft, not yet checked by a teacher",
    topics: (n, levels) => `${n} topics${levels ? ` on four levels (${levels})` : ""}`,
    tables: (n) => `${n} reference tables`,
    online: "The matching exercises are free at englishacademy.com/grammatik",
    footer: "Written by EnglishAcademy — by teachers who actually teach. You may download, print and share this PDF in class. No account, no cost.",
    contents: "Contents", level: "Level", topic: "Topic",
  },
  ar: {
    explained: "كل قاعدة مشروحة بالعربية، والأمثلة والجداول تبقى بالألمانية",
    draft: "الشرح بالعربية مسودة آلية لم يراجعها معلم بعد",
    topics: (n, levels) => `عدد المواضيع: ${n}${levels ? ` في أربعة مستويات (${levels})` : ""}`,
    tables: (n) => `عدد الجداول المرجعية: ${n}`,
    online: "التمارين المرافقة مجانية على englishacademy.com/grammatik",
    footer: "كتبته EnglishAcademy — معلمون يدرّسون فعلًا. يمكنك تنزيل هذا الملف وطباعته ومشاركته في الصف بحرية. بدون حساب وبدون تكلفة.",
    contents: "المحتوى", level: "المستوى", topic: "الموضوع",
  },
  uk: {
    explained: "Кожне правило пояснено українською; приклади й таблиці залишаються німецькою",
    draft: "Пояснення українською — машинна чернетка, ще не перевірена викладачем",
    topics: (n, levels) => `${n} ${ukPlural(n, "тема", "теми", "тем")}${levels ? ` на чотирьох рівнях (${levels})` : ""}`,
    tables: (n) => `${n} ${ukPlural(n, "довідкова таблиця", "довідкові таблиці", "довідкових таблиць")}`,
    online: "Вправи до книги — безкоштовно на englishacademy.com/grammatik",
    footer: "Написано EnglishAcademy — викладачами, які справді викладають. Цей PDF можна вільно завантажувати, друкувати й роздавати на заняттях. Без акаунта, безкоштовно.",
    contents: "Зміст", level: "Рівень", topic: "Тема",
  },
  tr: {
    explained: "Her kural Türkçe açıklamalı; örnekler ve tablolar Almanca kalır",
    draft: "Türkçe açıklamalar bir makine taslağıdır, henüz bir öğretmen tarafından kontrol edilmedi",
    topics: (n, levels) => (levels ? `Dört seviyede (${levels}) ${n} konu` : `${n} konu`),
    tables: (n) => `${n} başvuru tablosu`,
    online: "İlgili alıştırmalar ücretsiz: englishacademy.com/grammatik",
    footer: "EnglishAcademy tarafından yazıldı — gerçekten ders veren öğretmenler tarafından. Bu PDF'yi serbestçe indirebilir, yazdırabilir ve derste paylaşabilirsin. Hesap yok, ücret yok.",
    contents: "İçindekiler", level: "Seviye", topic: "Konu",
  },
  es: {
    explained: "Cada regla explicada en español; los ejemplos y las tablas siguen en alemán",
    draft: "Las explicaciones en español son un borrador automático, todavía sin revisar por un profesor",
    topics: (n, levels) => `${n} temas${levels ? ` en cuatro niveles (${levels})` : ""}`,
    tables: (n) => `${n} tablas de referencia`,
    online: "Los ejercicios correspondientes son gratis en englishacademy.com/grammatik",
    footer: "Escrito por EnglishAcademy, por profesores que dan clase de verdad. Puedes descargar, imprimir y compartir este PDF en clase. Sin cuenta, sin costo.",
    contents: "Contenido", level: "Nivel", topic: "Tema",
  },
  pt: {
    explained: "Cada regra explicada em português; os exemplos e as tabelas continuam em alemão",
    draft: "As explicações em português são um rascunho automático, ainda não revisado por um professor",
    topics: (n, levels) => `${n} temas${levels ? ` em quatro níveis (${levels})` : ""}`,
    tables: (n) => `${n} tabelas de referência`,
    online: "Os exercícios correspondentes são gratuitos em englishacademy.com/grammatik",
    footer: "Escrito pela EnglishAcademy, por professores que realmente dão aula. Você pode baixar, imprimir e compartilhar este PDF em aula. Sem cadastro, sem custo.",
    contents: "Sumário", level: "Nível", topic: "Tema",
  },
  vi: {
    explained: "Mỗi quy tắc được giải thích bằng tiếng Việt; ví dụ và bảng vẫn bằng tiếng Đức",
    draft: "Phần giải thích tiếng Việt là bản dịch máy, chưa được giáo viên kiểm tra",
    topics: (n, levels) => `${n} chủ đề${levels ? ` ở bốn trình độ (${levels})` : ""}`,
    tables: (n) => `${n} bảng tra cứu`,
    online: "Bài tập đi kèm miễn phí tại englishacademy.com/grammatik",
    footer: "Do EnglishAcademy biên soạn, bởi những giáo viên thực sự đứng lớp. Bạn được tải về, in và chia sẻ PDF này trong lớp học. Không cần tài khoản, không mất phí.",
    contents: "Mục lục", level: "Trình độ", topic: "Chủ đề",
  },
  hi: {
    explained: "हर नियम हिन्दी में समझाया गया है; उदाहरण और तालिकाएँ जर्मन में ही हैं",
    draft: "हिन्दी व्याख्या मशीन से बना ड्राफ़्ट है, अभी किसी शिक्षक ने इसे जाँचा नहीं है",
    topics: (n, levels) => `${n} विषय${levels ? `, चार स्तरों पर (${levels})` : ""}`,
    tables: (n) => `${n} संदर्भ तालिकाएँ`,
    online: "इनसे जुड़े अभ्यास englishacademy.com/grammatik पर मुफ़्त हैं",
    footer: "EnglishAcademy ने लिखा है, ऐसे शिक्षकों ने जो सच में पढ़ाते हैं। आप यह PDF डाउनलोड, प्रिंट और कक्षा में साझा कर सकते हैं। न खाता, न कोई ख़र्च।",
    contents: "विषय-सूची", level: "स्तर", topic: "विषय",
  },
  id: {
    explained: "Setiap aturan dijelaskan dalam bahasa Indonesia; contoh dan tabel tetap dalam bahasa Jerman",
    draft: "Penjelasan bahasa Indonesia adalah draf terjemahan mesin, belum diperiksa oleh guru",
    topics: (n, levels) => `${n} topik${levels ? ` di empat tingkat (${levels})` : ""}`,
    tables: (n) => `${n} tabel rujukan`,
    online: "Latihan yang sesuai gratis di englishacademy.com/grammatik",
    footer: "Ditulis oleh EnglishAcademy, oleh guru yang benar-benar mengajar. Anda boleh mengunduh, mencetak, dan membagikan PDF ini di kelas. Tanpa akun, tanpa biaya.",
    contents: "Daftar isi", level: "Tingkat", topic: "Topik",
  },
  tl: {
    explained: "Bawat tuntunin ay ipinaliwanag sa Tagalog; ang mga halimbawa at talahanayan ay nananatiling German",
    draft: "Ang mga paliwanag sa Tagalog ay machine draft pa, hindi pa nasusuri ng guro",
    topics: (n, levels) => `${n} paksa${levels ? ` sa apat na antas (${levels})` : ""}`,
    tables: (n) => `${n} talahanayang sanggunian`,
    online: "Libre ang mga kaugnay na pagsasanay sa englishacademy.com/grammatik",
    footer: "Isinulat ng EnglishAcademy, ng mga gurong talagang nagtuturo. Puwede mong i-download, i-print at ibahagi ang PDF na ito sa klase. Walang account, walang bayad.",
    contents: "Nilalaman", level: "Antas", topic: "Paksa",
  },
};

/** Whether a topic's every explained block has this language. A book goes out in a
    language only if all its topics do — half-translated reads as broken. */
function translatedIn(topic, lang) {
  const e = help.entries[topic.id];
  if (!e) return false;
  const intro = topic.kind === "quiz" ? topic.intro : topic.subtitle;
  if (intro && !e.intro?.[lang]) return false;
  const qa = topic.concept?.qa ?? [];
  if (qa.some((_, i) => !e.qa?.[i]?.[lang])) return false;
  if (topic.concept?.noteHtml && !e.note?.[lang]) return false;
  return true;
}

/* Word meanings for the word tables of a translated edition. A table whose rows are single
   German words (kaufen, der Tisch, du · kommen) gets one more column with the word's meaning
   in the reader's language, from the site's lexicon (A1–B2), so the site and the PDF agree.
   Ukrainian is not in the lexicon yet; its drafts live in src/data/uebersetzungen/woerter-uk.json.
   A table only gets the column when at least 70 % of its rows are such a word: sentence
   tables and grammar-term tables stay as they are, and a word the lexicon lacks gets an
   empty cell rather than a guess. */
const woerterUk = JSON.parse(readFileSync(path.join(root, "src", "data", "uebersetzungen", "woerter-uk.json"), "utf8")).uk;
const MEANING_HEAD = { en: "English", ar: "Arabisch", uk: "Українська", tr: "Türkçe" };
const LEAD = new Set("der die das ein eine ich du er sie es wir ihr sich".split(" "));
const normWord = (w) => w.toLowerCase().replace(/[^a-zäöüß-]/g, "");
const lexA1B2 = lexicon().filter((e) => LEVELS.includes(e.level));
const byLemma = new Map();
const byForm = new Map();
for (const e of lexA1B2) if (!byLemma.has(normWord(e.lemma))) byLemma.set(normWord(e.lemma), e);
for (const e of lexA1B2) {
  // A form ("hatte", "gegangen", "Äpfel") points back at its lemma, so a row that shows
  // one still finds the word.
  for (const f of [...(e.forms ?? []), e.plural]) {
    const n = f ? normWord(String(f).split(/\s+/).at(-1)) : "";
    if (n && !byForm.has(n)) byForm.set(n, e);
  }
}
/** The one German word a table row is about, or null when its first cell is not one word. */
function rowWord(cell) {
  const content = plain(cell).replace(/\([^)]*\)/g, " ").split(/[\s·,/]+/).map(normWord).filter((t) => t && !LEAD.has(t));
  return content.length === 1 ? byLemma.get(content[0]) ?? byForm.get(content[0]) ?? null : null;
}
const meaningOf = (e, lang) => (lang === "uk" ? woerterUk[e.id] : e[lang]) ?? "";

/** The table with a meaning column added, or the table as it was. */
function withMeanings(head, rows, lang) {
  if (!lang) return { head, rows, opts: {} };
  const words = rows.map((r) => rowWord(r[0]));
  if (words.filter(Boolean).length / rows.length < 0.7) return { head, rows, opts: {} };
  return {
    head: [...head, MEANING_HEAD[lang]],
    rows: rows.map((r, i) => [...r, words[i] ? meaningOf(words[i], lang) : ""]),
    opts: EDITIONS[lang].rtl ? { rtl: [head.length] } : {},
  };
}

// --- The book's own words -----------------------------------------------------

/* Everything the book says in its own voice rather than from the topic data: the practice
   box, the Merke box, the frequency page, the answer key. German first, like every other
   block; a translated edition adds the line in the reader's language under it. */
const BOOK_UI = {
  de: {
    practiceTitle: "Jetzt üben Sie",
    practice: "Schreiben Sie Ihre Antworten auf die Linien. Die Lösungen stehen hinten im Buch.",
    merke: "Merke",
    example: "Beispiel",
    examples: "Beispiele",
    rule: "Die Regel",
    shape: "Satzbau",
    fill: "Ergänzen Sie die Sätze.",
    answer: "Ihre Antwort",
    solutions: "Lösungen",
    solutionsLead: "Hier stehen die Lösungen zu allen Übungen, Kapitel für Kapitel. Erst selbst probieren, dann nachsehen.",
    exercise: "Übung",
    chapter: "Kapitel",
    freqTitle: "Die 30 häufigsten Wörter",
    freqLead:
      "Diese Wörter hören und lesen Sie ständig — und fast alle sind Grammatikwörter: Artikel, Pronomen, " +
      "sein und haben, Präpositionen, nicht. Wer die Kapitel dieses Buches kennt, versteht schon die Hälfte jedes Gesprächs.",
    freqCover: (n) => `die ${n} häufigsten Wörter`,
    freqShare: "So viel von allem, was man hört, sind …",
    freqTip:
      "Lernen Sie diese Wörter nicht als Vokabeln, sondern mit ihrem Kapitel: „den“ gehört zum Akkusativ, „mir“ zum Dativ, „dass“ zu den Nebensätzen.",
    freqSource: "Quelle: OpenSubtitles 2018 (hermitdave/FrequencyWords, MIT), gesprochenes Deutsch aus Filmen und Serien, gezählt als Wortformen. Die Anteile sind Schätzungen.",
    group: {
      pronomen: "Pronomen · Präsens, Akkusativ, Dativ",
      artikel: "Artikel · Artikel, Akkusativ",
      verb: "sein / haben · Präsens, Perfekt",
      negation: "Negation · nicht oder kein",
      frage: "Fragewort · W-Fragen",
      praeposition: "Präposition · Dativ, Wechselpräp.",
      konnektor: "Konnektor · Satzstellung",
      other: "Partikel / Adverb",
    },
    levelTopics: (n) => `${n} Kapitel auf diesem Niveau`,
    onlineTitle: "Auch online üben",
    online: "Mehr Übungen zu diesem Kapitel – das Handy korrigiert sofort. Kostenlos, ohne Konto.",
  },
  en: {
    practiceTitle: "Your turn",
    practice: "Write your answers on the lines. The answers are at the back of the book.",
    merke: "Remember",
    examples: "Examples",
    solutions: "Answers",
    solutionsLead: "The answers to every exercise, chapter by chapter. Try first, then check.",
    freqTitle: "The 30 most frequent words",
    freqLead: "You hear and read these words all the time — and almost all of them are grammar words: articles, pronouns, sein and haben, prepositions, nicht. Know the chapters of this book and you already understand half of every conversation.",
    freqTip: "Don't learn these words as vocabulary — learn them with their chapter: „den“ belongs to the accusative, „mir“ to the dative, „dass“ to subordinate clauses.",
    onlineTitle: "Practise online",
    online: "Practise this chapter online: more exercises, and your phone checks your answers right away. Free, no account.",
  },
  ar: {
    practiceTitle: "دورك الآن",
    practice: "اكتب إجاباتك على الخطوط. الحلول في آخر الكتاب.",
    merke: "تذكّر",
    examples: "أمثلة",
    solutions: "الحلول",
    solutionsLead: "حلول جميع التمارين، فصلًا بعد فصل. جرّب أولًا، ثم تحقّق.",
    freqTitle: "أكثر 30 كلمة استخدامًا",
    freqLead: "تسمع هذه الكلمات وتقرؤها طوال الوقت — وكلها تقريبًا كلمات نحوية: أدوات التعريف، الضمائر، sein و haben، حروف الجر، nicht. من يعرف فصول هذا الكتاب يفهم نصف أي محادثة.",
    freqTip: "لا تحفظ هذه الكلمات كمفردات، بل مع فصلها: „den“ من حالة النصب، „mir“ من حالة الجر، „dass“ من الجمل الفرعية.",
    onlineTitle: "تدرّب على الإنترنت",
    online: "تدرّب على هذا الفصل على الإنترنت: تمارين أكثر، ويصحّح هاتفك إجاباتك فورًا. مجانًا وبدون حساب.",
  },
  uk: {
    practiceTitle: "Тепер ви",
    practice: "Пишіть відповіді на лініях. Розв’язки — в кінці книги.",
    merke: "Запам’ятайте",
    examples: "Приклади",
    solutions: "Розв’язки",
    solutionsLead: "Розв’язки до всіх вправ, розділ за розділом. Спершу спробуйте самі, потім перевірте.",
    freqTitle: "30 найчастіших слів",
    freqLead: "Ці слова ви чуєте й читаєте постійно — і майже всі вони граматичні: артиклі, займенники, sein і haben, прийменники, nicht. Хто знає розділи цієї книги, вже розуміє половину будь-якої розмови.",
    freqTip: "Вчіть ці слова не як лексику, а разом із розділом: „den“ — це знахідний відмінок, „mir“ — давальний, „dass“ — підрядні речення.",
    onlineTitle: "Тренуйтеся онлайн",
    online: "Тренуйте цей розділ онлайн: більше вправ, і телефон одразу перевіряє відповіді. Безкоштовно, без акаунта.",
  },
  tr: {
    practiceTitle: "Sıra sende",
    practice: "Cevaplarını çizgilerin üzerine yaz. Çözümler kitabın sonunda.",
    merke: "Unutma",
    examples: "Örnekler",
    solutions: "Çözümler",
    solutionsLead: "Tüm alıştırmaların çözümleri, bölüm bölüm. Önce kendin dene, sonra kontrol et.",
    freqTitle: "En sık kullanılan 30 kelime",
    freqLead: "Bu kelimeleri sürekli duyar ve okursun — ve neredeyse hepsi dilbilgisi kelimeleridir: artikeller, zamirler, sein ve haben, edatlar, nicht. Bu kitabın bölümlerini bilen, her konuşmanın yarısını zaten anlar.",
    freqTip: "Bu kelimeleri kelime listesi olarak değil, bölümleriyle birlikte öğren: „den“ -i hâline, „mir“ -e hâline, „dass“ yan cümlelere aittir.",
    onlineTitle: "Çevrimiçi çalış",
    online: "Bu bölümü çevrimiçi çalış: daha fazla alıştırma var ve telefonun cevaplarını hemen kontrol eder. Ücretsiz, hesap gerekmez.",
  },
  es: {
    practiceTitle: "Ahora practicas tú",
    practice: "Escribe tus respuestas en las líneas. Las soluciones están al final del libro.",
    merke: "Recuerda",
    examples: "Ejemplos",
    solutions: "Soluciones",
    solutionsLead: "Las soluciones de todos los ejercicios, capítulo por capítulo. Primero inténtalo, luego compruébalo.",
    freqTitle: "Las 30 palabras más frecuentes",
    freqLead: "Estas palabras las oyes y las lees todo el tiempo, y casi todas son palabras gramaticales: artículos, pronombres, sein y haben, preposiciones, nicht. Si conoces los capítulos de este libro, ya entiendes la mitad de cualquier conversación.",
    freqTip: "No aprendas estas palabras como vocabulario: apréndelas con su capítulo. „den“ va con el acusativo, „mir“ con el dativo, „dass“ con las oraciones subordinadas.",
    onlineTitle: "Practica en línea",
    online: "Practica este capítulo en línea: más ejercicios, y tu móvil corrige tus respuestas al instante. Gratis, sin cuenta.",
  },
  pt: {
    practiceTitle: "Agora é com você",
    practice: "Escreva suas respostas nas linhas. As soluções estão no fim do livro.",
    merke: "Lembre-se",
    examples: "Exemplos",
    solutions: "Soluções",
    solutionsLead: "As soluções de todos os exercícios, capítulo por capítulo. Primeiro tente, depois confira.",
    freqTitle: "As 30 palavras mais frequentes",
    freqLead: "Você ouve e lê essas palavras o tempo todo, e quase todas são palavras gramaticais: artigos, pronomes, sein e haben, preposições, nicht. Quem conhece os capítulos deste livro já entende metade de qualquer conversa.",
    freqTip: "Não aprenda essas palavras como vocabulário: aprenda junto com o capítulo delas. „den“ é do acusativo, „mir“ do dativo, „dass“ das orações subordinadas.",
    onlineTitle: "Pratique online",
    online: "Pratique este capítulo online: mais exercícios, e o celular corrige suas respostas na hora. Grátis, sem cadastro.",
  },
  vi: {
    practiceTitle: "Đến lượt bạn",
    practice: "Viết câu trả lời lên các dòng kẻ. Đáp án ở cuối sách.",
    merke: "Ghi nhớ",
    examples: "Ví dụ",
    solutions: "Đáp án",
    solutionsLead: "Đáp án của mọi bài tập, theo từng chương. Hãy tự làm trước, rồi mới xem.",
    freqTitle: "30 từ thường gặp nhất",
    freqLead: "Bạn nghe và đọc những từ này liên tục, và gần như tất cả đều là từ ngữ pháp: mạo từ, đại từ, sein và haben, giới từ, nicht. Nắm được các chương của cuốn sách này là bạn đã hiểu một nửa mọi cuộc trò chuyện.",
    freqTip: "Đừng học những từ này như từ vựng, hãy học cùng chương của chúng: „den“ thuộc đối cách, „mir“ thuộc tặng cách, „dass“ thuộc mệnh đề phụ.",
    onlineTitle: "Luyện tập trực tuyến",
    online: "Luyện chương này trực tuyến: nhiều bài tập hơn, và điện thoại chấm bài cho bạn ngay. Miễn phí, không cần tài khoản.",
  },
  hi: {
    practiceTitle: "अब आपकी बारी",
    practice: "अपने उत्तर लाइनों पर लिखें। हल किताब के आख़िर में हैं।",
    merke: "याद रखें",
    examples: "उदाहरण",
    solutions: "हल",
    solutionsLead: "हर अभ्यास के हल, अध्याय दर अध्याय। पहले ख़ुद कोशिश करें, फिर देखें।",
    freqTitle: "30 सबसे ज़्यादा आने वाले शब्द",
    freqLead: "ये शब्द आप हर समय सुनते और पढ़ते हैं, और लगभग सभी व्याकरण वाले शब्द हैं: आर्टिकल, सर्वनाम, sein और haben, संबंधसूचक, nicht। इस किताब के अध्याय जान लिए तो आप हर बातचीत का आधा हिस्सा पहले से समझते हैं।",
    freqTip: "इन शब्दों को शब्दावली की तरह नहीं, उनके अध्याय के साथ सीखें: „den“ कर्म कारक का है, „mir“ संप्रदान कारक का, „dass“ आश्रित उपवाक्य का।",
    onlineTitle: "ऑनलाइन अभ्यास करें",
    online: "इस अध्याय का ऑनलाइन अभ्यास करें: और अभ्यास, और आपका फ़ोन उत्तर तुरंत जाँचता है। मुफ़्त, बिना खाते के।",
  },
  id: {
    practiceTitle: "Sekarang giliran Anda",
    practice: "Tulis jawaban Anda di garis. Kunci jawaban ada di bagian belakang buku.",
    merke: "Ingat",
    examples: "Contoh",
    solutions: "Kunci jawaban",
    solutionsLead: "Kunci jawaban semua latihan, bab demi bab. Coba dulu sendiri, lalu periksa.",
    freqTitle: "30 kata yang paling sering muncul",
    freqLead: "Kata-kata ini Anda dengar dan baca terus-menerus, dan hampir semuanya kata tata bahasa: artikel, pronomina, sein dan haben, preposisi, nicht. Siapa yang menguasai bab-bab buku ini sudah memahami setengah dari setiap percakapan.",
    freqTip: "Jangan hafalkan kata-kata ini sebagai kosakata, pelajari bersama babnya: „den“ milik akusatif, „mir“ milik datif, „dass“ milik anak kalimat.",
    onlineTitle: "Berlatih online",
    online: "Latih bab ini secara online: lebih banyak latihan, dan ponsel Anda langsung memeriksa jawaban. Gratis, tanpa akun.",
  },
  tl: {
    practiceTitle: "Ikaw naman",
    practice: "Isulat ang mga sagot mo sa mga linya. Nasa dulo ng libro ang mga sagot.",
    merke: "Tandaan",
    examples: "Mga halimbawa",
    solutions: "Mga sagot",
    solutionsLead: "Ang mga sagot sa lahat ng pagsasanay, kabanata por kabanata. Subukan mo muna, saka mo tingnan.",
    freqTitle: "Ang 30 pinakamadalas na salita",
    freqLead: "Lagi mong naririnig at nababasa ang mga salitang ito, at halos lahat ay salitang pang-gramatika: pantukoy, panghalip, sein at haben, pang-ukol, nicht. Kung alam mo ang mga kabanata ng librong ito, naiintindihan mo na ang kalahati ng bawat usapan.",
    freqTip: "Huwag aralin ang mga salitang ito bilang bokabularyo; aralin kasama ng kabanata nila: ang „den“ ay sa Akkusativ, ang „mir“ ay sa Dativ, ang „dass“ ay sa Nebensatz.",
    onlineTitle: "Magsanay online",
    online: "Sanayin ang kabanatang ito online: mas maraming pagsasanay, at agad na sinusuri ng phone mo ang mga sagot. Libre, walang account.",
  },
};
const DE = BOOK_UI.de;


/* Some flows are two rules side by side, not one chain: "Wohin? → Akkusativ | Wo? → Dativ".
   Chained into one strip they read as a single sequence, so they are drawn one per line. */
const FLOW_LINES = {
  negation: [["Nomen mit ein / ohne Artikel", "→ kein"], ["alles andere", "→ nicht"]],
  wechselpraepositionen: [["Wohin?", "→ Akkusativ"], ["Wo?", "→ Dativ"]],
  "partizip-als-adjektiv": [["Partizip I = Infinitiv + d", "+ Adjektivendung"], ["Partizip II", "+ Adjektivendung"]],
  "n-deklination": [["Nominativ", "der Herr"], ["alle anderen Kasus", "den / dem / des Herrn"]],
};

/** The first of several accepted answers is the one to print; the rest are there so the
    site accepts a short form or a typo, not because a learner should learn them. */
const firstAnswer = (a) => plain(Array.isArray(a) ? a[0] : a);

/** An exercise hint written for the site ("Tippen Sie …") turned into one for paper. */
const printHint = (ex) =>
  plain(ex.hintPrint ?? ex.hint ?? "")
    .replace(/\bTippen Sie\b/g, "Schreiben Sie")
    .replace(/\bWählen Sie\b/g, "Schreiben Sie")
    .replace(/\bKlicken Sie auf\b/g, "Schreiben Sie")
    .replace(/\btippe\b/gi, "schreibe");

/** A rule bullet: "tag — text", unless the text already starts with its tag or the tag is
    only punctuation ("—", "+ +"), which printed "du — du: …" and "— — Maskuline …". */
function ruleLine(item) {
  const text = plain(item.html ?? item.text);
  const tag = plain(item.tag ?? "");
  if (!tag || !/\p{L}/u.test(tag) || text.toLowerCase().startsWith(tag.toLowerCase())) return text;
  return `${tag} — ${text}`;
}

// --- Drawing helpers that only this book needs --------------------------------

/** The Satzbau strip as chips, the way the site draws it. An item that starts with + = →
    brings its own connector; otherwise an arrow goes between two chips. */
function flowStrip(pdf, lines) {
  const { doc } = pdf;
  const chipH = 20;
  const lineH = chipH + 8;
  // Measure each line first so the whole strip stays on one page.
  pdf.ensureSpace(lines.length * lineH + 8);
  for (const items of lines) {
    let x = MARGIN;
    let y = doc.y;
    const parts = [];
    for (const raw of items.map(plain)) {
      const m = raw.match(/^([+=→,])\s*(.*)$/);
      if (raw === "," || raw === "→" || raw === "+") parts.push({ conn: raw });
      else if (m) parts.push({ conn: m[1] }, { chip: m[2] });
      else {
        if (parts.length && parts.at(-1).chip !== undefined) parts.push({ conn: "→" });
        parts.push({ chip: raw });
      }
    }
    for (const p of parts) {
      if (p.conn) {
        const cw = doc.font(pdf.F.bold).fontSize(12).widthOfString(p.conn) + 10;
        doc.fillColor(TEAL).text(p.conn, x + 5, y + 3.5, { lineBreak: false });
        x += cw;
        continue;
      }
      const tw = doc.font(pdf.F.bold).fontSize(9.5).widthOfString(pdf.S(p.chip));
      const cw = tw + 18;
      if (x + cw > MARGIN + pdf.contentWidth()) { x = MARGIN; y += lineH; }
      doc.roundedRect(x, y, cw, chipH, 10).fill(TEAL_SOFT);
      doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(9.5).text(pdf.S(p.chip), x + 9, y + 5.5, { lineBreak: false });
      x += cw;
    }
    doc.x = MARGIN;
    doc.y = y + lineH;
  }
  doc.moveDown(0.2);
}

/** A bullet whose answer part is bold: a finished example sentence. */
function exampleLine(pdf, before, answer, after) {
  const { doc } = pdf;
  pdf.ensureSpace(16);
  const y = doc.y;
  doc.fillColor(TEAL).font(pdf.F.bold).fontSize(10.25).text("•", MARGIN, y, { width: 12 });
  doc.fillColor(INK).font(pdf.F.regular).fontSize(10.25)
    .text(pdf.S(before), MARGIN + 12, y, { width: pdf.contentWidth() - 12, continued: true, lineGap: 2 })
    .font(pdf.F.bold).fillColor(TEAL_DARK).text(pdf.S(answer), { continued: true })
    .font(pdf.F.regular).fillColor(INK).text(pdf.S(after));
  doc.x = MARGIN;
  doc.moveDown(0.3);
}

// --- Render one topic -------------------------------------------------------

/**
 * One chapter, in teaching order: what it is about → the rule → the sentence shape with an
 * example → the reference tables → examples and typical cases → Merke → practice.
 * The practice is a worksheet: the answer column is blank and the key goes to the back.
 */
function renderTopic(pdf, topic, { num, withBadge, lang = null, art, key, online }) {
  pdf.chapter(`${num}. ${topic.name}`, withBadge ? topic.level : null);
  const ed = lang ? EDITIONS[lang] : null;
  const ui = lang ? BOOK_UI[lang] : null;
  const gx = lang ? help.entries[topic.id] : null;
  const tr = (block, opts = {}) => { if (block?.[lang]) pdf.translation(plain(block[lang]), { rtl: ed.rtl, ...opts }); };
  const exercises = [];

  if (topic.subtitle) {
    pdf.paragraph(plain(topic.subtitle), { color: MUTED, size: 10.5 });
    tr(gx?.intro, { indent: 0 });
  }

  // The way back to the site, under every chapter heading: a book is what the learner keeps
  // and opens again, and it used to lead nowhere. Printed: the short address and a QR code;
  // tapped in a PDF viewer: the whole box. Here and not at the chapter's end, where it fell
  // onto a page of its own whenever the worksheet filled the last one.
  const o = online.get(topic.id);
  pdf.tip(`${DE.online}\n${o.url}`, {
    art: o.qr,
    artW: 46,
    tone: "online",
    link: o.href,
    title: ui && !ed.rtl ? `${DE.onlineTitle} · ${ui.onlineTitle}` : DE.onlineTitle,
    translation: ui?.online ?? null,
    rtl: Boolean(ed?.rtl),
  });

  if (topic.kind === "quiz") {
    // A quiz-only topic has its rule in one paragraph and a list of gap sentences. The first
    // three are shown finished, as the model; the rest are the practice.
    if (topic.intro) {
      pdf.h2(DE.rule, { icon: art.icon.rule, keep: 40 });
      pdf.callout(plain(topic.intro), { fill: TEAL_SOFT });
      tr(gx?.intro, { indent: 0 });
    }
    const qs = topic.questions ?? [];
    const [models, practice] = [qs.slice(0, 3), qs.slice(3)];
    if (models.length) {
      pdf.h2(DE.examples, { icon: art.icon.example, keep: 50 });
      for (const q of models) {
        const [before, after = ""] = plain(q.prompt.replace(/<em>\(.*?\)<\/em>/g, "")).split(/_{2,}/);
        exampleLine(pdf, before, firstAnswer(q.answer), after);
      }
    }
    if (practice.length) {
      exercises.push({
        title: DE.fill,
        hint: "",
        columns: ["Satz", DE.answer],
        rows: practice.map((q) => [plain(q.prompt).replace(/_{2,}/g, "______"), firstAnswer(q.answer)]),
        widths: [pdf.contentWidth() * 0.7, pdf.contentWidth() * 0.3],
      });
    }
  } else {
    const c = topic.concept ?? {};

    if (c.qa?.length) {
      pdf.h2(DE.rule, { icon: art.icon.rule, keep: 40 });
      c.qa.forEach((item, i) => {
        pdf.bullet(ruleLine(item));
        tr(gx?.qa?.[i]);
      });
    }

    if (PICTURES[c.pictures]) {
      const w = pdf.contentWidth();
      const h = w * (470 / 830);
      pdf.h2("Verbpaare im Bild", { icon: art.icon.rule, keep: h + 10 });
      if (pdf.doc.y + h > pdf.contentBottom()) pdf.doc.addPage();
      pdf.doc.image(PICTURES[c.pictures], MARGIN, pdf.doc.y, { width: w });
      pdf.doc.y += h + 10;
    }

    const lines = FLOW_LINES[topic.id] ?? (c.flow?.length ? [c.flow.map((f) => f.text)] : null);
    if (lines) {
      pdf.h2(DE.shape, { icon: art.icon.flow, keep: lines.length * 28 + 20 });
      flowStrip(pdf, lines);
      if (c.exampleHtml) {
        pdf.paragraph(`${DE.example}: ${plain(c.exampleHtml)}`, { italic: true, color: TEAL_DARK, size: 10.5 });
      }
    }

    // The reason to print this at all.
    for (const t of c.reference?.tables ?? []) {
      const tb = withMeanings(t.head.map(plain), t.rows.map((r) => r.map((cell) => plain(cell).replace(/[{}]/g, ""))), lang);
      pdf.h2(plain(t.caption) || "Übersicht", { icon: art.icon.table, keep: pdf.tableHeight(tb.head, tb.rows, tb.opts, 3) });
      pdf.table(tb.head, tb.rows, tb.opts);
    }

    // `boxes`: a badge over a list of examples. The badge is the heading.
    for (const box of c.reference?.boxes ?? []) {
      const items = (box.items ?? []).map((item) => (typeof item === "string" ? plain(item) : plain(item.html ?? item.text ?? "")));
      if (box.badge) pdf.h2(plain(box.badge), { icon: art.icon.example, keep: Math.min(3, items.length) * 18 });
      for (const it of items) pdf.bullet(it);
    }

    if (c.noteHtml) {
      pdf.tip(plain(c.noteHtml), {
        art: art.mascot.idea,
        title: ui && !ed.rtl ? `${DE.merke} · ${ui.merke}` : DE.merke,
        translation: gx?.note?.[lang] ? plain(gx.note[lang]) : null,
        rtl: Boolean(ed?.rtl),
      });
    }

    // Only the table exercises come along: term → answer prints as a worksheet. The other
    // four types (fill, match, story, build) are interactions that do not survive paper.
    for (const ex of (topic.exercises ?? []).filter((e) => e.type === "table" && e.rows?.length)) {
      exercises.push({
        title: plain(ex.title),
        hint: printHint(ex),
        columns: (ex.columns ?? ["", DE.answer]).map(plain),
        rows: ex.rows.map((r) => [plain(r.term), firstAnswer(r.answer)]),
      });
    }
  }

  if (exercises.length) {
    pdf.tip(DE.practice, {
      art: art.mascot.write,
      title: ui && !ed.rtl ? `${DE.practiceTitle} · ${ui.practiceTitle}` : DE.practiceTitle,
      translation: ui?.practice ?? null,
      rtl: Boolean(ed?.rtl),
    });
  }
  exercises.forEach((ex, k) => {
    const label = `${DE.exercise} ${num}.${k + 1}`;
    // The worksheet: term, a blank line for the answer, and — in a translated edition — the
    // word's meaning, which is help, not the answer.
    const blankRows = ex.rows.map(([term]) => [term, ""]);
    const tb = withMeanings(ex.columns, blankRows, lang);
    const opts = { ...tb.opts, writeCols: [1], rowPadding: 8, squeeze: 4, minRowHeight: 12, ...(ex.widths && !lang ? { widths: ex.widths } : {}) };
    const hintH = ex.hint ? pdf.paragraphHeight(ex.hint, { size: 9.5 }) : 0;
    pdf.h2(`${label}: ${ex.title}`, { icon: art.icon.pencil, keep: hintH + pdf.tableHeight(tb.head, tb.rows, opts, 3) });
    if (ex.hint) pdf.paragraph(ex.hint, { color: MUTED, size: 9.5 });
    pdf.table(tb.head, tb.rows, opts);
    key.push({ label, chapter: `${num}. ${topic.name}`, rows: ex.rows });
  });
}

/** Each topic's page on the site and its QR code: the address printed in the book, and the
    link with the book's name in utm tags (PostHog reads them as the session's source). */
async function onlineLinks(list, book) {
  const pairs = await Promise.all(list.map(async (t) => {
    const url = `englishacademy.com/${t.slug ?? t.id}`;
    const href = `https://${url}?utm_source=pdf&utm_medium=grammatik&utm_campaign=${book}`;
    // The code carries only the source: fewer modules, so it still scans at 16 mm.
    const qr = await QRCode.toBuffer(`https://${url}?utm_source=pdf`, { margin: 1, width: 300, color: { dark: "#0f766e", light: "#ffffff" } });
    return [t.id, { url, href, qr }];
  }));
  return new Map(pairs);
}

// --- Front and back matter ----------------------------------------------------

/** "Die 30 häufigsten Wörter": the chart that says why grammar comes first. */
function frequencyPage(pdf, { lang, art }) {
  const { doc } = pdf;
  const ed = lang ? EDITIONS[lang] : null;
  const ui = lang ? BOOK_UI[lang] : null;
  pdf.chapter(DE.freqTitle, null);
  pdf.paragraph(DE.freqLead, { size: 10.5 });
  if (ui) pdf.translation(ui.freqLead, { rtl: ed.rtl, indent: 0 });

  // Three tiles: how much of all running speech the top 10 / 100 / 1 000 words are.
  const tiles = [10, 100, 1000];
  const gap = 10;
  const tw = (pdf.contentWidth() - gap * 2) / 3;
  pdf.ensureSpace(80);
  doc.moveDown(0.3);
  doc.fillColor(MUTED).font(pdf.F.bold).fontSize(9).text(DE.freqShare, MARGIN, doc.y);
  const y = doc.y + 4;
  tiles.forEach((n, i) => {
    const x = MARGIN + i * (tw + gap);
    doc.roundedRect(x, y, tw, 54, 8).fill(i === 1 ? TEAL : TEAL_SOFT);
    doc.fillColor(i === 1 ? "#ffffff" : TEAL_DARK).font(pdf.F.bold).fontSize(22)
      .text(`${String(freq.coverage[n]).replace(".", ",")} %`, x, y + 9, { width: tw, align: "center", lineBreak: false });
    doc.fillColor(i === 1 ? "#ffffff" : INK).font(pdf.F.regular).fontSize(8.5)
      .text(DE.freqCover(n.toLocaleString("de-DE")), x + 8, y + 36, { width: tw - 16, align: "center", lineBreak: false });
  });
  doc.y = y + 64;

  const color = { pronomen: "#0284c7", artikel: TEAL, verb: "#7c3aed", negation: "#e11d48", frage: "#d97706", praeposition: "#16a34a", konnektor: "#4f46e5" };
  pdf.barChart(
    freq.top.map((w) => ({
      label: w.word,
      value: w.count,
      color: color[w.group] ?? "#94a3b8",
      note: DE.group[w.group ?? "other"],
    })),
    { labelWidth: 46, noteWidth: 170, barH: 8, gap: 2, format: (v) => `${(v / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.` }
  );
  pdf.tip(DE.freqTip, { art: art.mascot.read, title: DE.merke + (ui && !ed.rtl ? ` · ${ui.merke}` : ""), translation: ui?.freqTip ?? null, rtl: Boolean(ed?.rtl) });
  pdf.paragraph(DE.freqSource, { color: MUTED, size: 7.5 });
}

/** A level's opening page in the complete edition: the level, its motto, its chapters. */
function levelOpener(pdf, level, list, art) {
  const { doc } = pdf;
  doc.addPage();
  const w = pdf.contentWidth();
  doc.roundedRect(MARGIN, 90, w, 230, 16).fill(TEAL_SOFT);
  doc.image(pdf.pic(art.mascot.cheer), MARGIN + w - 190, 105, { width: 170 });
  doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(72).text(level, MARGIN + 28, 120, { lineBreak: false });
  doc.fillColor(INK).font(pdf.F.bold).fontSize(20).text(pdf.S(LEVEL_BLURB[level]), MARGIN + 30, 215, { width: w - 240 });
  doc.fillColor(MUTED).font(pdf.F.regular).fontSize(10.5).text(DE.levelTopics(list.length), MARGIN + 30, 250, { width: w - 240 });
  doc.y = 350;
  for (const { num, topic } of list) pdf.bullet(`${num}. ${topic.name}`);
}

/** The answer key, chapter by chapter. Small type, two answers per line where they fit. */
function solutions(pdf, key, { lang, art }) {
  const ed = lang ? EDITIONS[lang] : null;
  const ui = lang ? BOOK_UI[lang] : null;
  // Titles draw in the Latin face; an Arabic half would print as empty boxes.
  pdf.chapter(ui && !ed.rtl ? `${DE.solutions} · ${ui.solutions}` : DE.solutions, null);
  pdf.tip(DE.solutionsLead, { art: art.mascot.cheer, translation: ui?.solutionsLead ?? null, rtl: Boolean(ed?.rtl) });
  let chapter = null;
  for (const ex of key) {
    if (ex.chapter !== chapter) {
      chapter = ex.chapter;
      pdf.section(chapter, null);
    }
    const head = [ex.label, ""];
    const opts = { fontSize: 8, rowPadding: 3, headerHeight: 16, widths: [pdf.contentWidth() * 0.62, pdf.contentWidth() * 0.38], inkCols: [1] };
    pdf.ensureSpace(pdf.tableHeight(head, ex.rows, opts, 3) + 10);
    pdf.table(head, ex.rows, opts);
  }
}

/** The contents page, drawn last onto the page reserved for it, when the numbers are known. */
function contents(pdf, pageIndex, entries, ui, rtl) {
  const { doc } = pdf;
  doc.switchToPage(pageIndex);
  const toc = rtl ? null : ui;
  doc.x = MARGIN;
  doc.y = 60;
  pdf.h2(toc ? `${toc.contents} · Inhalt` : "Inhalt");
  const w = pdf.contentWidth();
  // Shrink the row height until it all fits on the one reserved page.
  const levels = entries.filter((e) => e.level).length;
  const rows = entries.length - levels;
  const room = pdf.contentBottom() - doc.y - levels * 10;
  const rh = Math.min(17, room / (rows + levels));
  for (const e of entries) {
    if (e.level) {
      doc.y += 5;
      doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(9).text(e.level, MARGIN, doc.y, { lineBreak: false, characterSpacing: 1 });
      doc.moveTo(MARGIN + 26, doc.y + 5).lineTo(MARGIN + w, doc.y + 5).strokeColor(TEAL_SOFT).lineWidth(1).stroke();
      doc.y += rh + 1;
      continue;
    }
    const y = doc.y;
    doc.fillColor(INK).font(pdf.F.regular).fontSize(9.5).text(pdf.S(e.title), MARGIN + 8, y, { width: w - 60, lineBreak: false });
    doc.fillColor(TEAL_DARK).font(pdf.F.bold).fontSize(9.5).text(String(e.page), MARGIN + w - 40, y, { width: 40, align: "right", lineBreak: false });
    doc.moveTo(MARGIN + 8, y + rh - 4).lineTo(MARGIN + w, y + rh - 4).strokeColor(BORDER).lineWidth(0.4).stroke();
    doc.y = y + rh;
  }
}

// --- Build one book ---------------------------------------------------------

const freq = JSON.parse(readFileSync(path.join(root, "src", "data", "haeufigste-woerter.json"), "utf8"));

async function buildBook({ level, fileName, lang = null }) {
  const art = await loadArt();
  const list = level ? topics.filter((t) => t.level === level) : topics;
  const ordered = LEVELS.flatMap((lv) => list.filter((t) => t.level === lv).sort((a, b) => orderOf(a) - orderOf(b)));

  const ed = lang ? EDITIONS[lang] : null;
  if (ed) {
    const missing = ordered.filter((t) => !translatedIn(t, lang));
    if (missing.length) {
      console.log(`${fileName.padEnd(34)} übersprungen: ${missing.length} Themen ohne ${ed.name}`);
      return;
    }
  }
  const title = level ? `Grammatik ${level}` : "Grammatik A1–B2";
  const outPath = path.join(outDir, fileName);
  // Always the embedded font: it has the arrows the rules are written with, which the
  // built-in Helvetica printed as ">" ("der > den" read as "greater than").
  const pdf = createDoc({ outPath, runningHead: `DEUTSCHACADEMY · ${title.toUpperCase()}${ed ? ` · DEUTSCH–${ed.name.toUpperCase()}` : ""}`, unicode: true, script: lang ? languageOf(lang)?.script : null });
  const unreviewed = ed && ordered.some((t) => !help.entries[t.id]?.reviewed);
  const ui = lang ? COVER_UI[lang] : null;
  const tableCount = ordered.reduce((n, t) => n + (t.concept?.reference?.tables?.length ?? 0), 0);

  pdf.cover({
    eyebrow: `DEUTSCHACADEMY · GRAMMATIK${ed ? ` · DEUTSCH–${ed.name.toUpperCase()}` : ""}`,
    title,
    subtitle: level
      ? `${LEVEL_BLURB[level]} — alle Grammatikthemen dieses Niveaus: Regel, Tabellen, Übungen mit Lösungen.`
      : "Alle Grammatikthemen von A1 bis B2 in einem Band: Regel, Tabellen, Übungen mit Lösungen.",
    subtitleTranslated: ed?.cover(level ?? "A1–B2"),
    subtitleRtl: ed?.rtl,
    art: art.mascot.wave,
    meta: ui
      ? [ui.explained, ...(unreviewed ? [ui.draft] : []), ui.topics(ordered.length, level ? null : LEVELS.join(", ")), ui.tables(tableCount), ui.online]
      : [
          `${ordered.length} Themen${level ? "" : ` auf vier Niveaus (${LEVELS.join(", ")})`}, in der Reihenfolge, in der man sie lernt`,
          `${tableCount} Übersichtstabellen zum Nachschlagen`,
          "Übungen zum Ausfüllen, die Lösungen hinten im Buch",
          "Die interaktiven Übungen dazu stehen kostenlos auf englishacademy.com/grammatik",
        ],
    footer: ui?.footer ??
      "Von EnglishAcademy geschrieben — von Lehrkräften, die wirklich unterrichten. Dieses PDF darfst du frei " +
      "herunterladen, ausdrucken und im Unterricht weitergeben. Kein Konto, keine Kosten.",
    rtl: Boolean(ed?.rtl),
  });

  // Reserve the contents page; it is drawn at the end, when the page numbers are known.
  pdf.doc.addPage();
  const tocPage = pdf.pageNumber() - 1;
  const entries = [];

  // Each of these starts on a new page, so its number is the next one.
  const nextPage = () => pdf.pageNumber() + 1;

  entries.push({ title: DE.freqTitle, page: nextPage() });
  frequencyPage(pdf, { lang, art });

  const key = [];
  const online = await onlineLinks(ordered, fileName.replace(/\.pdf$/, ""));
  let num = 0;
  for (const lv of LEVELS) {
    const inLevel = ordered.filter((t) => t.level === lv);
    if (!inLevel.length) continue;
    const numbered = inLevel.map((topic) => ({ topic, num: ++num }));
    if (!level) levelOpener(pdf, lv, numbered, art);
    entries.push({ level: lv });
    for (const { topic, num: n } of numbered) {
      entries.push({ title: `${n}. ${topic.name}`, page: nextPage() });
      renderTopic(pdf, topic, { num: n, withBadge: !level, lang, art, key, online });
    }
  }

  entries.push({ level: " " }, { title: DE.solutions, page: nextPage() });
  solutions(pdf, key, { lang, art });
  contents(pdf, tocPage, entries, ui, Boolean(ed?.rtl));

  await pdf.finish();
  const kb = Math.round(statSync(outPath).size / 1024);
  console.log(`${fileName.padEnd(34)} ${String(ordered.length).padStart(2)} Themen  ${kb} KB`);
}

// `node scripts/generate-grammatik-pdf.mjs komplett-en` builds only the files whose name
// contains the argument — for checking one book without waiting for all twenty-five.
const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
for (const lang of [...(ONLY ? [] : [null]), ...EDITION_LANGS]) {
  const suffix = lang ? `-${lang}` : "";
  const books = [...LEVELS.map((level) => ({ level, fileName: `grammatik-${level.toLowerCase()}${suffix}.pdf` })),
    { level: null, fileName: `grammatik-a1-b2-komplett${suffix}.pdf` }];
  for (const b of books) if (!only || b.fileName.includes(only)) await buildBook({ ...b, lang });
}
