// The clock of a lesson session (/lehrkraefte/unterricht): pure functions, no DOM, no
// Supabase, every one takes `now` (ms) so the tests can drive time by hand.
//
// Time comes from timestamps, never from counting ticks. A state is
//   { steps: [{ id, minutes }],     the Stunde's phases (from build(), not stored)
//     current,                      index into steps
//     stepMs: { [id]: ms },         finished running time per step
//     runningSince: ms | null,      the current step runs since then; null = paused
//     lastActiveAt: ms,             heartbeat: the page was alive at this moment
//     status: "active" | "paused" | "completed" }
// and the time of the running step is stepMs[id] + (now − runningSince).
//
// Closing or sleeping counts as a pause. A page that runs a session sends a heartbeat at
// least every 15 s (and on pagehide). When the next look at the state finds the last one
// more than GAP_MS ago (tab closed, laptop asleep, browser killed), only the time up to that
// heartbeat counts and the session is paused; the teacher continues with "Weiter".
// GAP_MS is generous because Chrome throttles timers in hidden tabs to about one a minute,
// and a teacher showing another window on the projector must not lose the clock.
// Going from the session page to a topic page in the same tab is a gap of a second or two.
//
// Nothing here ever moves to the next step on its own: overrun is shown, not acted on.
export const GAP_MS = 120_000;
export const HEARTBEAT_MS = 15_000;

const running = (s) => s.runningSince != null && s.status === "active";
const idOf = (s, i = s.current) => s.steps[i]?.id;

/** The moment the clock really reached: now, or the last heartbeat after a long gap. */
const reached = (s, now) => (now - s.lastActiveAt > GAP_MS ? s.lastActiveAt : now);

/** Running time not yet booked into stepMs. */
function live(s, now) {
  if (!running(s)) return 0;
  return Math.max(0, reached(s, now) - s.runningSince);
}

/** Time spent on step i (default: the current one). */
export function elapsed(s, now, i = s.current) {
  const id = idOf(s, i);
  return (s.stepMs[id] ?? 0) + (i === s.current ? live(s, now) : 0);
}

/** Time spent on the whole lesson so far, all steps together. */
export function lessonElapsed(s, now) {
  return s.steps.reduce((sum, st) => sum + (s.stepMs[st.id] ?? 0), 0) + live(s, now);
}

/** Planned length of step i in ms. */
export const planned = (s, i = s.current) => (s.steps[i]?.minutes ?? 0) * 60_000;

/** Time left in the current step; negative once it runs over. */
export const remaining = (s, now) => planned(s) - elapsed(s, now);

/** How far the current step is over its planned time (0 while it is not). */
export const overrun = (s, now) => Math.max(0, -remaining(s, now));

/** Planned start of each step in minutes from the start of the lesson (for the dial). */
export function plannedStarts(steps) {
  let at = 0;
  return steps.map((st) => { const from = at; at += st.minutes; return from; });
}

/** Moves the running time into stepMs; the result is paused at the moment reached. */
function book(s, now) {
  if (!running(s)) return { ...s };
  const id = idOf(s);
  const t = reached(s, now);
  return { ...s, stepMs: { ...s.stepMs, [id]: (s.stepMs[id] ?? 0) + Math.max(0, t - s.runningSince) }, runningSince: null };
}

/** A fresh state for a Stunde: step 0, nothing spent, paused until start(). */
export function create(steps, now) {
  return { steps, current: 0, stepMs: {}, runningSince: null, lastActiveAt: now, status: "paused" };
}

export function start(s, now) {
  if (s.status === "completed" || running(s)) return heartbeat(s, now);
  return { ...s, runningSince: now, lastActiveAt: now, status: "active", interrupted: false };
}
export const resume = start;

export function pause(s, now) {
  if (s.status === "completed") return s;
  return { ...book(s, now), status: "paused", lastActiveAt: now };
}

/** Go to step i. A running clock keeps running and from now counts for the new step. */
export function goTo(s, i, now) {
  if (i < 0 || i >= s.steps.length || i === s.current || s.status === "completed") return s;
  const wasRunning = running(s) && now - s.lastActiveAt <= GAP_MS;
  const b = book(s, now);
  return { ...b, current: i, runningSince: wasRunning ? now : null, status: wasRunning ? "active" : "paused", lastActiveAt: now };
}

export const next = (s, now) => goTo(s, s.current + 1, now);
export const prev = (s, now) => goTo(s, s.current - 1, now);

export function complete(s, now) {
  return { ...book(s, now), status: "completed", lastActiveAt: now };
}

/**
 * The page is alive at `now`. After a long gap the session is paused at its last
 * heartbeat (see the top of this file); `interrupted` tells the page to say so.
 */
export function heartbeat(s, now) {
  if (running(s) && now - s.lastActiveAt > GAP_MS) {
    // Booked up to the old heartbeat; the pause itself is news as of now, so this copy
    // wins over any older one (newer() compares lastActiveAt).
    return { ...book(s, now), status: "paused", interrupted: true, lastActiveAt: now };
  }
  return { ...s, lastActiveAt: now };
}

/* -------------------------------------------------------------- storage ---- */

const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
const ms = (v) => (v == null ? null : Date.parse(v));

/** The columns of public.unterrichtssitzungen this state writes. */
export function toRow(s) {
  const stepMs = {};
  for (const [id, v] of Object.entries(s.stepMs)) if (v > 0) stepMs[id] = Math.round(v);
  return {
    current_step: s.current,
    step_ms: stepMs,
    running_since: running(s) ? iso(s.runningSince) : null,
    last_active_at: iso(s.lastActiveAt),
    status: s.status,
    ...(s.status === "completed" ? { completed_at: iso(s.lastActiveAt) } : {}),
  };
}

/** A stored row (database or local copy) back into a state for these steps. */
export function fromRow(row, steps) {
  const stepMs = {};
  for (const st of steps) {
    const v = Number(row.step_ms?.[st.id]);
    if (v > 0) stepMs[st.id] = v;
  }
  const current = Math.min(Math.max(0, Number(row.current_step) || 0), Math.max(0, steps.length - 1));
  const status = ["active", "paused", "completed"].includes(row.status) ? row.status : "paused";
  const runningSince = status === "active" ? ms(row.running_since) : null;
  return {
    steps,
    current,
    stepMs,
    runningSince,
    lastActiveAt: ms(row.last_active_at) ?? Date.now(),
    status: status === "active" && runningSince == null ? "paused" : status,
  };
}

/** A saved row, opened again at `now`: its clock, with closing/sleeping counted as a pause. */
export const restore = (row, steps, now) => heartbeat(fromRow(row, steps), now);

/**
 * Which of two copies of the same session is newer: the one in this browser (written on
 * every change and on pagehide, so it can be ahead of the last save that reached the
 * server) or the server's. Both carry last_active_at from the same teacher's clock.
 * A completed copy always wins: an ended lesson does not come back.
 */
export function newer(local, server) {
  if (!local) return server;
  if (!server) return local;
  if (server.status === "completed") return server;
  if (local.status === "completed") return local;
  return (ms(local.last_active_at) ?? 0) > (ms(server.last_active_at) ?? 0) ? local : server;
}

/* ------------------------------------------------------------ formatting ---- */

/** 754000 → "12:34", 3_725_000 → "62:05". Rounds up, so 0:01 left shows until it is over. */
export function mmss(t) {
  const sec = Math.max(0, Math.ceil(t / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Overrun as the bar and the clock say it: "+1 Min." from the first second over. */
export const overText = (t) => `+${Math.max(1, Math.ceil(t / 60_000))} min`;
