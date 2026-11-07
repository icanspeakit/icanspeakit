// Quaki springt: the physics. Fixed 120 Hz, fully deterministic: only + − × ÷ on numbers that
// come from the tower and the input log, no Math.random, no frame time, no trig. The same
// input log gives the same run on every device, which is what makes Duell links, ghosts and
// the route test (tests/quaki-springt/route.json) fair. No DOM here: scripts/quaki-turm.mjs
// runs the same code in Node.
//
// World: tiles of 20, a room is 18 × 32 tiles (360 × 640, exactly 9:16), y grows downwards and
// the top of the tower is y = 0. Tiles (src/data/quakiSpringt/turm.json):
//   .  air          #  stone       =  wood (solid like stone, drawn differently)
//   /  slope ↗      \  slope ↘     a b c  lily pads of the room's question (one-way, can sink)
//   ?  sign         F  flag        S  start         Z  goal (the roof)
// Tiles under a slope are part of the ramp: the feet ride the slope's surface, the box ignores
// them (otherwise the corners would snag on the fill).

export const P = {
  DT: 1 / 120,
  TILE: 20,
  COLS: 18,
  ROWS: 32,
  ROOM_W: 360,
  ROOM_H: 640,
  METER: 64,
  W: 22, // hitbox
  H: 22,
  G: 1800,
  CHARGE_MAX: 108, // ticks = 0.9 s, then he jumps by himself
  VY0: 330, // take-off speed up at no charge, + VY1 at full charge
  VY1: 540,
  VX0: 60, // sideways, only with a direction
  VX1: 150,
  FALL_MAX: 960, // 8 per tick: less than half the box and any tile, so nothing tunnels
  BONK: 0.6, // a wall in the air sends him back at 60 %
  SLIDE_A: 900, // down a 45° slope
  SLIDE_MAX: 300,
  SINK_DELAY: 36, // a wrong pad holds 0.3 s, then sinks
  SINK_BACK: 360, // and comes back up 3 s later
  STURZ_MIN: 128, // landing ≥ 2 m below the take-off counts as a fall
  QUAAK_AT: 384, // 6 m of free fall: the big „QUAAAK!“
};

const SOLID = new Set(["#", "="]);
const PADS = "abc";

/** A tower → its tile grid, pads, signs, flags, start and goal. Rooms run bottom to top in the
 *  data; the grid's row 0 is the top of the tower. */
export function buildWorld(turm) {
  const rooms = []; // bottom first: { level, index (in its level), global }
  for (const [li, lv] of turm.levels.entries()) lv.rooms.forEach((rows, i) => rooms.push({ level: li, index: i, rows }));
  const n = rooms.length;
  const R = n * P.ROWS;
  const grid = new Array(R);
  const pads = []; // { room, slot, c0, c1, r, y, sinkAt, downUntil }
  const signs = []; // { room, c, r, x, y }
  const flags = []; // { level, room, x, y } — y = the ground he stands on
  let start = null;
  let goal = null;
  rooms.forEach((room, gi) => {
    // Room gi (from the bottom) covers grid rows (n-1-gi)*32 … +31.
    const top = (n - 1 - gi) * P.ROWS;
    room.global = gi;
    room.y = top * P.TILE;
    room.rows.forEach((line, ri) => {
      const r = top + ri;
      const row = (grid[r] = new Array(P.COLS));
      for (let c = 0; c < P.COLS; c++) {
        const ch = line[c] ?? ".";
        row[c] = ch;
        const x = c * P.TILE, y = r * P.TILE;
        if (ch === "?") signs.push({ room: gi, c, r, x, y });
        else if (ch === "F") flags.push({ level: room.level, room: gi, x: x + P.TILE / 2, y: y + P.TILE });
        else if (ch === "S") start = { x: x + P.TILE / 2, y: y + P.TILE };
        else if (ch === "Z") goal = { x, y, w: P.TILE, h: P.TILE };
      }
    });
  });
  // Pads: runs of the same letter in a row.
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < P.COLS; c++) {
      const ch = grid[r][c];
      if (!PADS.includes(ch)) continue;
      const last = pads.at(-1);
      if (last && last.r === r && last.c1 === c - 1 && last.ch === ch) { last.c1 = c; continue; }
      pads.push({ room: n - 1 - Math.floor(r / P.ROWS), slot: PADS.indexOf(ch), ch, r, c0: c, c1: c, y: r * P.TILE });
    }
  }
  // Ramp fill: a solid tile right under a slope belongs to the ramp.
  const under = new Set();
  for (let r = 1; r < R; r++) for (let c = 0; c < P.COLS; c++) {
    if (SOLID.has(grid[r][c]) && (grid[r - 1][c] === "/" || grid[r - 1][c] === "\\")) under.add(r * P.COLS + c);
  }
  return { rooms, grid, R, height: R * P.TILE, pads, signs, flags: flags.sort((a, b) => b.y - a.y), start, goal, under };
}

