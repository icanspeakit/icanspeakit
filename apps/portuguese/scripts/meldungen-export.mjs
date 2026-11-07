// Export open reports + content findings into one batch to fix (PROBLEM-MELDEN-QA-TIERED-PROMPT.md, Tier 5).
//
//   node scripts/meldungen-export.mjs [--ohne-db] [--nur-review]
//
// Reads public.meldungen (status 'offen') with SUPABASE_SERVICE_ROLE_KEY from .env.local, merges
// them with docs/inhalte-qa/befunde.json (open findings of the script and the review), groups
// everything by data file → ref, resolves each ref to the item as it is NOW
// (scripts/lib/inhalte-resolve.mjs) and marks "schon geändert?" where the fingerprint no longer
// matches. Several reports on one ref collapse into one entry with a count.
//
// Writes docs/inhalte-qa/batch-<YYYY-MM-DD>.json and .md. In the JSON, set `entscheidung` per
// entry to "erledigt" | "kein_fehler" | "doppelt", then fix and run
// scripts/meldungen-schliessen.mjs. See docs/inhalte-qa/ABLAUF.md.
import fs from "node:fs";
import path from "node:path";
import { resolveRef } from "./lib/inhalte-resolve.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const OUT = path.join(ROOT, "docs", "inhalte-qa");
const args = process.argv.slice(2);
const day = new Date().toLocaleDateString("sv-SE"); // local date, YYYY-MM-DD

function env() {
  try {
    return Object.fromEntries(fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
  } catch { return {}; }
}

async function openReports() {
  if (args.includes("--ohne-db") || args.includes("--nur-review")) return [];
  const e = { ...env(), ...process.env };
  if (!e.PUBLIC_SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("meldungen-export: SUPABASE_SERVICE_ROLE_KEY / PUBLIC_SUPABASE_URL missing (.env.local); use --ohne-db for findings only.");
    process.exit(1);
  }
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${e.PUBLIC_SUPABASE_URL}/rest/v1/meldungen?status=eq.offen&select=id,created_at,ref,fingerprint,quelle,grund,text,snapshot,seite,plattform,ui_sprache,posthog_session&order=created_at.asc`, {
      headers: { apikey: e.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${e.SUPABASE_SERVICE_ROLE_KEY}`, range: `${from}-${from + 999}` },
    });
    if (!res.ok) { console.error(`meldungen-export: Supabase ${res.status}: ${await res.text()}`); process.exit(1); }
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

const reports = await openReports();
let befunde = [];
try { befunde = JSON.parse(fs.readFileSync(path.join(OUT, "befunde.json"), "utf8")); } catch {}
if (args.includes("--nur-review")) befunde = befunde.filter((b) => b.herkunft === "review");
befunde = befunde.filter((b) => (b.status ?? "offen") === "offen");

// One entry per ref: reports + findings on it.
const byRef = new Map();
const entry = (ref) => {
  if (!byRef.has(ref)) {
    const now = resolveRef(ref);
    byRef.set(ref, { ref, datei: now?.datei ?? "(unbekannt)", jetzt: now ? { text: now.text, loesung: now.loesung } : null, fingerprintJetzt: now?.fingerprint ?? null, meldungen: [], befunde: [], anzahl: 0, entscheidung: null, notiz: "" });
  }
  return byRef.get(ref);
};
for (const r of reports) {
  const e = entry(r.ref);
  e.meldungen.push({ id: r.id, am: r.created_at, quelle: r.quelle, grund: r.grund, text: r.text, seite: r.seite, plattform: r.plattform, ui_sprache: r.ui_sprache, posthog_session: r.posthog_session, fingerprint: r.fingerprint, snapshot: r.snapshot });
  e.anzahl++;
}
for (const b of befunde) {
  const e = entry(b.ref);
  e.befunde.push({ herkunft: b.herkunft, check: b.check, schwere: b.schwere, grund: b.grund, text: b.text, vorschlag: b.vorschlag ?? null, fingerprint: b.fingerprint ?? null });
  if (e.datei === "(unbekannt)" && b.datei) e.datei = b.datei;
}
for (const e of byRef.values()) {
  const fps = [...e.meldungen.map((m) => m.fingerprint), ...e.befunde.map((b) => b.fingerprint)].filter(Boolean);
  e.schonGeaendert = Boolean(e.fingerprintJetzt && fps.some((fp) => fp !== e.fingerprintJetzt));
}

const entries = [...byRef.values()].sort((a, b) => a.datei.localeCompare(b.datei) || b.anzahl - a.anzahl || a.ref.localeCompare(b.ref, "de", { numeric: true }));
fs.mkdirSync(OUT, { recursive: true });
const jsonPath = path.join(OUT, `batch-${day}.json`);
fs.writeFileSync(jsonPath, JSON.stringify({ erstellt: new Date().toISOString(), meldungen: reports.length, befunde: befunde.length, eintraege: entries }, null, 2) + "\n");

const SEV = { error: "Fehler", warn: "Warnung", info: "Hinweis" };
let md = `# Batch ${day}\n\n${reports.length} offene Meldungen, ${befunde.length} offene Befunde, ${entries.length} Einträge. Entscheidungen in \`batch-${day}.json\` (\`entscheidung\`: erledigt | kein_fehler | doppelt), dann \`node scripts/meldungen-schliessen.mjs docs/inhalte-qa/batch-${day}.json <commit>\`.\n`;
let lastFile = "";
for (const e of entries) {
  if (e.datei !== lastFile) { md += `\n## ${e.datei}\n`; lastFile = e.datei; }
  md += `\n### \`${e.ref}\`${e.anzahl > 1 ? ` · ${e.anzahl} Meldungen` : e.anzahl ? " · 1 Meldung" : ""}${e.schonGeaendert ? " · **schon geändert?**" : ""}\n`;
  if (e.jetzt) md += `\nJetzt: „${e.jetzt.text}“${e.jetzt.loesung ? ` → **${e.jetzt.loesung}**` : ""}\n`;
  else md += `\nJetzt: (Ref nicht mehr gefunden)\n`;
  for (const m of e.meldungen) md += `\n- Meldung (${m.quelle}, ${m.grund}, ${m.am.slice(0, 10)}${m.plattform === "app" ? ", App" : ""})${m.text ? `: ${m.text}` : ""}${m.seite ? ` · ${m.seite}` : ""}`;
  for (const b of e.befunde) md += `\n- ${b.herkunft === "review" ? "Durchsicht" : "Skript"} · ${SEV[b.schwere] ?? b.schwere} · ${b.check ?? b.grund}: ${b.text}${b.vorschlag ? `\n  - **Vorschlag:** ${b.vorschlag}` : ""}`;
  md += "\n";
}
fs.writeFileSync(path.join(OUT, `batch-${day}.md`), md);
console.log(`meldungen-export: ${reports.length} Meldungen + ${befunde.length} Befunde → ${entries.length} Einträge → ${path.relative(ROOT, jsonPath)} (+ .md)`);
