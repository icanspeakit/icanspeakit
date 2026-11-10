// Builds the partner and group worksheets (src/data/partneruebungen/*.json) as PDFs with
// pdfkit and the brand primitives (scripts/lib/pdf-brand.mjs), like the other downloads:
//
//   public/downloads/partner-<id>.pdf      one per checked sheet (quelle.geprueft)
//   public/downloads/partner-a1-alle.pdf   one bundle per level with checked sheets
//
//   pnpm generate:partner-pdf                       the checked sheets, as above
//   node scripts/generate-partner-pdf.mjs --all     every sheet, drafts too, into _tmp_partner-pdf/
//   node scripts/generate-partner-pdf.mjs --all --out <dir> [id …]
//
// The layout is the page's (src/lib/partneruebungen/render.js) drawn again for pdfkit: intro,
// card pages with a cut line (what the learner does alone first, then the questions / game
// rules / gap table), the together page, the answers. Page splits follow render.js's own
// rules (isLater, ownTogetherPage), so the PDF and the web page tell the same story. A card
// column that does not fit its page continues on the next one, with its header again.
//
// Everything on these sheets is written by icanspeak English. Nothing is scanned, copied or
// excerpted from a Lehrwerk; the catalogue in data/partneruebungen/ only chose the topics.
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createDoc, TEAL, TEAL_DARK, TEAL_SOFT, INK, MUTED, BORDER } from "./lib/pdf-brand.mjs";
import { validateSheet, publicSpec, tileOrder, itemsByLetter, FORMAT_NAMES } from "../src/lib/partneruebungen/schema.js";
import { isLater, hasLater, ownTogetherPage, freeTitle, unmark, skills } from "../src/lib/partneruebungen/render.js";
import { iconSvg } from "../src/lib/partneruebungen/icons.js";
import { shuffle } from "../src/lib/arbeitsblatt/seed.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src/data/partneruebungen");
const args = process.argv.slice(2);
const ALL = args.includes("--all");
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const OUT = path.resolve(ROOT, outArg ?? (ALL ? "_tmp_partner-pdf" : "public/downloads"));
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");

// The skill's colours where they carry the grammar; the brand's teal for the frame.
const KEY = "#b00020", KEY_BG = "#ffe1e1", VERB = "#1d4e75", VERB_BG = "#d7ecff";
const TILE = "#fff7e0", YELLOW = "#ffd60a", TIPP = "#fff8e6", TIPP_LINE = "#e9c46a";
const GRAM_BG = "#ecf8f6", GRAM_LINE = "#99d5cc", HEAD_BG = "#e6dccb", LINE = "#8a8f98";

// A4, tighter than the books: a worksheet wants the room for writing.
const PW = 595.28, PH = 841.89, L = 36, R = PW - 36, W = R - L, TOP = 40, BOT = PH - 46;

/* ------------------------------------------------------------------ load -- */
function load() {
  const sheets = [];
  for (const f of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
    const spec = JSON.parse(readFileSync(path.join(SRC, f), "utf8"));
    const errs = validateSheet(spec);
    if (errs.length) throw new Error(`${f}:\n  ${errs.join("\n  ")}`);
    sheets.push(publicSpec(spec));
  }
  return sheets.sort((a, b) => a.niveau.localeCompare(b.niveau) || a.titel.localeCompare(b.titel, "de"));
}

const icons = new Map();
async function iconPng(key) {
  if (!icons.has(key)) icons.set(key, await sharp(Buffer.from(iconSvg(key, { width: 240, height: 180 }))).png().toBuffer());
  return icons.get(key);
}
async function preloadIcons(spec) {
  const keys = new Set(["wuerfel"]);
  for (const k of spec.karten) for (const s of k.schritte) {
    for (const it of s.items ?? []) if (it.icon) keys.add(it.icon);
    for (const o of s.szene ?? []) keys.add(o.icon);
  }
  for (const k of keys) await iconPng(k);
}