/** A fresh run on a world. `correct(room, slot)` says whether a pad holds; `sanft` turns the flags on. */
export function createSim(world, { correct = () => true, sanft = false } = {}) {
  const { grid, R, pads, under } = world;
  // Pad state lives in the sim, not the world: the ghost runs on the same world.
  const padAt = new Map(); // r*COLS+c → pad index
  const sinkAt = pads.map(() => -1);
  const downUntil = pads.map(() => -1);
  pads.forEach((p, i) => { for (let c = p.c0; c <= p.c1; c++) padAt.set(p.r * P.COLS + c, i); });
  const s = {
    tick: 0,
    x: world.start.x - P.W / 2,
    y: world.start.y - P.H,
    vx: 0,
    vy: 0,
    mode: "ground", // ground | air | slide
    charge: -1, // ticks held, -1 = not charging
    face: 1,
    aim: 0, // direction while charging; the jump takes it
    input: 0, // bits: 1 down, 2 left, 4 right
    takeoffY: 0,
    apexY: 0,
    quaak: false,
    flag: -1, // index into world.flags (Sanft)
    won: false,
    events: [],
    // stats the game reads
    jumps: 0,
    sturze: 0,
    rekord: 0, // longest drop, units
    maxHeight: 0, // units above the ground
  };
  s.takeoffY = s.apexY = s.y;

  const tileAt = (c, r) => (c < 0 || c >= P.COLS ? "#" : r < 0 ? "." : r >= R ? "#" : grid[r][c]);
  const isSlope = (ch) => ch === "/" || ch === "\\";
  /** Blocks the box (not slopes, not ramp fill, pads only from above). */
  const boxSolid = (c, r) => SOLID.has(tileAt(c, r)) && !under.has(r * P.COLS + c);
  const padSolid = (c, r) => {
    const i = padAt.get(r * P.COLS + c);
    return i !== undefined && !(downUntil[i] > s.tick);
  };
  const surface = (c, r, x) => {
    // y of a slope tile's surface at x
    const ch = tileAt(c, r);
    const lx = x - c * P.TILE;
    return r * P.TILE + (ch === "/" ? P.TILE - lx : lx);
  };
  const ev = (type, data) => s.events.push({ type, tick: s.tick, ...data });

  function overlapX() {
    // Solid tiles the box overlaps; returns the blocking column or null.
    const r0 = Math.floor(s.y / P.TILE), r1 = Math.floor((s.y + P.H - 0.001) / P.TILE);
    const c0 = Math.floor(s.x / P.TILE), c1 = Math.floor((s.x + P.W - 0.001) / P.TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (boxSolid(c, r)) return c;
    return null;
  }

  function leaveGround() {
    s.mode = "air";
    s.takeoffY = s.y;
    s.apexY = s.y;
    s.quaak = false;
  }

  function land(y) {
    s.y = y;
    s.vy = 0;
    s.vx = 0;
    s.mode = "ground";
    const drop = s.y - s.takeoffY;
    if (drop >= P.STURZ_MIN) {
      s.sturze++;
      if (drop > s.rekord) s.rekord = drop;
      ev("sturz", { drop });
    }
    ev("land", { drop, fall: s.y - s.apexY });
    padUnder();
  }

  /** Standing on a pad: a wrong one starts to sink. */
  function padUnder() {
    const r = Math.floor((s.y + P.H + 1) / P.TILE);
    const c0 = Math.floor(s.x / P.TILE), c1 = Math.floor((s.x + P.W - 0.001) / P.TILE);
    for (let c = c0; c <= c1; c++) {
      const i = padAt.get(r * P.COLS + c);
      if (i === undefined || downUntil[i] > s.tick) continue;
      const p = pads[i];
      const ok = correct(p.room, p.slot);
      ev("pad", { room: p.room, slot: p.slot, ok, pad: i });
      if (!ok && sinkAt[i] < 0) sinkAt[i] = s.tick + P.SINK_DELAY;
      return;
    }
  }

  function supported() {
    // Anything under the feet: box-solid, a standing pad, or ramp fill.
    const r = Math.floor((s.y + P.H + 1) / P.TILE);
    const c0 = Math.floor(s.x / P.TILE), c1 = Math.floor((s.x + P.W - 0.001) / P.TILE);
    for (let c = c0; c <= c1; c++) if (boxSolid(c, r) || padSolid(c, r)) return true;
    return false;
  }

  function jump() {
    const c = s.charge / P.CHARGE_MAX;
    const dir = s.aim;
    s.vy = -(P.VY0 + P.VY1 * c);
    s.vx = dir * (P.VX0 + P.VX1 * c);
    if (dir) s.face = dir;
    s.charge = -1;
    s.jumps++;
    leaveGround();
    ev("jump", { c, dir });
  }

  /** Bottom-centre inside a slope tile, below its surface → ride it. Returns true if on a slope. */
  function slopeSnap() {
    const fx = s.x + P.W / 2, fy = s.y + P.H;
    const c = Math.floor(fx / P.TILE);
    for (const r of [Math.floor((fy - 0.001) / P.TILE), Math.floor((fy + 2) / P.TILE)]) {
      if (!isSlope(tileAt(c, r))) continue;
      const sy = surface(c, r, fx);
      if (fy >= sy - 2) {
        s.y = sy - P.H;
        return tileAt(c, r);
      }
    }
    return null;
  }

  function step() {
    s.tick++;
    s.events.length = 0;
    const down = (s.input & 1) === 1;
    const dir = s.input & 2 ? -1 : s.input & 4 ? 1 : 0;
    if (dir && s.mode === "ground" && s.charge < 0) s.face = dir;

    // Pads: sink when due, come back later.
    for (let i = 0; i < pads.length; i++) {
      if (sinkAt[i] >= 0 && s.tick >= sinkAt[i]) {
        sinkAt[i] = -1;
        downUntil[i] = s.tick + P.SINK_BACK;
        ev("sink", { room: pads[i].room, slot: pads[i].slot, pad: i });
      }
    }

    if (s.mode === "ground") {
      if (!supported()) leaveGround();
      else if (s.charge >= 0) {
        if (down) s.aim = dir;
        if (!down) jump();
        else if (++s.charge >= P.CHARGE_MAX) { s.charge = P.CHARGE_MAX; jump(); }
      } else if (down) {
        s.charge = 0;
        s.aim = dir;
        ev("charge");
      }
    }

    if (s.mode === "slide") {
      const ch = slopeSnap();
      if (!ch) leaveGround();
      else {
        const a = ch === "/" ? -P.SLIDE_A : P.SLIDE_A;
        s.vx += a * P.DT;
        if (s.vx > P.SLIDE_MAX) s.vx = P.SLIDE_MAX;
        if (s.vx < -P.SLIDE_MAX) s.vx = -P.SLIDE_MAX;
        s.x += s.vx * P.DT;
        // A wall at mid height stops the slide.
        const mr = Math.floor((s.y + P.H / 2) / P.TILE);
        const side = s.vx > 0 ? Math.floor((s.x + P.W) / P.TILE) : Math.floor(s.x / P.TILE);
        if (boxSolid(side, mr)) {
          s.x = s.vx > 0 ? side * P.TILE - P.W : (side + 1) * P.TILE;
          s.vx = 0;
        }
        if (!slopeSnap()) {
          // Off the end of the ramp: flat ground or air.
          if (supported()) land(Math.floor((s.y + P.H + 1) / P.TILE) * P.TILE - P.H);
          else { s.mode = "air"; s.vy = Math.abs(s.vx); s.apexY = s.y; }
        } else if (s.vx === 0) land(s.y);
      }
    }

    if (s.mode === "air") {
      const wasUp = s.vy < 0;
      s.vy += P.G * P.DT;
      if (s.vy > P.FALL_MAX) s.vy = P.FALL_MAX;
      if (wasUp && s.vy >= 0) s.apexY = s.y;
      // x
      s.x += s.vx * P.DT;
      if (s.x < 0) { s.x = 0; bonk(); }
      if (s.x + P.W > P.ROOM_W) { s.x = P.ROOM_W - P.W; bonk(); }
      const bc = overlapX();
      if (bc !== null) {
        s.x = s.vx > 0 ? bc * P.TILE - P.W : (bc + 1) * P.TILE;
        bonk();
      }
      // y
      const prevBottom = s.y + P.H;
      s.y += s.vy * P.DT;
      const c0 = Math.floor(s.x / P.TILE), c1 = Math.floor((s.x + P.W - 0.001) / P.TILE);
      if (s.vy > 0) {
        const r = Math.floor((s.y + P.H - 0.001) / P.TILE);
        let hit = false;
        for (let c = c0; c <= c1; c++) {
          if (boxSolid(c, r) || (padSolid(c, r) && prevBottom <= r * P.TILE + 0.001)) { hit = true; break; }
        }
        if (hit) land(r * P.TILE - P.H);
        else {
          const ch = slopeSnap();
          if (ch) {
            s.mode = "slide";
            const dirDown = ch === "/" ? -1 : 1;
            s.vx = dirDown * Math.max(Math.abs(s.vx) * 0.5, 60);
            s.vy = 0;
            ev("slide");
          }
        }
      } else if (s.vy < 0) {
        const r = Math.floor(s.y / P.TILE);
        for (let c = c0; c <= c1; c++) {
          if (boxSolid(c, r)) {
            s.y = (r + 1) * P.TILE;
            s.vy = 0;
            ev("bonk", { ceiling: true });
            break;
          }
        }
      }
      if (s.mode === "air") {
        const fall = s.y - s.apexY;
        if (!s.quaak && s.vy > 0 && fall >= P.QUAAK_AT) {
          s.quaak = true;
          ev("quaak");
        }
      }
    }

    // Sanft: the last flag catches him.
    if (sanft && s.flag >= 0) {
      const f = world.flags[s.flag];
      if (s.mode === "air" && s.vy > 0 && s.y + P.H > f.y + 2 * P.TILE) {
        ev("catch", { level: f.level });
        s.x = f.x - P.W / 2;
        s.vx = 0;
        land(f.y - P.H);
      }
    }
    // Flags reached (standing near one that is higher than the current).
    if (s.mode === "ground") {
      for (let i = 0; i < world.flags.length; i++) {
        const f = world.flags[i];
        if (i > s.flag && Math.abs(s.y + P.H - f.y) < 1 && Math.abs(s.x + P.W / 2 - f.x) < 3 * P.TILE) {
          s.flag = i;
          ev("flag", { level: f.level });
        }
      }
    }
    const h = world.height - (s.y + P.H);
    if (h > s.maxHeight) s.maxHeight = h;
    const g = world.goal;
    if (!s.won && g && s.x < g.x + g.w && s.x + P.W > g.x && s.y < g.y + g.h && s.y + P.H > g.y) {
      s.won = true;
      ev("win");
    }
  }

  function bonk() {
    s.vx = -s.vx * P.BONK;
    ev("bonk", {});
  }

  return {
    s,
    /** Input bits for the next ticks: 1 = held, 2 = left, 4 = right. */
    setInput(bits) { s.input = bits; },
    /** 0 = up, 0…1 = sinking (wait), -1 = under water. For drawing. */
    padState(i) {
      if (downUntil[i] > s.tick) return -1;
      return sinkAt[i] >= 0 ? 1 - (sinkAt[i] - s.tick) / P.SINK_DELAY : 0;
    },
    /** Put him down somewhere (the route solver starts from every landing spot). */
    place(x, y) { s.x = x; s.y = y; s.vx = s.vy = 0; s.mode = "ground"; s.charge = -1; s.takeoffY = s.apexY = y; },
    step,
    /** Height of his feet above the ground, in metres. */
    height: () => (world.height - (s.y + P.H)) / P.METER,
    room: () => world.rooms.length - 1 - Math.floor((s.y + P.H / 2) / P.ROOM_H),
  };
}

/** Plays an input log ([[tick, bits], …]) onto a sim up to `until` ticks. */
export function replay(sim, log, until) {
  let i = 0;
  while (sim.s.tick < until) {
    while (i < log.length && log[i][0] <= sim.s.tick + 1) sim.setInput(log[i++][1]);
    sim.step();
    if (sim.s.won) break;
  }
  return sim;
}
