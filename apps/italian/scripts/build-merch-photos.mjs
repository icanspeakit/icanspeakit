// Product photos for /merch: real blank products (free-licence photos, sources below), each
// with what the page needs to dye it any colour and print on it (src/lib/merchMockups.js):
//
//   <id>.webp        the photo, framed square on the product, 2× resolution
//   <id>-mask.png    white, the product in the alpha channel — where the colour goes
//   <id>-shade.webp  the product's folds and highlights as grey around 50 %, alpha = mask,
//                    laid over the colour with `overlay`: a black shirt keeps its light
//                    creases, which plain `multiply` (it can only darken) flattened away
//
//   node scripts/build-merch-photos.mjs
//
// How a mask is found: the product is the bright, connected region grown from its
// brightest pixels (`hi`) through anything brighter than `lo`; holes in it (a fold, the
// neck tape) are filled. Where a bright prop touches the product (the wooden board under
// the T-shirt's sleeve), `clip` limits it to a drawn outline; the cap's shaded side is as
// grey as the backdrop and the mug is a simple shape, so their masks are drawn (`shape`).
// All coordinates — clip, shape, frame and the print areas in merchMockups.js — are in the
// photo scaled to 900px wide (1×); the files are written at 2×.
//
// Licences: Unsplash Licence and Pexels Licence — free for commercial use and to modify,
// no attribution required (credited on the page anyway). Not allowed: selling the photos
// unaltered, or implying the photographers endorse the products.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/img/merch");
const W = 900;
const S = 2;
// How strongly folds and highlights show in a dyed colour.
const SHADE_GAIN = 1.7;

export const PHOTOS = [
  { id: "shirt", src: "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/elbKS4DY21g", site: "Unsplash",
    hi: 235, lo: 200, clip: "345,98 300,112 205,178 232,300 262,300 262,592 604,588 607,545 603,470 603,300 614,282 650,264 683,198 582,118 528,98",
    frame: { left: 146, top: 38, width: 600, height: 600 } },
  { id: "pulli", src: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/7cERndkOyDw", site: "Unsplash",
    hi: 232, lo: 212, roi: [0.18, 0, 0.92, 1],
    frame: { left: 170, top: 16, width: 660, height: 660 } },
  { id: "cap", src: "https://images.unsplash.com/photo-1691256676359-20e5c6d4bc92?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/ozdzzeBu4Go", site: "Unsplash",
    shape: ["M191,606 C188,470 250,352 450,322 C650,352 710,470 706,600 Z", "M212,600 L690,600 C694,620 692,640 684,648 C540,656 360,656 218,648 C208,640 208,620 212,600 Z"],
    frame: { left: 150, top: 185, width: 600, height: 600 } },
  { id: "tasse", src: "https://images.pexels.com/photos/11075707/pexels-photo-11075707.jpeg?auto=compress&w=1800", page: "https://www.pexels.com/photo/11075707/", site: "Pexels",
    // Body, and the handle as a crescent so the backdrop shows through it.
    shape: ["M319,152 Q319,145 330,145 L600,145 Q611,145 611,152 L611,503 Q611,514 596,515 L334,515 Q319,514 319,503 Z",
      "M611,196 C700,180 758,240 756,322 C754,405 700,462 611,452 L611,428 C690,436 712,380 712,325 C712,265 690,214 611,222 Z"],
    frame: { left: 290, top: 75, width: 500, height: 500 } },
  // Further models: other cuts and angles of the same products (MODELS in merchMockups.js).
  { id: "shirt-bio", src: "https://images.unsplash.com/photo-1778671394516-8270eac13c42?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/8ACmRoleM24", site: "Unsplash",
    // White on a pale wall: brightness does not separate them, colour does — the fabric is a
    // shade cooler than the warm wall (`cool`). The drawn outline only bounds it.
    cool: true, hi: 140, lo: 115, spread: 3, clip: "400,112 330,148 296,160 232,262 240,288 298,320 302,558 597,558 597,320 640,305 673,265 612,160 575,148 510,112",
    frame: { left: 190, top: 60, width: 520, height: 520 } },
  { id: "shirt-heavy", src: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/acn5ERAeSb4", site: "Unsplash",
    hi: 200, lo: 138, roi: [0.26, 0.46, 0.78, 0.86],
    frame: { left: 130, top: 540, width: 640, height: 640 } },
  { id: "pulli-hoodie", src: "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/kJXGTOY1wLQ", site: "Unsplash",
    cool: true, hi: 145, lo: 104, spread: 3, clip: "432,140 382,156 366,192 324,208 298,256 282,380 277,602 298,632 334,612 352,602 575,602 600,632 641,624 645,500 642,330 624,240 600,216 560,186 536,156 470,136",
    frame: { left: 160, top: 76, width: 600, height: 600 } },
  { id: "cap-trucker", src: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/t8HiP3e5abg", site: "Unsplash",
    shape: ["M255,600 C258,520 290,430 360,372 C400,345 450,336 560,330 C640,338 720,385 780,450 C805,510 810,580 803,640 C795,700 760,740 662,762 C640,800 560,870 470,918 C420,935 340,930 260,900 C190,872 120,830 96,790 C92,760 140,730 205,692 C232,676 252,650 255,600 Z"],
    frame: { left: 60, top: 220, width: 800, height: 800 } },
  { id: "tasse-gross", src: "https://images.unsplash.com/photo-1650959858546-d09833d5317b?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/xf38DdLyBvI", site: "Unsplash",
    shape: ["M327,112 Q330,100 462,98 Q600,100 602,112 L600,470 Q598,502 465,504 Q330,502 328,470 Z",
      "M330,150 C240,138 203,200 205,300 C207,400 240,446 332,442 L332,402 C262,404 236,370 234,300 C232,220 258,182 330,186 Z"],
    frame: { left: 150, top: 50, width: 500, height: 500 } },
  // A blank cushion against a white board, which touches its right edge: the outline is drawn.
  { id: "kissen", src: "https://images.unsplash.com/photo-1629949008265-af1bcaf59786?fm=jpg&q=88&w=1800", page: "https://unsplash.com/photos/UR_eZMMmVn4", site: "Unsplash",
    edge: 4, shape: ["M122,146 Q420,138 717,132 Q708,330 712,522 Q420,532 128,527 Q140,330 122,146 Z"],
    frame: { left: 100, top: 10, width: 640, height: 640 } },
  // A tall photo: cut to the glass first (source pixels), so its blank label is not a speck.
  { id: "kerze", src: "https://images.pexels.com/photos/6311980/pexels-photo-6311980.jpeg?auto=compress&w=2800", page: "https://www.pexels.com/photo/6311980/", site: "Pexels",
    crop: { left: 660, top: 1400, width: 2140, height: 2480 },
    frame: { left: 70, top: 120, width: 780, height: 780 } },
];

