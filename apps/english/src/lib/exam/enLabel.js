// The exam data (derived from the DTZ sets) names parts and sets in German. The English UI shows
// these words in English; the data and ids stay as they are (dtzTrainer.js parses the labels).
const WORDS = [
  ["Sprachbausteine", "Language in context"],
  ["Leseverstehen", "Reading"],
  ["Hörverstehen", "Listening"],
  ["Schriftlicher Ausdruck", "Written expression"],
  ["Mündlicher Ausdruck", "Spoken expression"],
  ["Übungssatz", "Practice set"],
  ["Lesen", "Reading"],
  ["Hören", "Listening"],
  ["Schreiben", "Writing"],
  ["Sprechen", "Speaking"],
];

export function enLabel(s) {
  let out = String(s ?? "");
  for (const [de, en] of WORDS) out = out.split(de).join(en);
  return out;
}
