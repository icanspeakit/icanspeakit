// https://icanspeak.it/llms.txt (llmstxt.org): what icanspeak is, and one entry per live course
// pointing at that course's own llms.txt. Generated from data/courses.ts.
import type { APIRoute } from 'astro';
import { liveCourses } from '../data/courses';

export const GET: APIRoute = () => {
  const courses = liveCourses();
  const body = `# icanspeak.it

> Free language courses with grammar, vocabulary, listening, speaking, exam practice and printable material, for learners and teachers. One site, one course per language.

## Courses

${courses.map((c) => `- [${c.english === c.name ? c.english : `${c.english} (${c.name})`}](https://icanspeak.it/${c.slug}/): ${c.meta}. Details for AI assistants: https://icanspeak.it/${c.slug}/llms.txt`).join('\n')}

## More

- [Linguistics](https://icanspeak.it/linguistics/): articles, word cards and speech exercises about how languages work.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
