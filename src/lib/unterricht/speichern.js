// The parts of saving a lesson session that need neither Supabase nor a page: the plan key,
// the copy in localStorage, the saver's queue and the progress per group. Split from
// sitzung.js so `node --test` can load them (tests/unterricht/).
//
// The copy in localStorage ("da:unterricht") does two jobs:
//   - It tells every page of the site that a lesson is running, so the Layout loads the
//     session bar (src/lib/unterricht/leiste.js) without asking Supabase on every visit.
//   - It is written on every change and on pagehide, before the server hears of it. When
//     the tab closes mid-save, the next page finds the newer state here and pushes it
//     (timer.newer decides).
// It carries what the bar needs to draw without the plan data: the group's name, the
// Stunde's steps (id, name, minutes), and the stored row.
export const LOCAL_KEY = "da:unterricht";
// The learner's Stunde (/stunde, lernen.js) uses the same functions under its own key, so a
// teacher and a learner session on one device never touch each other.
const UUID = /^[0-9a-f-]{36}$/i;
export const isId = (id) => UUID.test(String(id ?? ""));

/** The plan key of a session: what build() needs to make its Stunde again. */
export const keyOf = (r) => ({ niveau: r.niveau, block: Number(r.block), stunden: Number(r.stunden), stunde: Number(r.stunde), minuten: Number(r.minuten) });

/** Plan key from URL parameters (?niveau=a1-1&block=1&stunden=3&stunde=1&min=90), or null. */
export function keyFromParams(q) {
  const k = {
    niveau: q.get("niveau") ?? "",
    block: Number(q.get("block")),
    stunden: Number(q.get("stunden")),
    stunde: Number(q.get("stunde")),
    minuten: Number(q.get("min")),
  };
  const ok = /^[abc][12](-[12])?$/.test(k.niveau) && k.block >= 1 && k.stunden >= 1 && k.stunde >= 1
    && k.stunde <= k.stunden && k.minuten >= 30 && k.minuten <= 240;
  return ok ? k : null;
}

/** The plan page's link for a key (without the Stunde). */
export const planHref = (k) => `/lehrkraefte/stundenplan?niveau=${k.niveau}&block=${k.block}&stunden=${k.stunden}&min=${k.minuten}`;
export const sessionHref = (id) => `/lehrkraefte/unterricht?sitzung=${encodeURIComponent(id)}`;

/* ---------------------------------------------------------------- progress ---- */

/**
 * Per class, what happened to each Stunde of a plan: "done" or the step it stopped at.
 * rows: planFortschritt(); stepName(stunde, index) names a step. Pure (tested).
 * → [{ klasseId, gruppe, stunden: { [n]: { done: true } | { step: "Grammatik", status } } }]
 */
export function fortschrittJeGruppe(rows, stepName) {
  const byClass = new Map();
  for (const r of rows) {
    const g = byClass.get(r.klasse_id) ?? { klasseId: r.klasse_id, gruppe: r.gruppe, stunden: {}, latest: r.updated_at };
    const was = g.stunden[r.stunde];
    // An open session says more than an older completed one; a completed one beats nothing.
    if (r.status !== "completed") g.stunden[r.stunde] = { step: stepName(r.stunde, r.current_step), status: r.status, id: r.id };
    else if (!was) g.stunden[r.stunde] = { done: true };
    if (r.updated_at > g.latest) g.latest = r.updated_at;
    byClass.set(r.klasse_id, g);
  }
  return [...byClass.values()].sort((a, b) => (a.latest < b.latest ? 1 : -1));
}

/* ------------------------------------------------------------------- local ---- */

const store = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** { id, key, gruppe, steps: [{id, name, minutes}], row } or null. */
export function readLocal(storage = store(), name = LOCAL_KEY) {
  try {
    const v = JSON.parse(storage?.getItem(name) ?? "null");
    return v && isId(v.id) && Array.isArray(v.steps) && v.row ? v : null;
  } catch {
    return null;
  }
}

export function writeLocal(v, storage = store(), name = LOCAL_KEY) {
  try { storage?.setItem(name, JSON.stringify(v)); } catch {}
}

export function clearLocal(storage = store(), name = LOCAL_KEY) {
  try { storage?.removeItem(name); } catch {}
}

/* ------------------------------------------------------------------- saver ---- */

/**
 * Saves a session: every push goes to localStorage at once, and to the server after
 * `delay` ms (0 = now). Pushes that come quicker than that (← ← ←) are merged into one
 * request; a push while a request runs waits for it, then sends only the latest row.
 * A failed save is kept and retried with the next push or flush.
 * deps: { send(row) → Promise, local(row), setTimeout, clearTimeout } — injectable for tests.
 */
export function createSaver({ send, local = () => {}, setTimeout: st = setTimeout, clearTimeout: ct = clearTimeout }) {
  let pending = null;
  let timer = null;
  let running = null;
  let failed = false;

  async function run() {
    timer = null;
    if (running) return running;
    if (!pending) return;
    const row = pending;
    pending = null;
    running = (async () => {
      try {
        await send(row);
        failed = false;
      } catch {
        pending ??= row;
        failed = true;
      } finally {
        running = null;
      }
    })();
    await running;
    // Something new came in while this one was on its way.
    if (pending && !failed) return run();
  }

  return {
    push(row, delay = 400) {
      local(row);
      pending = row;
      if (timer) ct(timer);
      timer = st(run, delay);
    },
    /** Sends what is waiting now (step change, pagehide). */
    flush() {
      if (timer) { ct(timer); timer = null; }
      failed = false;
      return run();
    },
    get failed() { return failed; },
    get waiting() { return pending != null; },
  };
}
