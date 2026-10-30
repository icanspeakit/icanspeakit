// Super-Blubb's coins (collected in the levels, action.js) and what they buy: nothing to
// spend – three little looks for the hero that open at a total, on this device. localStorage
// "ld-coins" is the total of all coins ever. Storage may fail: then it is simply 0.
const KEY = "ld-coins";

/** The looks, in the order they open: `at` coins in total. */
export const LOOKS_AT = [
  { at: 15, key: "ld.lookParty", de: "party hat" },
  { at: 40, key: "ld.lookCrown", de: "crown" },
  { at: 80, key: "ld.lookCape", de: "golden cape" },
];

let total = null;
export function coinTotal() {
  if (total == null) { try { total = Math.max(0, Number(localStorage.getItem(KEY)) || 0); } catch { total = 0; } }
  return total;
}
/** How many looks are open (0–3). */
export const lookLevel = (n = coinTotal()) => LOOKS_AT.filter((l) => n >= l.at).length;
/** The look being worn: { hat, cape } or null. */
export function lookOf(n = coinTotal()) {
  const k = lookLevel(n);
  return k ? { hat: k === 1 ? "party" : "crown", cape: k >= 3 ? "gold" : null } : null;
}
/** The next look: { at, left, name } or null when all are open. */
export function nextLook(n = coinTotal()) {
  const l = LOOKS_AT.find((x) => n < x.at);
  return l ? { at: l.at, left: l.at - n, i: LOOKS_AT.indexOf(l) } : null;
}
/** Adds coins to the total; returns the looks newly opened (their indexes). */
export function addCoins(n) {
  const before = lookLevel();
  total = coinTotal() + n;
  try { localStorage.setItem(KEY, String(total)); } catch {}
  const after = lookLevel();
  return Array.from({ length: after - before }, (_, k) => before + k);
}

/** Draws the look on the hero (inside drawHero's transform: head top is about y -44). */
export function drawLook(ctx, look) {
  if (!look) return;
  if (look.hat === "party") {
    ctx.fillStyle = "#ec4899";
    ctx.beginPath(); ctx.moveTo(-7, -41); ctx.lineTo(1, -58); ctx.lineTo(9, -41); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.arc(1, -58, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-4.5, -47); ctx.lineTo(6.5, -47); ctx.moveTo(-2.5, -52); ctx.lineTo(4.5, -52); ctx.stroke();
    ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 1.6;
  } else if (look.hat === "crown") {
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(-9, -40); ctx.lineTo(-10, -52); ctx.lineTo(-5, -47); ctx.lineTo(0, -55); ctx.lineTo(5, -47); ctx.lineTo(10, -52); ctx.lineTo(9, -40);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(0, -44, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}
