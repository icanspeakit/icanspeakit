// A short burst of confetti for a right answer on the phone. One canvas over the page,
// removed when the last piece has fallen; no library. Skipped under reduced motion.

const COLORS = ["#1f8a70", "#d9731c", "#2f6fdb", "#8a4bd6", "#f2c94c", "#eb5757"];

export function confetti({ count = 110, duration = 2200 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.append(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = (canvas.width = innerWidth * dpr);
  const h = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext("2d");

  // Two fountains from the lower corners, thrown up and inwards.
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const angle = (left ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
    const speed = (14 + Math.random() * 10) * dpr;
    return {
      x: left ? 0 : w, y: h * 0.85,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: (6 + Math.random() * 6) * dpr,
      rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length],
    };
  });

  const start = performance.now();
  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - duration * 0.6) / (duration * 0.4));
    for (const p of pieces) {
      p.vy += 0.45 * dpr;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < duration) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

/* The podium's finale: bursts from the corners every few seconds and confetti raining from
   the top the whole time, fluttering as it falls — about ten seconds, like a show's end.
   Returns a stop function (a new game starts before it ends). Nothing under reduced motion. */
export function confettiShow({ duration = 10000 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const timers = [0, 1600, 3400, 5600, 7800].filter((ms) => ms < duration - 1500)
    .map((ms, i) => setTimeout(() => confetti({ count: i === 0 ? 240 : 140, duration: 3200 }), ms));

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998";
  document.body.append(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = (canvas.width = innerWidth * dpr);
  const h = (canvas.height = innerHeight * dpr);
  const ctx = canvas.getContext("2d");
  const pieces = [];
  const spawn = () => pieces.push({
    x: Math.random() * w, y: -20 * dpr,
    vy: (1.6 + Math.random() * 1.8) * dpr, sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.02 + Math.random() * 0.03, size: (7 + Math.random() * 7) * dpr,
    rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  });
  const start = performance.now();
  let stopped = false;
  function frame(now) {
    const t = now - start;
    if (stopped) return canvas.remove();
    // Heavy at first, thinning out over the last third.
    const rate = t < duration * 0.66 ? 4 : t < duration ? 1 : 0;
    for (let i = 0; i < rate; i++) spawn();
    ctx.clearRect(0, 0, w, h);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.sway += p.swaySpeed;
      p.y += p.vy;
      p.x += Math.sin(p.sway) * 1.2 * dpr;
      p.rot += p.spin;
      if (p.y > h + 30 * dpr) { pieces.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.sway * 2)); // the flutter: a piece turning in the air
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < duration || pieces.length) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
  return () => { stopped = true; timers.forEach(clearTimeout); };
}
