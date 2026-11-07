// Bruno at the desk: dates and names as the papers write them. Dates are kept as ISO strings
// ("2027-03-14") and shown the Spanish way ("14/03/2027"); all maths runs in UTC days, so no
// time zone or summer time can shift a deadline by one. (Function names are kept from the
// German game: deDatum = the date as printed on the papers.)

const DAY = 86400000;
const WOCHENTAGE = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

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

/** Passports write the surname in capitals. */
export const grossName = (s) => s.toLocaleUpperCase("es-ES");

/**
 * Do two spellings of one name mean the same person's name? Case does not matter, and neither do
 * accents, because capitals on a passport often drop them (GARCIA = García). Ñ stays its own
 * letter, and a missing or extra letter (Gutiérez for Gutiérrez) does not pass.
 */
export function gleicherName(a, b) {
  const n = (s) => String(s).trim().normalize("NFD").replace(/([^Nn])\p{M}+/gu, "$1").normalize("NFC").toLocaleUpperCase("es-ES");
  return n(a) === n(b);
}
