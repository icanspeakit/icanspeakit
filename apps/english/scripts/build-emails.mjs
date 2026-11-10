// Builds the icanspeak English e-mails from emails/content.mjs + emails/layout.mjs.
//
//   node scripts/build-emails.mjs
//
// Writes:
//   emails/dist/<id>.html   — Brevo-ready. Paste into Brevo's HTML editor, or upload with
//                             scripts/brevo-upload-templates.mjs. Brevo tags left intact,
//                             images point at https://icanspeak.it/english/email/.
//   emails/preview.html     — every mail × every sample contact, Brevo tags rendered,
//                             images inlined, for review in any browser. Not for sending.
//
// Also fails the build if a link points at a page that does not exist in src/pages.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layout } from "../emails/layout.mjs";
import { all, samples } from "../emails/content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://icanspeak.it/english";

// ---- 1. link check -----------------------------------------------------------------
const pagesDir = path.join(ROOT, "src/pages");
function pageExists(p) {
  const clean = p.replace(/\/$/, "") || "/index";
  const cands = [`${clean}.astro`, `${clean}/index.astro`, `${clean}.ts`];
  if (cands.some((c) => fs.existsSync(path.join(pagesDir, c)))) return true;
  // Grammar topics are served by src/pages/[id].astro from two sources.
  const id = clean.slice(1);
  if (/^[a-z0-9-]+$/.test(id)) {
    if (fs.existsSync(path.join(ROOT, "src/data/grammatik", `${id}.json`))) return true;
    const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/grammatik.json"), "utf8"));
    if (legacy.some((t) => (t.id ?? t.slug) === id)) return true;
  }
  return false;
}
const problems = [];
for (const m of all) {
  const html = layout(m, LIVE);
  for (const [, href] of html.matchAll(/href="(https:\/\/englishacademy\.com[^"]*)"/g)) {
    const u = new URL(href.replaceAll("&amp;", "&"));
    if (!pageExists(u.pathname)) problems.push(`${m.id}: ${u.pathname}`);
  }
}
if (problems.length) {
  console.error("Links to pages that do not exist:\n  " + [...new Set(problems)].join("\n  "));
  process.exit(1);
}