/* ---------------------------------------------------------- the drawing -- */
function sheetDrawer(ctx) {
  const { doc, F, pic } = ctx;
  const S = ctx.S;

  /** *key* and _verb_ marks → runs. */
  const runs = (s) => {
    const out = [];
    const re = /\*([^*]+)\*|(^|[^\w])_([^_]+)_(?=[^\w]|$)/g;
    let last = 0, m;
    const str = String(s ?? "");
    while ((m = re.exec(str))) {
      if (m[1] != null) { out.push({ t: str.slice(last, m.index) }, { t: m[1], k: "k" }); last = m.index + m[0].length; }
      else { out.push({ t: str.slice(last, m.index) + m[2] }, { t: m[3], k: "v" }); last = m.index + m[0].length; }
    }
    out.push({ t: str.slice(last) });
    return out.filter((r) => r.t);
  };

  /** Rich text at (x, y) in width w. Returns its height; draws only if `draw`. */
  function text(str, x, y, w, o = {}, draw = true) {
    const size = o.size ?? 9, lineGap = o.lineGap ?? 1.2;
    const base = o.bold ? F.bold : F.regular;
    // Measured in bold when anything is marked: marks draw bold and are wider.
    const rs = runs(str);
    doc.font(rs.some((r) => r.k) || o.bold ? F.bold : F.regular).fontSize(size);
    const h = doc.heightOfString(S(unmark(str)), { width: w, lineGap, align: o.align });
    if (!draw) return h;
    rs.forEach((r, i) => {
      doc.font(r.k ? F.bold : base).fontSize(size).fillColor(r.k === "k" ? KEY : r.k === "v" ? VERB : o.color ?? INK);
      const opt = { width: w, lineGap, align: o.align, continued: i < rs.length - 1 };
      if (i === 0) doc.text(S(r.t), x, y, opt);
      else doc.text(S(r.t), opt);
    });
    doc.x = L;
    return h;
  }

  /** Word tiles in a wrapping row. */
  function tiles(list, inf, x, y, w, draw = true) {
    const size = 9, th = 15, gap = 4;
    let cx = x, cy = y;
    for (const t of list) {
      doc.font(inf.includes(t) ? F.bold : F.regular).fontSize(size);
      const tw = doc.widthOfString(S(t)) + 10;
      if (cx + tw > x + w && cx > x) { cx = x; cy += th + gap; }
      if (draw) {
        const blue = inf.includes(t);
        doc.roundedRect(cx, cy, tw, th, 3).lineWidth(0.8).fillAndStroke(blue ? VERB_BG : TILE, blue ? VERB : "#555");
        doc.fillColor(blue ? VERB : INK).text(S(t), cx + 5, cy + 3.5, { lineBreak: false });
      }
      cx += tw + gap;
    }
    return cy - y + th;
  }

  function writeLines(n, x, y, w, draw = true, gapH = 18) {
    if (draw) for (let i = 1; i <= n; i++) doc.moveTo(x, y + i * gapH).lineTo(x + w, y + i * gapH).lineWidth(0.6).strokeColor(LINE).stroke();
    return n * gapH;
  }
  /** "____________ ?" and "… ____________ ." as in the skill's question steps. */
  function answerLines(x, y, w, draw = true) {
    if (draw) {
      doc.font(F.regular).fontSize(9).fillColor(INK);
      doc.moveTo(x, y + 16).lineTo(x + w - 8, y + 16).lineWidth(0.6).strokeColor(LINE).stroke();
      doc.text("?", x + w - 6, y + 7, { lineBreak: false });
      doc.text("…", x, y + 27, { lineBreak: false });
      doc.moveTo(x + 10, y + 36).lineTo(x + w - 8, y + 36).stroke();
      doc.text(".", x + w - 5, y + 27, { lineBreak: false });
    }
    return 42;
  }

  const circle = (cx, cy, r, fill, stroke) => doc.circle(cx, cy, r).lineWidth(0.8).fillAndStroke(fill, stroke ?? fill);
  function letter(l, x, y, draw) {
    if (draw) {
      circle(x + 7, y + 7, 7, YELLOW, "#222");
      doc.fillColor(INK).font(F.bold).fontSize(8.5).text(l, x, y + 3, { width: 14, align: "center", lineBreak: false });
    }
  }
  function box(x, y, w, h, fill, line, r = 5) {
    doc.roundedRect(x, y, w, h, r).lineWidth(1.2).fillAndStroke(fill, line);
  }
  function dashedRect(x, y, w, h) {
    doc.rect(x, y, w, h).lineWidth(0.6).dash(3, { space: 2 }).strokeColor("#777").stroke().undash();
  }
  /** The skill's ■ ▲ ● for persons 1–3, drawn (no font has all three). */
  function symbol(i, x, y) {
    doc.fillColor(TEAL_DARK);
    if (i === 0) doc.rect(x, y + 2, 6, 6).fill();
    else if (i === 1) doc.polygon([x, y + 8], [x + 3.5, y + 1.5], [x + 7, y + 8]).fill();
    else doc.circle(x + 3.5, y + 5, 3.2).fill();
  }

  /** A table: header row (labels may be marked), cells may be null (empty, to fill in). */
  function grid(head, rows, x, y, w, o = {}, draw = true) {
    const n = head.length, size = o.size ?? 8, pad = 3;
    const widths = o.widths ?? head.map(() => w / n);
    const cellH = (c, i, bold) => (c == null || c === "" ? 0 : text(c, 0, 0, widths[i] - pad * 2, { size, bold }, false));
    const headH = head.some((h) => h) ? Math.max(...head.map((h, i) => cellH(h, i, true))) + pad * 2 : 0;
    const rowH = rows.map((r) => Math.max(o.minRow ?? 15, ...r.map((c, i) => cellH(c, i))) + pad * 2);
    const total = headH + rowH.reduce((a, b) => a + b, 0);
    if (!draw) return total;
    let cy = y;
    if (headH) {
      let cx = x;
      head.forEach((h, i) => {
        doc.rect(cx, cy, widths[i], headH).fillAndStroke(o.headFill?.(i) ?? "#eef1f4", "#999");
        if (h) text(h, cx + pad, cy + pad, widths[i] - pad * 2, { size, bold: true });
        cx += widths[i];
      });
      cy += headH;
    }
    rows.forEach((r, ri) => {
      let cx = x;
      r.forEach((c, i) => {
        doc.rect(cx, cy, widths[i], rowH[ri]).lineWidth(0.6).fillAndStroke(o.cellFill?.(i) ?? "#fff", "#999");
        if (c != null && c !== "") text(c, cx + pad, cy + pad, widths[i] - pad * 2, { size, bold: o.cellBold?.(i) });
        cx += widths[i];
      });
      cy += rowH[ri];
    });
    return total;
  }

  return { runs, text, tiles, writeLines, answerLines, circle, letter, box, dashedRect, symbol, grid };
}

