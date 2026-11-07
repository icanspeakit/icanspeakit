// SessionStart hook (.claude/settings.local.json): lists the Sentry issues worth fixing, so a
// new Claude session here starts with them in view and offers to fix them.
//
// "Worth fixing" = the same rules as the e-mail alert "Wichtig → E-Mail" in Sentry:
// unresolved, seen in the last 7 days, live site or app (not development), no CSP reports,
// no browser-extension noise, and either a server error (Cloudflare Worker), ≥3 users,
// ≥50 events, or an outage. Fixed issues drop off once they are resolved in Sentry
// (commit message "Fixes DEUTSCHACADEMY-WEB-…" or resolve by hand).
//
// Needs SENTRY_READ_TOKEN in .env.local: a Sentry personal token with event:read,
// project:read, org:read (SENTRY_AUTH_TOKEN is the CI token and may only upload releases).
// Never fails a session: no token, no network, an error → it prints nothing.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const API = "https://de.sentry.io/api/0/organizations/englishacademy";
const NOISE = /__firefox__|ethereum|^Blocked '/;

function envLocal(key) {
  try {
    const line = readFileSync(ROOT + ".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith(key + "="));
    return line?.slice(key.length + 1).trim().replace(/^"|"$/g, "") || undefined;
  } catch {
    return undefined;
  }
}

async function issues(token, query) {
  const url = `${API}/issues/?statsPeriod=7d&limit=25&sort=freq&query=${encodeURIComponent(query)}`;
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Sentry ${r.status}`);
  return r.json();
}

async function main() {
  const token = process.env.SENTRY_READ_TOKEN || envLocal("SENTRY_READ_TOKEN");
  if (!token) return;
  const base = "is:unresolved lastSeen:-7d environment:[production,android] !event.type:csp";
  const [server, all, outages] = await Promise.all([
    issues(token, `${base} sdk.name:sentry.javascript.cloudflare`),
    issues(token, base),
    issues(token, "is:unresolved lastSeen:-7d issue.category:outage"),
  ]);
  const picked = new Map();
  const add = (i, why) => !NOISE.test(i.title) && !picked.has(i.shortId) && picked.set(i.shortId, { ...i, why });
  for (const i of outages) add(i, "Ausfall");
  for (const i of server) add(i, "Server");
  for (const i of all) {
    if (i.userCount >= 3) add(i, `${i.userCount} Nutzer`);
    else if (Number(i.count) >= 50) add(i, `${i.count} Ereignisse`);
  }
  if (!picked.size) return;

  const lines = [...picked.values()].map(
    (i) => `- ${i.shortId} (${i.why}, ${i.count}×, zuletzt ${i.lastSeen.slice(0, 10)}): ${i.title} — ${i.culprit ?? ""} ${i.permalink}`,
  );
  const context =
    `Sentry: ${picked.size} offene wichtige Fehler (letzte 7 Tage, ohne CSP/Erweiterungen):\n${lines.join("\n")}\n` +
    "Biete Edgar zu Beginn kurz an, sie zu beheben (Skill sentry:sentry-debug-issue). Commit mit " +
    "„Fixes <ID>“ schließt das Sentry-Issue beim Deploy. Nichts davon ungefragt pushen.";
  process.stdout.write(
    JSON.stringify({
      systemMessage: `Sentry: ${picked.size} wichtige(r) Fehler offen – ${[...picked.keys()].join(", ")}`,
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
    }),
  );
}

main().catch(() => {});
