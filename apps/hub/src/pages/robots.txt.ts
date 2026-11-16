// https://icanspeak.it/robots.txt — the only robots file crawlers read. Generated from
// data/courses.ts: every live course adds its Disallow lines and a Sitemap line.
// Policy as on deutschacademy.com: search and answers yes, model training no.
import type { APIRoute } from 'astro';
import { liveCourses, SECTIONS_WITH_SITEMAP } from '../data/courses';

export const GET: APIRoute = () => {
  const courses = liveCourses();
  const disallow = courses.flatMap((c) => [
    `Disallow: /${c.slug}/design-system`,
    `Disallow: /${c.slug}/newfont`,
    `Disallow: /${c.slug}/inhalt/`,
  ]);
  const sitemaps = [
    'https://icanspeak.it/sitemap.xml',
    ...courses.map((c) => `https://icanspeak.it/${c.slug}/sitemap.xml`),
    ...SECTIONS_WITH_SITEMAP.map((s) => `https://icanspeak.it/${s}/sitemap.xml`),
  ];
  const body = `# icanspeak.it. Crawl the learner sites; skip the design prototypes and paid practice data
# (the per-course apps/*/public/robots.txt are the templates for the Disallow lines below).

User-agent: *
${disallow.join('\n')}
# Content Signals (contentsignals.org): search and answers that link here yes, model
# training no, the same policy as the AI-crawler block below.
Content-Signal: search=yes, ai-input=yes, ai-train=no

# AI search and answer bots are welcome: they fetch pages to answer a learner's question and
# link back here. Listed explicitly so no managed default can read as a block.
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: Bingbot
User-agent: Googlebot
${disallow.join('\n')}
Allow: /

# AI training crawlers: blocked (machine-readable rights reservation, text and data mining).
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: anthropic-ai
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: meta-externalagent
User-agent: FacebookBot
User-agent: Bytespider
User-agent: cohere-ai
User-agent: cohere-training-data-crawler
User-agent: Diffbot
User-agent: Omgilibot
User-agent: ImagesiftBot
User-agent: Timpibot
Disallow: /

${sitemaps.map((s) => `Sitemap: ${s}`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
