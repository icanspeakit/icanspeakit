// Artikel-Flitzer race room: Supabase Realtime (presence + broadcast) on the public key, no
// table behind it, like the live quiz (src/lib/liveQuiz/protocol.js). Nobody is the server:
// every phone runs its own game from the round's seed, so the track and the words are the
// same for all, and only the scores travel.
//
// Channel `sprint:<PIN>`. Presence carries who is in the room: { id, name, at, state, round }.
// The host is whoever has been in the room longest (smallest `at`), so the room survives the
// creator leaving. Broadcast:
//
//   host → all   start  { round, seed, mode, level, diff, lanes }   a new round, everyone counts down
//   any  → all   prog   { id, round, score, lives, correct, wrong, over }
//   any  → all   pos    { id, round, d, x, y, v, k }   where the rider is: distance, lane offset,
//                       height, speed, crouch (1/0) — the others draw it as a car on their road
//                       and run it on at `v` between two messages
//
// Progress goes out every PROG_EVERY ms while running, and at once on a lost life or the end;
// the position every POS_EVERY ms. Each message reaches every other phone, so a full room of
// MAX_PLAYERS sends ~25 and receives ~225 a second: within Realtime's quota on the paid plan,
// and the reason for not sending every frame.

import { createBrowserSupabase } from "../supabase/browser.js";
import { makePin, makeId, cleanName } from "../liveQuiz/protocol.js";

export const MAX_PLAYERS = 10;
export const PROG_EVERY = 1500;
export const POS_EVERY = 400;
export { makePin, cleanName };

/** The PIN from a typed code or a pasted link: six digits, not starting with 0. */
export function readPin(raw) {
  const m = String(raw ?? "").match(/[1-9]\d{5}/);
  return m ? m[0] : "";
}

/**
 * Joins (or opens) room `pin` as `name`.
 * @param {{ pin: string, name: string, onPlayers(list): void, onStart(cfg): void,
 *   onProg(p): void, onStatus(status: "live" | "full" | "error"): void }} opts
 */
export function joinRoom({ pin, name, onPlayers, onStart, onProg, onPos = () => {}, onStatus }) {
  const supabase = createBrowserSupabase();
  const me = { id: makeId(), name: cleanName(name), at: Date.now(), state: "lobby", round: 0 };
  const ch = supabase.channel(`sprint:${pin}`, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  let players = [];
  let closed = false;

  ch.on("presence", { event: "sync" }, () => {
    const st = ch.presenceState();
    players = Object.values(st)
      .map((metas) => metas[metas.length - 1])
      .filter((p) => p?.id)
      .sort((a, b) => a.at - b.at);
    // Too many: the latest to arrive steps out again.
    if (players.length > MAX_PLAYERS && players.findIndex((p) => p.id === me.id) >= MAX_PLAYERS) {
      leave();
      onStatus("full");
      return;
    }
    onPlayers(players.slice(0, MAX_PLAYERS));
  });
  ch.on("broadcast", { event: "start" }, ({ payload }) => onStart(payload));
  ch.on("broadcast", { event: "prog" }, ({ payload }) => onProg(payload));
  ch.on("broadcast", { event: "pos" }, ({ payload }) => onPos(payload));
  ch.subscribe(async (status) => {
    if (closed) return;
    if (status === "SUBSCRIBED") {
      await ch.track(me);
      onStatus("live");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      onStatus("error");
    }
  });

  function leave() {
    if (closed) return;
    closed = true;
    supabase.removeChannel(ch);
  }

  return {
    pin,
    me,
    get players() { return players; },
    isHost: () => players[0]?.id === me.id,
    /** Host: start a round for everyone (and for itself: broadcast does not echo). */
    start(cfg) {
      ch.send({ type: "broadcast", event: "start", payload: cfg });
      onStart(cfg);
    },
    /** What this phone is doing, for the lobby list: "lobby" | "run" | "done". */
    setState(state, round) {
      me.state = state;
      me.round = round;
      if (!closed) ch.track(me);
    },
    prog(p) {
      if (!closed) ch.send({ type: "broadcast", event: "prog", payload: { id: me.id, ...p } });
    },
    pos(p) {
      if (!closed) ch.send({ type: "broadcast", event: "pos", payload: { id: me.id, ...p } });
    },
    leave,
  };
}
