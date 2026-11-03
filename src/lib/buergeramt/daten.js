// Bruno's Front Desk: dates and names as the papers write them. Dates are kept as ISO strings
// ("2027-03-14") and shown the British way ("14/03/2027"); all maths runs in UTC days, so no
// time zone or summer time can shift a deadline by one. (Function names are kept from the
// German game: deDatum = the date as printed on the papers.)

const DAY = 86400000;
const WOCHENTAGE = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const utc = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** "2027-03-14" → "14/03/2027" */
export function deDatum(d) {
  const [y, m, t] = d.split("-");
  return `${t}/${m}/${y}`;
}

/** "14/03/2027" → "2027-03-14" (null when it isn't one) */
export function isoDatum(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "14/3" – the short form Regi writes on the memo */
export function kurzDatum(d) {
  const [, m, t] = d.split("-");
  return `${Number(t)}/${Number(m)}`;
}

export const plusTage = (d, n) => iso(utc(d) + n * DAY);
/** b − a in days */
export const tageZwischen = (a, b) => Math.round((utc(b) - utc(a)) / DAY);
export const wochentag = (d) => WOCHENTAGE[new Date(utc(d)).getUTCDay()];

/** ID documents write the surname in capitals. */
export const grossName = (s) => s.toLocaleUpperCase("en-GB");
// Left from the German game (Ä → AE on ID cards); English names have no umlauts, so these are
// no-ops for every English case and only kept so nothing that imports them breaks.
export const ohneUmlaut = (s) =>
  s.replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
export const umlautWeg = (s) =>
  s.replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/Ü/g, "U").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
export const hatUmlaut = (s) => /[ÄÖÜäöü]/.test(s);

/**
 * Do two spellings of one name mean the same person's name? Case does not matter (the ID
 * writes capitals), and a straight or curly apostrophe is the same (O'NEILL = O’Neill); a
 * missing or extra letter (Mackenzie for McKenzie) does not pass.
 */
export function gleicherName(a, b) {
  const n = (s) => ohneUmlaut(String(s).trim()).replace(/[’‘]/g, "'").toLocaleUpperCase("en-GB");
  return n(a) === n(b);
}
