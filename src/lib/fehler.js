// "Meine Fehler" — every wrong answer, kept on this device (PREMIUM-FEATURES Tier 2).
//
// localStorage["da_fehler_v1"] = [{ key, source, itemId, prompt, expected, given, level,
//   topic, href, times, at, fixed }]  newest first, at most 300.
//
// One entry per item (`source` + `itemId`): a repeated mistake moves to the top and counts
// `times` up; a later right answer marks it `fixed` — it stays on the list, it just leaves
// the worksheet. The `da_` prefix puts it into the Android app's mirror (src/lib/appState.js)
// like the rest of the learning state. Nothing here leaves the device.
//
// Callers: grammarWorkspace.js (fill, table), dtzTrainer.js, exam/pruefungEngine.js. Each
// calls recordResult() where it already knows right from wrong.
const KEY = "da_fehler_v1";
const MAX = 300;

/** @returns {Array<object>} */
export function readFehler() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("da:fehler"));
  } catch {}
}

const clean = (s, n = 300) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * A graded answer. Wrong → recorded (or moved up); right → an existing entry is marked fixed.
 * @param {{ source: string, itemId: string, prompt: string, expected: string, given: string,
 *   level?: string, topic?: string, href?: string }} item
 * @param {boolean} ok
 */
export function recordResult(item, ok) {
  if (typeof localStorage === "undefined" || !item?.source || item.itemId == null) return;
  const key = `${item.source}:${item.itemId}`;
  const list = readFehler();
  const i = list.findIndex((e) => e.key === key);
  if (ok) {
    if (i >= 0 && !list[i].fixed) {
      list[i] = { ...list[i], fixed: true, fixedAt: Date.now() };
      save(list);
    }
    return;
  }
  const prev = i >= 0 ? list.splice(i, 1)[0] : null;
  list.unshift({
    key,
    source: item.source,
    itemId: String(item.itemId),
    prompt: clean(item.prompt),
    expected: clean(item.expected, 160),
    given: clean(item.given, 160),
    level: item.level ?? prev?.level ?? "",
    topic: item.topic ?? prev?.topic ?? "",
    href: item.href ?? prev?.href ?? "",
    times: (prev?.times ?? 0) + 1,
    at: Date.now(),
    fixed: false,
  });
  save(list);
}

/** Shorthand for callers that only record mistakes. */
export const recordMistake = (item) => recordResult(item, false);

/** Open (not fixed) mistakes, newest first. */
export const openFehler = () => readFehler().filter((e) => !e.fixed);

export function clearFehler() {
  save([]);
}
