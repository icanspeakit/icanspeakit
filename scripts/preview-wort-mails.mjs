// Renders the Wortgeschichte mails for review, without Brevo:
//   node scripts/preview-wort-mails.mjs
// → emails/dist/wort-vorschau-taeglich-<slug>.html (one per entry) and
//   emails/dist/wort-vorschau-woechentlich.html (all entries as one digest).
// Drafts are included on purpose: this is for reading them. Brevo tags ({{ unsubscribe }},
// {{ contact.EMAIL }} …) stay as they are; Brevo fills them at send time.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { daily, weekly } from "../emails/wortgeschichte.mjs";
import { byDate, slugOf, berlinDate } from "../src/lib/wortgeschichteCore.js";

const DIR = "src/content/wortgeschichte";
const entries = byDate(
  await Promise.all(
    (await readdir(DIR)).filter((f) => f.endsWith(".json")).map(async (f) => JSON.parse(await readFile(path.join(DIR, f), "utf8"))),
  ),
);
await mkdir("emails/dist", { recursive: true });
for (const e of entries) {
  const m = daily(e);
  await writeFile(`emails/dist/wort-vorschau-taeglich-${slugOf(e)}.html`, m.html);
  console.log(`täglich  ${slugOf(e)}: „${m.subject}“`);
}
const w = weekly(entries, entries.at(-1)?.publishOn ?? berlinDate());
await writeFile("emails/dist/wort-vorschau-woechentlich.html", w.html);
console.log(`wöchentlich: „${w.subject}“`);
