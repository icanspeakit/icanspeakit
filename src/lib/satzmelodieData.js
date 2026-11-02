// Satzmelodie (/intonation): the lines that get a recording, and where each file lives.
// (Not to be confused with satzmelodie.js, the pitch analysis behind /pronunciation-check.)
// One list for scripts/generate-satzmelodie-audio.mjs and the page, so both find the same
// file. Text + kind go into the name: "Du kommst morgen." and "Du kommst morgen?" are
// different recordings of the same words.
import data from "../data/satzmelodie.json" with { type: "json" };
import { satzSlug } from "./audioSlug.js";

export const AUDIO_DIR = "/audio/satzmelodie";

/** The statement base said as a type: "Du kommst morgen" + echo → "Du kommst morgen?". */
export function familyLines(f) {
  return [
    { type: "aussage", text: `${f.base}.` },
    { type: "jn", text: f.jn },
    { type: "w", text: f.w },
    { type: "echo", text: `${f.base}?` },
    { type: "ausruf", text: `${f.base}!` },
  ];
}

export const stressText = (s) => s.words.join(" ");
export const ruleText = (r) => r.parts.map((p) => p.t).join(" ");

export function audioKey(kind, text) {
  return `${AUDIO_DIR}/${kind}-${satzSlug(text)}.mp3`;
}

/** Every line to voice: { kind, text, src, type?, stress?, parts? }. */
export function allLines() {
  const out = [];
  for (const f of data.families) for (const l of familyLines(f)) out.push({ kind: l.type, type: l.type, text: l.text, src: audioKey(l.type, l.text) });
  data.stress.forEach((s, i) => {
    const text = stressText(s);
    out.push({ kind: `stress-${s.k}`, text, stress: s, src: audioKey(`stress-${s.k}`, text) });
  });
  for (const r of data.rules) {
    const text = ruleText(r);
    out.push({ kind: `rule-${r.id}`, text, parts: r.parts, src: audioKey(`rule-${r.id}`, text) });
  }
  return out;
}

export default data;
