// The language courses on icanspeak.it. `slug` is the URL path, in the language's own name
// (/espanol/, /francais/ since 2026-11-14; the apps keep their folders, apps/spanish and apps/french). Each is its own app with
// base /<slug>, deployed as its own Worker. Flip `live` when a course's Worker route is up.
export interface Course {
  slug: string;
  code: string;
  name: string; // the language's own name
  english: string;
  meta: string;
  live: boolean;
}

export const COURSES: Course[] = [
  {
    slug: 'english',
    code: 'EN',
    name: 'English',
    english: 'English',
    meta: 'A1 to C1 · grammar, vocabulary, exams, speaking',
    live: true,
  },
  {
    slug: 'espanol',
    code: 'ES',
    name: 'Español',
    english: 'Spanish',
    meta: 'Castilian Spanish · DELE and SIELE · life in Spain',
    live: true, // the Spanish Worker is already up (older build); the card stays live
  },
  {
    slug: 'francais',
    code: 'FR',
    name: 'Français',
    english: 'French',
    meta: 'DELF, DALF and TCF · life in France',
    live: true,
  },
  {
    slug: 'portugues',
    code: 'PT',
    name: 'Português',
    english: 'Portuguese',
    meta: 'European Portuguese · CIPLE · life in Portugal',
    live: true, // flipped by the Portuguese queue (deploy-readme); redeploy the hub only after the Portuguese Worker is up
  },
  {
    slug: 'italiano',
    code: 'IT',
    name: 'Italiano',
    english: 'Italian',
    meta: 'CILS and CELI · life in Italy',
    live: true, // flipped by the Italian queue (deploy-readme); redeploy the hub only after the Italian Worker is up
  },
];

// Course slugs whose app publishes /<slug>/sitemap.xml and /<slug>/llms.txt (the linguistics
// section is not a course and has neither yet; add it to SECTIONS_WITH_SITEMAP when it does).
export const liveCourses = () => COURSES.filter((c) => c.live);
export const SECTIONS_WITH_SITEMAP: string[] = [];
