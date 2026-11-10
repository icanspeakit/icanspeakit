// Turns the hub photos from scripts/fetch-hub-bilder.mjs into what the pages serve.
//
//   pnpm hubs:build            write whatever is missing
//   pnpm hubs:build --force    rewrite everything
//
// Per hub with a photo in public/assets/hubs/<id>.jpg:
//   public/assets/hubs/opt/<id>-{800,1200,1600}.{avif,webp}   the hero banner, cut to 16:6
//   public/og/<id>.jpg                                          1200×630 share image with title
// and one manifest for all of them: src/data/hub-bilder.manifest.json.
//
// The pages read only the manifest, never the file system. That matters because Layout is
// also used by the on-demand routes on Vercel (/anmelden, /konto), where public/ is not on
// disk at request time; a static JSON import works in every build, the app build included.
// A hub missing from the manifest renders exactly as before this existed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp"); // resolved like generate-sprechen-thumbs.mjs does, for pnpm

// --set szenen: the Lernset scene photos — the same banner cut, no share images (a deck
// page keeps the site's default OG image), its own manifest.
const SET_NAME = process.argv.includes("--set") ? process.argv[process.argv.indexOf("--set") + 1] : "hubs";
const SETS = {
  hubs: { data: "src/data/hub-bilder.json", manifest: "src/data/hub-bilder.manifest.json", dir: "public/assets/hubs", og: true },
  szenen: { data: "src/data/wortschatz-szenen.json", manifest: "src/data/wortschatz-szenen.manifest.json", dir: "public/assets/szenen", og: false },
};
const SET = SETS[SET_NAME];
if (!SET) { console.error(`--set: ${Object.keys(SETS).join(" | ")}`); process.exit(1); }
const DATA = SET.data;
const MANIFEST = SET.manifest;
const SRC_DIR = SET.dir;
const OPT_DIR = path.join(SRC_DIR, "opt");
const OG_DIR = "public/og";
const PROV = path.join(SRC_DIR, "provenance.json");
const LOGO = "public/assets/logo.png";

const WIDTHS = [800, 1200, 1600];
const RATIO = 6 / 16; // banner height / width
const FORCE = process.argv.includes("--force");

mkdirSync(OPT_DIR, { recursive: true });
if (SET.og) mkdirSync(OG_DIR, { recursive: true });

const { slots } = JSON.parse(readFileSync(DATA, "utf8"));
const provenance = existsSync(PROV) ? JSON.parse(readFileSync(PROV, "utf8")) : {};
const manifest = {};

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

/* The OG overlay: a dark gradient from the left so white type reads on any photo, the hub
   title in two lines at most, and the site name under it. Drawn as SVG and composited, so
   there is no second image tool in the chain. */
function ogOverlay(title) {
  const words = title.split(" ");
  const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length > 26 && cur) lines.push(w);
    else lines[lines.length - 1] = (cur + " " + w).trim();
  }
  const top = 630 - 150 - (lines.length - 1) * 72;
  const text = lines
    .slice(0, 3)
    .map((l, i) => `<text x="72" y="${top + i * 72}" font-size="64" font-weight="600">${esc(l)}</text>`)
    .join("");
  return Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#0b1a2e" stop-opacity=".88"/>
    <stop offset=".65" stop-color="#0b1a2e" stop-opacity=".35"/>
    <stop offset="1" stop-color="#0b1a2e" stop-opacity="0"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g fill="#fff" font-family="Sora, 'Albert Sans', 'Segoe UI', Arial, sans-serif">${text}
    <text x="72" y="566" font-size="28" opacity=".85">icanspeak.it/english</text>
  </g></svg>`);
}

// Where the cut sits. sharp's "attention" crop goes for the busiest area, which in these
// photos is often hands or a newspaper rather than a face; a slot with `focusY` (0 = top of
// the photo, 1 = bottom) is cut there instead, full width. Without it, "attention" as before.
async function cut(src, slot, w, h) {
  if (typeof slot.focusY !== "number") return sharp(src).resize({ width: w, height: h, fit: "cover", position: "attention" });
  const meta = await sharp(src).metadata();
  const scaledH = Math.round(meta.height * (w / meta.width));
  if (scaledH < h) return sharp(src).resize({ width: w, height: h, fit: "cover", position: "attention" });
  const top = Math.round((scaledH - h) * Math.min(1, Math.max(0, slot.focusY)));
  const buf = await sharp(src).resize({ width: w }).toBuffer();
  return sharp(buf).extract({ left: 0, top, width: w, height: h });
}

let built = 0;
for (const slot of slots) {
  const src = path.join(SRC_DIR, `${slot.id}.jpg`);
  if (!existsSync(src)) continue;

  for (const w of WIDTHS) {
    const h = Math.round(w * RATIO);
    for (const fmt of ["avif", "webp"]) {
      const out = path.join(OPT_DIR, `${slot.id}-${w}.${fmt}`);
      if (existsSync(out) && !FORCE) continue;
      const img = await cut(src, slot, w, h);
      await (fmt === "avif" ? img.avif({ quality: 52 }) : img.webp({ quality: 74 })).toFile(out);
      built++;
    }
  }

  const og = path.join(OG_DIR, `${slot.id}.jpg`);
  if (SET.og && (!existsSync(og) || FORCE)) {
    const layers = [{ input: ogOverlay(slot.title) }];
    // The logo is blue on transparent and disappears into a dark photo, so it sits on a
    // light pill: the brand colours stay as they are and read on any picture.
    if (existsSync(LOGO)) {
      const logo = await sharp(LOGO).resize({ height: 48 }).png().toBuffer();
      const { width: lw } = await sharp(logo).metadata();
      const padX = 22, padY = 14, pw = lw + padX * 2, ph = 48 + padY * 2;
      const pill = Buffer.from(`<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg"><rect width="${pw}" height="${ph}" rx="${ph / 2}" fill="#fff" fill-opacity=".94"/></svg>`);
      layers.push({ input: pill, top: 48, left: 60 }, { input: logo, top: 48 + padY, left: 60 + padX });
    }
    await (await cut(src, slot, 1200, 630))
      .composite(layers)
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(og);
    built++;
  }

  const prov = provenance[`${slot.id}.jpg`] ?? {};
  manifest[slot.id] = {
    path: slot.path,
    alt: slot.alt,
    // Where the page's own crop sits: the phone shows the 16:6 cut at 16:9 (focusX picks the
    // horizontal slice), a wide screen caps it at 300px (objectY picks the vertical one).
    focusX: slot.focusX ?? null,
    objectY: slot.objectY ?? null,
    widths: WIDTHS,
    width: WIDTHS[WIDTHS.length - 1],
    height: Math.round(WIDTHS[WIDTHS.length - 1] * RATIO),
    og: SET.og ? `/og/${slot.id}.jpg` : null,
    source: prov.source ?? null,
    pageURL: prov.pageURL ?? null,
    photographer: prov.photographer ?? null,
  };
  console.log(`  ✓ ${slot.id}`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${Object.keys(manifest).length} Hub(s) im Manifest, ${built} Datei(en) geschrieben.`);
const missing = slots.filter((s) => !manifest[s.id]).map((s) => s.id);
if (missing.length) console.log(`Noch ohne Foto: ${missing.join(", ")} — pnpm hubs:fetch`);
