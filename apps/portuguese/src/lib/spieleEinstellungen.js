// Settings every learner game shares: one sound switch for all of them (muting Bruno Kart
// mutes Hör-Safari too) and the system's "reduce motion". Each game passes what its old
// key said, so nobody who muted a game hears it again.
//
//   gameMuted(legacy)    true when the learner switched sound off in any game
//   setGameMuted(m)      saves it for every game and tells the open ones (GAME_MUTE_EVENT)
//   reducedMotion()      prefers-reduced-motion: no shake, no flashing, calmer transitions

const KEY = "da.spiele.muted";
export const GAME_MUTE_EVENT = "da:spiele-muted";

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

// legacy: what the game's own old key said (its caller reads it), used until the shared
// key exists.
export function gameMuted(legacy = false) {
  const v = read(KEY);
  return v == null ? !!legacy : v === "1";
}

export function setGameMuted(m) {
  try { localStorage.setItem(KEY, m ? "1" : "0"); } catch {}
  dispatchEvent(new CustomEvent(GAME_MUTE_EVENT, { detail: { muted: !!m } }));
}

export function reducedMotion() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}
