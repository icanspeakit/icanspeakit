// Bruno sucht den Hochstapler, Klasse mode: the wire protocol, the one place projector
// (host.js) and phones (player.js) agree on. Pattern and transport as the live quiz
// (src/lib/liveQuiz/protocol.js): Supabase Realtime broadcast + presence on the public key, no
// table; the host tab is the game. The room registry (/api/live-quiz/raum, /join) is
// shared with the quiz, so PINs are unique across both.
//
// Channel `hochstapler:<PIN>`. Presence: host { role: "host" }; player
// { role: "player", id, name, avatar, lang, pub: { x, y }, proof? } — pub is the phone's ECDH
// key (crypto.js), proof = HMAC(secret, "pub|x|y") with the server-issued seat secret, so in a
// registered room nobody can put their own key on someone else's seat.
//
// In a registered room every host event travels signed as { d, s } (secure.js). Inside:
//
//   host   → all  roster  { players: [{ id, name, avatar, score }], hostPub, mode }
//   host   → all  round   { r, seats: { [id]: { iv, ct } } }   each seat sealed for its phone:
//                          { role: "wort" | "hochstapler", theme, word?: { de, img, m } }
//   host   → all  phase   the public state of the round, everything a screen needs:
//                          { r, phase, theme, order, turn, clueRound, rounds, typed, left, total,
//                            voted, count?, clues, reveal?, rescue?, result?, level }
//   host   → all  beat    { r, phase, v }                 every 4 s: a phone with another `v` asks
//   player → host sync    { id }
//   host   → all  state   { to, round?, phase }           the last round + phase again, for `to`
//   player → host done    { id, r, turn, mac }            "my sentence is said" (spoken mode)
//   player → host clue    { id, r, box }                  typed clue, sealed for the host
//   player → host vote    { id, r, k, target, mac }       k counts up: the latest vote counts
//   player → host guess   { id, r, choice, mac }          the Rettungsversuch
//   host   → all  kick    { id }
//   host   → all  closed  {}                              „Beenden“
//   host   → all  leaving {}                              host tab unloading (reload)
//
// MACs (HMAC with the player's pair key): "done|r|turn", "vote|r|k|target", "guess|r|choice".
// Sealed clue AAD: "clue|r|id"; sealed seat AAD: "seat|r|id".
import { cleanName, makeId, makePin } from "../liveQuiz/protocol.js";

export { cleanName, makeId, makePin };

export const channelName = (pin) => `hochstapler:${pin}`;

/** The PIN from a typed code or a pasted link: six digits, not starting with 0. */
export function readPin(raw) {
  const m = String(raw ?? "").match(/[1-9]\d{5}/);
  return m ? m[0] : "";
}

/** A typed clue as the projector may show it: one line, at most 120 characters. */
export const cleanClue = (raw) => String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

export const BEAT_MS = 4000;
export const PHASES = ["lobby", "clues", "discuss", "vote", "reveal", "rescue", "result", "end"];
