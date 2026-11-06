// Lindenau's action parts (/games/brambleford): the story of Super-Blubb, a side-scrolling level
// as the way into town, and after every errand another one – run, jump over the mud pits and
// blow soap bubbles at the dirt monsters. A bubble hurts nobody: it lifts the monster up and washes it clean, and it pops
// into sparkles, a flower and a word from the errand just played. The third level of an area
// is the boss (Graf Schmuddel in the morning, Baron Staubig in the afternoon), who ends up
// clean and happy, not beaten. Stages: 0 = the way into town, 1 and 2 after the first two
// errands, 3 = the boss after the third.
//
// No lives, no game over: a monster's touch or a fall into the mud only pushes the hero back
// ("Yuck!", "Platsch!"). Every level can be skipped. The story is easy German to read (🔊 and
// 💡 like the dialogues); game.js decides when a level comes and passes the words.
//
// A bit of Super Mario Land: every level has its own look (street, park, U-Bahn, roofs, the
// market for the bosses), coins to collect, and ?-boxes that a jump from below opens – a coin,
// or a power-up: die Seife (big and strong), die Wasserpistole, drei Blasen, die Sprungfeder
// (double jump), der Stern (nothing can touch you). A hit takes the power-ups away first.
import { hold, play, sfx, setDuck } from "./music.js";
import { t } from "../uiText.js";
import { mascotImage, ready } from "../mascotImage.js";
import { reducedMotion } from "../spieleEinstellungen.js";
import { glossP } from "./gloss.js";
import { addCoins, coinTotal, drawLook, lookOf, nextLook, LOOKS_AT } from "./coins.js";

// "Reduce motion" in the system: no blinking, no colour cycling, no flashing (read once).
let calmV;
const calm = () => (calmV ??= reducedMotion());

const VIEW_H = 400; // world units the canvas shows top to bottom
const GY = 290; // the street's top
const PIT = GY + 60; // below this the hero is in the mud
const VIEW_BOTTOM = GY + 56; // the canvas shows down to here; the rest of its height goes to the sky
const GRAV = 1500, RUN = 165, JUMP = 600, HW = 8;
const HH = 38, DUCK_H = 20; // the hero's height standing and ducking
const BIG = 1.35; // the hero's size with die Seife
// Thumbs are late: on a touch screen a jump counts a little longer before and after an edge.
const TOUCH = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
const COYOTE = TOUCH ? 0.14 : 0.1, JUMP_BUF = TOUCH ? 0.2 : 0.14;

// Each level its own place. far: the background; ground, pit: the street and its gaps;
// obst: what stands on the street to jump over.
const LOOKS = { morgen: ["bahnhof", "strasse", "park", "markt"], nachmittag: ["strasse", "ubahn", "daecher", "markt"] };
const LOOK = {
  bahnhof: { far: "houses", ground: "street", pit: "mud", obst: "crate", train: true },
  strasse: { far: "houses", ground: "street", pit: "mud", obst: "column", lamps: true },
  park: { far: "trees", ground: "grass", pit: "pond", obst: "stump" },
  ubahn: { far: "tunnel", ground: "tiles", pit: "rails", obst: "pipe", dark: true },
  daecher: { far: "skyline", ground: "roof", pit: "alley", obst: "chimney" },
  markt: { far: "houses", ground: "cobble", pit: "mud", obst: "crate", flags: true },
};
const OBST = { crate: [28, 14, 22, 14], column: [24, 0, 42, 16], stump: [34, 8, 18, 10], pipe: [34, 0, 30, 24], chimney: [26, 4, 28, 20] }; // w, +w, h, +h
const GROUND = {
  street: { fill: "#8d7d6b", top: "#b9b2a5", stripe: "#a39b8d" },
  cobble: { fill: "#7c6f62", top: "#a8a092", stripe: "#938a7c" },
  grass: { fill: "#8b5e34", top: "#4ade80", stripe: "#22c55e" },
  tiles: { fill: "#475569", top: "#cbd5e1", stripe: "#facc15" },
  roof: { fill: "#f1e6d6", top: "#c2410c", stripe: "#9a3412" },
};
const POWERS = ["gun", "spring", "triple", "star", "big"];
const ITEM_NAME = {
  big: () => t("ld.itemBig", "the soap – big and strong!"),
  gun: () => t("ld.itemGun", "the water pistol!"),
  triple: () => t("ld.itemTriple", "three bubbles!"),
  spring: () => t("ld.itemSpring", "the spring – jump twice!"),
  star: () => t("ld.itemStar", "the star!"),
};
// The level being played, so game.js can pause it (the header button, a hidden tab).
let activeLevel = null;
/** Pauses the level under way; false when there is none. */
export function pauseLevel() { if (!activeLevel) return false; activeLevel.pause(); return true; }

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// --- the story ---------------------------------------------------------------------------
// Per area: a prologue before Bruno, a title + line before each level, and the boss's end.
const STORY = {
  morgen: {
    villain: "schmuddel",
    prologue: {
      title: "Super-Blubb y el conde Mugre",
      lines: [
        { de: "Villabruno es una ciudad pequeña y muy limpia.", en: "Villabruno is a small, very clean town." },
        { de: "Pero el conde Mugre odia las ciudades limpias. ¡Y manda a sus monstruos de barro!", en: "But Count Grime hates clean towns. And he sends his mud monsters!" },
        { de: "Por suerte, estás aquí. Acabas de llegar y tienes un secreto: ¡eres Super-Blubb!", en: "Luckily, you're here. You've just arrived and you have a secret: you are Super-Blubb!" },
        { de: "Tu varita mágica hace pompas de jabón. No hacen daño. Solo limpian.", en: "Your magic wand makes soap bubbles. They don't hurt. They only clean." },
      ],
    },
    levels: [
      { title: "Llegada a Villabruno", de: "Llegas a Villabruno en tren. ¡Pero la calle está llena de barro! Corre a la plaza y limpia a los monstruos.", en: "You arrive in Villabruno by train. But the street is full of mud! Run to the square and clean the monsters." },
      { title: "¡Alerta de barro en la calle!", de: "Los monstruos de barro corren por la calle. ¡Salta los charcos y límpialos!", en: "The mud monsters are running down the street. Jump over the puddles and clean them!" },
      { title: "¡Alerta de barro en el parque!", de: "Ahora también vuelan nubes de polvo. ¡Salta y lánzales pompas!", en: "Now dust clouds are flying around too. Jump and throw bubbles at them!" },
      { title: "¡El conde Mugre!", de: "¡Ahí está el conde Mugre! Tira barro. ¡Enséñale lo bonito que es estar limpio!", en: "There's Count Grime! He throws mud. Show him how nice it is to be clean!" },
    ],
    end: [
      { de: "«¡Oh… estoy limpio! ¡Qué gusto!»", en: "“Oh… I'm clean! That feels good!”" },
      { de: "El conde Mugre se ríe. Desde hoy, ayuda a limpiar.", en: "Count Grime laughs. From today on, he helps with the cleaning." },
    ],
  },
  nachmittag: {
    villain: "staubig",
    prologue: {
      title: "Llega el barón Polvo",
      lines: [
        { de: "Por la tarde, el sol brilla sobre Villabruno.", en: "In the afternoon, the sun shines over Villabruno." },
        { de: "Pero ¿qué es eso? ¡Una gran nube gris! Es el barón Polvo, el hermano del conde Mugre.", en: "But what's that? A big grey cloud! It's Baron Dust, Count Grime's brother." },
        { de: "Sopla polvo por todas las calles. ¡Super-Blubb, la ciudad te necesita otra vez!", en: "He blows dust down every street. Super-Blubb, the town needs you again!" },
      ],
    },
    levels: [
      { title: "Polvo sobre Villabruno", de: "El barón Polvo sopla polvo sobre la ciudad. ¡Corre a la fuente y quita el polvo con tus pompas!", en: "Baron Dust is blowing dust over the town. Run to the fountain and get rid of the dust with your bubbles!" },
      { title: "¡Alerta de polvo en el metro!", de: "El polvo ha llegado al metro. Hay nubes de polvo y monstruos de barro por todas partes. ¡Límpialos con tus pompas de jabón!", en: "The dust has reached the metro. There are dust clouds and mud monsters everywhere. Clean them with your soap bubbles!" },
      { title: "¡Alerta de polvo en los tejados!", de: "El polvo vuela muy alto. ¡Salta a las cajas y lanza pompas hacia arriba!", en: "The dust is flying very high. Jump onto the boxes and throw bubbles upwards!" },
      { title: "¡El barón Polvo!", de: "El barón Polvo vuela sobre la plaza y tira bolas de polvo. ¡Salta y dale con tus pompas de jabón!", en: "Baron Dust is flying over the square, throwing balls of dust. Jump and hit him with your soap bubbles!" },
    ],
    end: [
      { de: "«¡Achís!» El barón Polvo estornuda, y ahora está blanco y limpio.", en: "“Atchoo!” Baron Dust sneezes, and now he's white and clean." },
      { de: "«¡Gracias, Super-Blubb! Voy a traer tarta para todos.»", en: "“Thank you, Super-Blubb! I'll bring cake for everyone.”" },
    ],
  },
};
export const storyOf = (areaId) => STORY[areaId] ?? STORY.morgen;

// --- drawing helpers ----------------------------------------------------------------------
/** Super-Blubb – Regi the hedgehog in a red cape with a bubble wand – feet at (x, y). Also the
    player on the town map (game.js). */
