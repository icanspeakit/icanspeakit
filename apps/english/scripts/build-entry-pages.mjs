// The Tier-5 entry pages (src/integrations/entry-pages.mjs) on an existing local build:
//   node scripts/build-entry-pages.mjs [dist/client]
// On Vercel the integration runs inside `astro build`; locally the adapter's own build:done
// hook fails first (Windows symlink EPERM), so this runs the same step by hand.
import path from "node:path";
import { buildEntryPages } from "../src/integrations/entry-pages.mjs";
const root = path.resolve(process.argv[2] ?? "dist/client");
await buildEntryPages(root, new URL("https://icanspeak.it/english"));
// …and the sitemap after it, with the language versions as xhtml:link.
const { writeSitemap } = await import("../src/integrations/sitemap.mjs");
await writeSitemap(root, new URL("https://icanspeak.it/english"));
