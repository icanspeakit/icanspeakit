// Tempo of the automatic Weiter in the Artikel-Trainer (src/lib/practiceWorkspace.js,
// wrongFlow): Schnell, Normal, Langsam, or Aus — then every card waits for Weiter. Set in
// /konto → Einstellungen → Üben, remembered per browser like the sound switch. Every pause
// after an answer is multiplied by the factor. Its own module so /konto does not load the
// trainer to show the switch.
const TEMPO_KEY = "da.practice.tempo";
export const TEMPOS = { schnell: 0.6, normal: 1, langsam: 1.6, aus: 0 };
export function getTempo() {
  try {
    const v = localStorage.getItem(TEMPO_KEY);
    return v && v in TEMPOS ? v : "normal";
  } catch {
    return "normal";
  }
}
export function setTempo(v) {
  try { localStorage.setItem(TEMPO_KEY, v in TEMPOS ? v : "normal"); } catch {}
}