/* ----------------------------------------------------- one sheet's pages -- */
function drawSheet(ctx, spec, { first }) {
  const { doc, F } = ctx;
  const D = sheetDrawer(ctx);
  const { text, tiles, writeLines, answerLines, circle, letter, box, dashedRect, symbol, grid } = D;
  const roleLabel = (r) => (spec.modus === "gruppe" ? `Person ${r}` : `Partner ${r}`);
  let y = TOP;
  const newPage = () => { doc.addPage(); y = TOP + 22; };
  const ensure = (h) => { if (y + h > BOT) newPage(); };

  /* ---- page 1: intro ---- */
  if (!first) newPage();
  else y = TOP;
  // Level and skills first, as on the page (render.js topStrip).
  doc.font(F.bold).fontSize(14);
  const lw = Math.max(34, doc.widthOfString(spec.niveau) + 16);
  doc.roundedRect(L, y, lw, 20, 5).fill(TEAL);
  doc.fillColor("#fff").text(spec.niveau, L, y + 1.5, { width: lw, align: "center", lineBreak: false });
  let sx = L + lw + 6;
  doc.fontSize(9.5);
  for (const sk of skills(spec)) {
    const sw = doc.widthOfString(sk) + 16;
    doc.roundedRect(sx, y + 2, sw, 16, 8).fillAndStroke(GRAM_BG, GRAM_LINE);
    doc.fillColor(TEAL_DARK).text(sk, sx, y + 4, { width: sw, align: "center", lineBreak: false });
    sx += sw + 4;
  }
  // The format line on the right of that row; the name line moves down beside the title.
  const meta = `${FORMAT_NAMES[spec.format]} · ${spec.modus === "gruppe" ? `Gruppe (${spec.personen})` : "Paar"} · ca. ${spec.dauerMin} Min.`.toUpperCase();
  doc.font(F.bold).fontSize(7.5).fillColor(MUTED).text(meta, sx + 6, y + 7, { width: R - sx - 6, align: "right", lineBreak: false, characterSpacing: 0.5 });
  y += 26;
  doc.font(F.regular).fontSize(9).fillColor(INK).text("Name:", R - 170, y + 8, { lineBreak: false });
  doc.moveTo(R - 140, y + 18).lineTo(R, y + 18).lineWidth(0.6).strokeColor("#555").stroke();
  doc.font(F.bold).fontSize(19).fillColor(TEAL_DARK).text(spec.titel, L, y, { width: W - 175 });
  y = doc.y + 2;
  y += text(spec.untertitel, L, y, W, { size: 11 }) + 8;

  // Grammatik box
  const g = spec.intro.grammatik;
  const mark = (i) => (g.markiere?.verb?.includes(i) ? VERB_BG : g.markiere?.schluessel?.includes(i) ? KEY_BG : null);
  const gramBody = (draw, by) => {
    let cy = by + 8;
    if (draw) doc.font(F.bold).fontSize(10).fillColor(TEAL_DARK).text(`Grammatik: ${spec.grammatik.join(", ")}`, L + 10, cy, { width: W - 20 });
    cy += text(`Grammatik: ${spec.grammatik.join(", ")}`, 0, 0, W - 20, { size: 10, bold: true }, false) + 5;
    cy += grid(g.kopf ?? g.positionen[0].map(() => ""), g.positionen, L + 10, cy, W - 20, { size: 9, headFill: (i) => mark(i) ?? HEAD_BG, cellFill: (i) => mark(i) ?? "#fff", cellBold: (i) => !!mark(i), minRow: 12 }, draw) + 6;
    cy += text(g.regel, L + 10, cy, W - 20, { size: 9 }, draw) + 4;
    if (g.tabelle) {
      const cw = Math.min(90, (W - 20) / g.tabelle.kopf.length);
      cy += grid(g.tabelle.kopf, g.tabelle.zeilen, L + 10, cy, cw * g.tabelle.kopf.length, { size: 8.5, headFill: () => HEAD_BG, minRow: 11 }, draw) + 4;
    }
    return cy + 4 - by;
  };
  const gh = gramBody(false, y);
  box(L, y, W, gh, GRAM_BG, GRAM_LINE);
  gramBody(true, y);
  y += gh + 8;

  // Redemittel, So geht's, (Und Sie?)
  const listBox = (title, items, kind) => {
    const body = (draw, by) => {
      let cy = by + 8;
      if (draw) doc.font(F.bold).fontSize(10).fillColor(TEAL_DARK).text(title, L + 10, cy, { width: W - 20 });
      cy += 15;
      items.forEach((it, i) => {
        if (kind === "red") {
          ["p1", "p2", "p3"].filter((p) => it[p]).forEach((p, pi) => {
            if (draw) symbol(pi, L + 12, cy);
            cy += text(it[p], L + 24, cy, W - 34, { size: 9 }, draw) + 1.5;
          });
          cy += 2;
        } else {
          if (draw) doc.font(F.bold).fontSize(9).fillColor(TEAL_DARK).text(kind === "ol" ? `${i + 1}.` : "•", L + 12, cy, { lineBreak: false });
          cy += text(it, L + 26, cy, W - 36, { size: 9 }, draw) + 2.5;
        }
      });
      return cy + 4 - by;
    };
    const h = body(false, y);
    ensure(h + 8);
    box(L, y, W, h, GRAM_BG, GRAM_LINE);
    body(true, y);
    y += h + 8;
  };
  listBox("Redemittel", spec.intro.redemittel, "red");
  listBox("So geht's", spec.intro.soGehts, "ol");
  if (!ownTogetherPage(spec) && spec.zusammen?.freiFragen?.length) listBox(freeTitle(spec.zusammen.titel), spec.zusammen.freiFragen, "ul");

  /* ---- card pages ---- */
  const by = itemsByLetter(spec);

  /** One card's blocks for one card page: each { h, draw(x, y) } at width cw. */
  function cardBlocks(k, later, cw) {
    const blocks = [];
    const add = (fn) => blocks.push({ h: fn(0, false), draw: (x, yy) => fn(x, true, yy) });
    // The Tipp box under the header.
    add((x, draw, yy = 0) => {
      const t = k.tipp;
      const body = (d) => {
        let cy = yy + 5;
        if (d) doc.font(F.bold).fontSize(8.5).fillColor(INK).text("Tipp", x + 7, cy, { lineBreak: false });
        cy += 11;
        cy += text(t.formel, x + 7, cy, cw - 14, { size: 8.5, bold: true }, d) + 2;
        cy += text(t.beispiel, x + 7, cy, cw - 14, { size: 8.5, color: "#444" }, d) + 2;
        for (const hnt of t.hinweise ?? []) {
          if (d) doc.font(F.regular).fontSize(8).fillColor(INK).text("•", x + 7, cy, { lineBreak: false });
          cy += text(hnt, x + 15, cy, cw - 22, { size: 8 }, d) + 1;
        }
        return cy + 4 - yy;
      };
      const h = body(false);
      if (draw) { box(x, yy, cw, h, TIPP, TIPP_LINE, 4); body(true); }
      return h + 4;
    });
    k.schritte.forEach((s, si) => {
      if (isLater(k, s) !== later) return;
      // Step heading
      add((x, draw, yy = 0) => {
        const h = text(s.anweisung, 0, 0, cw - 18, { size: 9, bold: true }, false);
        if (draw) {
          circle(x + 6.5, yy + 6.5, 6.5, TEAL_DARK);
          doc.fillColor("#fff").font(F.bold).fontSize(8).text(String(si + 1), x, yy + 2.8, { width: 13, align: "center", lineBreak: false });
          text(s.anweisung, x + 18, yy + 1, cw - 18, { size: 9, bold: true });
        }
        return Math.max(14, h + 2) + 4;
      });
      const item = (it, l, list, inf, seed, sol, after) => add((x, draw, yy = 0) => {
        const ix = x + 18, iw = cw - 18;
        let cy = yy;
        letter(l, x, yy, draw);
        let sx = ix;
        if (it.icon) {
          if (draw) doc.image(ctx.pic(icons.get(it.icon)), ix, cy, { width: 30, height: 22.5 });
          sx = ix + 34;
        }
        const sh = text(it.situation, sx, cy + (it.icon ? 5 : 2), ix + iw - sx, { size: 9 }, draw);
        cy += Math.max(it.icon ? 24 : 0, sh + (it.icon ? 5 : 2)) + 3;
        cy += tiles(tileOrder(spec.id, seed, list, sol), inf, ix, cy, iw, draw);
        cy += after(ix, cy, iw, draw);
        return cy - yy + 8;
      });
      if (s.typ === "allein") for (const it of s.items) item(it, it.buchstabe, it.kacheln, it.infinitive ?? [], it.buchstabe, it.loesung, (ix, cy, iw, d) => writeLines(it.zeilen ?? 2, ix, cy, iw, d));
      if (s.typ === "zusammen") for (const l of s.fragenAn) { const it = by.get(l).item; item(it, l, it.frageKacheln, it.frageInfinitive ?? [], `${l}?`, it.frage, (ix, cy, iw, d) => answerLines(ix, cy, iw, d)); }
      if (s.typ === "tabelle") add((x, draw, yy = 0) => grid(s.spalten, s.zeilen, x, yy, cw, { size: 7.5, minRow: 13 }, draw) + 6);
      if (s.typ === "rolle") add((x, draw, yy = 0) => {
        const body = (d) => {
          let cy = yy + 6;
          cy += text(`Ihre Rolle: *${s.rolle}*`, x + 7, cy, cw - 14, { size: 10 }, d) + 3;
          cy += text(`Ihr Ziel: ${s.ziel}`, x + 7, cy, cw - 14, { size: 9 }, d) + 4;
          cy += text("Das wissen Sie:", x + 7, cy, cw - 14, { size: 8.5, bold: true }, d) + 1;
          for (const i of s.infos) { if (d) doc.font(F.regular).fontSize(9).fillColor(INK).text("•", x + 9, cy, { lineBreak: false }); cy += text(i, x + 17, cy, cw - 24, { size: 9 }, d) + 1.5; }
          cy += 3 + text("Das können Sie sagen:", x + 7, cy, cw - 14, { size: 8.5, bold: true }, d) + 2;
          cy += tiles(s.redemittel, [], x + 7, cy, cw - 14, d) + 4;
          if (s.situationen) {
            cy += text("Situationen:", x + 7, cy, cw - 14, { size: 8.5, bold: true }, d) + 1;
            s.situationen.forEach((t, i) => { if (d) doc.font(F.bold).fontSize(9).fillColor(TEAL_DARK).text(`${i + 1}.`, x + 8, cy, { lineBreak: false }); cy += text(t, x + 20, cy, cw - 27, { size: 9 }, d) + 1.5; });
          }
          return cy + 5 - yy;
        };
        const h = body(false);
        if (draw) { doc.roundedRect(x, yy, cw, h, 4).lineWidth(1).strokeColor(GRAM_LINE).stroke(); body(true); }
        return h + 6;
      });
      if (s.typ === "raster") add((x, draw, yy = 0) => {
        const c = cw / 3;
        const rowsH = [0, 1, 2].map((r) => Math.max(...[0, 1, 2].map((ci) => text(s.felder[r * 3 + ci], 0, 0, c - 8, { size: 8.5 }, false))) + 24);
        let cy = yy;
        [0, 1, 2].forEach((r) => {
          [0, 1, 2].forEach((ci) => {
            const cx = x + ci * c;
            if (!draw) return;
            doc.rect(cx, cy, c, rowsH[r]).lineWidth(0.7).strokeColor("#777").stroke();
            text(s.felder[r * 3 + ci], cx + 4, cy + 4, c - 8, { size: 8.5 });
            const fy = cy + rowsH[r] - 13;
            if (spec.modus === "gruppe") {
              doc.font(F.regular).fontSize(7.5).fillColor(MUTED).text("Name:", cx + 4, fy, { lineBreak: false });
              doc.moveTo(cx + 28, fy + 8).lineTo(cx + c - 6, fy + 8).lineWidth(0.5).strokeColor(LINE).stroke();
            } else {
              doc.rect(cx + 4, fy, 7, 7).lineWidth(0.6).strokeColor("#555").stroke();
              doc.rect(cx + 34, fy, 7, 7).stroke();
              doc.font(F.regular).fontSize(7.5).fillColor(MUTED).text("ja", cx + 14, fy, { lineBreak: false }).text("nein", cx + 44, fy, { lineBreak: false });
            }
          });
          cy += rowsH[r];
        });
        return cy - yy + 6;
      });
      if (s.typ === "bild") add((x, draw, yy = 0) => {
        const h = cw * 0.75;
        if (draw) {
          doc.save();
          doc.roundedRect(x, yy, cw, h, 4).clip();
          doc.rect(x, yy, cw, h * 0.62).fill("#fdfbf6");
          doc.rect(x, yy + h * 0.62, cw, h * 0.38).fill("#efe4d1");
          for (const o of s.szene) {
            const iw = cw * (14 / 85) * (o.groesse ?? 1), ih = iw * 0.75;
            doc.image(ctx.pic(icons.get(o.icon)), x + (o.x / 100) * cw - iw / 2, yy + (o.y / 100) * h - ih / 2, { width: iw, height: ih });
          }
          doc.restore();
          doc.roundedRect(x, yy, cw, h, 4).lineWidth(1).strokeColor("#555").stroke();
        }
        return h + 8;
      });
      if (s.typ === "wuerfel") {
        add((x, draw, yy = 0) => grid(["", ""], s.regel.map((r) => [`Wurf ${r.wurf}`, r.form]), x, yy, cw, { size: 8, widths: [cw * 0.3, cw * 0.7], cellBold: (i) => i === 0, minRow: 12 }, draw) + 6);
        add((x, draw, yy = 0) => {
          const c = (cw - 4) / 2;
          const hs = s.felder.map((f, i) => text(`${i + 1}. ${f}`, 0, 0, c - 8, { size: 8.5 }, false) + 8);
          let cy = yy;
          for (let i = 0; i < s.felder.length; i += 2) {
            const rh = Math.max(hs[i], hs[i + 1] ?? 0);
            [i, i + 1].filter((j) => j < s.felder.length).forEach((j, n) => {
              const cx = x + n * (c + 4);
              if (draw) {
                doc.roundedRect(cx, cy, c, rh, 3).lineWidth(0.6).strokeColor("#999").stroke();
                text(`*${j + 1}.* ${s.felder[j]}`, cx + 4, cy + 4, c - 8, { size: 8.5 });
              }
            });
            cy += rh + 4;
          }
          return cy - yy + 2;
        });
      }
      if (s.typ === "regeln") add((x, draw, yy = 0) => {
        let cy = yy;
        s.schritte.forEach((r, i) => { if (draw) doc.font(F.bold).fontSize(9).fillColor(TEAL_DARK).text(`${i + 1}.`, x + 2, cy, { lineBreak: false }); cy += text(r, x + 14, cy, cw - 14, { size: 9 }, draw) + 2; });
        return cy - yy + 4;
      });
      if (s.typ === "schreiben") add((x, draw, yy = 0) => {
        let cy = yy;
        if (s.vorgabe) {
          const h = text(s.vorgabe, 0, 0, cw - 12, { size: 9 }, false) + 8;
          if (draw) { doc.rect(x, cy, cw, h).fill("#f7f8fa"); doc.rect(x, cy, 2.5, h).fill(TEAL); text(s.vorgabe, x + 8, cy + 4, cw - 12, { size: 9 }); }
          cy += h + 4;
        }
        if (s.kacheln) cy += tiles(shuffle(s.kacheln, `${spec.id}:${k.rolle}:${si}`), s.infinitive ?? [], x, cy, cw, draw) + 2;
        cy += writeLines(s.zeilen, x, cy, cw, draw, 20);
        return cy - yy + 8;
      });
      if (s.typ === "interview") {
        s.fragen.forEach((q, qi) => add((x, draw, yy = 0) => {
          const lw = cw * 0.62;
          const inner = (d) => (q.kacheln
            ? tiles(shuffle(q.kacheln, `${spec.id}:${k.rolle}:${si}:${qi}`), q.infinitive ?? [], x + 4, yy + 4, lw - 8, d) + 22
            : text(q.frage, x + 4, yy + 4, lw - 8, { size: 9 }, d) + 8);
          const h = inner(false) + 4;
          if (draw) {
            doc.rect(x, yy, lw, h).lineWidth(0.6).strokeColor("#999").stroke();
            doc.rect(x + lw, yy, cw - lw, h).stroke();
            inner(true);
            if (q.kacheln) { doc.moveTo(x + 4, yy + h - 6).lineTo(x + lw - 12, yy + h - 6).lineWidth(0.6).strokeColor(LINE).stroke(); doc.font(F.regular).fontSize(9).fillColor(INK).text("?", x + lw - 10, yy + h - 15, { lineBreak: false }); }
          }
          return h;
        }));
        if (s.bericht) add((x, draw, yy = 0) => {
          const h = text(s.bericht, x, yy + 8, cw, { size: 9 }, draw);
          writeLines(2, x, yy + 8 + h - 4, cw, draw, 18);
          return h + 48;
        });
      }
    });
    const last = later || !hasLater(spec);
    if (last && spec.modus === "gruppe") add((x, draw, yy = 0) => text(spec.gruppe.rotation, x, yy + 2, cw, { size: 8, color: MUTED }, draw) + 6);
    if (last && k.undSie) add((x, draw, yy = 0) => {
      const h = text(`*Und Sie?* ${k.undSie}`, 0, 0, cw - 12, { size: 8.5 }, false) + 8;
      if (draw) { doc.roundedRect(x, yy + 2, cw, h, 3).lineWidth(0.7).dash(2, { space: 2 }).strokeColor(GRAM_LINE).stroke().undash(); text(`*Und Sie?* ${k.undSie}`, x + 6, yy + 6, cw - 12, { size: 8.5 }); }
      return h + 6;
    });
    return blocks;
  }

  /** Card pages: columns side by side, each paginated on its own, pages in lockstep. */
  function cardPages(later) {
    const groups = spec.personen === 4 ? [spec.karten.slice(0, 2), spec.karten.slice(2)] : [spec.karten];
    for (const cards of groups) {
      const n = cards.length, gap = 18, cw = (W - gap * (n - 1)) / n;
      const cols = cards.map((k) => {
        const blocks = cardBlocks(k, later, cw);
        const pages = [[]];
        let h = 0;
        const room = BOT - (TOP + 22) - 26; // below the cut line and the card header
        for (const b of blocks) {
          if (h + b.h > room && pages.at(-1).length) { pages.push([]); h = 0; }
          pages.at(-1).push(b);
          h += b.h;
        }
        return { k, pages };
      });
      const count = Math.max(...cols.map((c) => c.pages.length));
      for (let p = 0; p < count; p++) {
        newPage();
        const top = y;
        // Cut line across, and between the columns.
        // No font here has ✂: a dashed rule with the words in its middle says the same.
        doc.font(F.regular).fontSize(7.5).fillColor(MUTED).text("hier durchschneiden", L, top - 15, { width: W, align: "center" });
        const tw = doc.widthOfString("hier durchschneiden") / 2 + 8;
        for (const [a, b] of [[L, L + W / 2 - tw], [L + W / 2 + tw, R]]) doc.moveTo(a, top - 11).lineTo(b, top - 11).lineWidth(0.8).dash(4, { space: 3 }).strokeColor("#888").stroke().undash();
        cols.forEach((c, ci) => {
          const x = L + ci * (cw + gap);
          if (ci > 0) doc.moveTo(x - gap / 2, top - 4).lineTo(x - gap / 2, BOT).lineWidth(1).dash(4, { space: 3 }).strokeColor("#888").stroke().undash();
          const blocks = c.pages[p] ?? [];
          if (!blocks.length) return;
          doc.roundedRect(x, top, cw, 19, 3).fill(TEAL_DARK);
          doc.fillColor("#fff").font(F.bold).fontSize(11.5).text(roleLabel(c.k.rolle) + (p > 0 ? " (weiter)" : ""), x + 7, top + 4, { width: cw - 14, lineBreak: false });
          let cy = top + 25;
          for (const b of blocks) { b.draw(x, cy); cy += b.h; }
        });
        y = BOT;
      }
    }
  }
  cardPages(false);
  if (hasLater(spec)) cardPages(true);

  /* ---- together ---- */
  const z = spec.zusammen;
  if (ownTogetherPage(spec)) {
    newPage();
    doc.font(F.bold).fontSize(16).fillColor(TEAL_DARK).text(z?.titel ?? "Zusammen", L, y, { width: W });
    y = doc.y + 8;
    if (spec.gruppe) {
      const head = ["Person", ...spec.gruppe.ergebnis.spalten];
      const widths = [50, ...spec.gruppe.ergebnis.spalten.map(() => (W - 50) / spec.gruppe.ergebnis.spalten.length)];
      doc.font(F.bold).fontSize(10).fillColor(TEAL_DARK).text("Gruppen-Ergebnis", L, y);
      y += 15;
      y += grid(head, spec.karten.map((k) => [k.rolle, ...spec.gruppe.ergebnis.spalten.map(() => null)]), L, y, W, { size: 9, widths, minRow: 18 }) + 8;
      y += text(spec.gruppe.ergebnis.bericht, L, y, W, { size: 9 }) + 2;
      y += writeLines(2, L, y, W, true, 18) + 10;
    }
    if (z?.regeln?.length) listBox("Spielregeln", z.regeln, "ol");
    if (z?.wortkarten?.length) {
      ensure(40);
      doc.font(F.bold).fontSize(10).fillColor(TEAL_DARK).text("Wortkarten – ausschneiden", L, y);
      y += 15;
      const cols = 4, cw = W / cols, ch = 30;
      shuffle(z.wortkarten, `${spec.id}:wk`).forEach((w, i) => {
        const cx = L + (i % cols) * cw, cy = y + Math.floor(i / cols) * ch;
        dashedRect(cx, cy, cw, ch);
        text(w, cx + 4, cy + 10, cw - 8, { size: 10, align: "center" });
      });
      y += Math.ceil(z.wortkarten.length / cols) * ch + 12;
    }
    if (z?.freiFragen?.length) listBox(freeTitle(z.titel), z.freiFragen, "ul");
  }

  /* ---- Lösungen ---- */
  newPage();
  doc.font(F.bold).fontSize(16).fillColor(TEAL_DARK).text("Lösungen", L, y, { width: W });
  y = doc.y + 8;
  const withQ = spec.loesungen.some((l) => l.frage);
  const widths = withQ ? [22, (W - 22) * 0.42, (W - 22) * 0.58] : [22, W - 22];
  const head = withQ ? ["", "Frage", "Antwort"] : ["", "Antwort"];
  for (const l of spec.loesungen) {
    const row = withQ ? [l.buchstabe ?? "", l.frage ?? "", l.antwort] : [l.buchstabe ?? "", l.antwort];
    const h = grid(head, [row], L, y, W, { size: 9, widths }, false);
    if (y + h > BOT) newPage();
    // The header only above the first row of a page.
    const atTop = y < TOP + 60;
    y += grid(atTop ? head : head.map(() => ""), [row], L, y, W, { size: 9, widths, cellBold: (i) => i === 0, headFill: () => TEAL_SOFT }) ;
  }
}

