#!/usr/bin/env node
// Raster versions of the icanspeak Spanish wordmark, made from the icanspeak.it brand kit
// (public/logos, docs/brand/BRAND.md). The SVGs there are the masters and are never redrawn
// or recoloured; this script only rasterises them for the places that need a PNG.
//
// Writes:
//   public/assets/logo.png         the wordmark, 4x its 44 px nav height, transparent: the
//                                  PDF generators and the hub share cards
//   public/assets/og-default.png   1200×630 on the warm paper: the default Open Graph card
//   public/favicon.ico, public/apple-touch-icon.png
//                                  copies of the kit's icons at the paths browsers probe
//
// Favicons, the manifest icons and the JSON-LD logo point at public/logos directly
// (Layout.astro, site.webmanifest, src/lib/seo/jsonld.ts); bump their ?v= when they change.
// The two lines of text on the share card are set in a system serif (librsvg cannot use
// the self-hosted web fonts); the wordmark itself is outlined paths.
// Usage: node scripts/build-wordmark.mjs
import { createRequire } from "node:module";
import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => path.join(ROOT, p);

const PAPER = "#fbf7ef";
const INK = "#24201b";
const MUTED = "#6b6152";
const AMBER = "#b3812e";
const SERIF = "Georgia, 'Times New Roman', serif";

const wordmark = readFileSync(out("public/logos/icanspeak-spanish-wordmark.svg"));
// viewBox 933 × 161
const wordmarkPng = (width) => sharp(wordmark, { density: 300 }).resize({ width }).png().toBuffer();

// The nav logo: 4x a 44 px height.
await sharp(await wordmarkPng(Math.round((933 / 161) * 176))).png().toFile(out("public/assets/logo.png"));

const ogBase = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="a" cx="0" cy="0" r="0.75"><stop offset="0" stop-color="${AMBER}" stop-opacity=".16"/><stop offset="1" stop-color="${AMBER}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="1" cy="0" r="0.75"><stop offset="0" stop-color="#2b4162" stop-opacity=".10"/><stop offset="1" stop-color="#2b4162" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <text x="600" y="392" font-family="${SERIF}" font-size="40" fill="${INK}" text-anchor="middle">Learn the Spanish of Spain, A1 to C1</text>
  <text x="600" y="446" font-family="${SERIF}" font-size="28" fill="${MUTED}" text-anchor="middle">Grammar · Vocabulary · DELE · SIELE · CCSE</text>
  <circle cx="600" cy="532" r="5" fill="${AMBER}"/>
  <text x="600" y="580" font-family="${SERIF}" font-size="24" fill="${MUTED}" text-anchor="middle">part of icanspeak.it</text>
</svg>`;
const ogWord = await wordmarkPng(820);
const { height: wh } = await sharp(ogWord).metadata();
await sharp(Buffer.from(ogBase))
  .composite([{ input: ogWord, left: 190, top: Math.round(290 - wh) }])
  .png()
  .toFile(out("public/assets/og-default.png"));

copyFileSync(out("public/logos/favicon.ico"), out("public/favicon.ico"));
copyFileSync(out("public/logos/icanspeak-spanish-apple-touch-icon.png"), out("public/apple-touch-icon.png"));
console.log("wordmark: public/assets/logo.png, og-default.png; favicon.ico, apple-touch-icon.png copied from public/logos");
