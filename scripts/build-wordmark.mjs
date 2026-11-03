#!/usr/bin/env node
// A plain text wordmark for icanspeak Spanish, until a designed logo exists.
//
// Writes (overwriting the inherited "da für Dich" lockup of deutschacademy):
//   public/assets/logo.png         618×176, transparent: nav, footer, hub share cards
//   public/assets/og-default.png   1200×630: the default Open Graph / Twitter card
//   public/icon-512.png, icon-192.png, apple-touch-icon.png, favicon-32x32.png,
//   favicon-16x16.png, favicon.ico  an "iS" square icon (bump ?v= in Layout.astro after)
//
// Drawn as SVG and rasterised with sharp (already a devDependency). The text uses the
// system sans-serif that librsvg finds (Segoe UI / Arial on Windows), so the result is a
// placeholder: when a real logo exists, put its master into brand/ and replace both files.
// Usage: node scripts/build-wordmark.mjs
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => path.join(ROOT, p);

const TEAL = "#0d9488";
const INK = "#0f3d3a";
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const word = (x, y, size, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" text-anchor="${anchor}">` +
  `<tspan font-weight="700" fill="${INK}">icanspeak</tspan>` +
  `<tspan font-weight="400" fill="${TEAL}" dx="0.28em">Spanish</tspan></text>`;

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="618" height="176" viewBox="0 0 618 176">
  ${word(309, 110, 68, "middle")}
</svg>`;

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect y="606" width="1200" height="24" fill="${TEAL}"/>
  ${word(600, 300, 112, "middle")}
  <text x="600" y="380" font-family="${FONT}" font-size="38" fill="#334155" text-anchor="middle">Learn the Spanish of Spain, A1 to C1</text>
  <text x="600" y="436" font-family="${FONT}" font-size="30" fill="#64748b" text-anchor="middle">Grammar · Vocabulary · DELE · SIELE · CCSE</text>
  <text x="600" y="548" font-family="${FONT}" font-size="28" fill="${TEAL}" text-anchor="middle">icanspeak.it/spanish</text>
</svg>`;

// The square icon: "iS" on the brand teal. Favicons, home-screen icons, the JSON-LD logo.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${TEAL}"/>
  <text x="256" y="346" font-family="${FONT}" font-size="270" font-weight="700" fill="#ffffff" text-anchor="middle">iS</text>
</svg>`;

await sharp(Buffer.from(logoSvg)).png().toFile(out("public/assets/logo.png"));
await sharp(Buffer.from(ogSvg)).png().toFile(out("public/assets/og-default.png"));
const icon = Buffer.from(iconSvg);
for (const [file, size] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon.png", 180], ["favicon-32x32.png", 32], ["favicon-16x16.png", 16]]) {
  await sharp(icon).resize(size, size).png().toFile(out(`public/${file}`));
}
// favicon.ico as a 32 px PNG: every current browser reads PNG data in an .ico.
await sharp(icon).resize(32, 32).png().toFile(out("public/favicon.ico"));
console.log("wordmark: public/assets/logo.png, og-default.png, icon-*.png, apple-touch-icon.png, favicon*");
