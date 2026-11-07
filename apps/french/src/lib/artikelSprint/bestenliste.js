// Artikel-Flitzer ranking, the browser side of /api/sprint/bestenliste.
//
// A finished run goes to the server when the player is signed in. Signed out, the run waits
// here (localStorage, the best few per board) and is sent on the first visit after sign-in,
// so the run that made someone sign in still counts. Each run carries a client_id: a retry
// never counts it twice.
import { apiFetch } from "../api.js";

const QUEUE_KEY = "da.artikelSprint.pending";
const MAX_WAITING = 12;
const APP = import.meta.env.PUBLIC_TARGET === "app";

export const signedIn = () => APP || /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

const readQueue = () => { try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); return Array.isArray(q) ? q : []; } catch { return []; } };
const writeQueue = (q) => { try { q.length ? localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) : localStorage.removeItem(QUEUE_KEY); } catch {} };
const boardOf = (r) => `${r.modus}:${r.stufe}:${r.schwierigkeit}`;

/** Keeps a signed-out run for later: the best ones, at most two per board. */
function keep(run) {
  const q = [...readQueue(), run];
  const perBoard = {};
  const kept = q
    .sort((a, b) => b.punkte - a.punkte)
    .filter((r) => (perBoard[boardOf(r)] = (perBoard[boardOf(r)] ?? 0) + 1) <= 2)
    .slice(0, MAX_WAITING);
  writeQueue(kept);
}

async function post(body) {
  const res = await apiFetch("/api/sprint/bestenliste", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res;
}

/** Sends a run waiting from before sign-in. Returns the last answer, or null. */
export async function flushRuns() {
  if (!signedIn()) return null;
  const q = readQueue();
  if (!q.length) return null;
  const left = [];
  let last = null;
  for (const r of q) {
    const res = await post({ run: r });
    if (res?.ok) last = await res.json().catch(() => null);
    // 400: not a possible run, retrying won't help. Anything else waits for the next visit.
    else if (res?.status !== 400) left.push(r);
  }
  writeQueue(left);
  return last;
}

/**
 * A finished run.
 * @param {{ modus: string, stufe: string, schwierigkeit: string, punkte: number, sekunden: number, richtig: number, falsch: number }} run
 * @returns {Promise<{ saved: boolean, needName?: boolean, waiting?: boolean }>}
 */
export async function submitRun(run) {
  const r = { ...run, client_id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  if (!signedIn()) {
    keep(r);
    return { saved: false, waiting: true };
  }
  const res = await post({ run: r });
  if (res?.ok) {
    const out = await res.json().catch(() => ({}));
    flushRuns();
    return { saved: true, needName: !!out.needName };
  }
  if (!res || res.status >= 500 || res.status === 401) keep(r);
  return { saved: false, waiting: !res || res.status >= 500 || res.status === 401 };
}

/** @returns {Promise<{ rows: { rang: number, name: string, punkte: number, ich: boolean }[], signedIn: boolean, name: string | null } | null>} */
export async function fetchBoard({ modus, stufe, schwierigkeit, zeit }) {
  const q = new URLSearchParams({ modus, stufe, schwierigkeit, zeit });
  const res = await apiFetch(`/api/sprint/bestenliste?${q}`, { credentials: "same-origin" }).catch(() => null);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
}

/** Saves the nickname. Returns it as stored, or null when it was refused. */
export async function saveName(name) {
  const res = await post({ name });
  if (!res?.ok) return null;
  return (await res.json().catch(() => null))?.name ?? null;
}

export const waitingRuns = () => readQueue().length;