/* ------------------------------------------------------------------ run -- */
async function build(specs, file, { bundle = null } = {}) {
  const outPath = path.join(OUT, file);
  const ctx = createDoc({ outPath, runningHead: bundle ? `DEUTSCHACADEMY · PARTNERÜBUNGEN ${bundle}` : `DEUTSCHACADEMY · ${specs[0].titel}`, unicode: true });
  // The running head at this file's tighter margin, not the books' 56 pt.
  ctx.doc.removeAllListeners("pageAdded");
  ctx.doc.on("pageAdded", () => {
    ctx.doc.fillColor(MUTED).font(ctx.F.regular).fontSize(7.5).text(ctx.S(bundle ? `icanspeak English · Partner- und Gruppenübungen ${bundle}` : `icanspeak English · ${specs[0].titel}`), L, 18, { width: W, lineBreak: false });
    ctx.doc.moveTo(L, 30).lineTo(R, 30).strokeColor(BORDER).lineWidth(0.6).stroke();
  });
  for (const s of specs) await preloadIcons(s);
  if (bundle) {
    ctx.cover({
      eyebrow: `DEUTSCHACADEMY · ARBEITSBLÄTTER ${bundle}`,
      title: `Partner- und Gruppenübungen ${bundle}`,
      subtitle: "Sprechen statt nur schreiben: Informationslücken, Rollenspiele, Spiele – mit Karten zum Ausschneiden, Tipps und Lösungen.",
      meta: specs.map((s) => `${s.titel} – ${FORMAT_NAMES[s.format]}, ${s.modus === "gruppe" ? `Gruppe (${s.personen})` : "Paar"}`),
      footer: "Alle Blätter sind eigene Texte von icanspeak English. Kostenlos für den eigenen Unterricht.",
    });
  }
  specs.forEach((s, i) => drawSheet(ctx, s, { first: !bundle && i === 0 }));
  await ctx.finish();
  return outPath;
}

const sheets = load().filter((s) => (ALL || s.quelle.geprueft) && (!only.length || only.includes(s.id)));
mkdirSync(OUT, { recursive: true });
for (const s of sheets) console.log(`✓ ${path.relative(ROOT, await build([s], `partner-${s.id}.pdf`))}`);
// One bundle per level: only checked sheets (a draft bundle would just repeat the drafts).
if (!only.length) {
  for (const lv of [...new Set(sheets.map((s) => s.niveau))]) {
    const of = sheets.filter((s) => s.niveau === lv && (ALL || s.quelle.geprueft));
    if (of.length) console.log(`✓ ${path.relative(ROOT, await build(of, `partner-${lv.toLowerCase()}-alle.pdf`, { bundle: lv }))}`);
  }
}
if (!sheets.length) console.log("generate-partner-pdf: keine geprüften Blätter – nichts zu bauen. (--all baut die Entwürfe nach _tmp_partner-pdf/)");
