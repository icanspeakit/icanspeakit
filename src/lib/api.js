// Calls to the site's own server routes. icanspeak Spanish has none yet (fully static, see
// src/lib/backend.js), so every call answers 503 with the OFFLINE error instead of hitting
// a 404. Callers already treat a non-OK response as "not available".
import { OFFLINE } from "./backend.js";

/**
 * @param {string} _path - a site path starting with "/", e.g. "/api/…"
 * @param {RequestInit} [_init]
 */
export async function apiFetch(_path, _init = {}) {
  return new Response(JSON.stringify({ error: OFFLINE.message, code: OFFLINE.code }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
