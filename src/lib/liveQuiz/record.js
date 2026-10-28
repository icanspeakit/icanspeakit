// A finished Live-Quiz round into the signed-in learner's record (/fortschritt, tab „Quiz“).
//
// Called once from the end screen (player.js) for a solo round and for the phone's own place
// in a class game. Signed out, nothing is sent: the auth cookie decides whether to try, the
// server whether it is allowed (public.quiz_ergebnisse, own rows only).
//
// A round that could not be sent (offline, server busy) waits in localStorage
// (lq.record.queue, at most 20) and goes with the next round or the next visit to the quiz.
// Each round carries a client_id, so a retry never counts it twice.
import { apiFetch } from "../api.js";

const QUEUE_KEY = "lq.record.queue";
const APP = import.meta.env.PUBLIC_TARGET === "app";
const signedIn = () => APP || /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

const readQueue = () => { try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); return Array.isArray(q) ? q : []; } catch { return []; } };
const writeQueue = (q) => { try { q.length ? localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20))) : localStorage.removeItem(QUEUE_KEY); } catch {} };

async function send(round) {
  const res = await apiFetch("/api/quiz/ergebnisse", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ round }),
  }).catch(() => null);
  // 400: the round itself is malformed — retrying won't help. 401: signed out after all.
  return !!res && (res.ok || res.status === 400 || res.status === 401);
}

/** Sends what is waiting; keeps what still fails. */
export async function flushRecords() {
  if (!signedIn()) return;
  const q = readQueue();
  if (!q.length) return;
  const left = [];
  for (const r of q) if (!(await send(r))) left.push(r);
  writeQueue(left);
}

/**
 * @param {{ art: "solo" | "klasse", titel?: string, set_ref?: string, modus?: string, stufe?: string,
 *   richtig: number, gesamt: number, punkte?: number, platz?: number, mitspielende?: number,
 *   fragen?: { aufgabe: string, antwort: string, richtig: string, ok: boolean }[] }} round
 * @returns {Promise<boolean>} whether it is in the record (false when signed out or queued)
 */
export async function recordRound(round) {
  if (!signedIn() || !round?.gesamt) return false;
  const r = { ...round, client_id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  const ok = await send(r);
  if (!ok) writeQueue([...readQueue(), r]);
  else flushRecords();
  return ok;
}
