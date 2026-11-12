#!/usr/bin/env node
// Raster versions of the icanspeak Portuguese logos, made from the icanspeak.it brand kit
// (public/logos, docs/brand/BRAND.md). The SVGs there are the masters and are never redrawn
// or recoloured; this script only rasterises them for the places that need a PNG or ICO.
//
// Writes:
//   public/assets/logo.png         the wordmark, 4x its 44 px nav height, transparent: the
//                                  PDF generators and the hub share cards
//   public/assets/og-default.png   1200×630 on the warm paper: the default Open Graph card
//   public/logos/icanspeak-portuguese-app-512.png, -app-1024.png   (manifest icons)
//   public/logos/icanspeak-portuguese-apple-touch-icon.png          (180×180, opaque)
//   public/logos/icanspeak-portuguese-mark-1024.png                 (JSON-LD / OG logo)
//   public/logos/favicon.ico       16, 32 and 48 px PNGs in one ICO, from favicon.svg
//   public/favicon.ico, public/apple-touch-icon.png, public/favicon-16x16.png,
//   public/favicon-32x32.png, public/icon-192.png, public/icon-512.png
//                                  copies at the paths browsers and tools probe
//
// The course PNGs that came with the kit were empty renders (a broken-image glyph on a
// transparent square), so they are rebuilt here from the SVG masters (base-path-and-brand).
//
// Favicons, the manifest icons and the JSON-LD logo point at public/logos directly
// (Layout.astro, site.webmanifest, src/lib/seo/jsonld.ts); bump their ?v= when they change.
// The two lines of text on the share card are set in a system serif (librsvg cannot use
// the self-hosted web fonts); the wordmark itself is outlined paths.
// Usage: node scripts/build-wordmark.mjs
import { createRequire } from "node:module";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => path.join(ROOT, p);

const PAPER = "#fbf7ef";
const ICON_PAPER = "#F4EDE2"; // the app icon's own background (icanspeak-portuguese-app.svg)
const INK = "#24201b";
const MUTED = "#6b6152";
const AMBER = "#b3812e";
const SERIF = "Georgia, 'Times New Roman', serif";

const wordmark = readFileSync(out("public/logos/icanspeak-portuguese-wordmark.svg"));
const appIcon = readFileSync(out("public/logos/icanspeak-portuguese-app.svg"));
const mark = readFileSync(out("public/logos/icanspeak-portuguese-mark.svg"));
const faviconSvg = readFileSync(out("public/logos/favicon.svg"));

// viewBox 1102 × 161
const WM_W = 1102;
const WM_H = 161;
const wordmarkPng = (width) => sharp(wordmark, { density: 300 }).resize({ width }).png().toBuffer();
const square = (svg, size) => sharp(svg, { density: 600 }).resize(size, size).png().toBuffer();

// The nav logo: 4x a 44 px height.
await sharp(await wordmarkPng(Math.round((WM_W / WM_H) * 176))).png().toFile(out("public/assets/logo.png"));

const ogBase = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="a" cx="0" cy="0" r="0.75"><stop offset="0" stop-color="${AMBER}" stop-opacity=".16"/><stop offset="1" stop-color="${AMBER}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="1" cy="0" r="0.75"><stop offset="0" stop-color="#2b4162" stop-opacity=".10"/><stop offset="1" stop-color="#2b4162" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <text x="600" y="392" font-family="${SERIF}" font-size="40" fill="${INK}" text-anchor="middle">Learn the Portuguese of Portugal, A1 to C1</text>
  <text x="600" y="446" font-family="${SERIF}" font-size="28" fill="${MUTED}" text-anchor="middle">Grammar · Vocabulary · CIPLE and the CAPLE exams · Life in Portugal</text>
  <circle cx="600" cy="532" r="5" fill="${AMBER}"/>
  <text x="600" y="580" font-family="${SERIF}" font-size="24" fill="${MUTED}" text-anchor="middle">part of icanspeak.it</text>
</svg>`;
const OG_WM_W = 900;
const ogWord = await wordmarkPng(OG_WM_W);
const { height: wh } = await sharp(ogWord).metadata();
await sharp(Buffer.from(ogBase))
  .composite([{ input: ogWord, left: Math.round((1200 - OG_WM_W) / 2), top: Math.round(290 - wh) }])
  .png()
  .toFile(out("public/assets/og-default.png"));

// Course icons from the SVG masters.
writeFileSync(out("public/logos/icanspeak-portuguese-app-512.png"), await square(appIcon, 512));
writeFileSync(out("public/logos/icanspeak-portuguese-app-1024.png"), await square(appIcon, 1024));
writeFileSync(out("public/logos/icanspeak-portuguese-mark-1024.png"), await square(mark, 1024));
// iOS paints transparent corners black: the touch icon is flattened onto the icon's paper.
writeFileSync(
  out("public/logos/icanspeak-portuguese-apple-touch-icon.png"),
  await sharp(await square(appIcon, 180)).flatten({ background: ICON_PAPER }).png().toBuffer(),
);

// favicon.ico: an ICO directory with embedded PNGs (supported by every current browser).
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(icoSizes.map((s) => square(faviconSvg, s)));
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(icoPngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += icoPngs[i].length;
});
writeFileSync(out("public/logos/favicon.ico"), Buffer.concat([header, ...icoPngs]));

copyFileSync(out("public/logos/favicon.ico"), out("public/favicon.ico"));
copyFileSync(out("public/logos/icanspeak-portuguese-apple-touch-icon.png"), out("public/apple-touch-icon.png"));
writeFileSync(out("public/favicon-16x16.png"), icoPngs[0]);
writeFileSync(out("public/favicon-32x32.png"), icoPngs[1]);
writeFileSync(out("public/icon-192.png"), await square(appIcon, 192));
copyFileSync(out("public/logos/icanspeak-portuguese-app-512.png"), out("public/icon-512.png"));
console.log("wordmark: logo.png, og-default.png, course icons, favicon.ico and the root copies written from public/logos");
