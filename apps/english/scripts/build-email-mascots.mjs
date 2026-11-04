// Rasterises the mascots for e-mail. Mail clients (Gmail above all) do not render SVG, so
// the drip mails reference PNGs served from /email/ on the live site. Source of truth stays
// src/lib/mascots.js — rerun this when a drawing changes:  node scripts/build-email-mascots.mjs
import sharp from "sharp";
import { mascotSvg } from "../src/lib/mascots.js";

const SETS = [
  ["bruno", "happy"], ["bruno", "thinking"], ["bruno", "celebrate"], ["bruno", "oops"], ["bruno", "sleepy"],
  ["regi"], ["hamsti"], ["quaki"],
];
for (const [name, expr] of SETS) {
  // A little margin: the drawings use overflow:visible (confetti, thought bubbles).
  const svg = mascotSvg({ name, expr, size: 240, label: "" }).replace('viewBox="0 0 200 200"', 'viewBox="-12 -12 224 224"');
  const file = `public/email/${name}${expr ? "-" + expr : ""}.png`;
  await sharp(Buffer.from(svg), { density: 300 }).resize(240, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(file);
  console.log(file);
}