/** Blue minus red, around 128: a white garment photographed on a warm wall is a shade cooler
 *  than the wall even where both are equally bright (`cool: true`). */
async function coolness(buf) {
  const { data, info } = await sharp(buf).blur(1.2).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height, out = Buffer.alloc(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(255, 128 + 6 * (data[i * 3 + 2] - data[i * 3])));
  return { data: out, info: { width: info.width, height: info.height } };
}

/** The product as one bright region: grown from pixels above `hi` through pixels above `lo`, largest piece, holes filled. */
async function grow(buf, { hi, lo, roi, cool }) {
  const { data, info } = cool ? await coolness(buf) : await sharp(buf).greyscale().blur(1.2).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, n = w * h;
  const inRoi = (x, y) => !roi || (x >= roi[0] * w && x <= roi[2] * w && y >= roi[1] * h && y <= roi[3] * h);
  const lab = new Int32Array(n), q = new Int32Array(n);
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let best = 0, bestSize = 0, id = 0;
  for (let s = 0; s < n; s++) {
    if (lab[s] || data[s] <= hi || !inRoi(s % w, (s / w) | 0)) continue;
    let head = 0, tail = 0, size = 0;
    lab[s] = ++id; q[tail++] = s;
    while (head < tail) {
      const p = q[head++]; size++;
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of steps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (!lab[k] && data[k] > lo && inRoi(nx, ny)) { lab[k] = id; q[tail++] = k; }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
  }
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) m[i] = lab[i] === best ? 255 : 0;
  // Holes: whatever is not reachable from the border without crossing the product.
  const out = new Uint8Array(n);
  let head = 0, tail = 0;
  const seed = (i) => { if (!m[i] && !out[i]) { out[i] = 1; q[tail++] = i; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (head < tail) {
    const p = q[head++], x = p % w, y = (p / w) | 0;
    for (const [dx, dy] of steps) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) seed(ny * w + nx);
    }
  }
  for (let i = 0; i < n; i++) if (!out[i]) m[i] = 255;
  return m;
}