export function drawHero(ctx, x, y, o = {}) {
  const f = o.face ?? 1, tt = o.t ?? 0, run = o.run ? 1 : 0, s = o.scale ?? 1;
  const view = o.view ?? "side";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * f * (o.duck ? 1.12 : 1), s * (o.duck ? 0.55 : 1)); // ducking: squashed down low
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.6;
  // cape
  const wave = Math.sin(tt * 9) * 2;
  const look = o.look === undefined ? lookOf() : o.look;
  ctx.fillStyle = look?.cape === "gold" ? "#f5b301" : "#e2445c";
  ctx.beginPath();
  ctx.moveTo(-3, -25);
  ctx.quadraticCurveTo(-13 - run * 5, -18 + wave, -15 - run * 7, -4 + wave);
  ctx.lineTo(-4, -7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Regi in the suit: the mascot drawing, the ¾ view sideways (mirrored with `face`), front
  // otherwise. Pained for a moment after a hit (`hurt`).
  const regi = mascotImage("regi", { view: view === "side" ? "three" : "front", expr: o.hurt ? "ouch" : "happy" });
  const bob = run ? Math.abs(Math.sin(tt * 14)) * 1.5 : 0;
  if (ready(regi)) ctx.drawImage(regi, -23, -44 - bob, 46, 46);
  if (look) { ctx.save(); ctx.translate(0, 3 - bob); drawLook(ctx, look); ctx.restore(); }
  // arm + wand
  ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(18, -27); ctx.stroke();
  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(19.5, -30, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.6;
  // mud on the suit after hits
  ctx.fillStyle = "#6b4a2b";
  const spots = [[-3, -16], [4, -11], [-5, -21], [2, -24], [-1, -4]];
  for (let i = 0; i < Math.min(o.dirt ?? 0, spots.length); i++) { ctx.beginPath(); ctx.arc(spots[i][0], spots[i][1], 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function eyes(ctx, x, y, r, lookX, mood) {
  for (const dx of [-r * 0.45, r * 0.45]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(x + dx, y, r * 0.3, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a2230";
    ctx.beginPath(); ctx.arc(x + dx + lookX * r * 0.1, y + r * 0.05, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "#1a2230"; ctx.lineWidth = Math.max(1.2, r * 0.09);
  if (mood === "grr") {
    ctx.beginPath(); ctx.moveTo(x - r * 0.75, y - r * 0.5); ctx.lineTo(x - r * 0.2, y - r * 0.32);
    ctx.moveTo(x + r * 0.75, y - r * 0.5); ctx.lineTo(x + r * 0.2, y - r * 0.32); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + r * 0.62, r * 0.25, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
  } else if (mood === "oh") {
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 0.13, r * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
}
function lerpColor(a, b, k) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",")})`;
}
/** A mud monster (walker) or a dust cloud (flyer); `clean` 0..1 washes it white. */
export function drawMonster(ctx, m, tt, lookX) {
  const k = m.clean ?? 0;
  const mood = m.state === "alive" ? "grr" : k > 0.6 ? "happy" : "oh";
  if (m.type === "walker") {
    const bob = Math.sin(tt * 8 + m.ph) * 1.5;
    ctx.fillStyle = lerpColor("7a5230", "fdf6e3", k);
    ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y - m.r + bob, m.r * 1.1, m.r, 0, Math.PI, 0);
    for (let i = 0; i <= 4; i++) {
      const dx = m.x + m.r * 1.1 - (i * m.r * 2.2) / 4;
      ctx.lineTo(dx, m.y + (i % 2 ? 2 : -1) + bob * 0.3);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (k < 0.5) { ctx.fillStyle = "#5a3a1e"; ctx.beginPath(); ctx.arc(m.x - m.r * 0.5, m.y - m.r * 1.3 + bob, 2.5, 0, Math.PI * 2); ctx.arc(m.x + m.r * 0.4, m.y - m.r * 1.6 + bob, 2, 0, Math.PI * 2); ctx.fill(); }
    eyes(ctx, m.x, m.y - m.r * 1.05 + bob, m.r, lookX, mood);
  } else {
    ctx.fillStyle = lerpColor("8a8f98", "ffffff", k);
    ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.4;
    const puffs = [[-0.7, 0.15, 0.55], [0.7, 0.15, 0.55], [-0.3, -0.3, 0.6], [0.35, -0.25, 0.6], [0, 0.25, 0.6]];
    ctx.beginPath();
    for (const [px, py, pr] of puffs) { ctx.moveTo(m.x + px * m.r + pr * m.r, m.y + py * m.r); ctx.arc(m.x + px * m.r, m.y + py * m.r, pr * m.r, 0, Math.PI * 2); }
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    for (const [px, py, pr] of puffs) { ctx.moveTo(m.x + px * m.r + pr * m.r - 1.5, m.y + py * m.r); ctx.arc(m.x + px * m.r, m.y + py * m.r, pr * m.r - 1.5, 0, Math.PI * 2); }
    ctx.fill();
    eyes(ctx, m.x, m.y, m.r * 0.9, lookX, mood);
  }
}
export function drawBubble(ctx, x, y, r, tt) {
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, "rgba(255,255,255,.75)");
  g.addColorStop(0.6, "rgba(186,230,253,.25)");
  g.addColorStop(1, "rgba(125,211,252,.55)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `hsla(${(tt * 120) % 360}, 80%, 70%, .9)`; ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/** Graf Schmuddel: a big mud blob in a top hat with a monocle. Baron Staubig: a grey storm
    cloud with a moustache. Both turn white and smile once clean. */
function drawBoss(ctx, b, tt, lookX) {
  const k = b.clean;
  const flash = b.hurt > 0 && (calm() || Math.floor(tt * 30) % 2); // reduced motion: one steady tint, no strobe
  const mood = k > 0.5 ? "happy" : b.hurt > 0 ? "oh" : "grr";
  ctx.save();
  if (b.kind === "schmuddel") {
    const r = 34, cy = b.y - r;
    ctx.fillStyle = flash ? "#e7d3bd" : lerpColor("6b4423", "fff7ed", k);
    ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(b.x, cy, r * 1.15, r, 0, Math.PI, 0);
    for (let i = 0; i <= 6; i++) ctx.lineTo(b.x + r * 1.15 - (i * r * 2.3) / 6, b.y + (i % 2 ? 3 : -2));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // hat
    ctx.fillStyle = "#1f2937";
    ctx.beginPath(); ctx.roundRect(b.x - 26, cy - r + 2, 52, 6, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(b.x - 16, cy - r - 24, 32, 28, 4); ctx.fill();
    ctx.fillStyle = k > 0.5 ? "#f472b6" : "#7c2d12"; ctx.fillRect(b.x - 16, cy - r - 2, 32, 4);
    eyes(ctx, b.x, cy - 6, r * 0.75, lookX, mood);
    // monocle
    ctx.strokeStyle = "#d4a017"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x + r * 0.34, cy - 6, r * 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x + r * 0.6, cy); ctx.quadraticCurveTo(b.x + r * 0.7, cy + 14, b.x + r * 0.5, cy + 20); ctx.stroke();
  } else {
    const r = 34, cy = b.y;
    ctx.fillStyle = flash ? "#f1f5f9" : lerpColor("6b7280", "ffffff", k);
    ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 2;
    const puffs = [[-0.9, 0.2, 0.55], [0.9, 0.2, 0.55], [-0.45, -0.35, 0.62], [0.45, -0.4, 0.62], [0, 0.3, 0.7], [0, -0.55, 0.5]];
    ctx.beginPath();
    for (const [px, py, pr] of puffs) { ctx.moveTo(b.x + px * r + pr * r, cy + py * r); ctx.arc(b.x + px * r, cy + py * r, pr * r, 0, Math.PI * 2); }
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    for (const [px, py, pr] of puffs) { ctx.moveTo(b.x + px * r + pr * r - 2, cy + py * r); ctx.arc(b.x + px * r, cy + py * r, pr * r - 2, 0, Math.PI * 2); }
    ctx.fill();
    eyes(ctx, b.x, cy - 6, r * 0.75, lookX, mood);
    // moustache
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.ellipse(b.x - 8, cy + 9, 9, 3.5, 0.3, 0, Math.PI * 2);
    ctx.ellipse(b.x + 8, cy + 9, 9, 3.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    if (k < 0.5) { // lightning-free grumble: little dust specks
      ctx.fillStyle = "#9ca3af";
      for (let i = 0; i < 5; i++) { const a = tt * 2 + i * 1.3; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * 46, cy + Math.sin(a) * 30 + 12, 2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
}

// --- a level -----------------------------------------------------------------------------
function makeLevel(stage, words, seed, look) {
  const r = rng(seed);
  const lv = { ground: [], pits: [], plats: [], blocks: [], monsters: [], flowers: [], houses: [], coins: [], goal: null, L: 0 };
  if (stage === 3) {
    lv.L = 760;
    lv.ground.push({ x0: -300, x1: lv.L + 300 });
    lv.plats.push({ x: 150, y: GY - 78, w: 96 }, { x: lv.L - 246, y: GY - 78, w: 96 }, { x: lv.L / 2 - 45, y: GY - 140, w: 90 });
  } else {
    lv.L = stage === 0 ? 3000 : 1700 + stage * 350; // the way into town is the long one
    let x = -300;
    while (x < lv.L + 300) {
      const len = x < 0 ? 620 : 240 + r() * 260;
      lv.ground.push({ x0: x, x1: x + len });
      x += len;
      if (x < lv.L - 280) {
        const gap = 44 + r() * 32 + stage * 6;
        lv.pits.push({ x0: x, x1: x + gap });
        x += gap;
      } else {
        lv.ground[lv.ground.length - 1].x1 = lv.L + 300;
        break;
      }
    }
    // Above the street: crates to stand on (one-way) and Seifenkisten – solid boxes that a
    // jump from below bumps, washing off the monster on top. On the street: crates to jump over.
    // ?-boxes open with a jump from below; the first row, before any monster, holds die Seife.
    let lastPlat = -999;
    const qbox = (x, item) => ({ x, y: GY - 92, w: 20, h: 20, q: true, item, bump: 0 });
    lv.blocks.push(qbox(170, "coin"), qbox(190, "big"), qbox(210, "coin"));
    const above = [{ x: 170, w: 60 }], qs = [];
    for (const g of lv.ground) {
      const x0 = Math.max(g.x0, 280), len = Math.min(g.x1, lv.L - 160) - x0;
      if (len < 180 || r() < 0.25) continue;
      const w = 70 + r() * 40;
      const px = x0 + 30 + r() * (len - w - 60);
      if (px - lastPlat < 140) continue;
      const roll = r();
      if (roll < 0.32) {
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) { const b = qbox(px + i * 20, "coin"); lv.blocks.push(b); qs.push(b); }
        above.push({ x: px, w: n * 20 });
        lastPlat = px;
        continue;
      }
      if (stage < 2 && roll < (stage === 0 ? 0.75 : 0.6)) {
        const b = { x: px, y: GY - 92, w: Math.min(w, 84), h: 18, bump: 0 };
        lv.blocks.push(b);
        above.push(b);
      } else {
        lv.plats.push({ x: px, y: GY - (stage === 2 && r() < 0.6 ? 112 : 72), w });
        above.push({ x: px, w });
      }
      lastPlat = px;
      if (stage === 2 && r() < 0.5) lv.plats.push({ x: px + w + 30, y: GY - 150, w: 64 });
    }
    for (const g of lv.ground) {
      const x0 = Math.max(g.x0, 340), len = Math.min(g.x1, lv.L - 200) - x0;
      if (len < 220) continue;
      const k = stage === 0 ? (len > 360 ? 2 : 1) : r() < 0.35 ? 1 : 0;
      const [w0, wj, h0, hj] = OBST[look.obst];
      for (let i = 0; i < k; i++) {
        const w = w0 + r() * wj, h = h0 + r() * hj;
        const cx = x0 + (len * (i + 1)) / (k + 1) + (r() - 0.5) * 40 - w / 2;
        if (cx < g.x0 + 30 || cx + w > g.x1 - 30) continue;
        if (above.some((p) => cx + w > p.x - 50 && cx < p.x + p.w + 50)) continue; // never a crate under a box: the hero must fit
        lv.blocks.push({ x: cx, y: GY - h, w, h, crate: true, bump: 0 });
      }
    }
    const crates = lv.blocks.filter((b) => b.crate);
    const n = stage === 0 ? 10 : 6 + stage * 2;
    const flyShare = [0.15, 0.35, 0.5][stage];
    const mon = (o) => ({ ph: r() * 6, state: "alive", shotT: 2 + r() * 3, charge: 0, ...o });
    for (let i = 0; i < n; i++) {
      let mx = 420 + ((lv.L - 680) * (i + 0.5)) / n + (r() - 0.5) * 60;
      const g = lv.ground.find((s) => mx > s.x0 + 30 && mx < s.x1 - 30);
      const word = words.length ? words[i % words.length] : "";
      if (g && r() > flyShare) {
        // walk between the crates, not through them
        let a = Math.max(g.x0 + 18, mx - 80), b = Math.min(g.x1 - 18, mx + 80);
        for (const c of crates) {
          if (c.x + c.w < g.x0 || c.x > g.x1) continue;
          if (c.x + c.w / 2 > mx) b = Math.min(b, c.x - 14); else a = Math.max(a, c.x + c.w + 14);
        }
        if (b - a < 20) continue;
        mx = Math.max(a, Math.min(b, mx));
        lv.monsters.push(mon({ type: "walker", x: mx, y: GY, a, b, dir: r() < 0.5 ? -1 : 1, sp: 32 + r() * 22 + stage * 6, r: 13, word }));
      } else {
        const by = GY - 80 - r() * (stage === 2 ? 90 : 50);
        lv.monsters.push(mon({ type: "flyer", x: mx, y: by, bx: mx, by, r: 14, sp: 0.7 + r() * 0.5, word }));
      }
    }
    // most Seifenkisten have a mud monster on top
    let wi = n;
    for (const b of lv.blocks) {
      if (b.crate || b.q || r() < 0.3) continue;
      const word = words.length ? words[wi++ % words.length] : "";
      lv.monsters.push(mon({ type: "walker", x: b.x + b.w / 2, y: b.y, a: b.x + 12, b: b.x + b.w - 12, dir: r() < 0.5 ? -1 : 1, sp: 18 + r() * 10, r: 12, on: b, word }));
    }
    // every third ?-box after the first row holds a power-up, at least one per level
    let pi = Math.floor(r() * POWERS.length);
    qs.forEach((b, i) => { if (i % 3 === 1) b.item = POWERS[pi++ % POWERS.length]; });
    if (qs.length && !qs.some((b) => b.item !== "coin")) qs[0].item = POWERS[pi % POWERS.length];
    // coins: an arc over every pit, a row over each crate to stand on, a few rows on the street
    for (const p of lv.pits) { const c = (p.x0 + p.x1) / 2; for (let i = -2; i <= 2; i++) lv.coins.push({ x: c + i * 16, y: GY - 84 + i * i * 7 }); }
    for (const p of lv.plats) for (let x = p.x + 14; x < p.x + p.w - 8; x += 18) lv.coins.push({ x, y: p.y - 18 });
    for (const g of lv.ground) {
      const x0 = Math.max(g.x0, 300), x1 = Math.min(g.x1, lv.L - 160);
      if (x1 - x0 < 300 || r() < 0.5) continue;
      const cx = x0 + (x1 - x0) * (0.3 + r() * 0.4);
      if (lv.blocks.some((b) => b.crate && cx + 40 > b.x - 10 && cx - 40 < b.x + b.w + 10)) continue;
      for (let i = -1.5; i <= 1.5; i++) lv.coins.push({ x: cx + i * 18, y: GY - 16 });
    }
    lv.goal = { x: lv.L - 90 };
  }
  for (let i = 0, x = -200; x < lv.L + 600; i++) {
    const w = 60 + r() * 50;
    lv.houses.push({ x, w, h: 70 + r() * 70, roof: ["#c2553d", "#5f7d8c", "#7d6a5a", "#b07a3b", "#8a5a7a", "#4f7a5a"][i % 6], wall: ["#f3e2c7", "#e7e2d8", "#eef2f4", "#f1e6d6"][i % 4] });
    x += w + 8 + r() * 30;
  }
  return lv;
}

const THEMES = {
  morgen: { top: "#7cc6f2", bottom: "#dff3ff", far: "rgba(255,255,255,.55)", sun: "#fde68a" },
  nachmittag: { top: "#f59e6b", bottom: "#ffe7c2", far: "rgba(255,240,220,.5)", sun: "#fff1b8" },
};

/**
 * One level in an overlay over the town: a title card, the level, a result card.
 * @param {HTMLElement} stage  .ld-stage
 * @param {{ area: string, stage: 0|1|2|3, words: string[], direct?: boolean, say: (text: string) => void }} o
 *   direct: no title card – straight into the level (right after the prologue).
 * @returns {Promise<{ cleaned: number, of: number, skipped: boolean }>}
 */
export function playLevel(stageEl, { area, stage, words, direct = false, say }) {
  return new Promise((resolve) => {
    const story = storyOf(area);
    const intro = story.levels[stage];
    const theme = THEMES[area] ?? THEMES.morgen;
    const boss = stage === 3;
    const look = LOOK[(LOOKS[area] ?? LOOKS.morgen)[stage]];
    const lv = makeLevel(stage, words, (area === "morgen" ? 11 : 29) + stage * 7, look);
    const ov = overlay(stageEl);
    const { canvas, card, count, skipBtn } = ov;
    const ctx = canvas.getContext("2d");
    const input = { left: false, right: false, jump: false, down: false, shoot: false, jumpEdge: false };
    const hero = { x: 60, y: GY, vx: 0, vy: 0, ground: true, face: 1, inv: 0, coyote: 0, buf: 0, safeX: 60, dirt: 0, cool: 0, onPlat: null, duck: false,
      big: false, gun: "", spring: false, star: 0, double: false };
    // the hero's size factor, the middle of the body and how wide it is – lower and smaller while ducking
    const hs = () => (hero.big ? BIG : 1);
    const heroCy = () => hero.y - (hero.duck ? 9 : 16) * hs();
    const heroR = () => (hero.duck ? 8 : 11) * hs();
    let bubbles = [], parts = [], texts = [], balls = [], items = [], coins = 0;
    let bossO = null;
    if (boss) {
      bossO = story.villain === "schmuddel"
        ? { kind: "schmuddel", x: lv.L - 170, y: GY, vy: 0, hp: 10, max: 10, hurt: 0, clean: 0, throwT: 2.2, jumpT: 3, dir: -1 }
        : { kind: "staubig", x: lv.L - 170, y: GY - 130, hp: 12, max: 12, hurt: 0, clean: 0, throwT: 2, t: 0 };
    }
    const total = boss ? 1 : lv.monsters.length;
    let cleaned = 0, collected = [], over = false, ended = false, endT = 0, running = false;
    let tt = 0, last = 0, raf = 0, cam = 0, scale = 1, oy = 0, cw = 0, ch = 0, dpr = 1;

    function updateCount() {
      const powers = `${hero.big ? " 🧼" : ""}${hero.gun === "gun" ? " 🔫" : hero.gun === "triple" ? " 🫧×3" : ""}${hero.spring ? " 🦘" : ""}${hero.star > 0 ? " ⭐" : ""}`;
      count.textContent = boss
        ? `${bossO.kind === "schmuddel" ? "🎩" : "☁️"} ${"●".repeat(Math.max(0, bossO.hp))}${"○".repeat(bossO.max - Math.max(0, bossO.hp))} · 🪙 ${coins}${powers}`
        : `🫧 ${cleaned} / ${total} · 🪙 ${coins}${powers}`;
    }

    // --- input ---
    const KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "jump", KeyW: "jump", Space: "jump", ArrowDown: "down", KeyS: "down", KeyX: "shoot", KeyJ: "shoot", KeyF: "shoot", KeyK: "shoot", ShiftLeft: "shoot", ShiftRight: "shoot" };
    function onKey(e) {
      // P or Esc: pause / go on (skipping is the button in the corner)
      if (e.type === "keydown" && (e.code === "KeyP" || e.key === "Escape")) {
        if (paused) { e.preventDefault(); if (!e.repeat) resume(); return; }
        if (running) { e.preventDefault(); if (!e.repeat) pause(); return; }
      }
      if (!running) return;
      const k = KEYS[e.code];
      if (!k) return;
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON" && (e.code === "Space" || e.code === "Enter")) e.target.blur();
      e.preventDefault();
      const down = e.type === "keydown";
      if (k === "jump" && down && !input.jump) input.jumpEdge = true;
      input[k] = down;
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    for (const b of ov.pads) {
      const k = b.dataset.k;
      const set = (v) => (e) => {
        e.preventDefault();
        if (k === "jump" && v && !input.jump) input.jumpEdge = true;
        input[k] = v;
        b.classList.toggle("is-down", v);
      };
      b.addEventListener("pointerdown", (e) => { b.setPointerCapture?.(e.pointerId); set(true)(e); });
      b.addEventListener("pointerup", set(false));
      b.addEventListener("pointercancel", set(false));
      b.addEventListener("lostpointercapture", set(false));
    }
    // The steering pad is one surface: the thumb slides between ◀ ▶ without lifting (even past
    // the pad's edge), and ⤓ under the middle ducks – the same split as its grid in lindenau.css.
    const dpad = ov.dpad;
    const steer = (e) => {
      const rc = dpad.getBoundingClientRect();
      const x = e.clientX - rc.left, side = rc.width / 2.7;
      input.left = x < side;
      input.right = x > rc.width - side;
      input.down = !input.left && !input.right && e.clientY > rc.top + rc.height / 2;
      dpad.dataset.dir = input.down ? "down" : input.left ? "left" : input.right ? "right" : "";
    };
    const unsteer = () => { input.left = input.right = input.down = false; dpad.dataset.dir = ""; };
    dpad.addEventListener("pointerdown", (e) => { e.preventDefault(); dpad.setPointerCapture?.(e.pointerId); steer(e); });
    dpad.addEventListener("pointermove", (e) => { if (dpad.hasPointerCapture?.(e.pointerId)) steer(e); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) dpad.addEventListener(ev, unsteer);
    // On a touch screen the right half of the picture is one big jump button.
    const jumpTouches = new Set();
    canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      const rc = canvas.getBoundingClientRect();
      if (e.clientX < rc.left + rc.width / 2) return;
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      if (!input.jump) input.jumpEdge = true;
      jumpTouches.add(e.pointerId);
      input.jump = true;
    });
    const unjump = (e) => { if (jumpTouches.delete(e.pointerId) && !jumpTouches.size) input.jump = false; };
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(ev, unjump);
    skipBtn.addEventListener("click", () => finish(true));
    // Android back: pause, which offers "Beenden"; paused already: go on
    ov.root.addEventListener("da:back", () => (paused ? resume() : running ? pause() : finish(true)));

    // --- pause: the clock stops, the music holds; Weiter / Neu starten / Beenden ---
    let paused = false, restart = false, quit = false;
    const pz = pauseOverlay(ov.root, {
      onResume: () => resume(),
      onRestart: () => { restart = true; finish(true); },
      onQuit: () => { quit = true; finish(true); },
    });
    ov.pauseBtn?.addEventListener("click", () => (paused ? resume() : pause()));
    function pause() {
      if (!running || paused || over) return;
      paused = true; running = false;
      cancelAnimationFrame(raf);
      for (const k in input) input[k] = false;
      jumpTouches.clear();
      dpad.dataset.dir = "";
      ov.pads.forEach((b) => b.classList.remove("is-down"));
      hold(true);
      pz.show();
    }
    function resume() {
      if (!paused) return;
      paused = false;
      pz.hide();
      hold(false);
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
      canvas.focus({ preventScroll: true });
    }
    activeLevel = { pause };

    function resize() {
      const rc = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = rc.width; ch = rc.height;
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      // Fill the height down to just below the street; a narrow phone keeps at least 300
      // units of street in view and gets more sky instead.
      scale = Math.min(ch / VIEW_BOTTOM, cw / 300);
      oy = ch / scale - VIEW_BOTTOM;
      if (!running) draw();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // --- flow: title card → level → result ---
    (direct ? Promise.resolve(true) : showCard(card, {
      tag: boss ? t("ld.actBoss", "Boss") : t("ld.actLevel", "Mud alert {i} of 3", { i: stage + 1 }),
      title: intro.title,
      lines: [intro],
      scene: (c) => drawScene(c, story.villain, boss, theme),
      go: t("ld.actGo", "Go!"),
      skip: t("ld.actSkip", "Skip"),
      keysHint: true,
      say,
    })).then((go) => {
      if (!go) return finish(true);
      play(boss ? "boss" : "action");
      setDuck(1);
      if (boss) sfx("boss");
      card.hidden = true;
      ov.root.classList.add("is-playing");
      document.documentElement.classList.add("ld-act-on"); // phones: the level fills the screen (lindenau.css)
      updateCount();
      if (direct) addText(hero.x + 110, GY - 150, intro.title, "#fff", true);
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
      canvas.focus({ preventScroll: true });
    });

    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!document.hidden) { step(dt); draw(); }
      raf = requestAnimationFrame(loop);
    }

    function addText(x, y, text, color = "#fff", big = false) { texts.push({ x, y, text, color, life: big ? 1.6 : 1.1, big }); }
    function sparkle(x, y, n = 10, hue = 195) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 110;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.6 + Math.random() * 0.4, hue: hue + Math.random() * 60, star: Math.random() < 0.5 });
      }
    }
    // A monster jumped on, or bumped off its Seifenkiste from below: it goes into a bubble
    // and is washed clean like after a soap bubble.
    function washOff(m, msg) {
      m.state = "bubbled"; m.bt = 0.7; m.clean = 0.3; m.charge = 0;
      sfx("trap");
      const cy = m.type === "walker" ? m.y - m.r : m.y;
      sparkle(m.x, cy, 8);
      addText(m.x, cy - 24, msg, "#fde68a");
    }
    function bumpBlock(b) {
      b.bump = 0.2;
      sfx("hit");
      for (const m of lv.monsters) if (m.on === b && m.state === "alive") washOff(m, t("ld.actBumm", "Bump!"));
    }
    // a ?-box from below: a coin, or a power-up that climbs out and walks off
    function bumpQ(b) {
      b.bump = 0.2;
      if (b.used) { sfx("bump"); return; }
      b.used = true;
      if (b.item === "coin") {
        addCoin();
        parts.push({ x: b.x + b.w / 2, y: b.y - 8, vx: 0, vy: -260, life: 0.45, coin: true });
      } else {
        sfx("bump");
        items.push({ kind: b.item, x: b.x + b.w / 2, y: b.y, vx: 0, vy: 0, rise: 0.45, top: b.y, dir: hero.x < b.x + b.w / 2 ? 1 : -1 });
      }
    }
    function addCoin(n = 1) {
      coins += n;
      sfx("coin");
      updateCount();
    }
    function powerUp(k) {
      sfx("power");
      sparkle(hero.x, hero.y - 20, 16, 40);
      if (k === "big") { if (hero.big) addCoin(5); hero.big = true; }
      else if (k === "gun" || k === "triple") hero.gun = k;
      else if (k === "spring") hero.spring = true;
      else if (k === "star") hero.star = 8;
      addText(hero.x, hero.y - 60 * hs(), ITEM_NAME[k](), "#fde68a", true);
      updateCount();
    }
    // the top a body lands on when it falls from y to ny at x, or null
    function floorAt(x, y, ny, hw) {
      if (y <= GY + 0.5 && ny >= GY && lv.ground.some((g) => x > g.x0 - 2 && x < g.x1 + 2)) return GY;
      for (const p of lv.plats) if (x > p.x - 4 && x < p.x + p.w + 4 && y <= p.y + 0.5 && ny >= p.y) return p.y;
      for (const b of lv.blocks) if (x > b.x - hw + 2 && x < b.x + b.w + hw - 2 && y <= b.y + 0.5 && ny >= b.y) return b.y;
      return null;
    }
    function stepItems(dt) {
      const hh = (hero.duck ? DUCK_H : HH) * hs();
      for (const it of items) {
        if (it.rise > 0) {
          it.rise -= dt;
          it.y = it.top - 16 * (1 - Math.max(0, it.rise) / 0.45);
          if (it.rise <= 0) { it.y = it.top - 0.1; it.vx = (it.kind === "star" ? 85 : 60) * it.dir; }
        } else {
          it.vy = Math.min(900, it.vy + GRAV * dt);
          let nx = it.x + it.vx * dt;
          for (const b of lv.blocks) if (it.y > b.y + 0.5 && it.y - 12 < b.y + b.h && nx + 7 > b.x && nx - 7 < b.x + b.w) { it.vx = -it.vx; nx = it.x; }
          for (const g of lv.ground) if (it.y > GY + 3 && nx + 7 > g.x0 && nx - 7 < g.x1) { it.vx = -it.vx; nx = it.x; }
          if (nx < 10 || nx > lv.L - 10) it.vx = -it.vx; else it.x = nx;
          const ny = it.y + it.vy * dt;
          const fy = it.vy >= 0 ? floorAt(it.x, it.y, ny, 7) : null;
          if (fy != null) { it.y = fy; it.vy = it.kind === "star" ? -400 : 0; } else it.y = ny;
          if (it.y > PIT + 40) it.dead = true;
        }
        if (!over && !it.dead && Math.abs(it.x - hero.x) < 9 + HW * hs() && it.y > hero.y - hh - 2 && it.y - 16 < hero.y) { it.dead = true; powerUp(it.kind); }
      }
      items = items.filter((it) => !it.dead);
      for (const c of lv.coins) {
        if (!c.got && !over && Math.abs(c.x - hero.x) < 5 + HW * hs() && c.y > hero.y - hh - 6 && c.y < hero.y + 6) {
          c.got = true;
          addCoin();
          sparkle(c.x, c.y, 3, 40);
        }
      }
    }
    function knock(fromX, msg) {
      if (hero.inv > 0 || over || hero.star > 0) return;
      if (hero.big || hero.gun || hero.spring) {
        // the power-ups go, the hero stays where they are
        hero.big = false; hero.gun = ""; hero.spring = false; hero.inv = 1.6;
        sfx("shrink");
        sparkle(hero.x, hero.y - 20, 10, 0);
        addText(hero.x, hero.y - 50, msg, "#fde68a");
        updateCount();
        return;
      }
      hero.vx = (hero.x < fromX ? -1 : 1) * 250;
      hero.vy = -330;
      hero.ground = false;
      hero.inv = 1.1;
      hero.dirt = Math.min(5, hero.dirt + 1);
      sfx("hit");
      addText(hero.x, hero.y - 50, msg, "#fde68a");
    }

    function step(dt) {
      tt += dt;
      // hero
      const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      hero.duck = !over && input.down && hero.ground;
      const s = hs(), hw = HW * s;
      const hh = (hero.duck ? DUCK_H : HH) * s;
      if (!over) {
        const target = hero.duck ? 0 : ax * RUN, acc = (hero.ground ? 1600 : 900) * dt;
        hero.vx += Math.max(-acc, Math.min(acc, target - hero.vx));
        if (ax) hero.face = ax;
      } else hero.vx *= 0.9;
      hero.coyote = hero.ground ? COYOTE : hero.coyote - dt;
      hero.buf = input.jumpEdge ? JUMP_BUF : hero.buf - dt;
      input.jumpEdge = false;
      if (hero.ground) hero.double = false;
      if (!over && hero.buf > 0 && hero.coyote > 0) {
        hero.vy = -JUMP; hero.ground = false; hero.coyote = 0; hero.buf = 0;
        sfx("jump");
      } else if (!over && hero.buf === JUMP_BUF && hero.spring && !hero.double && hero.coyote <= 0) {
        // die Sprungfeder: a second jump in the air
        hero.vy = -JUMP * 0.9; hero.double = true; hero.buf = 0;
        sfx("jump");
        sparkle(hero.x, hero.y, 6, 40);
      }
      hero.star = Math.max(0, hero.star - dt);
      if (hero.star === 0 && hero._star) updateCount();
      hero._star = hero.star > 0;
      if (!input.jump && hero.vy < -220) hero.vy = -220;
      hero.vy = Math.min(900, hero.vy + GRAV * dt);
      let nx = hero.x + hero.vx * dt;
      for (const g of lv.ground) {
        if (hero.y > GY + 3 && nx + hw > g.x0 && nx - hw < g.x1) { nx = hero.x <= g.x0 ? g.x0 - hw : g.x1 + hw; hero.vx = 0; }
      }
      for (const b of lv.blocks) {
        if (hero.y > b.y + 0.5 && hero.y - hh < b.y + b.h && nx + hw > b.x && nx - hw < b.x + b.w) { nx = hero.x <= b.x + b.w / 2 ? b.x - hw : b.x + b.w + hw; hero.vx = 0; }
      }
      hero.x = Math.max(12, Math.min(lv.L - 12, nx));
      let ny = hero.y + hero.vy * dt;
      hero.ground = false;
      if (hero.vy >= 0) {
        for (const g of lv.ground) if (hero.x > g.x0 - 2 && hero.x < g.x1 + 2 && hero.y <= GY + 0.5 && ny >= GY) { hero.ground = true; hero.vy = 0; hero.y = GY; hero.safeX = Math.max(g.x0 + 70, Math.min(g.x1 - 70, hero.x)); } // respawn well away from the edge
        if (!hero.ground) for (const p of lv.plats) if (hero.x > p.x - 4 && hero.x < p.x + p.w + 4 && hero.y <= p.y + 0.5 && ny >= p.y) { hero.ground = true; hero.vy = 0; hero.y = p.y; }
        if (!hero.ground) for (const b of lv.blocks) if (hero.x > b.x - hw + 2 && hero.x < b.x + b.w + hw - 2 && hero.y <= b.y + 0.5 && ny >= b.y) { hero.ground = true; hero.vy = 0; hero.y = b.y; }
      } else {
        // head against a box from below: the hero falls back, the box bumps
        for (const b of lv.blocks) {
          const bottom = b.y + b.h;
          if (hero.x > b.x - hw + 3 && hero.x < b.x + b.w + hw - 3 && hero.y - hh >= bottom - 1 && ny - hh < bottom) {
            ny = bottom + hh; hero.vy = 60;
            if (b.q) bumpQ(b); else if (!b.crate) bumpBlock(b);
          }
        }
      }
      if (!hero.ground) hero.y = ny;
      if (hero.y > PIT) {
        sfx("splash");
        for (let i = 0; i < 12; i++) parts.push({ x: hero.x, y: GY + 20, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 160, life: 0.7, mud: true });
        addText(hero.x, GY - 40, look.pit === "rails" || look.pit === "alley" ? t("ld.actOops", "Oops!") : t("ld.actSplash", "Splash!"), "#fde68a");
        hero.x = hero.safeX; hero.y = GY - 60; hero.vx = 0; hero.vy = 0; hero.inv = 1; hero.dirt = Math.min(5, hero.dirt + 1);
      }
      hero.inv = Math.max(0, hero.inv - dt);
      // shooting
      hero.cool -= dt;
      if (input.shoot && hero.cool <= 0 && !over) {
        // die Seife makes the bubbles big enough to wash two monsters; die Wasserpistole
        // squirts fast drops; drei Blasen fans out three at once
        const bx = hero.x + hero.face * 18 * s, by = hero.y - (hero.duck ? 12 : 29) * s;
        const bubble = (vy) => ({ x: bx, y: by, vx: hero.face * 280 + hero.vx * 0.3, vy, life: 1.4, r: hero.big ? 9 : 7, rmax: hero.big ? 14 : 10, pierce: hero.big ? 1 : 0, ph: Math.random() * 6 });
        if (hero.gun === "gun") {
          bubbles.push({ x: bx, y: by, vx: hero.face * 430 + hero.vx * 0.3, vy: 0, life: 0.6, r: hero.big ? 5 : 4, rmax: 0, pierce: 0, ph: 0, drop: true });
          hero.cool = 0.1;
        } else if (hero.gun === "triple") {
          for (const vy of [-150, -22, 110]) bubbles.push(bubble(vy));
          hero.cool = 0.3;
        } else {
          bubbles.push(bubble(-22));
          hero.cool = 0.24;
        }
        sfx("shoot");
      }
      for (const b of bubbles) {
        if (b.drop) { b.x += b.vx * dt; b.vy += 200 * dt; b.y += b.vy * dt; b.life -= dt; continue; }
        b.x += b.vx * dt; b.vx *= 1 - 0.6 * dt; b.vy -= 8 * dt; b.vy *= 1 - 1.5 * dt; b.y += b.vy * dt + Math.sin(tt * 10 + b.ph) * 0.4; b.life -= dt;
        b.r = Math.min(b.rmax, b.r + dt * 3);
      }
      // monsters
      for (const m of lv.monsters) {
        if (m.state === "alive") {
          if (m.type === "walker") { if (m.charge <= 0) { m.x += m.dir * m.sp * dt; if (m.x < m.a) { m.x = m.a; m.dir = 1; } if (m.x > m.b) { m.x = m.b; m.dir = -1; } } }
          else { m.ph += dt * m.sp; m.x = m.bx + Math.sin(m.ph) * 50; m.y = m.by + Math.sin(m.ph * 2.3) * 14; }
          for (const b of bubbles) if (b.life > 0 && Math.hypot(b.x - m.x, b.y - (m.type === "walker" ? m.y - m.r : m.y)) < m.r + b.r) {
            if (b.pierce > 0) b.pierce--; else b.life = 0;
            m.state = "bubbled"; m.bt = 1.1; m.clean = 0; m.charge = 0; sfx("trap");
            break;
          }
          const my = m.type === "walker" ? m.y - m.r : m.y;
          const top = my - m.r;
          if (m.state === "alive" && !over && hero.star > 0 && Math.hypot(hero.x - m.x, heroCy() - my) < m.r + heroR() + 2) washOff(m, t("ld.actWusch", "Whoosh!"));
          else if (m.state === "alive" && !over && hero.vy > 0 && Math.abs(hero.x - m.x) < m.r + 9 * hs() && hero.y > top - 8 && hero.y < my + 2) {
            // landed on it: wash it off and bounce up
            washOff(m, t("ld.actHopp", "Hop!"));
            hero.vy = input.jump ? -JUMP * 0.85 : -380; hero.ground = false;
          } else if (m.state === "alive" && Math.hypot(hero.x - m.x, heroCy() - my) < m.r + heroR() + 1) knock(m.x, t("ld.actIgitt", "Yuck!"));
          // it shoots back: a short warning (the „!“), then a blob. Walkers on the street spit
          // straight at head height – duck under it or jump over it; the others throw at the hero.
          if (m.state === "alive" && !over) {
            const dx = hero.x - m.x;
            if (m.charge > 0) {
              m.charge -= dt;
              if (m.charge <= 0) {
                const dir = Math.sign(dx) || 1;
                if (m.type === "walker" && !m.on) {
                  m.dir = dir;
                  balls.push({ x: m.x + dir * m.r, y: m.y - 24, vx: dir * (135 + stage * 15), vy: 0, grav: false, r: 5, life: 3 });
                } else {
                  const dy = heroCy() - my, d = Math.hypot(dx, dy) || 1;
                  balls.push({ x: m.x, y: my, vx: (dx / d) * 115, vy: (dy / d) * 115, grav: false, r: 5, life: 3.5, dust: m.type === "flyer" });
                }
                sfx("throw");
              }
            } else if ((m.shotT -= dt) <= 0) {
              m.shotT = Math.max(1.8, 3.2 + Math.random() * 2 - stage * 0.4);
              if (Math.abs(dx) < 300 && Math.abs(dx) > 50) m.charge = 0.6;
            }
          }
        } else if (m.state === "bubbled") {
          m.bt -= dt; m.y -= 46 * dt; m.x += Math.sin(tt * 4 + m.ph) * 0.5; m.clean = Math.min(1, m.clean + dt * 1.2);
          if (m.bt <= 0) {
            const cy = m.type === "walker" ? m.y - m.r : m.y;
            m.state = "gone"; cleaned++; sfx("pop"); sparkle(m.x, cy, 14);
            if (m.word) { addText(m.x, cy - 10, m.word, "#fff", true); if (!collected.includes(m.word)) collected.push(m.word); }
            if (m.type === "walker") lv.flowers.push({ x: m.x, hue: Math.random() * 360, t: 0 });
            updateCount();
          }
        }
      }
      // boss
      if (bossO) stepBoss(dt);
      stepBalls(dt);
      stepItems(dt);
      for (const b of lv.blocks) b.bump = Math.max(0, b.bump - dt);
      for (const b of bubbles) if (b.life <= 0 && !b.popped) { b.popped = true; if (b.life > -0.01) sparkle(b.x, b.y, 3); }
      bubbles = bubbles.filter((b) => b.life > 0);
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.mud ? 500 : p.coin ? 900 : 120) * dt; p.life -= dt; }
      parts = parts.filter((p) => p.life > 0);
      for (const x of texts) { x.y -= 30 * dt; x.life -= dt; }
      texts = texts.filter((x) => x.life > 0);
      for (const f of lv.flowers) f.t = Math.min(1, f.t + dt * 2);
      // goal
      if (!boss && !over && hero.x > lv.goal.x - 6) win();
      if (over) { endT -= dt; if (endT <= 0 && !ended) { ended = true; result(); } }
      const vw = cw / scale;
      cam = Math.max(0, Math.min(lv.L - vw, hero.x - vw * 0.38));
      if (lv.L < vw) cam = (lv.L - vw) / 2;
    }

    function stepBoss(dt) {
      const b = bossO;
      b.hurt = Math.max(0, b.hurt - dt);
      if (b.hp <= 0) { b.clean = Math.min(1, b.clean + dt * 0.8); if (b.kind === "staubig") b.y += ((GY - 120) - b.y) * dt; return; }
      const rage = 1 - b.hp / b.max;
      if (b.kind === "schmuddel") {
        const dir = Math.sign(hero.x - b.x) || 1;
        b.x += dir * (38 + rage * 40) * dt;
        b.x = Math.max(70, Math.min(lv.L - 70, b.x));
        b.vy += GRAV * dt; b.y += b.vy * dt;
        if (b.y >= GY) { b.y = GY; b.vy = 0; }
        b.jumpT -= dt;
        if (b.jumpT <= 0 && b.y >= GY) { b.vy = -460; b.jumpT = 2.6 + Math.random() * 1.5; }
        b.throwT -= dt;
        if (b.throwT <= 0) {
          const dx = hero.x - b.x;
          balls.push({ x: b.x, y: b.y - 60, vx: Math.max(-260, Math.min(260, dx / 1.1)), vy: -470, grav: true, r: 7 });
          b.throwT = Math.max(0.95, 1.9 - rage * 1.0);
          sfx("throw");
        }
        if (Math.hypot(hero.x - b.x, hero.y - 16 - (b.y - 34)) < 44) knock(b.x, t("ld.actIgitt", "Yuck!"));
      } else {
        b.t += dt;
        const tx = hero.x + Math.sin(b.t * 0.7) * 160;
        b.x += Math.sign(tx - b.x) * Math.min(Math.abs(tx - b.x), (50 + rage * 50) * dt);
        b.x = Math.max(70, Math.min(lv.L - 70, b.x));
        b.y = GY - 135 + Math.sin(b.t * 1.6) * 28;
        b.throwT -= dt;
        if (b.throwT <= 0) {
          const dx = hero.x - b.x, dy = hero.y - 16 - b.y, d = Math.hypot(dx, dy) || 1;
          balls.push({ x: b.x, y: b.y + 20, vx: (dx / d) * 150, vy: (dy / d) * 150, grav: false, r: 8, life: 4, dust: true });
          b.throwT = Math.max(0.9, 1.8 - rage * 0.9);
          sfx("throw");
        }
        if (Math.hypot(hero.x - b.x, hero.y - 16 - b.y) < 44) knock(b.x, t("ld.actHatschi", "Atchoo!"));
      }
      const cy = b.kind === "schmuddel" ? b.y - 34 : b.y;
      for (const bu of bubbles) if (bu.life > 0 && b.hp > 0 && Math.hypot(bu.x - b.x, bu.y - cy) < 40 + bu.r) {
        bu.life = 0;
        if (b.hurt > 0.12) continue; // a short breather after each hit, so a fast squirt is no shortcut b.hp--; b.hurt = 0.3; sfx("pop"); sparkle(bu.x, bu.y, 8);
        updateCount();
        if (b.hp <= 0) {
          balls = []; cleaned = 1; sparkle(b.x, cy, 40); sfx("coin");
          addText(b.x, cy - 60, t("ld.actClean", "Clean!"), "#fff", true);
          win();
        }
      }
    }

    // what the boss and the monsters throw; a bubble catches it in the air
    function stepBalls(dt) {
      for (const m of balls) {
        m.x += m.vx * dt; m.y += m.vy * dt; if (m.grav) m.vy += 1000 * dt; else m.life -= dt;
        if (!over && Math.hypot(m.x - hero.x, m.y - heroCy()) < m.r + heroR()) { m.dead = true; knock(m.x, m.dust ? t("ld.actHatschi", "Atchoo!") : t("ld.actIgitt", "Yuck!")); }
        for (const bu of bubbles) if (bu.life > 0 && Math.hypot(bu.x - m.x, bu.y - m.y) < bu.r + m.r) { bu.life = 0; m.dead = true; sfx("pop"); sparkle(m.x, m.y, 5); }
        if ((m.grav && m.y > GY) || m.life <= 0) { m.dead = true; for (let i = 0; i < 5; i++) parts.push({ x: m.x, y: Math.min(m.y, GY), vx: (Math.random() - 0.5) * 120, vy: -80 - Math.random() * 80, life: 0.5, mud: true, dust: m.dust }); }
      }
      balls = balls.filter((m) => !m.dead);
    }

    function win() {
      if (over) return;
      over = true;
      endT = boss ? 2.6 : 1.2;
      hero.dirt = 0;
      sparkle(hero.x, hero.y - 20, 24, 40);
      play("win");
      if (!boss) addText(hero.x, hero.y - 60, stage === 0 ? t("ld.actArrived", "Welcome to Villabruno!") : t("ld.actGoal", "Made it!"), "#fff", true);
    }

    function result() {
      running = false;
      cancelAnimationFrame(raf);
      ov.root.classList.remove("is-playing");
      document.documentElement.classList.remove("ld-act-on");
      saveCoins();
      const lines = boss ? story.end : [];
      const score = boss ? "" : `${t("ld.actScore", "{c} of {n} monsters cleaned", { c: cleaned, n: total })} · 🪙 ${coins}`;
      const note = coinNote(unlocked);
      const wordsH = stage === 0 ? t("ld.actWordsToday", "You need these words today:") : t("ld.actWords", "You cleaned these words:");
      showCard(card, {
        tag: boss ? t("ld.actBossDone", "The town is clean!") : t("ld.actDone", "Done!"),
        title: score,
        lines,
        words: collected,
        wordsH,
        note,
        scene: boss ? (c) => drawScene(c, story.villain, boss, theme, true) : null,
        go: t("ld.next", "Next"),
        say,
      }).then(() => close(false));
    }

    // Skip, Escape or Android back: out at once. After the goal it counts as done.
    function finish(skipped) {
      const wasDone = ended;
      ended = true;
      running = false;
      close(wasDone ? false : skipped);
    }
    let saved = false, unlocked = [];
    function saveCoins() {
      if (saved || !coins) return;
      saved = true;
      unlocked = addCoins(coins);
    }
    let closed = false;
    function close(skipped) {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.documentElement.classList.remove("ld-act-on");
      if (restart || quit) saved = true; // a level started over or left halfway keeps no coins
      saveCoins();
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      if (activeLevel?.pause === pause) activeLevel = null;
      if (paused) { paused = false; hold(false); }
      ov.root.remove();
      // "Neu starten": the same level again at once, no title card
      if (restart) return resolve(playLevel(stageEl, { area, stage, words, direct: true, say }));
      resolve({ cleaned, of: total, skipped, coins, unlocked, quit });
    }

    // --- drawing ---
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      if (look.dark) { sky.addColorStop(0, "#0b1120"); sky.addColorStop(1, "#334155"); }
      else { sky.addColorStop(0, theme.top); sky.addColorStop(1, theme.bottom); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, dpr * scale * oy);
      const vw = cw / scale;
      if (!look.dark) {
        // sun + clouds (slow parallax)
        ctx.fillStyle = theme.sun;
        ctx.beginPath(); ctx.arc(vw - 60 - cam * 0.02, 60 - oy * 0.5, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = theme.far;
        for (let i = 0; i < 6; i++) {
          const cx = ((i * 260 - cam * 0.12 + tt * 6) % (vw + 300) + vw + 300) % (vw + 300) - 150, cy = 50 + (i % 3) * 30 - oy * (0.7 - (i % 3) * 0.2);
          ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.arc(cx + 20, cy - 8, 22, 0, Math.PI * 2); ctx.arc(cx + 44, cy, 16, 0, Math.PI * 2); ctx.fill();
        }
      }
      drawFar(vw);
      ctx.save();
      ctx.translate(-cam, 0);
      const G = GROUND[look.ground];
      for (const g of lv.ground) drawGround(g, G);
      for (const p of lv.pits) drawPit(p);
      // things standing by the street
      if (look.lamps) for (let x = 120; x < lv.L; x += 240) {
        ctx.strokeStyle = "#334155"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY - 72); ctx.quadraticCurveTo(x, GY - 80, x + 10, GY - 80); ctx.stroke();
        ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.ellipse(x + 12, GY - 77, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (look.train) drawTrain(-250, GY);
      // flowers where monsters were washed
      for (const f of lv.flowers) {
        const s = f.t;
        ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(f.x, GY); ctx.lineTo(f.x, GY - 10 * s); ctx.stroke();
        ctx.fillStyle = `hsl(${f.hue},80%,65%)`;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 3 * s, GY - 12 * s + Math.sin(a) * 3 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(f.x, GY - 12 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      }
      // platforms: planks with a stripe, in the colours of the place
      const PL = { park: ["#a16207", "#65a30d"], tiles: ["#64748b", "#facc15"], roof: ["#78716c", "#e2445c"] }[look.far === "trees" ? "park" : look.ground] ?? ["#c98b4f", "#e2445c"];
      for (const p of lv.plats) {
        ctx.fillStyle = PL[0]; ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, 14, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = PL[1];
        for (let x = p.x + 4; x < p.x + p.w - 6; x += 14) ctx.fillRect(x, p.y + 2, 7, 4);
        ctx.strokeStyle = look.dark ? "rgba(203,213,225,.35)" : "rgba(26,34,48,.35)";
        ctx.beginPath(); ctx.moveTo(p.x + 6, p.y + 14); ctx.lineTo(p.x + 10, GY); ctx.moveTo(p.x + p.w - 6, p.y + 14); ctx.lineTo(p.x + p.w - 10, GY); ctx.stroke();
      }
      // what stands on the street, the Seifenkisten (blue, with a bubble) and the ?-boxes
      for (const b of lv.blocks) {
        const y = b.y - Math.sin((b.bump / 0.2) * Math.PI) * 6;
        ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.5;
        if (b.crate) drawObstacle(b, y);
        else if (b.q) {
          ctx.fillStyle = b.used ? "#a16207" : "#f59e0b";
          ctx.beginPath(); ctx.roundRect(b.x, y, b.w, b.h, 3); ctx.fill(); ctx.stroke();
          if (b.used) {
            ctx.fillStyle = "#713f12";
            for (const [dx, dy] of [[4, 4], [b.w - 4, 4], [4, b.h - 4], [b.w - 4, b.h - 4]]) { ctx.beginPath(); ctx.arc(b.x + dx, y + dy, 1.3, 0, Math.PI * 2); ctx.fill(); }
          } else {
            ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(b.x + 3, y + 3, b.w - 6, 2);
            ctx.font = "800 14px Fredoka, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = "#92400e"; ctx.fillText("?", b.x + b.w / 2 + 1, y + b.h / 2 + 2);
            ctx.fillStyle = Math.floor(tt * 3) % 2 ? "#fff" : "#fef3c7"; ctx.fillText("?", b.x + b.w / 2, y + b.h / 2 + 1);
          }
        } else {
          ctx.fillStyle = "#3b82f6";
          ctx.beginPath(); ctx.roundRect(b.x, y, b.w, b.h, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(b.x + 3, y + 3, b.w - 6, 3);
          for (let x = b.x + 14; x < b.x + b.w - 8; x += 24) drawBubble(ctx, x, y + b.h / 2 + 1, 4, tt);
        }
      }
      for (const c of lv.coins) if (!c.got) drawCoin(c.x, c.y + Math.sin(tt * 3 + c.x) * 1.2);
      for (const it of items) drawItem(it);
      // goal: a fountain with a flag
      if (lv.goal) {
        const gx = lv.goal.x;
        ctx.fillStyle = "#94a3b8"; ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(gx - 26, GY - 18, 52, 18, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#7dd3fc"; ctx.fillRect(gx - 22, GY - 16, 44, 5);
        ctx.strokeStyle = "rgba(125,211,252,.9)"; ctx.lineWidth = 2;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(gx, GY - 34); ctx.quadraticCurveTo(gx + s * 14, GY - 46 - Math.sin(tt * 6) * 2, gx + s * 20, GY - 18); ctx.stroke(); }
        ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx + 32, GY); ctx.lineTo(gx + 32, GY - 70); ctx.stroke();
        ctx.fillStyle = "#0d9488";
        ctx.beginPath(); ctx.moveTo(gx + 32, GY - 70); ctx.lineTo(gx + 62 + Math.sin(tt * 5) * 2, GY - 62); ctx.lineTo(gx + 32, GY - 54); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "700 7px Fredoka, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(t("ld.actFlag", "GOAL"), gx + 43, GY - 62);
      }
      // monsters
      ctx.font = "600 8px Fredoka, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const m of lv.monsters) {
        if (m.state === "gone") continue;
        drawMonster(ctx, m, tt, Math.sign(hero.x - m.x));
        if (m.state === "bubbled") drawBubble(ctx, m.x, m.type === "walker" ? m.y - m.r : m.y, m.r + 9, tt);
        if (m.state === "alive" && m.charge > 0) {
          const ty = (m.type === "walker" ? m.y - m.r * 2 : m.y - m.r) - 9;
          ctx.font = "700 14px Fredoka, system-ui, sans-serif";
          ctx.lineWidth = 3; ctx.strokeStyle = "rgba(26,34,48,.85)"; ctx.strokeText("!", m.x, ty);
          ctx.fillStyle = "#fb923c"; ctx.fillText("!", m.x, ty);
          ctx.font = "600 8px Fredoka, system-ui, sans-serif";
        }
      }
      if (bossO) drawBoss(ctx, bossO, tt, Math.sign(hero.x - bossO.x));
      for (const m of balls) {
        ctx.fillStyle = m.dust ? "#9ca3af" : "#6b4423"; ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // hero (blinks while knocked)
      if (hero.star > 0 && (calm() || hero.star > 2 || Math.floor(tt * 10) % 2)) {
        // der Stern: a rainbow glow, blinking for the last two seconds (reduced motion: steady gold)
        ctx.fillStyle = calm() ? "hsla(48, 95%, 62%, .45)" : `hsla(${(tt * 400) % 360}, 95%, 65%, .45)`;
        ctx.beginPath(); ctx.ellipse(hero.x, heroCy() - 4, 18 * hs(), 26 * hs(), 0, 0, Math.PI * 2); ctx.fill();
      }
      if (calm() && hero.inv > 0) ctx.globalAlpha = 0.6; // reduced motion: see-through instead of blinking
      if (calm() || !(hero.inv > 0 && Math.floor(tt * 16) % 2)) drawHero(ctx, hero.x, hero.y, { face: hero.face, t: tt, run: Math.abs(hero.vx) > 20 && hero.ground, air: !hero.ground, dirt: hero.dirt, duck: hero.duck, hurt: hero.inv > 0, scale: hs() });
      ctx.globalAlpha = 1;
      for (const b of bubbles) {
        if (!b.drop) { drawBubble(ctx, b.x, b.y, b.r, tt + b.ph); continue; }
        ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = "#0369a1"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.4, b.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(b.x - b.r * 0.4, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2); ctx.fill();
      }
      for (const p of parts) {
        ctx.globalAlpha = Math.min(1, p.life * 2);
        if (p.coin) drawCoin(p.x, p.y);
        else if (p.mud) { ctx.fillStyle = p.dust ? "#9ca3af" : "#6b4a2b"; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill(); }
        else if (p.star) { ctx.fillStyle = `hsl(${p.hue},90%,70%)`; star(ctx, p.x, p.y, 3.2); }
        else drawBubble(ctx, p.x, p.y, 2.5, tt);
        ctx.globalAlpha = 1;
      }
      for (const x of texts) {
        ctx.globalAlpha = Math.min(1, x.life * 1.5);
        ctx.font = `700 ${x.big ? 13 : 10}px Fredoka, system-ui, sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(26,34,48,.85)"; ctx.strokeText(x.text, x.x, x.y);
        ctx.fillStyle = x.color; ctx.fillText(x.text, x.x, x.y);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // --- the places (LOOK) ---
    function drawFar(vw) {
      ctx.save();
      if (look.far === "tunnel") {
        // U-Bahn: a tiled wall with a blue band and station signs, pillars, lamps under the ceiling
        ctx.translate(-cam * 0.6, 0);
        const x0 = cam * 0.6 - 40, x1 = x0 + vw + 80;
        ctx.fillStyle = "#cbd5e1"; ctx.fillRect(x0, GY - 170, x1 - x0, 170);
        ctx.strokeStyle = "rgba(100,116,139,.35)"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = GY - 170; y < GY; y += 12) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
        for (let x = Math.floor(x0 / 18) * 18; x < x1; x += 18) { ctx.moveTo(x, GY - 170); ctx.lineTo(x, GY); }
        ctx.stroke();
        ctx.fillStyle = "#1d4ed8"; ctx.fillRect(x0, GY - 112, x1 - x0, 10);
        ctx.fillStyle = "#1e293b"; ctx.fillRect(x0, GY - 230 - oy, x1 - x0, 60 + oy);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let x = Math.floor(x0 / 520) * 520 + 200; x < x1; x += 520) {
          ctx.fillStyle = "#1d4ed8"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(x - 44, GY - 150, 88, 22, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#fff"; ctx.font = "700 11px Fredoka, system-ui, sans-serif";
          ctx.fillText("Villabruno", x, GY - 138);
          ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.roundRect(x - 62, GY - 150, 14, 14, 2); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "800 10px system-ui, sans-serif"; ctx.fillText("M", x - 55, GY - 142.5);
        }
        for (let x = Math.floor(x0 / 260) * 260 + 70; x < x1; x += 260) {
          ctx.fillStyle = "#94a3b8"; ctx.fillRect(x, GY - 170, 18, 170);
          ctx.fillStyle = "rgba(253,230,138,.9)"; ctx.fillRect(x + 60, GY - 172, 50, 4);
          ctx.fillStyle = "rgba(253,230,138,.12)"; ctx.beginPath(); ctx.moveTo(x + 60, GY - 168); ctx.lineTo(x + 110, GY - 168); ctx.lineTo(x + 140, GY); ctx.lineTo(x + 30, GY); ctx.fill();
        }
      } else if (look.far === "trees") {
        // park: green hills far away, round trees in front of them
        ctx.save(); ctx.translate(-cam * 0.2, 0);
        ctx.fillStyle = "#86efac";
        for (let x = Math.floor((cam * 0.2 - 200) / 240) * 240; x < cam * 0.2 + vw + 240; x += 240) { ctx.beginPath(); ctx.ellipse(x, GY, 170, 90 + (Math.abs(x / 240) % 3) * 18, 0, Math.PI, 0); ctx.fill(); }
        ctx.restore();
        ctx.translate(-cam * 0.45, 0);
        for (const h of lv.houses) {
          const tx = h.x + h.w / 2, top = GY - 8 - h.h * 0.8;
          ctx.fillStyle = "#92400e"; ctx.fillRect(tx - 4, top + 20, 8, GY - top - 20);
          ctx.fillStyle = h.w > 85 ? "#22c55e" : "#16a34a";
          ctx.beginPath(); ctx.arc(tx, top + 10, h.w * 0.38, 0, Math.PI * 2); ctx.arc(tx - h.w * 0.22, top + 24, h.w * 0.26, 0, Math.PI * 2); ctx.arc(tx + h.w * 0.22, top + 24, h.w * 0.26, 0, Math.PI * 2); ctx.fill();
        }
      } else if (look.far === "skyline") {
        // roofs: the city far below and behind, towers and all
        ctx.translate(-cam * 0.25, 0);
        lv.houses.forEach((h, i) => {
          ctx.fillStyle = i % 2 ? "rgba(124,58,237,.28)" : "rgba(91,33,182,.22)";
          const top = GY + 30 - h.h * 1.5;
          ctx.fillRect(h.x, top, h.w, GY + 60 - top);
          if (i % 5 === 0) { ctx.beginPath(); ctx.moveTo(h.x + h.w / 2 - 10, top); ctx.lineTo(h.x + h.w / 2, top - 50); ctx.lineTo(h.x + h.w / 2 + 10, top); ctx.fill(); }
          ctx.fillStyle = "rgba(254,240,138,.55)";
          for (let wy = top + 10; wy < GY + 40; wy += 22) for (let wx = h.x + 8; wx < h.x + h.w - 10; wx += 18) if (Math.round(wx * 7 + wy * 3) % 5 < 2) ctx.fillRect(wx, wy, 6, 8);
        });
      } else {
        ctx.translate(-cam * 0.45, 0);
        lv.houses.forEach((h, i) => {
          const top = GY - 8 - h.h;
          ctx.fillStyle = h.wall; ctx.globalAlpha = 0.85;
          ctx.fillRect(h.x, top, h.w, h.h);
          ctx.fillStyle = h.roof;
          ctx.beginPath(); ctx.moveTo(h.x - 5, top); ctx.lineTo(h.x + h.w / 2, top - 26); ctx.lineTo(h.x + h.w + 5, top); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(56,104,150,.45)";
          for (let wy = top + 14; wy < GY - 30; wy += 26) for (let wx = h.x + 10; wx < h.x + h.w - 14; wx += 22) ctx.fillRect(wx, wy, 11, 13);
          ctx.globalAlpha = 1;
          // market day: bunting from roof to roof
          const n = lv.houses[i + 1];
          if (look.flags && n) {
            const ax = h.x + h.w / 2, ay = top - 20, bx = n.x + n.w / 2, by = GY - 8 - n.h - 20, my = Math.max(ay, by) + 24;
            ctx.strokeStyle = "#475569"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, my, bx, by); ctx.stroke();
            for (let k = 1; k < 6; k++) {
              const u = k / 6, fx = (1 - u) ** 2 * ax + 2 * u * (1 - u) * ((ax + bx) / 2) + u * u * bx, fy = (1 - u) ** 2 * ay + 2 * u * (1 - u) * my + u * u * by;
              ctx.fillStyle = ["#e2445c", "#facc15", "#3b82f6", "#22c55e"][k % 4];
              ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.lineTo(fx + 4, fy); ctx.lineTo(fx, fy + 8); ctx.fill();
            }
          }
        });
      }
      ctx.restore();
    }
    function drawGround(g, G) {
      const w = g.x1 - g.x0;
      if (look.ground === "roof") {
        // a house per stretch: its wall with windows, red tiles on top
        ctx.fillStyle = G.fill; ctx.fillRect(g.x0, GY, w, VIEW_H - GY + 20);
        ctx.fillStyle = "rgba(56,104,150,.5)";
        for (let x = g.x0 + 18; x < g.x1 - 24; x += 34) ctx.fillRect(x, GY + 26, 14, 18);
        ctx.fillStyle = G.top; ctx.fillRect(g.x0, GY, w, 14);
        ctx.fillStyle = G.stripe;
        for (let x = g.x0 + 6; x < g.x1; x += 12) { ctx.beginPath(); ctx.arc(x, GY + 14, 6, 0, Math.PI); ctx.fill(); }
      } else {
        ctx.fillStyle = G.fill; ctx.fillRect(g.x0, GY, w, VIEW_H - GY + 20);
        ctx.fillStyle = G.top; ctx.fillRect(g.x0, GY, w, 10);
        ctx.fillStyle = G.stripe;
        if (look.ground === "grass") for (let x = Math.ceil(g.x0 / 7) * 7; x < g.x1 - 3; x += 7) { ctx.beginPath(); ctx.moveTo(x, GY + 1); ctx.lineTo(x + 2, GY - 4 - (Math.abs(x) % 3)); ctx.lineTo(x + 4, GY + 1); ctx.fill(); }
        else if (look.ground === "tiles") ctx.fillRect(g.x0, GY + 2, w, 3);
        else if (look.ground === "cobble") for (let x = Math.ceil(g.x0 / 12) * 12; x < g.x1 - 6; x += 12) { ctx.beginPath(); ctx.arc(x + 6, GY + 5, 4, 0, Math.PI * 2); ctx.fill(); }
        else for (let x = Math.ceil(g.x0 / 18) * 18; x < g.x1 - 6; x += 18) ctx.fillRect(x, GY + 2, 14, 6);
      }
      ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(g.x0, VIEW_H + 20); ctx.lineTo(g.x0, GY); ctx.lineTo(g.x1, GY); ctx.lineTo(g.x1, VIEW_H + 20); ctx.stroke();
    }
    function drawPit(p) {
      const w = p.x1 - p.x0;
      if (look.pit === "pond") {
        ctx.fillStyle = "#38bdf8"; ctx.fillRect(p.x0, GY + 18, w, VIEW_H - GY);
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) { const x = p.x0 + w * (0.3 + i * 0.4) + Math.sin(tt * 2 + i) * 4; ctx.beginPath(); ctx.moveTo(x - 5, GY + 24 + i * 6); ctx.lineTo(x + 5, GY + 24 + i * 6); ctx.stroke(); }
      } else if (look.pit === "rails") {
        ctx.fillStyle = "#111827"; ctx.fillRect(p.x0, GY + 6, w, VIEW_H - GY);
        ctx.fillStyle = "#57534e"; for (let x = p.x0 + 4; x < p.x1 - 4; x += 10) ctx.fillRect(x, GY + 44, 6, 4);
        ctx.fillStyle = "#9ca3af"; ctx.fillRect(p.x0, GY + 41, w, 2);
      } else if (look.pit === "alley") {
        const g = ctx.createLinearGradient(0, GY, 0, GY + 60);
        g.addColorStop(0, "#334155"); g.addColorStop(1, "#0f172a");
        ctx.fillStyle = g; ctx.fillRect(p.x0, GY, w, VIEW_H - GY);
      } else {
        ctx.fillStyle = "#6b4a2b"; ctx.fillRect(p.x0, GY + 22, w, VIEW_H - GY);
        ctx.fillStyle = "#856043";
        for (let i = 0; i < 3; i++) { const bx = p.x0 + ((i + 0.5) * w) / 3, s = (Math.sin(tt * 3 + i * 2) + 1) * 2; ctx.beginPath(); ctx.arc(bx, GY + 24, 2 + s, Math.PI, 0); ctx.fill(); }
      }
    }
    function drawObstacle(b, y) {
      const k = look.obst;
      if (k === "column") {
        // a Litfaßsäule: posters all round, a green cap
        ctx.fillStyle = "#e5e7eb"; ctx.beginPath(); ctx.roundRect(b.x, y + 6, b.w, b.h - 6, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f59e0b"; ctx.fillRect(b.x + 2, y + 12, b.w - 4, 10);
        ctx.fillStyle = "#3b82f6"; ctx.fillRect(b.x + 2, y + 25, b.w - 4, Math.max(4, b.h - 34));
        ctx.fillStyle = "#166534"; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, y + 6, b.w / 2 + 2, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (k === "stump") {
        ctx.fillStyle = "#92400e"; ctx.beginPath(); ctx.roundRect(b.x, y + 3, b.w, b.h - 3, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#d6a76c"; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, y + 3, b.w / 2, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(146,64,14,.6)"; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, y + 3, b.w / 4, 2, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (k === "pipe") {
        ctx.fillStyle = "#16a34a"; ctx.fillRect(b.x + 2, y + 10, b.w - 4, b.h - 10); ctx.strokeRect(b.x + 2, y + 10, b.w - 4, b.h - 10);
        ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.roundRect(b.x - 2, y, b.w + 4, 11, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(b.x + 6, y + 12, 4, b.h - 14); ctx.fillRect(b.x + 2, y + 2, 4, 7);
      } else if (k === "chimney") {
        ctx.fillStyle = "#b91c1c"; ctx.fillRect(b.x, y + 4, b.w, b.h - 4); ctx.strokeRect(b.x, y + 4, b.w, b.h - 4);
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
        ctx.beginPath(); for (let yy = y + 11; yy < y + b.h; yy += 7) { ctx.moveTo(b.x, yy); ctx.lineTo(b.x + b.w, yy); } ctx.stroke();
        ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.5;
        ctx.fillStyle = "#44403c"; ctx.beginPath(); ctx.roundRect(b.x - 3, y, b.w + 6, 6, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(226,232,240,.6)";
        for (let i = 0; i < 3; i++) { const u = (tt * 0.5 + i / 3) % 1; ctx.beginPath(); ctx.arc(b.x + b.w / 2 + u * 14, y - 6 - u * 34, 3 + u * 6, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.fillStyle = "#b7793f";
        ctx.beginPath(); ctx.roundRect(b.x, y, b.w, b.h, 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(26,34,48,.45)";
        ctx.beginPath(); ctx.moveTo(b.x + 3, y + 3); ctx.lineTo(b.x + b.w - 3, y + b.h - 3); ctx.moveTo(b.x + b.w - 3, y + 3); ctx.lineTo(b.x + 3, y + b.h - 3); ctx.stroke();
      }
    }
    function drawTrain(x, y) {
      // the regional train Super-Blubb came in
      ctx.fillStyle = "#dc2626"; ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x, y - 62, 270, 54, [6, 22, 6, 6]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e5e7eb"; ctx.fillRect(x, y - 22, 270, 6);
      ctx.fillStyle = "#bae6fd";
      for (let wx = x + 12; wx < x + 230; wx += 34) { ctx.beginPath(); ctx.roundRect(wx, y - 54, 24, 18, 3); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.roundRect(x + 240, y - 54, 22, 20, [3, 12, 3, 3]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1a2230";
      for (const wx of [x + 30, x + 60, x + 210, x + 240]) { ctx.beginPath(); ctx.arc(wx, y - 6, 6, 0, Math.PI * 2); ctx.fill(); }
    }
    function drawCoin(x, y) {
      const w = Math.max(0.15, Math.abs(Math.cos(tt * 4 + x * 0.05)));
      ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#a16207"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(x, y, 5.5 * w, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (w > 0.5) { ctx.fillStyle = "#fef08a"; ctx.fillRect(x - 0.8, y - 3.5, 1.6, 7); }
    }
    function drawItem(it) {
      const x = it.x, y = it.y;
      ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.4;
      if (it.kind === "big") {
        // a pink bar of soap with bubbles
        ctx.fillStyle = "#f472b6"; ctx.beginPath(); ctx.roundRect(x - 9, y - 12, 18, 12, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(x - 6, y - 10, 9, 2);
        drawBubble(ctx, x + 5, y - 16, 3.5, tt); drawBubble(ctx, x - 3, y - 18, 2.5, tt + 1);
      } else if (it.kind === "gun") {
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath(); ctx.roundRect(x - 9, y - 14, 18, 7, 3); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(x - 7, y - 9, 6, 9, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x + 1, y - 15, 3, Math.PI, 0); ctx.fill(); ctx.stroke();
      } else if (it.kind === "triple") {
        for (const [dx, dy] of [[-5, -5], [5, -5], [0, -12]]) drawBubble(ctx, x + dx, y + dy, 5, tt + dx);
      } else if (it.kind === "spring") {
        ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 6, y); for (let i = 1; i <= 6; i++) ctx.lineTo(x + (i % 2 ? 6 : -6), y - i * 2.2); ctx.stroke();
        ctx.fillStyle = "#e2445c"; ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.roundRect(x - 8, y - 18, 16, 5, 2); ctx.fill(); ctx.stroke();
      } else if (it.kind === "star") {
        ctx.fillStyle = `hsl(${50 + Math.sin(tt * 10) * 10}, 95%, 58%)`;
        star(ctx, x, y - 9, 10); ctx.stroke();
        ctx.fillStyle = "#1a2230"; ctx.fillRect(x - 3, y - 12, 1.6, 4); ctx.fillRect(x + 1.5, y - 12, 1.6, 4);
      }
    }
  });
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

/** The prologue of an area: a card over the town, before Bruno. */
export function playPrologue(stageEl, { area, say }) {
  const story = storyOf(area);
  const theme = THEMES[area] ?? THEMES.morgen;
  const ov = overlay(stageEl, true);
  play("action");
  setDuck(0.45);
  return showCard(ov.card, {
    tag: t("ld.actStory", "The story"),
    title: story.prologue.title,
    lines: story.prologue.lines,
    scene: (c) => drawScene(c, story.villain, false, theme),
    go: t("ld.actStoryGo", "Let's go!"),
    keysHint: true,
    say,
  }).then(() => { ov.root.remove(); });
}

// --- the overlay and its cards --------------------------------------------------------------
function overlay(stageEl, cardOnly = false) {
  const root = document.createElement("div");
  root.className = "ld-act";
  root.dataset.backCloses = "";
  root.innerHTML = `<canvas class="ld-act-canvas" tabindex="-1" aria-hidden="true"></canvas>
    ${cardOnly ? "" : `<div class="ld-act-hud"><span class="ld-act-count" aria-live="polite"></span><span class="ld-act-btns"><button type="button" class="ld-act-skip ld-act-pausebtn" data-pause aria-label="${esc(t("ld.pause", "Pause"))}" title="${esc(t("ld.pause", "Pause"))}">⏸</button><button type="button" class="ld-act-skip" data-skip-level aria-label="${esc(t("ld.actSkip", "Skip"))}"><span class="ld-act-skip-t">${esc(t("ld.actSkip", "Skip"))}</span> ⏭</button></span></div>
    <div class="ld-deck ld-act-pad">
      <div class="ld-dpad" data-dpad role="group" aria-label="${esc(t("ld.actLeft", "Left"))} · ${esc(t("ld.actDuck", "Duck"))} · ${esc(t("ld.actRight", "Right"))}"><span data-d="left">◀</span><span data-d="down">⤓</span><span data-d="right">▶</span></div>
      <div class="ld-ab"><button type="button" class="sf-key ld-act-shoot ld-key-b" data-k="shoot" aria-label="${esc(t("ld.actShoot", "Soap bubble"))}">🫧</button><button type="button" class="sf-key sf-key--gas ld-key-a" data-k="jump" aria-label="${esc(t("ld.actJump", "Jump"))}">⤒</button></div>
    </div>`}
    <div class="sf-panel ld-act-card" hidden aria-live="polite"></div>`;
  stageEl.append(root);
  return {
    root,
    canvas: root.querySelector("canvas"),
    card: root.querySelector(".ld-act-card"),
    count: root.querySelector(".ld-act-count"),
    skipBtn: root.querySelector("[data-skip-level]"),
    pauseBtn: root.querySelector("[data-pause]"),
    pads: [...root.querySelectorAll("[data-k]")],
    dpad: root.querySelector("[data-dpad]"),
  };
}

/** A story card: a little comic scene, the German lines (🔊 💡), optional word chips. */
function showCard(card, o) {
  return new Promise((resolve) => {
    card.innerHTML = `<p class="sf-q-tag">${esc(o.tag)}</p>
      ${o.title ? `<h3 class="ld-act-title" lang="es">${esc(o.title)}</h3>` : ""}
      ${o.scene ? `<canvas class="ld-act-scene" width="560" height="200" aria-hidden="true"></canvas>` : ""}
      ${o.lines.map((l, i) => `<div class="ld-act-row"><p class="ld-line ld-act-line" lang="es">${esc(l.de)}</p>
        <div class="ld-tools">
          <button type="button" class="ld-tool" data-say="${i}" aria-label="${esc(t("ld.listen", "Listen"))}" title="${esc(t("ld.listen", "Listen"))}">🔊</button>
          ${l.en ? `<button type="button" class="ld-tool" data-gloss-btn="${i}" aria-expanded="false" aria-label="${esc(t("ld.help", "Help"))}" title="${esc(t("ld.help", "Help"))}">💡</button>` : ""}
        </div></div>
        ${l.en ? glossP(l.de, l.en, `data-gloss="${i}"`) : ""}`).join("")}
      ${o.words?.length ? `<p class="ld-act-words-h">${esc(o.wordsH ?? t("ld.actWords", "You cleaned these words:"))}</p>
        <div class="ld-act-words">${o.words.map((w) => `<button type="button" class="ld-act-word" lang="es" data-word="${esc(w)}">🫧 ${esc(w)}</button>`).join("")}</div>` : ""}
      ${o.note ? `<p class="ld-act-note">${esc(o.note)}</p>` : ""}
      ${o.keysHint ? `<p class="ld-act-keys">${esc(t("ld.actKeys", "← → run · ↓ duck · space bar jump · X soap bubbles"))}</p><p class="ld-act-touch">${esc(t("ld.actTouch", "◀ ▶ run · ⤓ duck · ⤒ jump · 🫧 soap bubbles"))}</p><p class="ld-act-tip">${esc(t("ld.actTip", "Tip: jump on a monster – or hit the blue crate from below. When a “!” appears, duck!"))}</p><p class="ld-act-tip">${esc(t("ld.actTipItems", "Hit the ?-crate from below: coins, the soap (big and strong), the water pistol, the star …"))}</p><p class="ld-act-touch">${esc(t("ld.actTouchJump", "Tap the right half of the picture – then you jump."))}</p>` : ""}
      <div class="ld-btns">
        <button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(o.go)}</button>
        ${o.skip ? `<button type="button" class="quiz-btn" data-skip>${esc(o.skip)}</button>` : ""}
      </div>`;
    card.hidden = false;
    card.scrollTop = 0;
    const sc = card.querySelector(".ld-act-scene");
    const refit = () => fitCard(card, sc);
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(card.parentElement);
    card.addEventListener("ld:closed", () => ro.disconnect(), { once: true });
    if (sc && o.scene) {
      let alive = true;
      const tick = () => { if (!alive || !sc.isConnected || card.hidden) return; o.scene(sc); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      card.addEventListener("ld:closed", () => { alive = false; }, { once: true });
    }
    card.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", () => o.say?.(o.lines[Number(b.dataset.say)].de)));
    card.querySelectorAll("[data-gloss-btn]").forEach((b) => b.addEventListener("click", () => {
      const g = card.querySelector(`[data-gloss="${b.dataset.glossBtn}"]`);
      g.hidden = !g.hidden;
      b.setAttribute("aria-expanded", String(!g.hidden));
      refit();
    }));
    card.querySelectorAll("[data-word]").forEach((b) => b.addEventListener("click", () => o.say?.(b.dataset.word)));
    const done = (v) => { card.dispatchEvent(new Event("ld:closed")); card.hidden = true; resolve(v); };
    const go = card.querySelector("[data-go]");
    go.focus({ preventScroll: true });
    go.addEventListener("click", () => done(true), { once: true });
    card.querySelector("[data-skip]")?.addEventListener("click", () => done(false), { once: true });
  });
}

/** No scrolling in a story card: first the comic scene gets smaller, then the text. */
function fitCard(card, sc) {
  card.style.removeProperty("--ld-fs");
  if (sc) { sc.style.removeProperty("height"); sc.hidden = false; }
  const over = () => card.scrollHeight - card.clientHeight;
  if (sc && over() > 0) sc.style.height = `${Math.max(70, sc.offsetHeight - over())}px`;
  for (let fs = 95; over() > 0 && fs >= 75; fs -= 5) card.style.setProperty("--ld-fs", String(fs / 100));
  if (sc && over() > 0) sc.hidden = true;
}

/** The comic panel on a card: Super-Blubb facing the villain – or, after the boss, both happy. */
function drawScene(c, villain, boss, theme, clean = false) {
  const ctx = c.getContext("2d");
  const W = c.width, H = c.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, theme.top); sky.addColorStop(1, theme.bottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#b9b2a5"; ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = "#a39b8d"; for (let x = 0; x < W; x += 24) ctx.fillRect(x + 3, H - 30, 18, 8);
  const tt = performance.now() / 1000;
  // hero left, jumping a little
  const hop = Math.abs(Math.sin(tt * 3)) * 8;
  drawHero(ctx, 130, H - 34 - hop, { face: 1, t: tt, scale: 3.4, air: hop > 3 });
  for (let i = 0; i < 4; i++) {
    const k = ((tt * 0.6 + i / 4) % 1);
    drawBubble(ctx, 200 + k * 160, 60 + Math.sin(tt * 3 + i) * 10 - k * 20, 8 + k * 6, tt + i);
  }
  const b = villain === "schmuddel"
    ? { kind: "schmuddel", x: 440, y: H - 34, hurt: 0, clean: clean ? 1 : 0 }
    : { kind: "staubig", x: 440, y: 92, hurt: 0, clean: clean ? 1 : 0 };
  ctx.save();
  ctx.translate(440, b.y); ctx.scale(1.35, 1.35); ctx.translate(-440, -b.y);
  drawBoss(ctx, b, tt, -1);
  ctx.restore();
  if (!boss && !clean) {
    // a couple of minions
    drawMonster(ctx, { type: "walker", x: 345, y: H - 34, r: 15, ph: 1, state: "alive" }, tt, -1);
    drawMonster(ctx, { type: "flyer", x: 520, y: 40, r: 14, ph: 2, state: "alive" }, tt, -1);
  }
}

/** The line under a level's result: the coin total and the next (or newly opened) look. */
export function coinNote(unlocked = []) {
  const n = coinTotal();
  const head = t("ld.coinsTotal", "🪙 {n} coins in total", { n });
  const look = (i) => t(LOOKS_AT[i].key, LOOKS_AT[i].de);
  if (unlocked.length) return `${head} · ${t("ld.lookNew", "New: {look}!", { look: look(unlocked[unlocked.length - 1]) })}`;
  const nx = nextLook(n);
  return nx ? `${head} · ${t("ld.lookNext", "{n} more for: {look}", { n: nx.left, look: look(nx.i) })}` : head;
}

/** The pause card over `host`: Weiter / Neu starten / Beenden. Used in town and in levels. */
export function pauseOverlay(host, { onResume, onRestart, onQuit }) {
  const el = document.createElement("div");
  el.className = "ld-pause";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", t("ld.pause", "Pause"));
  el.innerHTML = `<div class="ld-pause-card">
    <h3>⏸ ${esc(t("ld.pause", "Pause"))}</h3>
    <div class="ld-pause-btns">
      <button type="button" class="quiz-btn quiz-btn--primary" data-p="resume">${esc(t("ld.pauseResume", "Resume"))}</button>
      <button type="button" class="quiz-btn" data-p="restart">${esc(t("ld.pauseRestart", "Start over"))}</button>
      <button type="button" class="quiz-btn" data-p="quit">${esc(t("ld.pauseQuit", "Quit"))}</button>
    </div>
    <p class="ld-pause-keys">${esc(t("ld.pauseKeys", "P or Esc: resume"))}</p>
  </div>`;
  host.append(el);
  const fn = { resume: onResume, restart: onRestart, quit: onQuit };
  el.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => fn[b.dataset.p]()));
  return {
    el,
    get open() { return !el.hidden; },
    show() { el.hidden = false; el.querySelector("[data-p=resume]").focus({ preventScroll: true }); },
    hide() { el.hidden = true; },
  };
}
