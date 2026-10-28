// One running lesson session in this tab: the clock state (timer.js), the saver
// (speichern.js) and the server (sitzung.js) tied together. Both the session page and the
// session bar on other pages drive it; the views (leiste.js, uhr.js, the step screen)
// only listen to change events and call the actions.
//
// Saves: at once on a step change, pause, resume and end; while running, a heartbeat every
// 15 s also goes to the server (the "at least every 15 s" of the brief). The local copy is
// written with every save and on pagehide, so a closed tab loses nothing (see speichern.js).
import * as T from "./timer.js";
import { createSaver, writeLocal, clearLocal, LOCAL_KEY } from "./speichern.js";
import { sitzungSpeichern } from "./sitzung.js";

/**
 * @param {{ id: string, key: object, gruppe: string, steps: Array<{id, name, minutes}>, row: object, extra?: object }} s
 *        what readLocal() returns, or the same built from a freshly loaded session
 * @param opts  the teacher's defaults; the learner's Stunde (lernen.js) passes its own:
 *   send(row)       where a save goes (default: the teacher's unterrichtssitzungen row)
 *   localKey        the localStorage key of the local copy (default "da:unterricht")
 *   merge(a, b)     how `extra` (state beside the clock, e.g. per-step status) from another
 *                   tab joins this one's; without it, `extra` is not used
 */
export function createSteuerung({ id, key, gruppe, steps, row, extra: extra0 = null, klasse = null }, { send, localKey = LOCAL_KEY, merge = null } = {}) {
  let state = T.restore(row, steps, Date.now());
  let extra = extra0;
  const listeners = new Set();
  // `klasse`: the learner's Stunde for a class (an Aufgabe), carried along in the local copy.
  const snapshot = () => ({ id, key, gruppe, steps, row: T.toRow(state), ...(extra ? { extra } : {}), ...(klasse ? { klasse } : {}) });
  const saver = createSaver({
    send: send ? (r) => send(r, extra) : (r) => sitzungSpeichern(id, r),
    local: () => (state.status === "completed" ? clearLocal(undefined, localKey) : writeLocal(snapshot(), undefined, localKey)),
  });

  const emit = () => listeners.forEach((fn) => fn(state));
  const set = (next, { save = true, delay = 0 } = {}) => {
    if (next === state) return;
    state = next;
    if (save) saver.push(T.toRow(state), delay);
    emit();
  };

  // A long gap found on opening (tab was closed, laptop slept): the pause is real, save it.
  if (state.interrupted) saver.push(T.toRow(state), 0);
  else writeLocal(snapshot(), undefined, localKey);

  // The clock face redraws every second; the heartbeat goes out every 15 s.
  const tick = setInterval(emit, 1000);
  const beat = setInterval(() => {
    if (state.status !== "active") return;
    set(T.heartbeat(state, Date.now()));
  }, T.HEARTBEAT_MS);
  // Waking up from sleep: look at once, so a long gap turns into a pause before anything else.
  const wake = () => {
    if (document.visibilityState === "visible" && state.status === "active") set(T.heartbeat(state, Date.now()));
  };
  document.addEventListener("visibilitychange", wake);
  const leave = () => {
    if (state.status === "active") state = T.heartbeat(state, Date.now());
    if (state.status !== "completed") writeLocal(snapshot(), undefined, localKey);
    saver.flush();
  };
  addEventListener("pagehide", leave);
  // Another tab of the same lesson (a material opened in a new tab) moved on, paused or
  // ended: follow it, without saving again. Every change writes the local copy, and the
  // browser tells the other tabs of this site.
  const follow = (e) => {
    if (e.key !== localKey || state.status === "completed") return;
    if (e.newValue == null) {
      set({ ...T.complete(state, Date.now()) }, { save: false });
      return;
    }
    try {
      const v = JSON.parse(e.newValue);
      if (v?.id !== id || !v.row) return;
      if (merge && v.extra) {
        const joined = merge(extra, v.extra);
        if (JSON.stringify(joined) !== JSON.stringify(extra)) { extra = joined; emit(); }
      }
      if (T.newer(T.toRow(state), v.row) === v.row) set(T.restore(v.row, steps, Date.now()), { save: false });
    } catch {}
  };
  addEventListener("storage", follow);

  const act = (fn) => () => set(fn(state, Date.now()));
  return {
    id, key, gruppe, steps,
    get state() { return state; },
    get extra() { return extra; },
    /** Changes the state beside the clock (fn(extra) → new extra) and saves it. */
    patch(fn) {
      const next = fn(extra);
      if (next === extra) return;
      extra = next;
      saver.push(T.toRow(state), 0);
      emit();
    },
    get saveFailed() { return saver.failed; },
    on(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    next: act(T.next),
    prev: act(T.prev),
    goTo: (i) => set(T.goTo(state, i, Date.now())),
    pause: act(T.pause),
    resume: act(T.resume),
    toggle() { (state.status === "active" ? this.pause : this.resume)(); },
    async end() {
      set(T.complete(state, Date.now()));
      clearLocal(undefined, localKey);
      await saver.flush();
    },
    /** Takes a newer copy from the server (another tab or device moved on). */
    adopt(serverRow) {
      const best = T.newer(T.toRow(state), serverRow);
      if (best === serverRow) set(T.restore(serverRow, steps, Date.now()), { save: false });
    },
    destroy() {
      clearInterval(tick);
      clearInterval(beat);
      document.removeEventListener("visibilitychange", wake);
      removeEventListener("pagehide", leave);
      removeEventListener("storage", follow);
      listeners.clear();
    },
  };
}

/** The numbers every view shows, read off the state at `now`. */
export function view(state, now = Date.now()) {
  const step = state.steps[state.current];
  const over = T.overrun(state, now);
  return {
    step,
    index: state.current,
    count: state.steps.length,
    running: state.status === "active",
    completed: state.status === "completed",
    interrupted: !!state.interrupted,
    lessonMs: T.lessonElapsed(state, now),
    totalMs: state.steps.reduce((s, st) => s + st.minutes, 0) * 60_000,
    remaining: T.mmss(Math.max(0, T.remaining(state, now))),
    over: over > 0 ? T.overText(over) : "",
  };
}
