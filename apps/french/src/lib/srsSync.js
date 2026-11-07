// Premium: the Wortschatz trainer's spaced-repetition state on every device
// (PREMIUM-FEATURES Tier 3). Pull on trainer start, push every PUSH_EVERY grades and when
// the page is hidden. Free learners: nothing leaves the device — this module does nothing
// for them, and the database would refuse them anyway (RLS on public.srs_state).
//
// Whether to sync is read from the purchase hint (src/lib/zugang.js) — a hint is enough to
// decide whether to *try*; the server decides whether it is allowed.
import { apiFetch } from "./api.js";
import { readZugang } from "./zugang.js";
import { dirtyRows, markClean, mergeRows } from "./srs.js";

const PUSH_EVERY = 20;
let pending = 0;
let started = false;

export const syncOn = () => !!readZugang()?.products?.includes("premium");

export async function pull() {
  if (!syncOn()) return 0;
  const res = await apiFetch("/api/wortschatz/srs", { credentials: "same-origin" }).catch(() => null);
  if (!res?.ok) return 0;
  const { rows } = await res.json();
  return mergeRows(rows);
}

export async function push({ keepalive = false } = {}) {
  if (!syncOn()) return;
  const rows = dirtyRows();
  if (!rows.length) return;
  pending = 0;
  const res = await apiFetch("/api/wortschatz/srs", {
    method: "POST",
    credentials: "same-origin",
    keepalive,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows }),
  }).catch(() => null);
  if (res?.ok) markClean(rows.map((r) => r.card_id));
}

/** Call after every grade. */
export function noteGrade() {
  if (!syncOn()) return;
  if (++pending >= PUSH_EVERY) push();
}

/** Once per page: pull now, push on pagehide. Resolves when the pull is done. */
export function startSrsSync() {
  if (started) return Promise.resolve(0);
  started = true;
  addEventListener("pagehide", () => push({ keepalive: true }));
  return pull();
}
