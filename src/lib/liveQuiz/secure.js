// Who may say what on a live-quiz channel (SWEEP-FOLLOWUP-TIERED-PROMPT.md, Tier 4; security M5).
//
// The channel `quiz:<PIN>` is a public Supabase Realtime broadcast: anyone who knows the PIN
// can send on it. So the messages carry their own proof, checked by the receiver:
//
//   host → all   Every host event is signed with an ECDSA P-256 key made in the host's tab.
//                The public half is registered with the server when the room opens
//                (/api/live-quiz/raum), and every phone fetches it from the server when it
//                joins (/api/live-quiz/beitreten) — never from the channel. A phone drops any
//                host event that is unsigned, signed by another key, or older than the last
//                one it accepted (a sequence number inside the signature stops replays).
//   player → host  On join the server issues each phone an id and a secret:
//                secret = HMAC(roomKey, "player|" + id). Only the server and the host hold
//                roomKey, so the host can recompute any player's secret but nobody else can.
//                An answer carries mac = HMAC(secret, n + "|" + choice); presence carries
//                proof = HMAC(secret, "presence"). The secret itself never goes on the wire.
//
// The PIN, the join flow and the screens stay as they were. Pure WebCrypto: runs in the
// browser and in Node (tests).
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

export function b64u(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(str) {
  const s = atob(String(str).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

const hmacKey = (raw) => subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
async function hmac(rawKey, text) {
  return new Uint8Array(await subtle.sign("HMAC", await hmacKey(rawKey), enc.encode(text)));
}
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ------------------------------------------------------------------ host ---- */
const ECDSA = { name: "ECDSA", namedCurve: "P-256" };
const SIGN = { name: "ECDSA", hash: "SHA-256" };

/**
 * A fresh signing key for one room. `pub` (a JWK) goes to the server, `key` stays in the tab,
 * and `jwk` (the private half) in the tab's sessionStorage, so a reload keeps the room (host.js).
 */
export async function makeHostKey() {
  const pair = await subtle.generateKey(ECDSA, true, ["sign", "verify"]);
  const jwk = await subtle.exportKey("jwk", pair.publicKey);
  return { key: pair.privateKey, jwk: await subtle.exportKey("jwk", pair.privateKey), pub: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } };
}

/** The signing key again, from the private JWK makeHostKey() gave. */
export function importHostKey(jwk) {
  return subtle.importKey("jwk", jwk, ECDSA, false, ["sign"]);
}

/**
 * Wraps host events in signatures, in order. `send(event, payload)` resolves to the wire
 * payload { d, s } once signed; signing is chained so a later event never overtakes.
 *
 * Sequence numbers start at the clock, not at 1: a reloaded host tab signs with the same key
 * and must come out above everything the phones accepted from the tab before it.
 * `farewell` ([event, payload]) is kept signed with the next number, ready for pagehide,
 * where there is no time to wait for a signature.
 */
export function hostSigner(privateKey, { farewell } = {}) {
  let seq = Date.now() * 1000;
  let chain = Promise.resolve();
  let parting = null;
  const signOne = async (event, payload, q) => {
    const d = JSON.stringify({ e: event, q, p: payload });
    const s = b64u(await subtle.sign(SIGN, privateKey, enc.encode(d)));
    return { d, s };
  };
  const prepare = (q) => {
    if (farewell) signOne(farewell[0], farewell[1] ?? {}, q + 1).then((w) => { if (q === seq) parting = w; }, () => {});
  };
  prepare(seq);
  return {
    sign(event, payload) {
      const q = ++seq;
      const out = chain.then(() => signOne(event, payload, q));
      chain = out.catch(() => {});
      out.then(() => prepare(q), () => {});
      return out;
    },
    /** The farewell, signed to follow the last event sent; null until ready. */
    get farewell() { return parting; },
  };
}

/** The phone's side: accepts a host event only if the room's own key signed it, in order. */
export async function hostVerifier(pubJwk) {
  const key = await subtle.importKey("jwk", { ...pubJwk, ext: true }, ECDSA, false, ["verify"]);
  let last = 0;
  return {
    /** @returns {Promise<object | null>} the payload, or null when the message is not the host's */
    async open(event, wire) {
      if (!wire || typeof wire.d !== "string" || typeof wire.s !== "string" || wire.d.length > 200_000) return null;
      let ok = false;
      try { ok = await subtle.verify(SIGN, key, unb64u(wire.s), enc.encode(wire.d)); } catch { ok = false; }
      if (!ok) return null;
      let m;
      try { m = JSON.parse(wire.d); } catch { return null; }
      if (m?.e !== event || !Number.isSafeInteger(m.q) || m.q <= last) return null;
      last = m.q;
      return m.p ?? {};
    },
  };
}

/* ---------------------------------------------------------------- player ---- */
/** secret = HMAC(roomKey, "player|" + id). Server (Node) and host (browser) both use this. */
export async function playerSecret(roomKeyB64, id) {
  return b64u(await hmac(unb64u(roomKeyB64), `player|${id}`));
}

export async function answerMac(secretB64, n, choice) {
  return b64u(await hmac(unb64u(secretB64), `${n}|${choice}`));
}

export async function presenceProof(secretB64) {
  return b64u(await hmac(unb64u(secretB64), "presence"));
}

/**
 * The host's check of a player's message. Caches each player's secret.
 * @param {string} roomKeyB64
 */
export function playerChecker(roomKeyB64) {
  const secrets = new Map();
  const secretOf = (id) => {
    if (!secrets.has(id)) secrets.set(id, playerSecret(roomKeyB64, id));
    return secrets.get(id);
  };
  return {
    async answer({ id, n, choice, mac } = {}) {
      if (typeof id !== "string" || id.length > 40 || !Number.isInteger(n) || !Number.isInteger(choice)) return false;
      return same(mac, await answerMac(await secretOf(id), n, choice));
    },
    async presence({ id, proof } = {}) {
      if (typeof id !== "string" || id.length > 40) return false;
      return same(proof, await presenceProof(await secretOf(id)));
    },
  };
}
