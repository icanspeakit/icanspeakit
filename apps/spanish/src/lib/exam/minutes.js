// Total time of an Übungssatz. Modules that share one time block carry the same timerLabel
// (telc: "Leseverstehen und Sprachbausteine" 90 Min., A2: "Lesen und Schreiben" 50 Min.);
// that block counts once, not once per module.
/** @param {{ minutes?: number, timerLabel?: string }[]} modules */
export function examMinutes(modules) {
  const seen = new Set();
  let total = 0;
  for (const m of modules) {
    if (m.timerLabel) {
      if (seen.has(m.timerLabel)) continue;
      seen.add(m.timerLabel);
    }
    total += m.minutes ?? 0;
  }
  return total;
}
