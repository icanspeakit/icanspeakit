// Bruno sucht den Hochstapler, Klasse mode: keeping each player's role secret on a public
// broadcast channel (threat model: docs/hochstapler-tier0-v1.md, section 3).
//
// Every phone makes an ECDH P-256 key pair when it joins and shows the public half in its
// presence. The host has one ECDH key pair per room and sends its public half in the (signed)
// roster. Both sides derive, per player, an AES-GCM key and an HMAC key from the shared
// secret (HKDF, salt = PIN, info = purpose + player id), so:
//   - a role/word sealed for one player opens only on that player's phone;
//   - a vote or guess carries an HMAC only that player (and the host) can make.
// Sealed plaintexts are padded to one length, so the ciphertexts do not tell the Hochstapler's
// short "you are it" apart from a word with its translations.
//
// Pure WebCrypto: the same code runs in the browser and in Node (tests).
import { b64u, unb64u } from "../liveQuiz/secure.js";

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDH = { name: "ECDH", namedCurve: "P-256" };

/** Every sealed plaintext is this long (bytes): longer than any role with all translations. */
export const SEAL_BYTES = 768;

const validXY = (p) => p && typeof p.x === "string" && typeof p.y === "string" && p.x.length < 100 && p.y.length < 100;

/** A fresh key pair: `pub` ({ x, y }) goes on the wire, `jwk` (private) into storage for a reload. */
export async function makeKeys() {
  const kp = await subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pub = await subtle.exportKey("jwk", kp.publicKey);
  return { priv: kp.privateKey, jwk: await subtle.exportKey("jwk", kp.privateKey), pub: { x: pub.x, y: pub.y } };
}

/** The private key again from its JWK, with its public half. */
export async function loadKeys(jwk) {
  const priv = await subtle.importKey("jwk", jwk, ECDH, false, ["deriveBits"]);
  return { priv, jwk, pub: { x: jwk.x, y: jwk.y } };
}

/**
 * The keys between `myPriv` and the other side's public `theirPub` for player `id`.
 * Host and player get the same pair.
 * @returns {Promise<{ aes: CryptoKey, mac: CryptoKey }>}
 */
export async function pairKeys(myPriv, theirPub, pin, id) {
  if (!validXY(theirPub)) throw new TypeError("pub");
  const pub = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: theirPub.x, y: theirPub.y, ext: true }, ECDH, false, []);
  const bits = await subtle.deriveBits({ name: "ECDH", public: pub }, myPriv, 256);
  const base = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const hk = (info) => ({ name: "HKDF", hash: "SHA-256", salt: enc.encode(`hst|${pin}`), info: enc.encode(`${info}|${id}`) });
  const aes = await subtle.deriveKey(hk("hst-aes"), base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const mac = await subtle.deriveKey(hk("hst-mac"), base, { name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign", "verify"]);
  return { aes, mac };
}

/** Seals `obj` for one reader. `aad` binds it to its place (e.g. "round|3|<id>"). */
export async function seal(aes, obj, aad, size = SEAL_BYTES) {
  const body = enc.encode(JSON.stringify(obj));
  if (body.length > size) throw new RangeError(`sealed payload too long (${body.length} > ${size})`);
  const padded = new Uint8Array(size).fill(0x20);
  padded.set(body);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, aes, padded);
  return { iv: b64u(iv), ct: b64u(ct) };
}

/** Opens a sealed box, or null when it is not for this key / place. */
export async function unseal(aes, box, aad) {
  if (!box || typeof box.iv !== "string" || typeof box.ct !== "string" || box.ct.length > 20_000) return null;
  try {
    const pt = await subtle.decrypt({ name: "AES-GCM", iv: unb64u(box.iv), additionalData: enc.encode(aad) }, aes, unb64u(box.ct));
    return JSON.parse(dec.decode(pt).trimEnd());
  } catch {
    return null;
  }
}

export async function macOf(mac, text) {
  return b64u(await subtle.sign("HMAC", mac, enc.encode(text)));
}

export async function macOk(mac, text, sig) {
  if (typeof sig !== "string" || sig.length > 100) return false;
  try { return await subtle.verify("HMAC", mac, unb64u(sig), enc.encode(text)); } catch { return false; }
}
