// Builds „Spanish Grammar Start A1–B1 – The 10 most important chapters“, the free starter
// grammar book, with English explanations and in every help language with a translation file:
//
//   pnpm generate:grammatik-start-pdf          all editions
//   node scripts/generate-grammatik-start-pdf.mjs en de   some
//
// → public/downloads/grammatik-start.pdf (English) and grammatik-start-<code>.pdf.
//
// The content is src/data/grammatik-start/en.json; each translation (<code>.json) carries only
// the explaining blocks — the book rule: rules, explanations and Merke boxes in the learner's
// language, examples, tables, exercises and solutions Spanish, because Spanish is the subject.
// Check them with scripts/check-grammatik-start.mjs. A translation with status "skeleton" is
// not written yet and gets no edition.
//
// The chapter links and the back page are printed URLs, built from src/lib/routes.js: rerun
// this script whenever a slug in there changes.
//
// The look is the Grammatik books' (scripts/lib/pdf-brand.mjs) with more of the crew
// (scripts/lib/pdf-art.mjs), each one with a job: the whole crew on the cover and the back
// page, Bruno on the contents, Regi on the book's rule and at every Merke, Hamsti at the
// exercises, Bruno at a typical mistake and dozing over the answer key, Quaki pointing to the
// matching exercises online. Every chapter has a three-panel comic before its exercises
// (the crew makes the chapter's typical mistake in Spanish and puts it right), and a page
// with none of them gets a small one beside the page number. Never more than three on a
// page (the comic counts as three), never on top of text.
//
// Every page says where it is from (footer, in the reader's language and English); the last
// page sends the reader back to icanspeak.it/spanish, with a QR code.
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { createDoc, INK, MUTED, TEAL, TEAL_DARK, TEAL_SOFT, BORDER, SURFACE, MARGIN } from "./lib/pdf-brand.mjs";
import { loadArt, single } from "./lib/pdf-art.mjs";
import { languageOf, LANGUAGE_REGISTRY } from "../src/lib/languages.js";
import { topicPath } from "../src/lib/routes.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data", "grammatik-start");
const outDir = path.join(root, "public", "downloads");
const SITE = "icanspeak.it/spanish";
const LOGO = readFileSync(path.join(root, "public", "assets", "logo.png"));
// Fredoka at SemiBold as a static TTF (pdfkit cannot subset the site's variable WOFF2); see scripts/fonts/README.md.
const FREDOKA_FILE = path.join(root, "scripts", "fonts", "Fredoka-SemiBold.ttf");
const fontkit = createRequire(createRequire(import.meta.url).resolve("pdfkit"))("fontkit");
const FREDOKA = fontkit.openSync(FREDOKA_FILE);

// The editions: English, then every registry language with a written translation file in
// src/data/grammatik-start/ (registry order, so a new language needs only its file).
const BASE = "en";
const isWritten = (c) => {
  const file = path.join(dataDir, `${c}.json`);
  return existsSync(file) && JSON.parse(readFileSync(file, "utf8")).status !== "skeleton";
};
export const EDITIONS = [BASE, ...LANGUAGE_REGISTRY.map((l) => l.code).filter((c) => c !== BASE && isWritten(c))];
const RTL = new Set(["ar", "fa", "ps"]);
const RED = "#c0392b";
const GREEN = "#1f8a4c";

const base = JSON.parse(readFileSync(path.join(dataDir, `${BASE}.json`), "utf8"));
// Bidi control marks a translator may have set: the RTL drawing places Latin runs itself,
// and the fonts have no glyph for them.
const load = (code) => JSON.parse(readFileSync(path.join(dataDir, `${code}.json`), "utf8").replace(/[‎‏‪-‮⁦-⁩]/g, ""));
const date = new Date().toISOString().slice(0, 10).split("-").reverse().join(".");
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

