// The live quiz's wire protocol — the one place both screens agree on.
//
// Transport is Supabase Realtime (broadcast + presence) on the public key, with no table
// behind it: a game lives only as long as the host's tab. The host is authoritative. It
// picks the questions, times them, scores the answers and is the only side that knows
// the right option until it reveals it — so a phone cannot read the answer out of the
// payload, and a slow phone cannot argue with the clock.
//
// Channel: `quiz:<PIN>`. Presence carries who is in the room ({ role, id, name, lang, proof? });
// broadcast carries the game. In a registered room (secure.js) every host event travels
// signed as { d, s } and every answer carries a `mac`; the payloads below are what is inside:
//
//   player → host   join     { id, name, lang }             asks for a seat (and a name)
//   host   → all    roster   { players: [{ id, name }] }     names as the host settled them
//   host   → all    question { n, total, mode, kind?, prompt, options, seconds, img? }
//   host   → all    time     { n, left, total, paused }       the teacher changed the clock
//   player → host   answer   { id, n, choice }
//   host   → all    reveal   { n, correct, img?, dist, results: { [id]: { ok, points, score, rank } } }
//
// `img` is the asked word's picture (src/lib/wortBild.js), or a synonym group's, where it
// has one. With the question only in "meaning-de" and "synonym": beside a German word
// whose meaning is to be picked, the picture would give the answer away. With the reveal always, so the word is seen with its picture once.
//   host   → all    end      { podium, results }
//   host   → all    closed   {}                              host ended the game („Beenden“)
//   host   → all    leaving  {}                              the host's tab is unloading (reload or
//                                                            closed): phones wait for it to come back
//   host   → all    beat     { phase, n }                    every 5 s during a game: where it stands
//   player → host   sync     { id }                          "I am behind" (after a beat, a reconnect, unlock)
//   host   → all    state    { to, event, payload }          the last question/reveal/end again, for `to` only;
//                                                            a question adds { left, totalMs, paused }
//
// `kind` is the line above the prompt for a teacher's own question ("Ergänzen Sie
// werden."), null otherwise; mode "custom" is such a question, German on both sides, with
// two to four options. A phone that predates it simply shows the mode's line.
//
// `prompt` and each option are either { de: "der Tisch" } or a meaning
// { en, ar, uk, ru, tr } — the phone shows the one in its player's language.
import { langsFor } from "../languages.js";

/** The languages a meaning can be shown in: the lexicon's complete ones. */
export const MEANING_LANGS = langsFor("cards");

export const MODES = {
  /** A meaning on screen, the German word to pick. */
  "meaning-de": "meaning-de",
  /** A German word on screen, its meaning to pick. */
  "de-meaning": "de-meaning",
  /** A German word on screen, the German word that means the same to pick. */
  synonym: "synonym",
  /** A teacher's own question (custom.js): German prompt, two to four German options. */
  custom: "custom",
};

/** The line above the prompt, the same on the projector and on the phone. */
export function modeQuestion(mode, t) {
  if (mode === "meaning-de") return t("lq.mode.meaningDe", "Wie heißt das auf Deutsch?");
  if (mode === "synonym") return t("lq.mode.synonym", "Welches Wort bedeutet dasselbe?");
  if (mode === "custom") return t("lq.mode.custom", "Was ist richtig?");
  return t("lq.mode.deMeaning", "Was bedeutet das?");
}

export const channelName = (pin) => `quiz:${pin}`;

/** Six digits, never starting with 0 — read aloud in class, a leading zero gets dropped. */
export function makePin() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Kahoot's rule: a right answer is worth up to 1000, falling to 500 at the buzzer, so
 * speed counts but never more than being right. `ms` is the host's own measurement
 * from sending the question to receiving the answer.
 */
export function points(ms, seconds) {
  const t = Math.min(Math.max(ms / (seconds * 1000), 0), 1);
  return Math.round(1000 * (1 - t / 2));
}

/** A nickname as the room will show it: trimmed, single-spaced, at most 16 characters. */
export function cleanName(raw) {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 16);
}

/** The option shapes and colours, the same on the projector and on every phone. */
export const OPTION_STYLES = ["a", "b", "c", "d"];
