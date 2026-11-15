#!/usr/bin/env node
// Raster version of the icanspeak wordmark ("i canspeak!", docs/brand/BRAND.md §1) for the
// places that need a PNG. The kit's SVGs in public/logos are the masters and are never redrawn
// or recoloured; this script only rasterises one.
//
// Writes:
//   public/assets/logo.png   the wordmark, 4x a 44 px height, transparent: the hub share
//                            cards (scripts/generate-hub-bilder.mjs)
//
// Everything else comes from the kit as is, nothing to build: favicons, apple-touch-icon and
// the manifest icons in public/ (Layout.astro, site.webmanifest; bump their ?v= when they
// change), the default share card public/og/og-default.png, the JSON-LD logo
// (src/lib/seo/jsonld.ts).
// Usage: node scripts/build-wordmark.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => path.join(ROOT, p);

const wordmark = readFileSync(out("public/logos/icanspeak-wordmark.svg"));
// width/height 1094 × 227
await sharp(wordmark, { density: 300 })
  .resize({ width: Math.round((1094 / 227) * 176) })
  .png()
  .toFile(out("public/assets/logo.png"));
console.log("wordmark: public/assets/logo.png from public/logos/icanspeak-wordmark.svg");