// ---- 2. Brevo-ready files ------------------------------------------------------------
fs.mkdirSync(path.join(ROOT, "emails/dist"), { recursive: true });
const manifest = [];
for (const m of all) {
  fs.writeFileSync(path.join(ROOT, "emails/dist", `${m.id}.html`), layout(m, LIVE));
  manifest.push({ id: m.id, brevoName: m.brevoName, kind: m.kind, day: m.day ?? null, draft: !!m.draft, subject: m.subject, preheader: m.preheader });
}
fs.writeFileSync(path.join(ROOT, "emails/dist/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// ---- 3. preview ----------------------------------------------------------------------
// A tiny renderer for the subset of Brevo's template language these mails use:
// {{ contact.X }}, {{ params.X }}, {% if a %}, {% if a == "b" %}, {% else %}, {% endif %}.
function render(tpl, ctx) {
  const get = (expr) => expr.trim().split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  const tokens = tpl.split(/({%[^%]*%})/);
  let i = 0;
  function block(stopAt) {
    let out = "";
    while (i < tokens.length) {
      const t = tokens[i];
      const tag = t.match(/^{%\s*(\w+)\s*(.*?)\s*%}$/);
      if (!tag) { out += t; i++; continue; }
      const [, kw, arg] = tag;
      if (stopAt.includes(kw)) return out;
      i++;
      if (kw === "if") {
        const eq = arg.match(/^(.+?)\s*==\s*"(.*)"$/);
        const cond = eq ? String(get(eq[1]) ?? "") === eq[2] : !!get(arg);
        const yes = block(["else", "endif"]);
        let no = "";
        if (tokens[i]?.match(/{%\s*else/)) { i++; no = block(["endif"]); }
        i++; // endif
        out += cond ? yes : no;
      }
    }
    return out;
  }
  return block([]).replace(/{{\s*([\w.]+)\s*}}/g, (_, k) => {
    if (k === "unsubscribe" || k === "doubleoptin" || k === "mirror") return "#";
    return String(get(k) ?? "");
  });
}

const imgDir = path.join(ROOT, "public/email");
const inline = (html) =>
  html.replace(/https:\/\/englishacademy\.com\/email\/([\w-]+\.png)/g, (_, f) =>
    `data:image/png;base64,${fs.readFileSync(path.join(imgDir, f)).toString("base64")}`);

const esc = (s) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const frames = [];
for (const m of all) {
  // Only mails whose body actually branches get one frame per sample.
  const branches = m.id === "d04-ziel" ? samples : m.id === "d00-start" ? [samples[0], samples[1], samples[5]] : [samples[0]];
  // A mail with its own params (the purchase mail) renders once per params set instead.
  const variants = m.previews ? m.previews.map((v) => ({ label: v.label, html: inline(render(layout(m, LIVE), { contact: {}, params: v.params })) })) : branches.map((s) => {
    const ctx = { contact: s.contact, params: { VORNAME: s.contact.FIRSTNAME } };
    return { label: branches.length > 1 ? s.label : "", html: inline(render(layout(m, LIVE), ctx)) };
  });
  frames.push({ m, variants });
}

const preview = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>icanspeak English E-Mails — Vorschau</title>
<style>
:root{--bg:#eef1f5;--ink:#1a2230;--muted:#5b6472;--card:#fff;--teal:#0f766e;--line:#dfe3ea}
@media (prefers-color-scheme:dark){:root{--bg:#0f141c;--ink:#e9edf3;--muted:#9aa4b2;--card:#182029;--teal:#5eead4;--line:#2b3642}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{padding:28px 20px 8px;max-width:1200px;margin:auto}h1{margin:0 0 6px;font-size:24px}header p{margin:0;color:var(--muted);max-width:760px}
.mail{max-width:1200px;margin:22px auto;padding:0 16px}
.meta{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin-bottom:12px}
.meta b{font-size:16px}.meta .s{margin-top:6px}.meta .ph{color:var(--muted)}
.tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;background:#ccfbf1;color:#115e59;margin-left:6px;vertical-align:1px}
.tag.draft{background:#fef9c3;color:#713f12}.tag.tx{background:#e0e7ff;color:#3730a3}
.row{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px}
.v{flex:0 0 auto;width:390px}.v span{display:block;font-size:13px;font-weight:600;color:var(--muted);margin:0 0 6px 4px}
iframe{width:390px;height:1080px;border:1px solid var(--line);border-radius:16px;background:#fff}
@media (max-width:440px){.v,iframe{width:calc(100vw - 34px)}}
</style></head><body>
<header><h1>icanspeak English · E-Mails</h1>
<p>Vorschau aller Mails in Handybreite (390px). Die Onboarding-Serie startet, wenn jemand den Newsletter bestätigt. Mails mit Varianten zeigen jede Variante nebeneinander (seitlich scrollen). Links sind echt; „Abmelden“ ist hier nur ein Platzhalter.</p></header>
${frames
  .map(
    ({ m, variants }) => `<section class="mail">
<div class="meta"><b>${m.day != null ? `Tag ${m.day} · ` : ""}${esc(m.brevoName)}</b>${m.kind === "marketing" ? `<span class="tag">Serie</span>` : `<span class="tag tx">${m.kind === "doi" ? "Double Opt-in" : "Transaktional"}</span>`}${m.draft ? `<span class="tag draft">Entwurf</span>` : ""}
<div class="s"><b>Betreff:</b> ${esc(m.subject)}</div><div class="ph"><b>Vorschautext:</b> ${esc(m.preheader)}</div></div>
<div class="row">${variants.map((v) => `<div class="v">${v.label ? `<span>${esc(v.label)}</span>` : ""}<iframe loading="lazy" title="${esc(m.subject)}" srcdoc="${esc(v.html)}"></iframe></div>`).join("")}</div>
</section>`,
  )
  .join("\n")}
</body></html>`;
fs.writeFileSync(path.join(ROOT, "emails/preview.html"), preview);
console.log(`built ${all.length} mails → emails/dist/, preview → emails/preview.html`);
