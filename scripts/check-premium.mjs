// Validates src/data/premium-features.json and src/data/produkte.json. Runs in prebuild.
//
// Fails the build when: an id repeats, a gate type is unknown, a feature points at a page
// that does not exist, a metered feature has no numeric limits, or a feature is unlocked by
// a product that produkte.json does not know (wildcards like "pack_*" must match at least
// one product), or a feature's name / description / free-line key is missing from
// public/i18n/en.json, the base dictionary (other languages are validate:i18n's job).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const features = read("src/data/premium-features.json");
const produkte = read("src/data/produkte.json");
const de = read("public/i18n/en.json"); // the base dictionary (was de.json in deutschacademy)

const GATES = new Set(["content", "meter", "soft", "server"]);
const errors = [];
const ids = new Set();
const productIds = new Set(produkte.map((p) => p.id));
const known = (p) =>
  p.endsWith("*") ? [...productIds].some((id) => id.startsWith(p.slice(0, -1))) : productIds.has(p) || p === "teacher";

function pageExists(route) {
  const base = join(root, "src/pages", route.replace(/^\//, ""));
  return [".astro", "/index.astro", ".md", ".ts", ".js"].some((ext) => existsSync(base + ext)) || existsSync(base);
}

for (const f of features) {
  if (ids.has(f.id)) errors.push(`duplicate feature id "${f.id}"`);
  ids.add(f.id);
  if (!GATES.has(f.gate)) errors.push(`${f.id}: unknown gate "${f.gate}"`);
  if (!Array.isArray(f.unlockedBy) || !f.unlockedBy.length) errors.push(`${f.id}: unlockedBy is empty`);
  for (const p of f.unlockedBy ?? []) if (!known(p)) errors.push(`${f.id}: unlockedBy "${p}" matches no product in produkte.json`);
  if (f.gate === "meter" && !(Number.isInteger(f.free?.limit) && Number.isInteger(f.paid?.limit)))
    errors.push(`${f.id}: a metered feature needs integer free.limit and paid.limit`);
  if (f.live && !pageExists(f.page)) errors.push(`${f.id}: live, but page ${f.page} does not exist`);
  if (!f.i18n?.startsWith("premium.feature.")) errors.push(`${f.id}: i18n key must start with premium.feature.`);
  for (const k of [f.i18n, `${f.i18n}.desc`, `${f.i18n}.free`]) if (!(k in de)) errors.push(`${f.id}: "${k}" missing in public/i18n/en.json`);
  // The Premium price card's line (src/lib/preise.js premiumCardItems).
  if (f.live && f.unlockedBy.includes("premium") && !(`preise.card.${f.id}` in de)) errors.push(`${f.id}: "preise.card.${f.id}" missing in public/i18n/en.json`);
}

const pids = new Set();
for (const p of produkte) {
  if (pids.has(p.id)) errors.push(`duplicate product id "${p.id}"`);
  pids.add(p.id);
  if (!Array.isArray(p.lookupKeys) || !p.lookupKeys.length) errors.push(`${p.id}: lookupKeys missing`);
}

if (errors.length) {
  console.error("check:premium failed:\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(`check:premium ok — ${features.length} features, ${produkte.length} products`);
