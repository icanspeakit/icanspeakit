// Artikel-Flitzer challenge links: "beat my run" without anyone online at the same time. The
// link carries the run's seed, mode, level, score and difficulty, so the friend gets the same track and
// the same words (rng.js) and a number to beat:
//
//   /games/countable-sprint?duell=<seed base36>.<mode>.<level>.<score>[.<difficulty>]&von=<name>
//
// No difficulty is „normal": links from before there was a choice still work.
//
// The score is the sender's word: fine between friends, not proof of anything.

import { MODES, LEVELS } from "./questions.js";
import { DIFFICULTIES } from "./game.js";
import { cleanName } from "../liveQuiz/protocol.js";
import { currentPath } from "../paths.js";

/** The challenge in the page's URL, or null. */
export function readChallenge(search = location.search) {
  const q = new URLSearchParams(search);
  const [seed36, mode, level, score, diff = "normal"] = (q.get("duell") || "").split(".");
  const seed = parseInt(seed36, 36);
  if (!Number.isFinite(seed) || !MODES[mode] || !LEVELS.includes(level) || !DIFFICULTIES[diff]) return null;
  return { seed: seed >>> 0, mode, level, diff, score: Math.max(0, parseInt(score, 10) || 0), name: cleanName(q.get("von")) };
}

export function challengeUrl({ seed, mode, level, diff = "normal", score, name }) {
  const u = new URL(currentPath(), location.origin);
  u.searchParams.set("duell", `${(seed >>> 0).toString(36)}.${mode}.${level}.${Math.floor(score)}${diff === "normal" ? "" : `.${diff}`}`);
  const n = cleanName(name);
  if (n) u.searchParams.set("von", n);
  return u.toString();
}

/** The page's URL without the challenge, once it is accepted or dismissed. */
export function dropChallenge() {
  const u = new URL(location.href);
  u.searchParams.delete("duell");
  u.searchParams.delete("von");
  history.replaceState(history.state, "", u);
}

/** Share sheet where there is one (phones), clipboard otherwise. Returns "shared" | "copied" | "". */
export async function shareLink(url, text) {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "";
  }
}