async function build(lang) {
  const tr = lang === BASE ? null : load(lang);
  const rtl = RTL.has(lang);
  const ui = { ...base.ui, ...(tr?.ui ?? {}) };
  const baseUi = base.ui;
  const draft = tr && tr.status !== "reviewed";
  const T = (id, field, english) => tr?.blocks?.[id]?.[field] ?? english;
  const chTitle = (c) => tr?.chapters?.[c.id]?.title ?? c.titleDe;
  const chBubble = (c) => tr?.chapters?.[c.id]?.bubble ?? c.bubble;
  const file = lang === BASE ? "grammatik-start.pdf" : `grammatik-start-${lang}.pdf`;
  const art = await loadArt();
  const pics = {
    regi: await single("regi", "thinking"),
    regiHappy: await single("regi", "happy"),
    hamsti: await single("hamsti", "happy"),
    quaki: await single("quaki", "happy"),
    bruno: await single("bruno", "happy"),
  };
  const opener = { regi: pics.regiHappy, hamsti: pics.hamsti, quaki: pics.quaki, bruno: pics.bruno };
  // Every crew member with every face, for the comics and the page corners.
  const faces = {};
  for (const name of ["bruno", "regi", "hamsti", "quaki"]) {
    for (const expr of ["happy", "thinking", "celebrate", "oops", "sleepy"]) faces[`${name}:${expr}`] = await single(name, expr);
  }

  let footerDraw = null;
  const pdf = createDoc({
    outPath: path.join(outDir, file),
    runningHead: `SPANISH GRAMMAR START A1–B1 · ${SITE.toUpperCase()}`,
    unicode: true,
    script: languageOf(lang)?.script,
    footer: (i, n) => footerDraw(i, n),
  });
  const { doc, F, S } = pdf;
  doc.registerFont("Fredoka", FREDOKA_FILE);
  const W = pdf.contentWidth();
  const RIGHT = MARGIN + W;

  /* ---------------------------------------------------------------- text ---- */
  const unstar = (s) => String(s ?? "").replace(/\*([^*]+)\*/g, "$1");
  const arabicLh = (size) => doc.font("Noto-Arabic").fontSize(size).currentLineHeight(true) + 2;
  // A voice for the bubbles: Fredoka where it has every letter, else Noto Bold.
  const fredokaCan = (s) => [...s].every((ch) => !ch.trim() || FREDOKA.hasGlyphForCodePoint(ch.codePointAt(0)));

  /** Height of `text` at `width`. `rtl`: wrapped like an RTL line. */
  function measure(text, width, { size = 10.5, bold = false, rtl: r = false, lineGap = 2 } = {}) {
    if (!text) return 0;
    if (r) return pdf.rtlWrap(S(unstar(text)), width, size).length * arabicLh(size);
    doc.font(bold ? F.bold : F.regular).fontSize(size);
    return doc.heightOfString(S(unstar(text)), { width, lineGap });
  }

  /** Draws `text` into the box (x, y, width): RTL from the right edge; LTR with *stars* bold. */
  function draw(text, x, y, width, { size = 10.5, bold = false, rtl: r = false, color = INK, lineGap = 2, align = "left" } = {}) {
    if (!text) return 0;
    doc.fillColor(color);
    if (r) {
      const lines = pdf.rtlWrap(S(unstar(text)), width, size);
      const lh = arabicLh(size);
      lines.forEach((line, i) => { doc.fillColor(color); pdf.rtlDraw(line, x + width, y + i * lh, size); });
      return lines.length * lh;
    }
    const h = measure(text, width, { size, bold, lineGap });
    const parts = S(text).split(/(\*[^*]+\*)/).filter(Boolean);
    if (bold || parts.length === 1 || align !== "left") {
      doc.font(bold ? F.bold : F.regular).fontSize(size).fillColor(color).text(S(unstar(text)), x, y, { width, lineGap, align });
    } else {
      parts.forEach((p, i) => {
        const star = p.startsWith("*") && p.endsWith("*");
        doc.font(star ? F.bold : F.regular).fontSize(size).fillColor(star ? TEAL_DARK : color);
        const t = star ? p.slice(1, -1) : p;
        if (i === 0) doc.text(t, x, y, { width, lineGap, continued: i < parts.length - 1 });
        else doc.text(t, { continued: i < parts.length - 1 });
      });
    }
    doc.x = MARGIN;
    return h;
  }

  /** A paragraph at doc.y over the full width (less `indent`). */
  function para(text, { indent = 0, gap = 6, ...o } = {}) {
    if (!text) return;
    const w = W - indent;
    const h = measure(text, w, o);
    pdf.ensureSpace(Math.min(h, 60) + 4);
    const x = o.rtl ? MARGIN : MARGIN + indent;
    // Long paragraphs may cross a page: LTR text lets pdfkit flow it, RTL is drawn line by line.
    if (!o.rtl && doc.y + h > pdf.contentBottom()) {
      doc.font(F.regular).fontSize(o.size ?? 10.5).fillColor(o.color ?? INK).text(S(unstar(text)), x, doc.y, { width: w, lineGap: 2 });
      doc.y += gap; doc.x = MARGIN;
      return;
    }
    if (o.rtl && doc.y + h > pdf.contentBottom()) {
      const size = o.size ?? 10.5;
      const lh = arabicLh(size);
      for (const line of pdf.rtlWrap(S(unstar(text)), w, size)) {
        pdf.ensureSpace(lh);
        doc.fillColor(o.color ?? INK);
        pdf.rtlDraw(line, x + w, doc.y, size);
        doc.y += lh;
      }
      doc.y += gap;
      return;
    }
    const y = doc.y;
    draw(text, x, y, w, o);
    doc.y = y + h + gap;
    doc.x = MARGIN;
  }

  /** A section heading with the teal bar on its leading edge. */
  function heading(text, { keep = 40, size = 12.5, r = false } = {}) {
    pdf.ensureSpace(36 + keep);
    doc.y += 8;
    const y = doc.y;
    const h = measure(text, W - 14, { size, bold: true, rtl: r });
    if (r) {
      doc.rect(RIGHT - 3, y + 2, 3, Math.max(13, h - 4)).fill(TEAL);
      draw(text, MARGIN, y, W - 12, { size, rtl: true, color: TEAL_DARK });
    } else {
      doc.rect(MARGIN, y + 2, 3, Math.max(13, h - 4)).fill(TEAL);
      draw(text, MARGIN + 12, y, W - 12, { size, bold: true, color: TEAL_DARK });
    }
    doc.y = y + h + 6;
    doc.x = MARGIN;
  }

  /* ------------------------------------------------------------- mascots ---- */
  // At most three on a page (cover and back page excepted): a fourth simply stays away.
  // Counted per page object, as the contents page is drawn last, from the end of the book.
  const perPage = new Map();
  function mascotSlot() {
    const p = doc.page;
    const n = perPage.get(p) ?? 0;
    if (n >= 3) return false;
    perPage.set(p, n + 1);
    return true;
  }

  /** A speech bubble with its tail on the `tail` side; returns its height. */
  function bubble(text, x, y, maxW, { tail = "left", size = 11 } = {}) {
    text = S(text);
    const voice = !rtl && fredokaCan(text) ? "Fredoka" : F.bold;
    const pad = 8;
    let w, h;
    if (rtl && tr) {
      const lines = pdf.rtlWrap(text, maxW - pad * 2, size);
      w = Math.min(maxW, Math.max(...lines.map((l) => l.reduce((n, word) => n + doc.font("Noto-Arabic").fontSize(size).widthOfString(word) + 4, 0))) + pad * 2 + 6);
      h = lines.length * arabicLh(size) + pad * 2 - 2;
      if (tail === "right") x = x - w;
      drawBubbleShape(x, y, w, h, tail);
      lines.forEach((l, i) => { doc.fillColor(TEAL_DARK); pdf.rtlDraw(l, x + w - pad, y + pad + i * arabicLh(size) - 1, size); });
    } else {
      doc.font(voice).fontSize(size);
      w = Math.min(maxW, doc.widthOfString(text) + pad * 2 + 2);
      h = doc.heightOfString(text, { width: w - pad * 2 }) + pad * 2 - 2;
      if (tail === "right") x = x - w;
      drawBubbleShape(x, y, w, h, tail);
      doc.fillColor(TEAL_DARK).font(voice).fontSize(size).text(text, x + pad, y + pad - 1, { width: w - pad * 2 + 1 });
    }
    doc.x = MARGIN;
    return { w, h };
  }
  function drawBubbleShape(x, y, w, h, tail, stroke = TEAL) {
    doc.save();
    doc.roundedRect(x, y, w, h, 9).fillAndStroke("#ffffff", stroke);
    const ty = y + h / 2;
    if (tail === "left") doc.polygon([x + 1, ty - 5], [x - 8, ty + 2], [x + 1, ty + 5]).fillAndStroke("#ffffff", stroke);
    else if (tail === "right") doc.polygon([x + w - 1, ty - 5], [x + w + 8, ty + 2], [x + w - 1, ty + 5]).fillAndStroke("#ffffff", stroke);
    else if (tail === "down") doc.polygon([x + 22, y + h - 1], [x + 16, y + h + 9], [x + 32, y + h - 1]).fillAndStroke("#ffffff", stroke);
    // Cover the stroke where the tail meets the box.
    if (tail === "left") doc.rect(x + 0.6, ty - 4, 2, 8).fill("#ffffff");
    if (tail === "right") doc.rect(x + w - 2.6, ty - 4, 2, 8).fill("#ffffff");
    if (tail === "down") doc.rect(x + 23, y + h - 2.6, 8, 2).fill("#ffffff");
    doc.restore();
  }

  /**
   * A box with a small mascot in its own column: the Merke (Regi), a typical mistake (Bruno).
   * `lines`: [{ text, rtl, size, bold, color }] drawn under the title.
   */
  function box({ pic, title, titleRtl = false, lines, fillColor = SURFACE, stroke = BORDER, titleColor = TEAL_DARK, artW = 40 }) {
    const pad = 11;
    const inner = W - artW - pad * 3;
    const titleH = title ? measure(title, inner, { size: 10.5, bold: true, rtl: titleRtl }) + 3 : 0;
    const hs = lines.map((l) => measure(l.text, inner, l) + 3);
    const h = Math.max(artW + pad * 2, titleH + hs.reduce((a, b) => a + b, 0) + pad * 2);
    pdf.ensureSpace(h + 10);
    const y = doc.y + 2;
    doc.roundedRect(MARGIN, y, W, h, 8).fillAndStroke(fillColor, stroke);
    const artX = rtl ? RIGHT - pad - artW : MARGIN + pad;
    const tx = rtl ? MARGIN + pad : MARGIN + artW + pad * 2;
    if (pic && mascotSlot()) doc.image(pdf.pic(pic), artX, y + (h - artW) / 2, { width: artW });
    let ty = y + pad;
    if (title) {
      draw(title, tx, ty, inner, { size: 10.5, bold: true, rtl: titleRtl, color: titleColor });
      ty += titleH;
    }
    lines.forEach((l, i) => { draw(l.text, tx, ty, inner, l); ty += hs[i]; });
    doc.x = MARGIN;
    doc.y = y + h + 10;
  }

  /* -------------------------------------------------------------- tables ---- */
  /* Column widths: every column at least as wide as its longest word (measured bold, as the
     head and the first column are drawn), the rest shared by how much text a column holds. */
  function widthsFor(head, rows, fontSize) {
    doc.font(F.bold).fontSize(fontSize);
    const words = (i) => [head[i], ...rows.map((r) => r[i])].flatMap((c) => S(String(c ?? "")).split(/\s+/));
    const min = head.map((_, i) => Math.max(34, ...words(i).map((w) => doc.widthOfString(w) + 18)));
    const weight = head.map((h, i) => Math.min(42, Math.max(6, ...rows.map((r) => String(r[i] ?? "").length))));
    const free = Math.max(0, W - min.reduce((a, b) => a + b, 0));
    const sum = weight.reduce((a, b) => a + b, 0);
    const widths = min.map((m, i) => m + (free * weight[i]) / sum);
    const total = widths.reduce((a, b) => a + b, 0);
    return widths.map((w) => (w * W) / total);
  }
  function table(b) {
    const tb = tr?.blocks?.[b.id];
    const head = b.head.map((h, i) => tb?.head?.[i] ?? h);
    const rows = b.rows.map((r, ri) => r.map((c, ci) => {
      const k = (b.explain ?? []).indexOf(ci);
      return k >= 0 ? tb?.cells?.[ri]?.[k] ?? c : c;
    }));
    const title = b.title ? T(b.id, "title", b.title) : null;
    const fontSize = head.length > 5 ? 7.5 : head.length > 3 ? 8.25 : 9;
    const opts = { widths: widthsFor(head, rows, fontSize), squeeze: 3 };
    if (rtl && tr) {
      opts.rtl = b.explain ?? [];
      opts.rtlHead = head.map((h, i) => (tb?.head?.[i] ? i : -1)).filter((i) => i >= 0);
    }
    if (title) {
      pdf.ensureSpace(20 + pdf.tableHeight(head, rows, opts, Math.min(rows.length, 3)));
      const y = doc.y + 4;
      const h = draw(title, MARGIN, y, W, { size: 10, bold: !rtl || !tr, rtl: rtl && !!tr, color: INK });
      doc.y = y + h + 4;
    }
    pdf.table(head, rows, opts);
  }

  /* --------------------------------------------------------------- cover ---- */
  function cover() {
    // The document opens with its first page: that is the cover.
    const pw = doc.page.width;
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(0, 0, pw, 318).fill(TEAL_SOFT);
    // The logo, with the name and the slogan beside it.
    doc.image(pdf.pic(LOGO), MARGIN, 36, { width: 150 });
    doc.fillColor(INK).font(F.bold).fontSize(13).text("icanspeak Spanish", MARGIN + 164, 46, { lineBreak: false });
    doc.fillColor(TEAL_DARK).font("Fredoka").fontSize(11).text("Here for you!", MARGIN + 164, 63, { lineBreak: false });
    doc.fillColor(TEAL_DARK).font(F.bold).fontSize(9).text("LEARN SPANISH · A1 – B1", MARGIN, 104, { characterSpacing: 1.2 });
    // As large as fits on one line: a break inside „A1–B1“ reads badly.
    let titleSize = 34;
    while (titleSize > 24 && doc.font(F.bold).fontSize(titleSize).widthOfString(baseUi.bookTitle) > W) titleSize -= 1;
    doc.fillColor(INK).font(F.bold).fontSize(titleSize).text(baseUi.bookTitle, MARGIN, 120, { width: W });
    doc.fillColor(MUTED).font(F.regular).fontSize(16).text(baseUi.bookSubtitle, MARGIN, doc.y + 2, { width: W });
    let y = doc.y + 14;
    if (tr) {
      // The book's name in the reader's language, under the English one.
      y += draw(ui.bookTitle, MARGIN, y, W, { size: 21, bold: true, rtl, color: TEAL_DARK }) + 4;
      y += draw(ui.bookSubtitle, MARGIN, y, W, { size: 12.5, rtl, color: INK }) + 3;
      y += draw(ui.forSpeakers, MARGIN, y, W, { size: 11, rtl, color: MUTED });
    } else {
      y += draw(baseUi.forSpeakers, MARGIN, y, W, { size: 12, color: MUTED });
    }

    // The crew, with the slogan in the reader's language.
    const cw = 370;
    const cx = (pw - cw) / 2 + 24;
    const cy = 372;
    doc.image(pdf.pic(art.mascot.crew), cx, cy, { width: cw });
    bubble(ui.coverBubble, cx + 6, cy - 34, 280, { tail: "down", size: 14 });

    // What is in the book and what it is not yet.
    let my = cy + (cw * 260) / 480 + 14;
    const meta = [ui.explained, ...(draft ? [ui.draft] : []), `${fill(ui.chapter, { n: "1–10" })} · A1 · A2 · B1`];
    for (const line of meta) {
      const h = measure(line, W - 16, { size: 10.5, rtl: rtl && !!tr });
      doc.fillColor(TEAL).font(F.bold).fontSize(10).text("•", rtl ? RIGHT - 8 : MARGIN, my, { lineBreak: false });
      draw(line, rtl ? MARGIN : MARGIN + 14, my, W - 16, { size: 10.5, rtl: rtl && !!tr, color: line === ui.draft ? "#92400e" : INK });
      my += h + 5;
    }

    // The address, big: the one thing to remember from this page.
    const by = doc.page.height - 128;
    doc.moveTo(MARGIN, by).lineTo(RIGHT, by).strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.fillColor(TEAL_DARK).font(F.bold).fontSize(20).text(SITE, MARGIN, by + 12, { width: W, align: "center", link: `https://${SITE}` });
    let sy = by + 42;
    sy += draw(ui.share, MARGIN, sy, W, { size: 8.5, rtl: rtl && !!tr, color: MUTED, align: rtl ? "left" : "center" }) + 2;
    doc.fillColor(MUTED).font(F.regular).fontSize(8).text(`${fill(baseUi.made, { date })} · © icanspeak Spanish`, MARGIN, sy + 2, { width: W, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
    doc.x = MARGIN;
  }

  /* -------------------------------------------------------- the chapters ---- */
  const exerciseLabel = { done: false };
  function chapter(c, starts) {
    doc.addPage();
    starts[c.id] = pdf.pageNumber();
    // The badge: chapter, level, priority.
    const badge = [fill(ui.chapter, { n: c.nr }), c.level, fill(ui.priority, { n: c.priority })].join(" · ");
    const by = doc.y;
    if (rtl && tr) {
      const bw = pdf.rtlWrap(S(badge), 400, 9)[0].reduce((n, w) => n + doc.font("Noto-Arabic").fontSize(9).widthOfString(w) + 3, 0) + 18;
      doc.roundedRect(RIGHT - bw, by, bw, 18, 9).fill(TEAL_SOFT);
      doc.fillColor(TEAL_DARK);
      pdf.rtlDraw(pdf.rtlWrap(S(badge), 400, 9)[0], RIGHT - 9, by + 3, 9);
    } else {
      doc.font(F.bold).fontSize(9);
      const bw = doc.widthOfString(S(badge)) + 18;
      doc.roundedRect(MARGIN, by, bw, 18, 9).fill(TEAL_SOFT);
      doc.fillColor(TEAL_DARK).font(F.bold).fontSize(9).text(S(badge), MARGIN + 9, by + 4.5, { lineBreak: false });
    }
    // Title (and the English title under a translated one), clear of the mascot's corner.
    const tw = W - 236;
    let y = by + 28;
    const tx = rtl ? MARGIN + 236 : MARGIN;
    y += draw(chTitle(c), tx, y, tw, { size: 20, bold: true, rtl: rtl && !!tr, color: INK }) + 2;
    if (tr) y += draw(c.titleDe, tx, y, tw, { size: 11, color: MUTED, align: rtl ? "right" : "left" }) + 2;
    // The chapter's mascot with one short line.
    const mx = rtl ? MARGIN : RIGHT - 62;
    if (mascotSlot()) doc.image(pdf.pic(opener[c.mascot]), mx, by - 4, { width: 62 });
    const bt = bubble(chBubble(c), rtl ? MARGIN + 66 : RIGHT - 70, by + 6, 150, { tail: rtl ? "left" : "right", size: 10 });
    y = Math.max(y, by + 70, by + 6 + bt.h + 6);
    doc.moveTo(MARGIN, y + 4).lineTo(RIGHT, y + 4).strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.y = y + 16;
    doc.x = MARGIN;
    exerciseLabel.done = false;

    c.blocks.forEach((b, i) => {
      if (b.type === "exercise" && !exerciseLabel.done && c.comic) comic(c.comic);
      block(b, c.blocks[i + 1]);
    });

    // Where to practise this online.
    if (c.topic) {
      pdf.ensureSpace(44);
      doc.y += 10;
      const ly = doc.y;
      doc.moveTo(MARGIN, ly).lineTo(RIGHT, ly).strokeColor(BORDER).lineWidth(0.75).stroke();
      const url = `${SITE}${topicPath(c.topic)}`;
      const qx = rtl ? RIGHT - 32 : MARGIN;
      if (mascotSlot()) doc.image(pdf.pic(pics.quaki), qx, ly + 6, { width: 32 });
      const label = `${ui.practice}:`;
      if (rtl && tr) {
        doc.fillColor(TEAL_DARK);
        const lw = pdf.rtlWrap(S(label), 200, 10.5)[0];
        pdf.rtlDraw(lw, RIGHT - 40, ly + 15, 10.5);
        doc.fillColor(TEAL_DARK).font(F.bold).fontSize(10.5).text(url, MARGIN, ly + 15, { width: W - 140, align: "right", link: `https://${url}` });
      } else {
        doc.fillColor(INK).font(F.bold).fontSize(10.5).text(S(label), MARGIN + 40, ly + 15, { continued: true })
          .fillColor(TEAL_DARK).text(` ${url}`, { link: `https://${url}`, underline: false });
      }
      doc.y = ly + 44;
      doc.x = MARGIN;
    }
  }

  function block(b, next) {
    const r = rtl && !!tr;
    switch (b.type) {
      case "intro":
        para(T(b.id, "text", b.text), { size: 11, rtl: r, color: INK, gap: 8 });
        break;
      case "why":
        heading(T(b.id, "title", b.title), { r });
        para(T(b.id, "text", b.text), { rtl: r });
        break;
      case "h":
        // A heading stays with what it announces: a table needs room for its first rows.
        heading(T(b.id, "text", b.text), { r, keep: next?.type === "table" ? 120 : 40 });
        break;
      case "rule":
        if (b.title) {
          pdf.ensureSpace(40);
          const y = doc.y + 2;
          const h = draw(T(b.id, "title", b.title), MARGIN, y, W, { size: 11, bold: !r, rtl: r, color: INK });
          doc.y = y + h + 2;
        }
        para(T(b.id, "text", b.text), { rtl: r });
        break;
      case "table":
        table(b);
        break;
      case "merke":
        box({ pic: pics.regi, title: ui.merke, titleRtl: r, lines: [{ text: T(b.id, "text", b.text), rtl: r, size: 10.25 }], fillColor: "#fffbeb", stroke: "#fcd34d", titleColor: "#92400e" });
        break;
      case "mistake":
        box({
          pic: art.mascot.oops, title: ui.mistake, titleRtl: r, fillColor: "#fef2f2", stroke: "#fecaca", titleColor: RED, artW: 46,
          lines: [
            { text: `✗  ${b.wrong}`, color: RED, size: 10.25 },
            { text: `✓  ${b.right}`, color: GREEN, size: 10.25, bold: true },
            { text: T(b.id, "text", b.text), rtl: r, size: 9.75, color: INK },
          ],
        });
        break;
      case "examples": {
        const title = b.title ? T(b.id, "title", b.title) : ui.examples;
        pdf.ensureSpace(40);
        const y = doc.y + 2;
        const h = draw(title, MARGIN, y, W, { size: 10.5, bold: !r, rtl: r, color: TEAL_DARK });
        doc.y = y + h + 3;
        for (const it of b.items) pdf.bullet(it);
        doc.y += 4;
        break;
      }
      case "words":
        pdf.callout(b.text, { bold: true, fill: TEAL_SOFT });
        break;
      case "exercise":
        exercise(b, r);
        break;
    }
  }

  /* A comic strip: three panels, a crew member and a speech bubble in each. A
     panel with the mistake („oops“) gets a red bubble, so the wrong sentence reads as wrong. */
  function comic(panels) {
    const gap = 10;
    const pw = (W - gap * 2) / 3;
    const pad = 9;
    const size = 10.5;
    const art = 76;
    const tw = pw - pad * 2 - 16;
    const voice = (t) => (fredokaCan(t) ? "Fredoka" : F.bold);
    const hs = panels.map(([, , t]) => doc.font(voice(t)).fontSize(size).heightOfString(S(t), { width: tw }) + 14);
    const bh = Math.max(...hs);
    const ph = pad + bh + 12 + art + pad - 14;
    pdf.ensureSpace(ph + 24);
    doc.y += 8;
    const y = doc.y;
    panels.forEach(([name, expr, text], i) => {
      const x = MARGIN + i * (pw + gap);
      doc.roundedRect(x, y, pw, ph, 10).fillAndStroke(i % 2 ? "#f0fdfa" : "#fffbeb", BORDER);
      // The panel number, small, in the corner.
      doc.circle(x + pw - 12, y + ph - 12, 7).fill(TEAL_SOFT);
      doc.fillColor(TEAL_DARK).font(F.bold).fontSize(7.5).text(String(i + 1), x + pw - 19, y + ph - 15.5, { width: 14, align: "center", lineBreak: false });
      const t = S(text);
      const bw = Math.min(pw - pad * 2, doc.font(voice(text)).fontSize(size).widthOfString(t) + 18);
      const h = hs[i];
      const bx = x + pad;
      const by = y + pad + (bh - h);
      drawBubbleShape(bx, by, bw, h, "down", expr === "oops" ? RED : TEAL);
      doc.fillColor(expr === "oops" ? RED : TEAL_DARK).font(voice(text)).fontSize(size).text(t, bx + 8, by + 6, { width: bw - 14 });
      doc.image(pdf.pic(faces[`${name}:${expr}`]), x + 6, y + ph - art - 2, { width: art });
    });
    perPage.set(doc.page, 3);
    doc.x = MARGIN;
    doc.y = y + ph + 10;
  }

  function exercise(b, r) {
    if (!exerciseLabel.done) {
      exerciseLabel.done = true;
      pdf.ensureSpace(130);
      doc.y += 10;
      const y = doc.y;
      // The heading, with Hamsti and his „Your turn!“ at its end.
      const label = ui.exercises;
      const lh = measure(label, W - 200, { size: 15, bold: true, rtl: r });
      draw(label, r ? MARGIN + 200 : MARGIN, y + 6, W - 200, { size: 15, bold: !r, rtl: r, color: INK });
      const hx = r ? MARGIN : RIGHT - 44;
      // No Hamsti on this page (the page is full of crew): no bubble pointing at nobody either.
      if (mascotSlot()) {
        doc.image(pdf.pic(pics.hamsti), hx, y - 4, { width: 44 });
        bubble(ui.exerciseBubble, r ? MARGIN + 50 : RIGHT - 50, y + 4, 150, { tail: r ? "left" : "right", size: 10.5 });
      }
      doc.y = y + Math.max(lh + 10, 42);
      doc.moveTo(MARGIN, doc.y).lineTo(RIGHT, doc.y).strokeColor(TEAL).lineWidth(1).stroke();
      doc.y += 8;
    }
    pdf.ensureSpace(60);
    doc.fillColor(INK).font(F.bold).fontSize(10.5).text(S(b.title), MARGIN, doc.y + 4, { width: W });
    doc.y += 4;
    b.items.forEach((it, i) => {
      pdf.ensureSpace(22);
      const y = doc.y;
      const n = `${i + 1}.`;
      doc.fillColor(TEAL_DARK).font(F.bold).fontSize(10.25).text(n, MARGIN + 4, y, { width: 18 });
      const q = S(it.q.replace(/\s*→\s*/g, " ").trim());
      doc.font(F.regular).fontSize(10.25);
      const qw = Math.min(doc.widthOfString(q), W - 26);
      const qh = doc.heightOfString(q, { width: W - 26, lineGap: 2 });
      doc.fillColor(INK).text(q, MARGIN + 24, y, { width: W - 26, lineGap: 2 });
      let ny = y + qh;
      // A task without a gap asks for a sentence: a line to write it on, beside it or under it.
      if (!it.q.includes("___")) {
        const lx = MARGIN + 24 + qw + 8;
        const under = qh > 20 || RIGHT - lx < 150;
        const lineY = under ? (ny += 16) : y + 11;
        const x0 = under ? MARGIN + 24 : lx;
        doc.moveTo(x0, lineY).lineTo(RIGHT, lineY).strokeColor("#b8c0cc").lineWidth(0.6).dash(1.5, { space: 2 }).stroke().undash();
      }
      doc.y = ny + 5;
      doc.x = MARGIN;
    });
    doc.y += 4;
  }

  /* ------------------------------------------------------------- answers ---- */
  function solutions(starts) {
    doc.addPage();
    starts.solutions = pdf.pageNumber();
    const y0 = doc.y;
    const r = rtl && !!tr;
    draw(ui.solutions, r ? MARGIN + 160 : MARGIN, y0 + 4, W - 160, { size: 20, bold: !r, rtl: r, color: INK });
    const sx = r ? MARGIN : RIGHT - 64;
    if (mascotSlot()) doc.image(pdf.pic(art.mascot.sleepy), sx, y0 - 8, { width: 64 });
    bubble(ui.solutionsLead, r ? MARGIN + 70 : RIGHT - 72, y0 + 6, 160, { tail: r ? "left" : "right", size: 10 });
    doc.y = y0 + 62;
    doc.moveTo(MARGIN, doc.y).lineTo(RIGHT, doc.y).strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.y += 8;
    for (const c of base.chapters) {
      heading(fill(ui.solutionsOf, { n: c.nr, title: chTitle(c) }), { keep: 50, size: 11.5, r });
      for (const b of c.blocks.filter((x) => x.type === "exercise")) {
        const letter = b.title.match(/^([A-Z])\./)?.[1] ?? "";
        const text = b.items.map((it, i) => `${i + 1}. ${it.a}`).join("   ");
        doc.font(F.regular).fontSize(9.5);
        const h = doc.heightOfString(S(text), { width: W - 22, lineGap: 1.5 });
        pdf.ensureSpace(h + 6);
        const y = doc.y;
        doc.fillColor(TEAL_DARK).font(F.bold).fontSize(10).text(letter, MARGIN, y, { width: 18 });
        doc.fillColor(INK).font(F.regular).fontSize(9.5).text(S(text), MARGIN + 22, y, { width: W - 22, lineGap: 1.5 });
        doc.y = y + h + 5;
        doc.x = MARGIN;
      }
    }
  }

  /* ------------------------------------------------------------ the back ---- */
  async function back(starts) {
    doc.addPage();
    starts.back = pdf.pageNumber();
    const r = rtl && !!tr;
    const pw = doc.page.width;
    const cw = 300;
    // The bubble first, the crew right under its tail, however many lines it took.
    const bb = bubble(ui.bye, (pw - cw) / 2 + 6, doc.y + 8, 240, { tail: "down", size: 13 });
    const y0 = doc.y + 8 + bb.h + 4;
    doc.image(pdf.pic(art.mascot.crewCheer), (pw - cw) / 2, y0, { width: cw });
    perPage.set(doc.page, 3);
    let y = y0 + (cw * 260) / 480 + 20;
    y += draw(ui.backTitle, MARGIN, y, W, { size: 19, bold: !r, rtl: r, color: INK }) + 4;
    y += draw(ui.backLead, MARGIN, y, W, { size: 11, rtl: r, color: MUTED }) + 12;

    const links = [
      [ui.back1, `${SITE}/grammar`],
      [ui.back2, `${SITE}/vocabulary`],
      [ui.back3, `${SITE}/placement-test`],
      [ui.back4, `${SITE}/exams`],
    ];
    const qrW = 118;
    const listW = W - qrW - 24;
    const lx = r ? MARGIN + qrW + 24 : MARGIN;
    const qrY = y;
    links.forEach(([label, url], i) => {
      doc.circle(r ? lx + listW - 9 : lx + 9, y + 9, 9).fill(TEAL);
      doc.fillColor("#ffffff").font(F.bold).fontSize(9.5).text(String(i + 1), r ? lx + listW - 18 : lx, y + 4, { width: 18, align: "center" });
      const tx = r ? lx : lx + 26;
      const h = draw(label, tx, y, listW - 26, { size: 11, bold: !r, rtl: r, color: INK });
      doc.fillColor(TEAL_DARK).font(F.regular).fontSize(10).text(url, tx, y + h + 1, { width: listW - 26, align: r ? "right" : "left", link: `https://${url}` });
      y += h + 22;
    });
    const qr = await QRCode.toBuffer(`https://${SITE}`, { margin: 1, width: 360, color: { dark: "#0f766e", light: "#ffffff" } });
    const qx = r ? MARGIN : RIGHT - qrW;
    doc.roundedRect(qx - 6, qrY - 6, qrW + 12, qrW + 34, 10).fillAndStroke("#ffffff", BORDER);
    doc.image(pdf.pic(qr), qx, qrY, { width: qrW });
    draw(ui.qr, qx, qrY + qrW + 6, qrW, { size: 8.5, rtl: r, color: MUTED, align: r ? "left" : "center" });

    // Logo, slogan, the right to share.
    const fy = pdf.contentBottom() - 70;
    doc.moveTo(MARGIN, fy).lineTo(RIGHT, fy).strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.image(pdf.pic(LOGO), MARGIN, fy + 14, { width: 120 });
    doc.fillColor(INK).font(F.bold).fontSize(11).text("icanspeak Spanish", MARGIN + 130, fy + 18, { lineBreak: false });
    doc.fillColor(TEAL_DARK).font("Fredoka").fontSize(10).text("Here for you!", MARGIN + 130, fy + 33, { lineBreak: false });
    draw(ui.share, MARGIN + 250, fy + 12, W - 250, { size: 8.5, rtl: r, color: MUTED });
    doc.x = MARGIN;
  }

  /* -------------------------------------------- contents and the rule page ---- */
  function about() {
    doc.addPage();
    const r = rtl && !!tr;
    const y0 = doc.y + 6;
    draw(ui.aboutTitle, r ? MARGIN + 130 : MARGIN, y0, W - 130, { size: 20, bold: !r, rtl: r, color: INK });
    doc.y = y0 + 44;
    doc.moveTo(MARGIN, doc.y).lineTo(RIGHT, doc.y).strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.y += 14;
    para(ui.aboutText, { size: 11.5, rtl: r, gap: 12 });
    // The book's one rule, said by Regi.
    const ry = doc.y + 4;
    if (mascotSlot()) doc.image(pdf.pic(pics.regi), r ? RIGHT - 90 : MARGIN, ry, { width: 90 });
    bubble(ui.aboutBubble, r ? RIGHT - 100 : MARGIN + 100, ry + 8, 200, { tail: r ? "right" : "left", size: 12 });
    doc.y = ry + 100;
    box({ title: null, lines: [{ text: ui.aboutRule, rtl: r, size: 11.5, color: INK }], fillColor: TEAL_SOFT, stroke: TEAL_SOFT, artW: 0 });
    if (tr) {
      // The same in English, for the teacher.
      doc.y += 6;
      para(`${baseUi.aboutText} ${baseUi.aboutRule}`, { size: 9.5, color: MUTED });
    }
  }

  function contents(tocPage, starts) {
    doc.switchToPage(tocPage - 1);
    const r = rtl && !!tr;
    let y = 66;
    draw(ui.contents, r ? MARGIN + 170 : MARGIN, y, W - 170, { size: 20, bold: !r, rtl: r, color: INK });
    if (mascotSlot()) doc.image(pdf.pic(pics.bruno), r ? MARGIN : RIGHT - 58, y - 12, { width: 58 });
    bubble(ui.tocBubble, r ? MARGIN + 62 : RIGHT - 64, y - 4, 170, { tail: r ? "left" : "right", size: 10.5 });
    y += 58;
    doc.moveTo(MARGIN, y).lineTo(RIGHT, y).strokeColor(TEAL).lineWidth(1.5).stroke();
    y += 12;
    const row = (label, sub, page, n) => {
      const numW = 24;
      const pageW = 30;
      const tw = W - numW - pageW - 10;
      const tx = r ? MARGIN + pageW + 6 : MARGIN + numW;
      if (n != null) {
        doc.circle(r ? RIGHT - 11 : MARGIN + 11, y + 9, 11).fill(TEAL_SOFT);
        doc.fillColor(TEAL_DARK).font(F.bold).fontSize(10).text(String(n), r ? RIGHT - 22 : MARGIN, y + 4, { width: 22, align: "center" });
      }
      const h = draw(label, tx, y + 1, tw, { size: 12, bold: !r, rtl: r, color: INK });
      doc.fillColor(MUTED).font(F.bold).fontSize(11).text(String(page), r ? MARGIN : RIGHT - pageW, y + 2, { width: pageW, align: r ? "left" : "right" });
      let sh = 0;
      if (sub) sh = draw(sub, tx, y + h + 2, tw, { size: 9, color: MUTED, align: r ? "right" : "left" });
      y += Math.max(h + sh + 12, 30);
      doc.moveTo(MARGIN, y - 6).lineTo(RIGHT, y - 6).strokeColor(BORDER).lineWidth(0.5).stroke();
    };
    for (const c of base.chapters) {
      const sub = [tr ? c.titleDe : null, `${c.level} · ${fill(baseUi.priority, { n: c.priority })}`].filter(Boolean).join(" · ");
      row(chTitle(c), sub, starts[c.id], c.nr);
    }
    row(ui.solutions, null, starts.solutions, null);
    row(ui.backTitle, null, starts.back, null);
  }

  /* -------------------------------------------------------------- footer ---- */
  // The crew takes turns in the corner of pages that have none of them.
  const corner = ["hamsti:happy", "quaki:thinking", "regi:happy", "bruno:sleepy", "quaki:happy", "hamsti:thinking", "bruno:happy", "regi:celebrate"];
  footerDraw = (i) => {
    const y = doc.page.height - 44;
    const maxW = W - 70;
    if (!perPage.get(doc.page)) doc.image(pdf.pic(faces[corner[i % corner.length]]), RIGHT - 70, y - 14, { width: 32 });
    if (tr) {
      if (rtl) {
        doc.fillColor(MUTED);
        const line = pdf.rtlWrap(S(ui.footer), maxW, 7.5)[0];
        pdf.rtlDraw(line, MARGIN + maxW, y - 3, 7.5);
      } else {
        doc.fillColor(MUTED).font(F.regular).fontSize(7.5).text(S(ui.footer), MARGIN, y, { width: maxW, lineBreak: false });
      }
      doc.fillColor(MUTED).font(F.regular).fontSize(7.5).text(baseUi.footer, MARGIN, y + 10, { width: maxW, lineBreak: false, align: rtl ? "right" : "left" });
    } else {
      doc.fillColor(MUTED).font(F.regular).fontSize(7.5).text(baseUi.footer, MARGIN, y + 6, { width: maxW, lineBreak: false });
    }
  };

  /* --------------------------------------------------------------- order ---- */
  const starts = {};
  cover();
  doc.addPage(); // contents, filled in once the page numbers are known
  const tocPage = pdf.pageNumber();
  about();
  for (const c of base.chapters) chapter(c, starts);
  solutions(starts);
  await back(starts);
  contents(tocPage, starts);
  doc.switchToPage(doc.bufferedPageRange().count - 1);
  const pages = doc.bufferedPageRange().count;
  await pdf.finish();
  return { file, pages };
}

const asked = process.argv.slice(2);
const langs = asked.length ? asked : EDITIONS;
for (const lang of langs) {
  if (!EDITIONS.includes(lang)) throw new Error(`unknown edition: ${lang}`);
  const { file, pages } = await build(lang);
  console.log(`${file.padEnd(28)} ${String(pages).padStart(3)} pages  ${languageOf(lang)?.native ?? lang}`);
}
