// The brand's look for generated PDFs, as reusable primitives.
//
// scripts/generate-fakten-pdf.mjs grew these inline and they were good; a second and third
// generator wanting the same cover, the same teal rule under a heading and the same striped
// table made copying them the wrong move. That script is left alone — it works, and a
// refactor of a shipping generator buys nothing here — but everything written after it
// builds on this file, so the downloads look like one set rather than three.
//
// pdfkit's built-in Helvetica is WinAnsi-encoded, which covers ä ö ü ß € — the whole set the
// German content needs. No font files to ship, no licence to check.
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fonts");

// Matches src/styles/global.css.
export const TEAL = "#0d9488";
export const TEAL_DARK = "#0f766e";
export const TEAL_SOFT = "#ccfbf1";
export const INK = "#1a2230";
export const MUTED = "#4b5768";
export const BORDER = "#e7e9ee";
export const SURFACE = "#f7f8fa";
export const MARGIN = 56;

/* pdfkit's built-in fonts are WinAnsi-encoded, and a code point outside that repertoire does
   not fail loudly — it draws as whatever byte happens to land there. The site's German is
   fine (ä ö ü ß € „ “ – — … all exist), but the arrows the grammar flows are built from do
   not, and "haben/sein → Position 2" printed as "haben/sein !' Position 2" before this map
   existed. Everything that cannot be drawn is either replaced with something that can or
   dropped, and sanitising happens at draw time so no caller can forget. */
const CHAR_MAP = new Map(Object.entries({
  "→": ">", "⇒": ">", "➡": ">", "➔": ">", "➜": ">",
  "←": "<", "⇐": "<",
  "↔": "<>", "⇔": "<>",
  "↑": "^", "↓": "v",
  "✓": "+", "✔": "+", "✗": "-", "✘": "-", "✖": "-",
  "▲": "", "▼": "", "▶": "", "◀": "",
  "−": "-", "≠": "!=", "≈": "~", "≤": "<=", "≥": ">=",
  " ": " ", " ": " ", " ": " ", "​": "",
}));

/* The embedded font (NotoSansDA, see scripts/fonts/README.md) has the arrows and signs the
   grammar explanations are written with — "du kommst → Komm!", "ich ≠ meine Eltern" — so in
   unicode mode only the few it still lacks are swapped for their nearest relative. */
const UNICODE_MAP = new Map(Object.entries({
  "➡": "→", "➔": "→", "➜": "→", "⇐": "←", "⇔": "↔",
  "✔": "✓", "✗": "×", "✘": "×", "✖": "×",
  "▲": "", "▼": "", "◀": "",
}));

// The signs the merged Devanagari face lacks, as text (createDoc, script "Deva").
const DEVA_MAP = { "≠": "!=", "≈": "~", "≤": "<=", "≥": ">=", "✓": "+", "✔": "+", "✗": "x", "✘": "x", "✖": "x", "×": "x", "⇒": "→", "⇐": "←", "⇔": "↔", "➡": "→", "➔": "→", "➜": "→", "↑": "^", "↓": "v" };

// Latin-1 minus the C1 control block, plus the printable characters WinAnsi puts in 0x80–0x9F.
const WIN_ANSI_EXTRAS = new Set(
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ" +
  "‘’“”•–—˜™š›œžŸ"
);

