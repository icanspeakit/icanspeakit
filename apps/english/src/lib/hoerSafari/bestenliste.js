// Hör-Safari ranking, the browser side of /api/safari/bestenliste. Same pattern as
// Artikel-Flitzer (src/lib/artikelSprint/bestenliste.js): a finished round goes to the server
// when the player is signed in; signed out, it waits here and is sent after sign-in. Each
// round carries a client_id so a retry never counts twice. The nickname is the one shared
// with Artikel-Flitzer (table sprint_namen).
import { apiFetch } from "../api.js";
import { signedIn } from "../artikelSprint/bestenliste.js";

export { signedIn };

const QUEUE_KEY = "da.hoerSafari.pending";
const MAX_WAITING = 12;
const boardOf = (r) => `${r.stufe}:${r.karten}`;

const readQueue = () => { try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); return Array.isArray(q) ? q : []; } catch { return []; } };
const writeQueue = (q) => { try { q.length ? localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) : localStorage.removeItem(QUEUE_KEY); } catch {} };

/** Keeps a signed-out round: the best two per board, at most twelve in all. */
function keep(run) {
  const perBoard = {};
  const kept = [...readQueue(), run]
    .sort((a, b) => b.punkte - a.punkte)
    .filter((r) => (perBoard[boardOf(r)] = (perBoard[boardOf(r)] ?? 0) + 1) <= 2)
    .slice(0, MAX_WAITING);
  writeQueue(kept);
}

function post(body) {
  return apiFetch("/api/safari/bestenliste", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
}

/** Sends rounds waiting from before sign-in. Returns the last answer, or null. */
export async function flushRuns() {
  if (!signedIn()) return null;
  const q = readQueue();
  if (!q.length) return null;
  const left = [];
  let last = null;
  for (const r of q) {
    const res = await post({ run: r });
    if (res?.ok) last = await res.json().catch(() => null);
    else if (res?.status !== 400) left.push(r);
  }
  writeQueue(left);
  return last;
}

/**
 * A finished round.
 * @param {{ stufe: string, karten: string, punkte: number, sekunden: number, richtig: number, falsch: number, herzen: number }} run
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

export async function fetchBoard({ stufe, karten, zeit }) {
  const q = new URLSearchParams({ stufe, karten, zeit });
  const res = await apiFetch(`/api/safari/bestenliste?${q}`, { credentials: "same-origin" }).catch(() => null);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
}

export async function saveName(name) {
  const res = await post({ name });
  if (!res?.ok) return null;
  return (await res.json().catch(() => null))?.name ?? null;
}
