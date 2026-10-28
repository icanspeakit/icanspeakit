// The numbers on the teacher dashboard (KLASSEN-TIERED-PROMPT.md, Tier 3), from the rows of
// uebung_versuche. Pure functions, no DOM, no Supabase, so they can be checked in Node.
//
// Rules the dashboard keeps:
// - A student's rows count from when they joined *this* class. RLS allows from joining
//   any of the teacher's classes; the narrower date is applied here.
// - The sources are never mixed into one number without saying so. The overview's median
//   uses "selbst gemeldet" rows only; rows from the live quiz (Tier 6) or server grading
//   (Tier 5) get their own column when they exist.
// - A row without a score (Sprechen, open Schreiben, Aussprache) counts as practised, never
//   as 0 %.

const DAY = 86_400_000;
export const INAKTIV_TAGE = 7;

export const KINDS = {
  g: "Grammatik", w: "Wortschatz", x: "Prüfung", h: "Hören", l: "Lesen", k: "Kultur",
  f: "Führerschein", s: "Schreiben", sp: "Sprechen", a: "Aussprache", q: "Quiz", vs: "Kartenset",
  st: "Stunde",
};

/** "g:verben-praepositionen" → { kind: "g", id: "verben-praepositionen" } */
export function splitRef(ref) {
  const i = ref.indexOf(":");
  return { kind: ref.slice(0, i), id: ref.slice(i + 1) };
}

/**
 * The topic a row belongs to in the heat table: one column per thing a teacher would
 * assign. Sub-modes fold into their topic (g:artikel/diktat → g:artikel); an exam set's
 * parts fold into the set (x:telc/telc-b1-1/lesen-1 → x:telc/telc-b1-1; x:testdaf/lesen1
 * → x:testdaf); numbered prompts fold into their page (sp:b1b2/3 → sp:b1b2).
 */
export function themaRef(ref) {
  const { kind, id } = splitRef(ref);
  const parts = id.split("/");
  if (kind === "x") {
    if (parts.length >= 3) return `x:${parts[0]}/${parts[1]}`;
    if (parts[0] === "dtz") return ref;
    return `x:${parts[0]}`;
  }
  if (kind === "g" || kind === "sp") return `${kind}:${parts[0]}`;
  return ref;
}

/** A readable name: from `names` (built from the site's catalogs), else the id tidied up. */
export function refLabel(ref, names = {}) {
  if (names[ref]) return names[ref];
  // A Stunde (st:a1-1/2/3/1/90): "A1.1 · Block 2 · Stunde 1 von 3".
  const st = /^st:([abc])([12])(?:-([12]))?\/(\d+)\/(\d+)\/(\d+)\/\d+$/.exec(ref);
  if (st) return `${st[1].toUpperCase()}${st[2]}${st[3] ? `.${st[3]}` : ""} · Block ${st[4]} · Stunde ${st[6]} von ${st[5]}`;
  const { id } = splitRef(ref);
  const s = id.replace(/[/_-]+/g, " ").replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const kindLabel = (ref) => KINDS[splitRef(ref).kind] ?? "";

const median = (xs) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const scored = (r) => r.gesamt != null && r.gesamt > 0;

/**
 * Rows per member, each only from that member's join date on.
 * @param {{user_id:string, beigetreten_at:string}[]} members
 * @param {object[]} rows uebung_versuche rows, any order
 * @returns {Map<string, object[]>} user_id → rows, newest first
 */
export function rowsByMember(members, rows) {
  const since = new Map(members.map((m) => [m.user_id, Date.parse(m.beigetreten_at)]));
  const out = new Map(members.map((m) => [m.user_id, []]));
  for (const r of rows) {
    const from = since.get(r.user_id);
    if (from == null || Date.parse(r.beendet_at) < from) continue;
    out.get(r.user_id).push(r);
  }
  for (const list of out.values()) list.sort((a, b) => Date.parse(b.beendet_at) - Date.parse(a.beendet_at));
  return out;
}

/**
 * One row per student for the Übersicht.
 * @returns {{ user_id, name, zuletzt: string|null, saetze: number, minuten: number,
 *             median: number|null, live: number|null, inaktiv: boolean }[]}
 */
export function uebersicht(members, byMember, now = Date.now()) {
  const weekFrom = now - 7 * DAY;
  return members.map((m) => {
    const rows = byMember.get(m.user_id) ?? [];
    const week = rows.filter((r) => Date.parse(r.beendet_at) >= weekFrom);
    const share = (src) => week.filter((r) => r.quelle === src && scored(r)).map((r) => r.richtig / r.gesamt);
    const zuletzt = rows[0]?.beendet_at ?? null;
    return {
      user_id: m.user_id,
      name: m.anzeigename,
      zuletzt,
      saetze: week.length,
      minuten: Math.round(week.reduce((n, r) => n + (r.dauer_ms ?? 0), 0) / 60_000),
      median: median(share("client")),
      live: median(share("live")),
      inaktiv: !zuletzt || Date.parse(zuletzt) < now - INAKTIV_TAGE * DAY,
    };
  });
}

/**
 * The heat table: students × topics the class actually touched.
 * @returns {{ themen: string[], zellen: Map<string, Map<string, {richtig, gesamt, saetze, geuebt}>> }}
 *   zellen: user_id → thema → totals. `geuebt` counts rows without a score.
 */
export function themen(members, byMember) {
  const zellen = new Map();
  const seen = new Map(); // thema → number of rows, to order the columns
  for (const m of members) {
    const cells = new Map();
    for (const r of byMember.get(m.user_id) ?? []) {
      const th = themaRef(r.uebung_ref);
      const c = cells.get(th) ?? { richtig: 0, gesamt: 0, saetze: 0, geuebt: 0 };
      c.saetze += 1;
      if (scored(r)) {
        c.richtig += r.richtig;
        c.gesamt += r.gesamt;
      } else c.geuebt += 1;
      cells.set(th, c);
      seen.set(th, (seen.get(th) ?? 0) + 1);
    }
    zellen.set(m.user_id, cells);
  }
  // Most practised first: the topics the class works on now lead the table.
  const order = Object.keys(KINDS);
  const themenList = [...seen.keys()].sort(
    (a, b) => seen.get(b) - seen.get(a) || order.indexOf(splitRef(a).kind) - order.indexOf(splitRef(b).kind) || a.localeCompare(b),
  );
  return { themen: themenList, zellen };
}

/** 0..4 for the colour step of a share 0..1. Five even bins; the number is in the cell anyway. */
export const stufe = (share) => Math.min(4, Math.floor(share * 5));

/** "3× eingefügt, 2× Tab gewechselt" — or "" when there is nothing to say. */
export function hinweisText(h, t = (k, de, v) => de.replace(/\{(\w+)\}/g, (_, x) => v[x])) {
  if (!h) return "";
  const parts = [];
  if (h.paste) parts.push(t("kl.d.hint.paste", "{n}× Text eingefügt", { n: h.paste }));
  if (h.blur) parts.push(t("kl.d.hint.blur", "{n}× Tab gewechselt", { n: h.blur }));
  if (h.schnell) parts.push(t("kl.d.hint.fast", "{n}× sehr schnell geantwortet", { n: h.schnell }));
  return parts.join(", ");
}

/** CSV for German Excel: UTF-8 with BOM, ";" between fields, CRLF between lines. */
export function csv(header, rows) {
  const cell = (v) => {
    let s = v == null ? "" : String(v);
    // Students choose their own display name. One starting with = + - @ would run as a
    // formula when the teacher opens the file; a leading ' makes Excel show it as text.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
