// Which topic pages linked from the A1 lesson plans can't show their rule or examples
// cleanly in present mode (?mode=present, src/lib/praesentation.js)? A list for whoever
// fixes the content; nothing here writes or invents anything.
//
//   node scripts/audit-praesentation.mjs            A1 (a1-1, a1-2)
//   node scripts/audit-praesentation.mjs b1-1 b1-2  other plan levels
//
// It builds every plan of those levels (every block, 1–6 Stunden) the way
// /teachers/timetable does, collects every material link, and checks each one.
// Loads the site's modules through Vite, because they import JSON and use import.meta.glob.
// Prints Markdown to stdout.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// pnpm keeps vite inside astro's own dependencies; reach it from there.
const fromAstro = createRequire(createRequire(import.meta.url).resolve("astro/package.json"));
const { createServer } = await import(pathToFileURL(fromAstro.resolve("vite")).href);

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : ["a1-1", "a1-2"];
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
try {
  const { planLevels } = await vite.ssrLoadModule("/src/lib/stundenplanLinks.js");
  const { build, cefrOf } = await vite.ssrLoadModule("/src/lib/stundenplan.js");
  const { deckIssues } = await vite.ssrLoadModule("/src/lib/praesentation.js");

  const dir = "src/data/grammatik";
  const workspaces = new Map();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const w = JSON.parse(readFileSync(join(dir, f), "utf8"));
    workspaces.set(w.slug ?? w.id, { ...w, file: `${dir}/${f}` });
  }

  // Quiz topics: grammar pages with questions only (src/data/grammatik.json, no workspace).
  const quizTopics = new Set(JSON.parse(readFileSync("src/data/grammatik.json", "utf8")).map((t) => t.id));

  const levels = planLevels().filter((l) => wanted.includes(l.id));
  const links = new Map(); // href → { name, where: Set }
  const unlinked = new Map(); // grammar line → Set(where)
  for (const level of levels) {
    level.blocks.forEach((block, bi) => {
      const where = `${level.label} Block ${bi + 1}`;
      block.grammatik.forEach((g, j) => {
        if (!block.grammar[j].length) (unlinked.get(g) ?? unlinked.set(g, new Set()).get(g)).add(where);
      });
      for (let n = 1; n <= 6; n++) {
        const plan = build({ level, block, n, minutes: 90, links: { grammar: block.grammar, words: level.words, game: level.game } });
        for (const lesson of plan.lessons) for (const ph of lesson.phases) for (const l of ph.links) {
          const e = links.get(l.href) ?? { name: l.name, where: new Set() };
          e.where.add(where);
          links.set(l.href, e);
        }
      }
    });
  }

  const cefr = [...new Set(levels.map((l) => cefrOf(l.label)))].join("/");
  const problems = [];
  const fine = [];
  const other = [];
  for (const [href, { name, where }] of [...links].sort(([a], [b]) => a.localeCompare(b))) {
    const at = [...where].join(", ");
    const slug = href.slice(1);
    if (!workspaces.has(slug) && !quizTopics.has(slug)) {
      other.push(`- \`${href}\` ${name} – keine Themenseite, öffnet normal (${at})`);
      continue;
    }
    const w = workspaces.get(slug);
    if (!w) {
      problems.push(`- **\`${href}\` ${name}** (${at})\n  - nur Quiz-Thema in grammatik.json: keine Regel und keine Beispiele, Präsentationsmodus nicht verfügbar`);
      continue;
    }
    const issues = deckIssues(w, cefrOf(levels[0].label));
    if (w.status === "entwurf") issues.unshift("Entwurf (status: entwurf) – Inhalt ungeprüft, Seite noindex");
    if (issues.length) problems.push(`- **\`${href}\` ${name}** – \`${w.file}\` (${at})\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    else fine.push(`\`${href}\``);
  }

  console.log(`# Präsentationsmodus: Audit ${levels.map((l) => l.label).join(", ")} (Niveau ${cefr})\n`);
  console.log(`## Seiten mit Lücken (${problems.length})\n`);
  console.log(problems.join("\n") || "Keine.");
  console.log(`\n## Grammatik im Plan ohne Themenseite (${unlinked.size})\n`);
  console.log([...unlinked].map(([g, w]) => `- „${g}“ (${[...w].join(", ")})`).join("\n") || "Keine.");
  console.log(`\n## Ohne Befund (${fine.length})\n\n${fine.join(", ")}`);
  console.log(`\n## Kein Präsentationsmodus nötig\n\n${other.join("\n")}`);
} finally {
  await vite.close();
}
