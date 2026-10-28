// The learner's Stunde in the browser: the teacher's engine (steuerung.js) under its own
// local key (lernen.js LERN_KEY), plus the listener that turns what happens on a page into
// step progress. Saved on the device always, and – for a signed-in learner – to the server
// too (Tier 2, lernServer.js, loaded only when a session cookie exists).
//
// There is no Pause for a learner. The clock stops by itself when the tab is closed or
// asleep (timer.js) and runs again as soon as a page of the Stunde is open – unless the
// learner chose „Später weiter“ (extra.parked), which stops it until /stunde is opened again.
import { createSteuerung } from "./steuerung.js";
import { readLocal, writeLocal, clearLocal } from "./speichern.js";
import { ARCHIV_KEY, LERN_KEY, keyText, mergeExtra, record } from "./lernen.js";

export const readLern = () => readLocal(undefined, LERN_KEY);
export const clearLern = () => clearLocal(undefined, LERN_KEY);

const mergeParked = (a, b) => ({ ...mergeExtra(a, b), parked: b?.parked ?? a?.parked ?? false });

/** Where a save goes besides the device: the server, for a signed-in learner. */
function serverSend(local) {
  return async (row, extra) => {
    if (!/(^|;\s*)sb-[^=]*-auth-token[^=]*=/.test(document.cookie)) return;
    const { saveLernstunde } = await import("./lernServer.js");
    await saveLernstunde({ id: local.id, key: local.key, klasse: local.klasse ?? null, steps: local.steps, row, extra });
  };
}

export function createLernSteuerung(local) {
  const ctl = createSteuerung(local, { send: serverSend(local), localKey: LERN_KEY, merge: mergeParked });
  ctl.on((state) => {
    if (state.status === "paused" && !ctl.extra?.parked) ctl.resume();
  });
  return ctl;
}

/** Page events → the current step's progress (lernen.js record). Returns the way to stop. */
export function listenSteps(ctl) {
  const add = (ev) => {
    if (ctl.state.status === "completed") return;
    ctl.patch((x) => record(x, ctl.state.current, ev));
  };
  const handlers = {
    // A checked answer on a topic page (grammarWorkspace.js): which page, which item, right?
    "da:answer": (d) => d?.topic && d.ex != null && d.item != null && add({ type: "answer", topic: `/${d.topic}`, key: `${d.ex}/${d.item}`, ok: !!d.ok }),
    // A round of word cards finished (wortschatz-app.js).
    "da:round": (d) => d?.kind === "karten" && add({ type: "karten" }),
    // A presentation seen to its end or its whole rule opened (praesentationDeck.js).
    "da:deck-end": (d) => d?.topic && add({ type: "deck", topic: d.topic }),
    // An exam part's result reached (examApp.js).
    "da:set-end": () => add({ type: "set" }),
  };
  const fns = Object.entries(handlers).map(([type, fn]) => {
    const h = (e) => fn(e.detail ?? {});
    addEventListener(type, h);
    return [type, h];
  });
  return () => fns.forEach(([type, h]) => removeEventListener(type, h));
}

/* ------------------------------------------------- other Stunden on device ---- */

function readArchiv() {
  try { return JSON.parse(localStorage.getItem(ARCHIV_KEY) ?? "{}") ?? {}; } catch { return {}; }
}

/** Keeps a copy of a Stunde under its plan key, to pick it up again later. */
export function archive(snapshot) {
  if (!snapshot?.key) return;
  const all = readArchiv();
  all[keyText(snapshot.key)] = { ...snapshot, savedAt: Date.now() };
  // The 30 most recent are plenty for one learner.
  const keep = Object.entries(all).sort(([, a], [, b]) => b.savedAt - a.savedAt).slice(0, 30);
  try { localStorage.setItem(ARCHIV_KEY, JSON.stringify(Object.fromEntries(keep))); } catch {}
}

export const fromArchive = (key) => readArchiv()[keyText(key)] ?? null;

/** Makes `snapshot` the running Stunde (the one the bar follows). */
export const makeCurrent = (snapshot) => writeLocal(snapshot, undefined, LERN_KEY);

/** Every Stunde this device holds: the running one first, then the archive (newest first). */
export function deviceSnapshots() {
  const run = readLern();
  const rest = Object.values(readArchiv()).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  return [...(run ? [run] : []), ...rest];
}
