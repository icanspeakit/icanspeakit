// „Vokabeln vom Foto“: files other than photos, read in the browser.
//
//   PDF   each page: has a text layer (digital PDF) → its text with positions, no OCR;
//         no text (a scan) → rendered to a JPEG and read by Azure like a photo.
//   DOCX  paragraphs and table rows → lines; a table row's cells sit side by side, so
//         „Tisch | -e | table“ becomes one row of three cells, like on a photo.
//   TXT   one line per line, tabs split cells.
//
// Out: { images: File[], lines: [{ text, box: { x, y, h } }], pages } for /api/wortschatz/foto
// (field `foto` for images, `zeilen` for lines). Boxes are only for grouping into rows and
// columns, so their unit doesn't matter; each page/document gets its own y range.
// pdf.js and fflate load only when such a file is picked.

export const MAX_PDF_PAGES = 20;
const PAGE_GAP = 100000;

export const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const isDocx = (f) => /officedocument\.wordprocessingml/.test(f.type) || /\.docx$/i.test(f.name);
export const isText = (f) => f.type === "text/plain" || /\.txt$/i.test(f.name);
export const isDocument = (f) => isPdf(f) || isDocx(f) || isText(f);

/** Cells of one row (strings) → lines with boxes on row `row`, page `page`. */
const rowLines = (cells, row, page = 0) =>
  cells
    .map((text, i) => ({ text: text.replace(/\s+/g, " ").trim(), box: { x: i * 1000, y: page * PAGE_GAP + row * 20, h: 10 } }))
    .filter((l) => l.text);

let sheet = 0; // every PDF page and every document gets its own y range, so rows never mix

/* ------------------------------------------------------------------ PDF ---- */

let pdfjsPromise = null;
async function pdfjs() {
  pdfjsPromise ??= (async () => {
    const lib = await import("pdfjs-dist");
    lib.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    return lib;
  })();
  return pdfjsPromise;
}

/** A page's text items → lines: items on one baseline form a row; close items merge into one cell. */
function pageLines(items, viewport, page) {
  const pieces = items
    .filter((it) => it.str?.trim())
    .map((it) => {
      const h = Math.abs(it.height || it.transform[3]) || 10;
      return { str: it.str, x: it.transform[4], y: viewport.height - it.transform[5], h, w: it.width };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const p of pieces) {
    const row = rows.find((r) => Math.abs(r.y - p.y) < Math.max(r.h, p.h) * 0.5);
    if (row) row.items.push(p); else rows.push({ y: p.y, h: p.h, items: [p] });
  }
  const out = [];
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x);
    let cell = null;
    for (const it of r.items) {
      const gap = cell ? it.x - (cell.x + cell.w) : Infinity;
      // A gap of about two letters or more starts a new column.
      if (cell && gap < it.h * 1.2) {
        cell.text += (gap > it.h * 0.15 && !/\s$/.test(cell.text) ? " " : "") + it.str;
        cell.w = it.x + it.w - cell.x;
      } else {
        cell = { text: it.str, x: it.x, w: it.w };
        out.push({ cell, y: r.y, h: r.h });
      }
    }
  }
  return out.map(({ cell, y, h }) => ({ text: cell.text.replace(/\s+/g, " ").trim(), box: { x: cell.x, y: page * PAGE_GAP + y, h } }));
}

async function renderPage(page, max = 2000) {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(4, max / Math.max(base.width, base.height)) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return new File([blob], `seite-${page.pageNumber}.jpg`, { type: "image/jpeg" });
}

async function readPdf(file) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
  const images = [];
  const lines = [];
  for (let n = 1; n <= pages; n++) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    const chars = items.reduce((s, it) => s + (it.str?.trim().length ?? 0), 0);
    if (chars >= 20) lines.push(...pageLines(items, page.getViewport({ scale: 1 }), ++sheet));
    else images.push(await renderPage(page));
  }
  await doc.destroy();
  return { images, lines, pages: doc.numPages, cut: doc.numPages > MAX_PDF_PAGES };
}

/* ----------------------------------------------------------------- DOCX ---- */

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** A paragraph's text; tabs kept as \t (they separate columns in a tabbed list). */
function paraText(p) {
  let s = "";
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.namespaceURI !== W) { walk(c); continue; }
      if (c.localName === "t") s += c.textContent;
      else if (c.localName === "tab") s += "\t";
      else if (c.localName === "br") s += "\n";
      else walk(c);
    }
  };
  walk(p);
  return s;
}

async function readDocx(file) {
  const { unzipSync, strFromU8 } = await import("fflate");
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => f.name === "word/document.xml" });
  const xml = zip["word/document.xml"];
  if (!xml) throw new Error("Das Word-Dokument konnte nicht gelesen werden.");
  const dom = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
  const body = dom.getElementsByTagNameNS(W, "body")[0];
  const lines = [];
  let row = 0;
  const page = ++sheet;
  for (const el of body?.children ?? []) {
    if (el.localName === "p") {
      for (const part of paraText(el).split("\n")) lines.push(...rowLines(part.split(/\t+/), row++, page));
    } else if (el.localName === "tbl") {
      for (const tr of el.getElementsByTagNameNS(W, "tr")) {
        const cells = [...tr.children].filter((c) => c.localName === "tc").map((tc) => [...tc.getElementsByTagNameNS(W, "p")].map(paraText).join(" "));
        lines.push(...rowLines(cells, row++, page));
      }
    }
  }
  return { images: [], lines, pages: 1 };
}

/* ------------------------------------------------------------------ TXT ---- */

async function readTxt(file) {
  const page = ++sheet;
  const lines = (await file.text()).split(/\r?\n/).flatMap((l, row) => rowLines(l.split(/\t+|\s*;\s*/), row, page));
  return { images: [], lines, pages: 1 };
}

/** A PDF, Word or text file → { images, lines, pages, cut? }. Throws an Error for the teacher. */
export async function readDocument(file) {
  try {
    if (isPdf(file)) return await readPdf(file);
    if (isDocx(file)) return await readDocx(file);
    if (isText(file)) return await readTxt(file);
  } catch (err) {
    console.error(err);
    throw new Error(`„${file.name}“ konnte nicht gelesen werden. Ist die Datei vielleicht geschützt oder beschädigt?`);
  }
  throw new Error(`„${file.name}“: Dieses Format geht nicht. Bitte Foto, PDF, Word (.docx) oder Text.`);
}