/** Makes a string safe to draw with a built-in pdfkit font. */
export function safe(text) {
  let out = "";
  for (const ch of String(text ?? "")) {
    if (CHAR_MAP.has(ch)) { out += CHAR_MAP.get(ch); continue; }
    const cp = ch.codePointAt(0);
    if (ch === "\n" || ch === "\t" || (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || WIN_ANSI_EXTRAS.has(ch)) {
      out += ch;
    }
    // anything else is dropped rather than drawn as a stray byte
  }
  return out;
}

/** `<strong>fett</strong>` -> `fett`. The content is authored as HTML for the web; a PDF
    wants the words. Entities are decoded, block-ish tags become spaces so words do not
    run together, everything else is dropped. */
export function plain(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|tr)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Document properties (File → Properties in any PDF reader). Every download names its author
 * and carries the rights notice, so a copy passed around without our cover still says whose
 * it is. Exported for the German Fakten PDFs, which open their own PDFDocument.
 */
export const PDF_COPYRIGHT =
  "© 2018–2026 Edgar Kretschmann (icanspeak English), icanspeak.it/english. Kostenlos für den eigenen Unterricht; Weiterverkauf, Veröffentlichung auf anderen Plattformen und KI-Training nicht gestattet.";
export function pdfInfo(title) {
  return {
    Title: String(title ?? "icanspeak English").replace(/^DEUTSCHACADEMY · /, "icanspeak English · "),
    Author: "icanspeak English (Edgar Kretschmann)",
    Subject: PDF_COPYRIGHT,
    Keywords: "icanspeak English, icanspeak.it/english, Deutsch lernen",
    Creator: "icanspeak English — icanspeak.it/english",
  };
}

/**
 * Opens a document and returns it together with the helpers. Everything draws at the
 * current `doc.y` and leaves `doc.x` back at the margin, so callers can mix helpers and
 * raw pdfkit freely.
 *
 * @param {object} opts
 * @param {string} opts.outPath   where to write
 * @param {string} opts.runningHead  small caps line at the top of every page but the cover
 */
export function createDoc({ outPath, runningHead, unicode = false, footer = null, script = null }) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true, info: pdfInfo(runningHead) });

  // The translated editions carry Arabic, Cyrillic and Turkish ğ ş ı — none of which the
  // built-in WinAnsi fonts can draw. They embed Noto instead (scripts/fonts/README.md);
  // the German-only PDFs stay on Helvetica, and on safe(), exactly as before.
  let F = { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
  let S = safe;
  if (unicode) {
    doc.registerFont("Noto", path.join(FONT_DIR, "NotoSansDA-Regular.ttf"));
    doc.registerFont("Noto-Bold", path.join(FONT_DIR, "NotoSansDA-Bold.ttf"));
    doc.registerFont("Noto-Arabic", path.join(FONT_DIR, "NotoSansArabic-Regular.ttf"));
    F = { regular: "Noto", bold: "Noto-Bold", italic: "Noto" };
    S = (text) => [...String(text ?? "")].map((ch) => (UNICODE_MAP.has(ch) ? UNICODE_MAP.get(ch) : ch)).join("");
    /* Hindi: Noto Sans Devanagari with the Latin of Noto Sans merged in
       (NotoSansDevanagariDA, scripts/fonts/README.md), so German and Hindi share one face and
       fontkit shapes the conjuncts. It has → ← ↔ but not the rarer signs, which become their
       plain-text relatives. */
    if (script === "Deva") {
      doc.registerFont("Noto", path.join(FONT_DIR, "NotoSansDevanagariDA-Regular.ttf"));
      doc.registerFont("Noto-Bold", path.join(FONT_DIR, "NotoSansDevanagariDA-Bold.ttf"));
      const fit = (t) => String(t ?? "").replace(/[≠≈≤≥✓✔✗✘✖×⇒⇐⇔▶◀▲▼➡➔➜↑↓]/g, (c) => DEVA_MAP[c] ?? "");
      const base = S;
      S = (text) => fit(base(text));
    }
  }

  /* Right-to-left text is placed by hand, from the right edge leftwards. Handing pdfkit
     a whole Arabic line lost the spaces between words ("الاسم الأول" printed as one run):
     its line wrapper and fontkit's RTL reordering disagree about which end of a word a
     trailing space belongs to. So fontkit only ever gets one same-script piece at a time
     and does the job it does well — joining and ordering the letters inside it.

     Noto Sans Arabic has Arabic and nothing else: no Latin letters, and not even ( ) / —.
     Every word is therefore cut into script segments, and only the Arabic ones are drawn
     in the Arabic face; digits, punctuation and German go in the Latin one. */
  const ARABIC = /[\u0600-\u06FF]/;
  const LATIN = /[A-Za-z0-9\u00C0-\u024F]/;
  // In right-to-left text an opening bracket stands on the right and has to face left.
  const MIRROR = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«", "<": ">", ">": "<" };
  // A word is Arabic by its letters, not its punctuation: "Bäume" followed by an Arabic
  // comma is a German word, and must stay in its German phrase. Such a word is split in
  // two and the comma carries TIGHT — no space before it — so it lands on the Arabic side
  // of the German run, which is where bidi puts it.
  const ARABIC_LETTER = /[\u0620-\u064A\u066E-\u06D3\u06FA-\u06FF]/;
  const TIGHT = "\u0001";
  const bare = (tok) => tok.replace(TIGHT, "");
  function tokenize(text) {
    const out = [];
    for (const w of String(text ?? "").split(/\s+/).filter(Boolean)) {
      const m = !ARABIC_LETTER.test(w) && w.match(/^(.*[^\u060C\u061B\u061F])([\u060C\u061B\u061F]+)$/);
      if (m) out.push(m[1], TIGHT + m[2]);
      else out.push(w);
    }
    return out;
  }
  const segments = (word) => bare(word).match(/[\u0600-\u06FF]+|[^\u0600-\u06FF]+/g) ?? [];
  const segFont = (seg) => (ARABIC.test(seg) ? "Noto-Arabic" : F.regular);
  const segWidth = (seg, size) => doc.font(segFont(seg)).fontSize(size).widthOfString(seg);
  const wordWidth = (word, size) => segments(word).reduce((n, seg) => n + segWidth(seg, size), 0);
  function rtlWidth(words, size) {
    const space = doc.font(F.regular).fontSize(size).widthOfString(" ");
    return words.reduce((n, w, i) => n + wordWidth(w, size) + (i > 0 && !w.startsWith(TIGHT) ? space : 0), 0);
  }
  // pdfkit places text by the top of the line box, and Noto Sans Arabic's ascender is
  // taller than Noto Sans's — so each piece is nudged onto the Latin face's baseline, the
  // one the German in the neighbouring cells sits on.
  const ascender = (name) => doc.font(name)._font.ascender;
  const drawSeg = (seg, x, y, size) => {
    const font = segFont(seg);
    doc.font(font).fontSize(size).text(seg, x, y + ((ascender(F.regular) - ascender(font)) * size) / 1000, { lineBreak: false });
  };
  /** One word of a right-to-left run: its segments go right to left, brackets mirrored. */
  function drawRtlWord(word, right, y, size) {
    let x = right;
    for (let seg of segments(word)) {
      if (!ARABIC.test(seg) && !LATIN.test(seg)) seg = [...seg].reverse().map((c) => MIRROR[c] ?? c).join("");
      x -= segWidth(seg, size);
      drawSeg(seg, x, y, size);
    }
  }
  /* A German phrase inside an Arabic sentence ("… مثل der hohe Baum …") must still read
     left to right, so a line is cut into runs: consecutive Latin words form one run whose
     words go left to right, and the runs themselves are placed right to left. A token with
     neither script (a dash, a lone bracket) joins the run before it. */
  function rtlRuns(words) {
    const runs = [];
    for (const word of words) {
      const kind = ARABIC_LETTER.test(word) || word.startsWith(TIGHT) ? "rtl" : LATIN.test(word) ? "ltr" : runs.at(-1)?.kind ?? "rtl";
      if (runs.at(-1)?.kind === kind) runs.at(-1).words.push(word);
      else runs.push({ kind, words: [word] });
    }
    return runs;
  }
  function rtlDraw(words, right, y, size) {
    const space = doc.font(F.regular).fontSize(size).widthOfString(" ");
    let x = right;
    let first = true;
    for (const run of rtlRuns(words)) {
      // The gap before a run belongs to its first word: none at the line start, none before TIGHT.
      if (!first && !run.words[0].startsWith(TIGHT)) x -= space;
      first = false;
      if (run.kind === "ltr") {
        const width = rtlWidth(run.words, size);
        let lx = x - width;
        run.words.forEach((word, i) => {
          if (i > 0 && !word.startsWith(TIGHT)) lx += space;
          for (const seg of segments(word)) { drawSeg(seg, lx, y, size); lx += segWidth(seg, size); }
        });
        x -= width;
      } else {
        run.words.forEach((word, i) => {
          if (i > 0 && !word.startsWith(TIGHT)) x -= space;
          drawRtlWord(word, x, y, size);
          x -= wordWidth(word, size);
        });
      }
    }
  }
  /** Greedy wrap of RTL text into lines of words, in reading order. */
  function rtlWrap(text, width, size) {
    const lines = [];
    let line = [];
    for (const word of tokenize(text)) {
      const next = [...line, word];
      // A TIGHT token never starts a line: it is punctuation belonging to the word before.
      if (line.length && rtlWidth(next, size) > width && !word.startsWith(TIGHT)) { lines.push(line); line = [word]; }
      else line = next;
    }
    if (line.length) lines.push(line);
    return lines;
  }
  // pdfkit embeds a Buffer image anew on every doc.image(); opened once, it is embedded once
  // and every later placement points at the same object.
  const opened = new Map();
  const pic = (buf) => {
    if (!opened.has(buf)) opened.set(buf, doc.openImage(buf));
    return opened.get(buf);
  };

  const stream = createWriteStream(outPath);
  doc.pipe(stream);

  // Drawn on 'pageAdded' rather than per section, so it also lands on pages a table
  // created while it was breaking across a page boundary.
  let pageCount = 0;
  doc.on("pageAdded", () => {
    pageCount += 1;
    if (pageCount === 1) return;
    doc.fillColor(MUTED).font(F.regular).fontSize(8)
      .text(S(runningHead), MARGIN, 28, { characterSpacing: 0.6 });
    doc.moveTo(MARGIN, 44).lineTo(doc.page.width - MARGIN, 44)
      .strokeColor(BORDER).lineWidth(0.75).stroke();
    doc.x = MARGIN;
    doc.y = 60;
  });

  const contentWidth = () => doc.page.width - doc.page.margins.right - MARGIN;
  const contentBottom = () => doc.page.height - doc.page.margins.bottom;

  function ensureSpace(height) {
    if (doc.y + height > contentBottom()) doc.addPage();
  }

  /* `rtl`: the meta lines and the footer are in a right-to-left language (a translated
     edition's cover is written in the reader's language), so they are wrapped and drawn
     by rtlWrap/rtlDraw with the bullet on the right. */
  function cover({ eyebrow, title, subtitle, subtitleTranslated, subtitleRtl, meta = [], footer, rtl = false, art = null }) {
    // With a mascot on the band, the band's text keeps clear of it.
    const bandW = contentWidth() - (art ? 150 : 0);
    doc.rect(0, 0, doc.page.width, 210).fill(TEAL_SOFT);
    if (art) doc.image(pic(art), doc.page.width - MARGIN - 140, 50, { width: 140 });
    doc.fillColor(TEAL_DARK).font(F.bold).fontSize(9)
      .text(S(eyebrow), MARGIN, 64, { characterSpacing: 1.2, width: bandW });
    doc.fillColor(INK).font(F.bold).fontSize(30)
      .text(S(title), MARGIN, 88, { width: bandW, lineGap: 2 });
    if (subtitle) {
      doc.fillColor(MUTED).font(F.regular).fontSize(11)
        .text(S(subtitle), MARGIN, doc.y + 8, { width: bandW, lineGap: 3 });
    }
    // The same line in the reader's language, for a translated edition. One line, short
    // enough never to wrap, so an RTL line can be drawn whole and right-aligned.
    if (subtitleTranslated) {
      doc.fillColor(TEAL_DARK);
      if (subtitleRtl) rtlDraw(tokenize(subtitleTranslated), MARGIN + bandW, doc.y + 6, 11.5);
      else doc.font(F.regular).fontSize(11.5).text(subtitleTranslated, MARGIN, doc.y + 6, { width: bandW, lineBreak: false });
    }
    doc.y = 250;
    const w = contentWidth();
    if (rtl) {
      const lh = doc.font("Noto-Arabic").fontSize(10.5).currentLineHeight(true) + 2;
      for (const line of meta) {
        const lines = rtlWrap(S(line), w - 14, 10.5);
        const y = doc.y;
        doc.fillColor(TEAL).font(F.bold).fontSize(10).text("•", MARGIN + w - 7, y, { width: 10, lineBreak: false });
        doc.fillColor(INK);
        lines.forEach((l, i) => rtlDraw(l, MARGIN + w - 14, y + i * lh, 10.5));
        doc.y = y + lines.length * lh + 6;
      }
      if (footer) {
        const flh = doc.font("Noto-Arabic").fontSize(8.5).currentLineHeight(true) + 2;
        const lines = rtlWrap(S(footer), w, 8.5);
        doc.fillColor(MUTED);
        lines.forEach((l, i) => rtlDraw(l, MARGIN + w, contentBottom() - 60 + i * flh, 8.5));
      }
      doc.x = MARGIN;
      return;
    }
    for (const line of meta) {
      doc.fillColor(TEAL).font(F.bold).fontSize(10)
        .text("•", MARGIN, doc.y, { width: 12, continued: false });
      doc.fillColor(INK).font(F.regular).fontSize(10.5)
        .text(S(line), MARGIN + 12, doc.y - 12, { width: w - 12, lineGap: 2 });
      doc.x = MARGIN;
      doc.moveDown(0.4);
    }
    if (footer) {
      doc.fillColor(MUTED).font(F.regular).fontSize(8.5)
        .text(S(footer), MARGIN, contentBottom() - 60, { width: w, lineGap: 2 });
    }
    doc.x = MARGIN;
  }

  /** A chapter opener: big, with the level in a pill, and it always starts a page. */
  function chapter(title, badge) {
    doc.addPage();
    const w = contentWidth();
    if (badge) {
      badge = S(badge);
      const bw = doc.widthOfString(badge, { size: 9 }) + 16;
      doc.roundedRect(MARGIN, doc.y, bw, 16, 8).fill(TEAL_SOFT);
      doc.fillColor(TEAL_DARK).font(F.bold).fontSize(9)
        .text(badge, MARGIN + 8, doc.y + 4.5, { width: bw });
      doc.x = MARGIN;
      doc.y += 24;
    }
    doc.fillColor(INK).font(F.bold).fontSize(19)
      .text(S(title), MARGIN, doc.y, { width: w, lineGap: 1 });
    doc.x = MARGIN;
    doc.moveDown(0.35);
    doc.moveTo(MARGIN, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.moveDown(0.7);
    doc.x = MARGIN;
  }

  /** Like chapter(), but it only breaks the page when the heading would be stranded at the
      bottom. A Grammatik topic deserves its own page; a 25-word Lernset does not, and
      forcing one turned a 650-word list into 85 mostly-white pages. */
  function section(title, badge) {
    ensureSpace(150);
    const w = contentWidth();
    doc.moveDown(0.8);
    if (badge) {
      badge = S(badge);
      const bw = doc.widthOfString(badge, { size: 8.5 }) + 14;
      doc.roundedRect(MARGIN, doc.y, bw, 15, 7.5).fill(TEAL_SOFT);
      doc.fillColor(TEAL_DARK).font(F.bold).fontSize(8.5)
        .text(badge, MARGIN + 7, doc.y + 4, { width: bw });
      doc.x = MARGIN;
      doc.y += 20;
    }
    doc.fillColor(INK).font(F.bold).fontSize(14)
      .text(S(title), MARGIN, doc.y, { width: w });
    doc.x = MARGIN;
    doc.moveDown(0.3);
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + w, doc.y).strokeColor(TEAL).lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.x = MARGIN;
  }

  /** A section heading. `keep`: the height of what must follow on the same page — the
      first rows of a table, a hint — so a heading is never left alone at a page foot.
      `icon`: a PNG drawn instead of the teal bar. */
  function h2(text, opts = {}) {
    ensureSpace(42 + (opts.keep ?? 0));
    doc.moveDown(0.7);
    const y = doc.y;
    const ix = opts.icon ? 23 : 12;
    if (opts.icon) doc.image(pic(opts.icon), MARGIN, y - 1.5, { width: 16 });
    else doc.rect(MARGIN, y + 2, 3, 13).fill(TEAL);
    doc.fillColor(TEAL_DARK).font(F.bold).fontSize(12)
      .text(S(text), MARGIN + ix, y, { width: contentWidth() - ix });
    doc.x = MARGIN;
    doc.moveDown(0.45);
  }

  /** The height paragraph() would take for this text. */
  function paragraphHeight(text, opts = {}) {
    if (!text) return 0;
    doc.font(opts.bold ? F.bold : F.regular).fontSize(opts.size || 10.25);
    return doc.heightOfString(S(text), { width: contentWidth(), lineGap: opts.lineGap ?? 2 }) + (opts.paragraphGap ?? 5);
  }

  function paragraph(text, opts = {}) {
    if (!text) return;
    ensureSpace(16);
    doc.fillColor(opts.color || INK)
      .font(opts.bold ? F.bold : opts.italic ? F.italic : F.regular)
      .fontSize(opts.size || 10.25)
      .text(S(text), MARGIN, doc.y, {
        width: contentWidth(),
        lineGap: opts.lineGap ?? 2,
        paragraphGap: opts.paragraphGap ?? 5,
      });
    doc.x = MARGIN;
  }

  function bullet(text, opts = {}) {
    const bw = 12;
    ensureSpace(16);
    const y = doc.y;
    doc.fillColor(opts.markerColor || TEAL).font(F.bold).fontSize(10.25)
      .text(opts.marker ?? "•", MARGIN, y, { width: bw });
    doc.fillColor(opts.color || INK).font(F.regular).fontSize(opts.size || 10.25)
      .text(S(text), MARGIN + bw, y, { width: contentWidth() - bw, lineGap: 2 });
    doc.x = MARGIN;
    doc.moveDown(0.3);
  }

  /** A tinted box — for the one sentence a page should be read around. */
  function callout(text, opts = {}) {
    text = S(text);
    const w = contentWidth();
    const inner = w - 24;
    doc.font(opts.bold ? F.bold : F.regular).fontSize(opts.size || 10.25);
    const h = doc.heightOfString(text, { width: inner, lineGap: 2 }) + 20;
    ensureSpace(h + 8);
    const y = doc.y;
    doc.roundedRect(MARGIN, y, w, h, 6).fill(opts.fill || SURFACE);
    doc.rect(MARGIN, y, 3, h).fill(opts.accent || TEAL);
    doc.fillColor(opts.color || INK)
      .font(opts.bold ? F.bold : F.regular)
      .fontSize(opts.size || 10.25)
      .text(S(text), MARGIN + 14, y + 10, { width: inner, lineGap: 2 });
    doc.x = MARGIN;
    doc.y = y + h + 8;
  }

  /** The learner's-language version of the block just drawn: smaller, muted, indented,
      with a teal rule on its leading edge — so the German above it still leads. */
  function translation(text, opts = {}) {
    if (!text) return;
    const size = opts.size ?? 9.25;
    const indent = opts.indent ?? 12;
    const w = contentWidth() - indent - 10;
    doc.fillColor(MUTED);
    if (opts.rtl) {
      const lines = rtlWrap(S(text), w, size);
      // One line height for the block, from the taller Arabic face: measuring while drawing
      // picked up whichever face the previous segment had left set.
      const lh = doc.font("Noto-Arabic").fontSize(size).currentLineHeight(true) + 1.5;
      const h = lines.length * lh;
      ensureSpace(h + 6);
      const y = doc.y;
      const right = MARGIN + indent + 10 + w;
      doc.rect(right + 6, y, 1.5, h).fill(TEAL);
      doc.fillColor(MUTED);
      lines.forEach((line, i) => rtlDraw(line, right, y + i * lh, size));
      doc.y = y + h + 5;
    } else {
      doc.font(F.regular).fontSize(size);
      const h = doc.heightOfString(S(text), { width: w, lineGap: 1.5 });
      ensureSpace(h + 6);
      const y = doc.y;
      doc.rect(MARGIN + indent, y, 1.5, h).fill(TEAL);
      doc.fillColor(MUTED).font(F.regular).fontSize(size)
        .text(S(text), MARGIN + indent + 10, y, { width: w, lineGap: 1.5 });
      doc.y = y + h + 5;
    }
    doc.x = MARGIN;
  }

  /**
   * Bordered, striped table that repeats its header after a page break.
   * @param {string[]} head
   * @param {string[][]} rows
   */
  function tableGeometry(head, opts) {
    // Wide reference tables (te-ka-nicht-mo-lo is seven columns) need smaller type or every
    // cell wraps to one word per line.
    const fontSize = opts.fontSize ?? (head.length > 5 ? 7.5 : head.length > 3 ? 8.25 : 9);
    const pad = opts.rowPadding ?? 6;
    const w = contentWidth();
    const widths = opts.widths ?? head.map(() => w / head.length);
    const rtl = new Set(opts.rtl ?? []);
    // The first column draws bold, so it is MEASURED bold: Helvetica-Bold is wider than
    // Helvetica, and measuring "der Nachname, die Nachnamen" in the regular face sized the
    // row for one line while the bold draw took two.
    const cellFont = (i) => (rtl.has(i) ? "Noto-Arabic" : i === 0 && opts.boldFirst !== false ? F.bold : F.regular);
    const lineGap = 1.5;
    /* Right-to-left cells are wrapped here rather than by pdfkit — see rtlDraw(). */
    const rtlLines = (text, width) => rtlWrap(text, width, fontSize);
    const cellHeight = (cell, i) => {
      doc.font(cellFont(i)).fontSize(fontSize);
      const width = widths[i] - 14;
      if (!rtl.has(i)) return doc.heightOfString(S(cell), { width, lineGap });
      return rtlLines(cell, width).length * (doc.font("Noto-Arabic").fontSize(fontSize).currentLineHeight(true) + lineGap);
    };
    const rowHeight = (row) => Math.max(opts.minRowHeight ?? 0, ...row.map(cellHeight)) + pad * 2;
    // A header label that wraps ("links von nicht") makes the header taller, not clipped.
    // `rtlHead`: labels in a right-to-left language, wrapped and drawn like an RTL cell.
    const rtlHead = new Set(opts.rtlHead ?? []);
    const rtlHeadLh = () => doc.font("Noto-Arabic").fontSize(fontSize - 0.5).currentLineHeight(true) + 1;
    const labelH = Math.max(...head.map((label, i) => {
      if (rtlHead.has(i)) return rtlWrap(S(label), widths[i] - 14, fontSize - 0.5).length * rtlHeadLh();
      doc.font(F.bold).fontSize(fontSize - 0.5);
      return doc.heightOfString(S(label), { width: widths[i] - 14, characterSpacing: 0.4 });
    }));
    const headH = Math.max(opts.headerHeight ?? 20, labelH + 11);
    return { fontSize, pad, headH, w, widths, rtl, rtlHead, rtlHeadLh, cellFont, lineGap, rtlLines, rowHeight };
  }

  /** Header plus the first `n` rows: what a heading above the table has to keep with it. */
  function tableHeight(head, rows, opts = {}, n = 3) {
    const g = tableGeometry(head, opts);
    return g.headH + rows.slice(0, n).reduce((h, r) => h + g.rowHeight(r), 0);
  }

  function table(head, rows, opts = {}) {
    // `squeeze`: a tighter row padding to fall back on when that keeps the whole table on
    // this page — a worksheet's last three rows alone on a new page help nobody.
    if (opts.squeeze != null) {
      const fits = (o) => doc.y + tableHeight(head, rows, o, rows.length) <= contentBottom();
      const tight = { ...opts, rowPadding: opts.squeeze, squeeze: null };
      if (!fits(opts) && fits(tight)) opts = tight;
    }
    const { fontSize, pad, headH, w, widths, rtl, rtlHead, rtlHeadLh, cellFont, lineGap, rtlLines, rowHeight } = tableGeometry(head, opts);

    const drawHead = () => {
      const y = doc.y;
      doc.rect(MARGIN, y, w, headH).fill(TEAL_SOFT);
      let x = MARGIN;
      doc.fillColor(TEAL_DARK).font(F.bold).fontSize(fontSize - 0.5);
      head.forEach((label, i) => {
        if (rtlHead.has(i)) {
          rtlWrap(S(label), widths[i] - 14, fontSize - 0.5).forEach((line, li) => {
            doc.fillColor(TEAL_DARK);
            rtlDraw(line, x + widths[i] - 7, y + 6 + li * rtlHeadLh(), fontSize - 0.5);
          });
          x += widths[i];
          return;
        }
        doc.fillColor(TEAL_DARK).font(F.bold).fontSize(fontSize - 0.5);
        doc.text(S(label), x + 7, y + 6, {
          width: widths[i] - 14,
          characterSpacing: 0.4,
          align: opts.rtl?.includes(i) ? "right" : "left",
        });
        x += widths[i];
      });
      doc.y = y + headH;
    };

    // Never a header with no row under it: the header and the first rows move together, and
    // a short table does not split at all.
    ensureSpace(tableHeight(head, rows, opts, rows.length <= 4 ? rows.length : 2));
    drawHead();

    const heights = rows.map(rowHeight);
    rows.forEach((row, ri) => {
      const h = heights[ri];
      // No widows: when the last three rows would not all fit here, they go over together,
      // rather than one row alone under a repeated header on an otherwise empty page.
      const rest = heights.slice(ri).reduce((a, b) => a + b, 0);
      const widow = ri > 0 && rows.length - ri === 3 && doc.y + rest > contentBottom();

      if (doc.y + h > contentBottom() || widow) {
        doc.addPage();
        drawHead();
      }

      const y = doc.y;
      if (ri % 2 === 1) doc.rect(MARGIN, y, w, h).fill(SURFACE);
      let x = MARGIN;
      row.forEach((cell, i) => {
        doc.fillColor(i === 0 || opts.inkCols?.includes(i) ? INK : MUTED)
          .font(cellFont(i))
          .fontSize(fontSize);
        const width = widths[i] - 14;
        if (rtl.has(i)) {
          let ly = y + pad;
          for (const line of rtlLines(cell, width)) {
            rtlDraw(line, x + 7 + width, ly, fontSize);
            ly += doc.font("Noto-Arabic").fontSize(fontSize).currentLineHeight(true) + lineGap;
          }
        } else if (cell === "" && opts.writeCols?.includes(i)) {
          // A worksheet's answer cell: a line to write on.
          doc.moveTo(x + 7, y + h - pad).lineTo(x + widths[i] - 7, y + h - pad)
            .strokeColor("#b8c0cc").lineWidth(0.6).dash(1.5, { space: 2 }).stroke().undash();
        } else {
          doc.text(S(cell), x + 7, y + pad, { width, lineGap });
        }
        x += widths[i];
      });
      doc.moveTo(MARGIN, y + h).lineTo(MARGIN + w, y + h)
        .strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.y = y + h;
      doc.x = MARGIN;
    });

    doc.moveDown(0.6);
    doc.x = MARGIN;
  }

  /** A box with a mascot beside it: for the one hint a learner should not miss.
      `tone: "online"` is the teal box that sends the reader to the site, with a QR code as
      `art` and `link` over the whole box, so a tap in a PDF viewer opens the page too. */
  function tip(text, { art, artW: artSize = 50, title, translation: tr, rtl = false, tone = "hint", link = null } = {}) {
    const w = contentWidth();
    const artW = art ? artSize : 0;
    const inner = w - artW - 30;
    const titleH = title ? doc.font(F.bold).fontSize(10.5).heightOfString(S(title), { width: inner }) + 3 : 0;
    const textH = doc.font(F.regular).fontSize(10).heightOfString(S(text), { width: inner, lineGap: 2 });
    let trLines = null;
    let trH = 0;
    const trLh = () => doc.font("Noto-Arabic").fontSize(9).currentLineHeight(true) + 1.5;
    if (tr) {
      if (rtl) {
        trLines = rtlWrap(S(tr), inner, 9);
        trH = trLines.length * trLh() + 5;
      } else {
        trH = doc.font(F.regular).fontSize(9).heightOfString(S(tr), { width: inner, lineGap: 1.5 }) + 5;
      }
    }
    const h = Math.max(artW + 12, titleH + textH + trH + 22);
    ensureSpace(h + 12);
    const y = doc.y + 2;
    const online = tone === "online";
    doc.roundedRect(MARGIN, y, w, h, 8).fill(online ? TEAL_SOFT : "#fffbeb");
    doc.roundedRect(MARGIN, y, w, h, 8).strokeColor(online ? TEAL : "#fcd34d").lineWidth(0.8).stroke();
    if (link) doc.link(MARGIN, y, w, h, link);
    if (art) doc.image(pic(art), MARGIN + 8, y + (h - artW) / 2, { width: artW });
    const tx = MARGIN + artW + 18;
    let ty = y + 11;
    if (title) {
      doc.fillColor(online ? TEAL_DARK : "#92400e").font(F.bold).fontSize(10.5).text(S(title), tx, ty, { width: inner });
      ty += titleH;
    }
    doc.fillColor(INK).font(F.regular).fontSize(10).text(S(text), tx, ty, { width: inner, lineGap: 2 });
    ty += textH + 5;
    if (tr) {
      doc.fillColor(MUTED);
      if (rtl) {
        const lh = trLh();
        doc.fillColor(MUTED);
        trLines.forEach((l, i) => rtlDraw(l, tx + inner, ty + i * lh, 9));
      } else {
        doc.font(F.regular).fontSize(9).text(S(tr), tx, ty, { width: inner, lineGap: 1.5 });
      }
    }
    doc.x = MARGIN;
    doc.y = y + h + 10;
  }

  /**
   * Horizontal bars, one per item: `{ label, value, color, note }`. The value is printed at
   * the end of its bar, so the chart needs no axis.
   */
  function barChart(items, { labelWidth = 60, noteWidth = 150, barH = 11, gap = 4, format = String } = {}) {
    const w = contentWidth();
    const max = Math.max(...items.map((i) => i.value));
    const trackW = w - labelWidth - noteWidth - 50;
    const h = items.length * (barH + gap);
    ensureSpace(h + 10);
    let y = doc.y + 4;
    for (const it of items) {
      doc.fillColor(INK).font(F.bold).fontSize(9).text(S(it.label), MARGIN, y + 1, { width: labelWidth - 8, align: "right", lineBreak: false });
      const bw = Math.max(2, (it.value / max) * trackW);
      doc.roundedRect(MARGIN + labelWidth, y, bw, barH, 2.5).fill(it.color || TEAL);
      doc.fillColor(MUTED).font(F.regular).fontSize(7.5).text(format(it.value), MARGIN + labelWidth + bw + 5, y + 2, { width: 60, lineBreak: false });
      if (it.note) doc.fillColor(it.noteColor || it.color || MUTED).font(F.regular).fontSize(8).text(S(it.note), MARGIN + w - noteWidth, y + 1.5, { width: noteWidth, lineBreak: false });
      y += barH + gap;
    }
    doc.x = MARGIN;
    doc.y = y + 6;
  }

  /** The number paginate() will print on the page being drawn (the cover is 1). */
  const pageNumber = () => doc.bufferedPageRange().count;

  /** Page numbers, written at the end because they need the final page count. */
  function paginate({ skipFirst = true } = {}) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      if (skipFirst && i === range.start) continue;
      doc.switchToPage(i);
      // The number sits below the bottom margin, and pdfkit treats text there as overflow:
      // it adds a new page for it — one per numbered page, each blank but for the running
      // head, which doubled every book (the A1–B2 edition was 85 pages and 84 empty ones).
      // So the margin is lifted while the number is written, and lineBreak is off.
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      // Brand line on the left of every numbered page: a page copied out of the book on its
      // own still says where it came from. A book can draw its own (`footer` in createDoc).
      if (footer) footer(i - range.start, range.count);
      else doc.fillColor(MUTED).font(F.regular).fontSize(8).text(
        "icanspeak.it/english · © icanspeak English",
        MARGIN,
        doc.page.height - 38,
        { width: doc.page.width - MARGIN * 2 - 70, align: "left", lineBreak: false }
      );
      doc.fillColor(MUTED).font(F.regular).fontSize(8).text(
        `${i - range.start + 1} / ${range.count}`,
        MARGIN,
        doc.page.height - 38,
        { width: doc.page.width - MARGIN * 2, align: "right", lineBreak: false }
      );
      doc.page.margins.bottom = bottom;
    }
  }

  /**
   * Resolves once the file is actually on disk, and records its size and page count in
   * public/downloads/manifest.json on the way out.
   *
   * The Wissensdatenbank page wants to say "PDF · 31 Seiten · 41 KB" before anyone clicks.
   * Size it could stat for itself; the page count it cannot, short of parsing the PDF. Here
   * it is free — pdfkit has just counted the pages — so it gets written down rather than
   * guessed at or hand-maintained in the catalogue.
   */
  function finish() {
    const pages = doc.bufferedPageRange().count;
    paginate();
    doc.end();
    return new Promise((resolve, reject) => {
      stream.on("error", reject);
      stream.on("finish", () => {
        const dir = path.dirname(outPath);
        const file = path.join(dir, "manifest.json");
        const all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
        all[path.basename(outPath)] = { pages, bytes: statSync(outPath).size };
        // Sorted by rebuilding the object, not via stringify's replacer array — that
        // argument is a key *filter*, and passing the top-level names to it stripped
        // `pages` and `bytes` out of every entry.
        const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
        writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
        resolve();
      });
    });
  }

  return { doc, F, S, pic, rtlWrap, rtlDraw, cover, chapter, section, h2, paragraph, paragraphHeight, bullet, callout, translation, table, tableHeight, tip, barChart, pageNumber, ensureSpace, contentWidth, contentBottom, finish };
}