const svgMask = (w, h, inner) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}"/>${inner}</svg>`)).extractChannel(0).raw().toBuffer();
const gray = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 1 } });

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
for (const p of PHOTOS.filter((x) => !only.length || only.includes(x.id))) {
  let res;
  for (let tries = 0; ; tries++) {
    try { res = await fetch(p.src); if (res.ok) break; } catch (err) { if (tries >= 5) throw err; }
    if (tries >= 5) throw new Error(`${p.id}: ${res?.status} ${p.src}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  let img = sharp(Buffer.from(await res.arrayBuffer())).rotate();
  if (p.crop) img = sharp(await img.extract(p.crop).toBuffer());
  const big = await img.resize({ width: W * S }).toBuffer();
  const { width: bw, height: bh } = await sharp(big).metadata();
  const small = await sharp(big).resize({ width: W }).toBuffer();
  const { width: w, height: h } = await sharp(small).metadata();

  // The mask, found at 1× and scaled up smoothly.
  let alpha = null;
  // Drawn outlines also get a thin stroke: the photo's light edge highlight sits just outside them.
  if (p.shape) alpha = await svgMask(w, h, p.shape.map((d) => `<path fill="#fff" stroke="#fff" stroke-width="${p.edge ?? 12}" stroke-linejoin="round" d="${d}"/>`).join(""));
  else if (p.hi) {
    alpha = await grow(small, p);
    if (p.clip) {
      const clip = await svgMask(w, h, `<polygon fill="#fff" points="${p.clip}"/>`);
      for (let i = 0; i < alpha.length; i++) alpha[i] = Math.min(alpha[i], clip[i]);
    }
  }
  // Grow the mask by ~1.5px: the photo's own edge pixels are lighter than the fabric, and
  // left outside the colour they read as a white rim around a dark shirt.
  if (alpha) {
    const spread = await gray(Buffer.from(alpha), w, h).blur(p.spread ?? 1.6).extractChannel(0).raw().toBuffer();
    alpha = Buffer.from(spread.map((v) => (v > 40 ? 255 : 0)));
  }
  const f = p.frame;
  const frame2 = { left: f.left * S, top: f.top * S, width: f.width * S, height: f.height * S };
  await sharp(big).extract(frame2).webp({ quality: 82 }).toFile(path.join(OUT, `${p.id}.webp`));

  if (alpha) {
    const a2 = await gray(Buffer.from(alpha), w, h).blur(0.9).resize(bw, bh, { kernel: "cubic" }).extractChannel(0).raw().toBuffer();
    // Mask: white, product in alpha.
    const rgba = Buffer.alloc(bw * bh * 4, 255);
    for (let i = 0; i < bw * bh; i++) rgba[i * 4 + 3] = a2[i];
    await sharp(rgba, { raw: { width: bw, height: bh, channels: 4 } }).extract(frame2).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${p.id}-mask.png`));

    // Shade: the product's own light around 50 % grey, so `overlay` adds folds and
    // highlights to any colour and leaves a flat area as it is.
    const L = await sharp(big).greyscale().blur(0.6).extractChannel(0).raw().toBuffer();
    const inside = [];
    for (let i = 0; i < L.length; i += 7) if (a2[i] > 200) inside.push(L[i]);
    inside.sort((x, y) => x - y);
    const med = inside[Math.floor(inside.length * 0.6)] ?? 200;
    const ga = Buffer.alloc(bw * bh * 2);
    for (let i = 0; i < bw * bh; i++) {
      ga[i * 2] = Math.max(0, Math.min(255, Math.round(128 + SHADE_GAIN * (L[i] - med))));
      ga[i * 2 + 1] = a2[i];
    }
    await sharp(ga, { raw: { width: bw, height: bh, channels: 2 } }).extract(frame2).webp({ quality: 80, alphaQuality: 90 }).toFile(path.join(OUT, `${p.id}-shade.webp`));
  }
  console.log(`✓ ${p.id} ${frame2.width}×${frame2.height}${alpha ? " + mask + shade" : ""}`);
}
