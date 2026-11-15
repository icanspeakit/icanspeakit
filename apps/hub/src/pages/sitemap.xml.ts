// https://icanspeak.it/sitemap.xml — sitemap index: the hub's own sitemap plus one per live
// course, taken from data/courses.ts so a course going live appears here by itself.
import type { APIRoute } from 'astro';
import { liveCourses, SECTIONS_WITH_SITEMAP } from '../data/courses';

export const GET: APIRoute = () => {
  const locs = [
    'https://icanspeak.it/sitemap-hub.xml',
    ...liveCourses().map((c) => `https://icanspeak.it/${c.slug}/sitemap.xml`),
    ...SECTIONS_WITH_SITEMAP.map((s) => `https://icanspeak.it/${s}/sitemap.xml`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((l) => `  <sitemap><loc>${l}</loc></sitemap>`).join('\n')}
</sitemapindex>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
