// Brunos Bürgeramt: dates and names as the papers write them. Dates are kept as ISO strings
// ("2027-03-14") and shown German-style ("14.03.2027"); all maths runs in UTC days, so no
// time zone or summer time can shift a deadline by one.

const DAY = 86400000;
const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

const utc = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** "2027-03-14" → "14.03.2027" */
export function deDatum(d) {
  const [y, m, t] = d.split("-");
  return `${t}.${m}.${y}`;
}

/** "14.03.2027" → "2027-03-14" (null when it isn't one) */
export function isoDatum(s) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "14.3." – the short form Regi writes on the memo */
export function kurzDatum(d) {
  const [, m, t] = d.split("-");
  return `${Number(t)}.${Number(m)}.`;
}

export const plusTage = (d, n) => iso(utc(d) + n * DAY);
/** b − a in days */
export const tageZwischen = (a, b) => Math.round((utc(b) - utc(a)) / DAY);
export const wochentag = (d) => WOCHENTAGE[new Date(utc(d)).getUTCDay()];

/** The ID card writes family names in capitals; Ä/Ö/Ü/ß may be spelt AE/OE/UE/SS there. */
export const grossName = (s) => s.toLocaleUpperCase("de-DE");
export const ohneUmlaut = (s) =>
  s.replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
/** Müller → Muller: the mistake Tag 6 is about */
export const umlautWeg = (s) =>
  s.replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/Ü/g, "U").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
export const hatUmlaut = (s) => /[ÄÖÜäöü]/.test(s);

/**
 * Do two spellings of one name mean the same person's name? Case does not matter (the ID
 * writes capitals); an umlaut may stand as AE/OE/UE (MUELLER = Müller); a missing dot
 * (Muller) does not pass.
 */
export function gleicherName(a, b) {
  const n = (s) => ohneUmlaut(String(s).trim()).toLocaleUpperCase("de-DE");
  return n(a) === n(b);
}
