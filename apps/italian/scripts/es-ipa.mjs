// Broad Castilian IPA from Spanish spelling (docs/content-plan.md §1.4): distinción (/θ/ for c, z),
// yeísmo (ll = y = /ʝ/), syllable dots and a stress mark, e.g. casa ˈka.sa, cerveza θeɾˈβe.θa.
//   import { ipaOf } from "./es-ipa.mjs";
// Spanish spelling is regular enough that this is more reliable than typing 4,000 transcriptions
// by hand. It does not know loan words and abbreviations: scripts/lexicon-import.mjs takes an
// `ipa=` override for those (NIE, wifi). Each word of a phrase is transcribed on its own.
const ACUTE = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };
const isVowel = (ch) => "aeiouáéíóúü".includes(ch);
const isStrong = (ch) => "aeoáéó".includes(ch);
const isAccented = (ch) => ch in ACUTE;
const ONSETS = new Set(["pr", "br", "tr", "dr", "kr", "gr", "fr", "pl", "bl", "kl", "gl", "fl"]);

/** Spelling → units: digraphs stay one consonant, silent h and the u of que/gue go. */
function tokens(word) {
  const out = [];
  const w = word.toLowerCase();
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const n = w[i + 1];
    if (c === "h") continue;
    if (c === "c" && n === "h") { out.push("tʃ"); i++; continue; }
    if (c === "l" && n === "l") { out.push("ʝ"); i++; continue; }
    if (c === "r" && n === "r") { out.push("rr"); i++; continue; }
    if (c === "q" && n === "u") { out.push("k"); i++; continue; }
    if (c === "g" && n === "u" && /[eéií]/.test(w[i + 2] ?? "")) { out.push("g"); i++; continue; }
    if (c === "g" && /[eéií]/.test(n ?? "")) { out.push("x"); continue; }
    if (c === "c") { out.push(/[eéií]/.test(n ?? "") ? "θ" : "k"); continue; }
    if (c === "z") { out.push("θ"); continue; }
    if (c === "j") { out.push("x"); continue; }
    if (c === "ñ") { out.push("ɲ"); continue; }
    if (c === "v") { out.push("b"); continue; }
    if (c === "x") { out.push("k", "s"); continue; }
    if (c === "y") {
      // A vowel at the end of a word (hoy, muy) or alone (y); a consonant elsewhere.
      if (i === w.length - 1) out.push("i");
      else out.push("ʝ");
      continue;
    }
    out.push(c === "ü" ? "u" : c);
  }
  return out;
}

/** Splits units into syllables: [{ onset, nucleus, coda }] with nucleus as a vowel list. */
function syllables(units) {
  // Vowel groups: two strong vowels, or an accented weak one, start a new syllable.
  const sylls = [];
  let i = 0;
  let onset = [];
  while (i < units.length) {
    const u = units[i];
    if (!isVowel(u)) { onset.push(u); i++; continue; }
    const nucleus = [u];
    i++;
    while (i < units.length && isVowel(units[i])) {
      const prev = nucleus[nucleus.length - 1];
      const next = units[i];
      const hiatus = (isStrong(prev) && isStrong(next)) || "íú".includes(next) || "íú".includes(prev);
      if (hiatus || nucleus.length === 3) break;
      nucleus.push(next);
      i++;
    }
    sylls.push({ onset, nucleus, coda: [] });
    onset = [];
  }
  // What is left after the last vowel closes the last syllable.
  if (onset.length && sylls.length) sylls[sylls.length - 1].coda.push(...onset);
  // Between vowels: one consonant opens the next syllable; of two, a valid onset stays together.
  for (let s = 1; s < sylls.length; s++) {
    const on = sylls[s].onset;
    if (on.length <= 1) continue;
    const lastTwo = on.slice(-2).join("");
    const keep = ONSETS.has(lastTwo) ? 2 : 1;
    sylls[s - 1].coda.push(...on.slice(0, on.length - keep));
    sylls[s].onset = on.slice(on.length - keep);
  }
  return sylls;
}

function stressIndex(word, sylls) {
  const at = sylls.findIndex((s) => s.nucleus.some(isAccented));
  if (at >= 0) return at;
  if (sylls.length === 1) return 0;
  const last = word.toLowerCase().at(-1);
  // Final -y counts as a consonant for stress (jersey), though it sounds like a vowel.
  return "aeiouns".includes(last) ? sylls.length - 2 : sylls.length - 1;
}

function nucleusIpa(nucleus, stressed) {
  const plain = nucleus.map((v) => ACUTE[v] ?? v);
  if (plain.length === 1) return plain[0];
  // The syllable's peak: a strong vowel, or an accented one, or the second of iu/ui.
  let peak = nucleus.findIndex(isAccented);
  if (peak < 0) peak = plain.findIndex(isStrong);
  if (peak < 0) peak = plain.length - 1;
  return plain
    .map((v, k) => {
      if (k === peak) return v;
      if (k < peak) return v === "i" ? "j" : "w";
      return v === "i" ? "i̯" : "u̯";
    })
    .join("");
}

/** Allophones by position; prev is the phone before, "" at the start of the word. */
function consonantIpa(c, prev) {
  if (c === "rr") return "r";
  if (c === "r") return prev === "" || prev === "n" || prev === "l" || prev === "s" ? "r" : "ɾ";
  if (c === "b") return prev === "" || prev === "m" || prev === "n" ? "b" : "β";
  if (c === "d") return prev === "" || prev === "n" || prev === "l" ? "d" : "ð";
  if (c === "g") return prev === "" || prev === "n" || prev === "ŋ" ? "g" : "ɣ";
  return c;
}

function wordIpa(word) {
  const clean = word.replace(/[¿?¡!.,]/g, "");
  if (!clean) return "";
  const units = tokens(clean);
  const sylls = syllables(units);
  if (!sylls.length) return clean;
  const stress = stressIndex(clean, sylls);
  let prev = "";
  const out = sylls.map((s, si) => {
    let text = "";
    const emit = (c, nextC) => {
      let p = consonantIpa(c, prev);
      // Nasal assimilation: invierno imˈbjeɾ.no, banco ˈbaŋ.ko.
      if (c === "n" && nextC) {
        if (nextC === "b" || nextC === "p" || nextC === "m") p = "m";
        else if (nextC === "k" || nextC === "g" || nextC === "x") p = "ŋ";
      }
      text += p;
      prev = c === "n" && p !== "n" ? p : c;
    };
    const nextOnset = (k, list) => list[k + 1] ?? sylls[si + 1]?.onset[0] ?? null;
    s.onset.forEach((c, k) => emit(c, s.onset[k + 1] ?? null));
    text += nucleusIpa(s.nucleus, si === stress);
    prev = "a";
    s.coda.forEach((c, k) => emit(c, nextOnset(k, s.coda)));
    return (si === stress && sylls.length > 1 ? "ˈ" : "") + text;
  });
  // ˈ replaces the dot before a stressed syllable: θeɾˈβe.θa, not θeɾ.ˈβe.θa.
  return out.reduce((acc, s) => (!acc ? s : s.startsWith("ˈ") ? acc + s : `${acc}.${s}`), "");
}

export const ipaOf = (text) => text.split(/\s+/).map(wordIpa).filter(Boolean).join(" ");
