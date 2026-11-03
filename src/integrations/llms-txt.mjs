// @ts-check
/* /llms.txt (llmstxt.org): a short Markdown index of the site for AI assistants, written after
 * the build from the HTML that was actually produced — like /sitemap.xml (./sitemap.mjs).
 *
 * The list below only says which pages belong in it and under which heading; every title and
 * description comes from that page's own <title> and <meta name="description">, so the file
 * can never describe a page differently from the page itself. A path that was not built, or
 * that is noindex (a draft), is left out without a word. The exam sections also list every
 * built page under them, so a new Übungssatz appears on the next build with no change here.
 * Kept to the key pages (the format asks for an index, not the whole site: < 10 KB).
 *
 * Website build only — the Android app build (PUBLIC_TARGET=app) does not add this. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlFiles, toPathname, NOINDEX, REFRESH } from './sitemap.mjs';
import { absoluteUrl } from '../lib/paths.js';

/** Headings and the pages under them. `/x/*` = every built page below /x as well. */
// Site paths (without /spanish); the URLs are built with absoluteUrl() (src/lib/paths.js).
// The Spanish-course slugs (docs/content-plan.md §8) are listed already: they appear once the
// `routes` run builds them. The English-course slugs next to them go when `routes` renames them.
const SECTIONS = [
  ['Start here', ['/placement-test', '/step-by-step', '/exercises', '/progress']],
  ['Grammar and vocabulary', ['/grammar', '/grammar/conjugation', '/vocabulary', '/pronunciation']],
  ['Skills', ['/skills', '/speaking', '/listening', '/reading', '/writing']],
  ['Exams', ['/exams', '/dele', '/dele/*', '/siele', '/siele/*', '/exams/dele-or-siele', '/ccse', '/nationality', '/nationality/*',
    '/cambridge', '/cambridge/*', '/trinity', '/trinity/*', '/ielts', '/life-in-the-uk']],
  ['Life and work in Spain', ['/spanish-for-work', '/business-spanish', '/dgt-vocabulary', '/english-for-work', '/culture', '/knowledge', '/knowledge/word-stories']],
  ['For teachers', ['/teachers']],
  // The entry pages with their own URL per language (./entry-pages.mjs): the home of each.
  ['In other languages', ['/de', '/fr', '/pt', '/it']],
];

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (m) => ENTITIES[m] ?? m).trim();
const TITLE = /<title>([^<]*)<\/title>/i;
const DESC = /<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i;
const SUFFIX = /\s+[–|-]\s+(icanspeak Spanish|icanspeak)$/;

/** @returns {import('astro').AstroIntegration} */
export default function llmsTxt() {
  /** @type {URL | undefined} */
  let site;
  return {
    name: 'icanspeak-llms-txt',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site ? new URL(config.site) : undefined;
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!site) return;
        const root = fileURLToPath(dir);
        /** @type {Map<string, { title: string, description: string }>} */
        const pages = new Map();
        for (const file of await htmlFiles(root)) {
          const pathname = toPathname(path.relative(root, file));
          const html = await readFile(file, 'utf8');
          const head = html.slice(0, html.indexOf('</head>') + 1 || 20000);
          if (NOINDEX.test(head) || REFRESH.test(head)) continue;
          const title = decode(head.match(TITLE)?.[1] ?? '').replace(SUFFIX, '');
          if (title) pages.set(pathname, { title, description: decode(head.match(DESC)?.[1] ?? '') });
        }
        const home = pages.get('/');
        if (!home) return;

        const line = (p) => {
          const page = pages.get(p);
          if (!page) return null;
          const url = absoluteUrl(p);
          return `- [${page.title}](${url})${page.description ? `: ${page.description}` : ''}`;
        };
        let out = `# icanspeak Spanish\n\n> ${home.description}\n`;
        for (const [heading, list] of SECTIONS) {
          const paths = list.flatMap((p) =>
            p.endsWith('/*')
              ? [...pages.keys()].filter((k) => k.startsWith(p.slice(0, -1))).sort()
              : [p]
          );
          const lines = [...new Set(paths)].map(line).filter(Boolean);
          if (lines.length) out += `\n## ${heading}\n\n${lines.join('\n')}\n`;
        }
        await writeFile(path.join(root, 'llms.txt'), out);
        const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
        logger.info(`llms.txt: ${out.split('\n- [').length - 1} pages, ${kb} KB`);
        if (Buffer.byteLength(out) > 10 * 1024) logger.warn('llms.txt is over 10 KB — trim SECTIONS in src/integrations/llms-txt.mjs');
      },
    },
  };
}
