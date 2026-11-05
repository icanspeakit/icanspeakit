// The language courses on icanspeak.it. Each one is its own app in apps/<slug> with
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
    live: false, // flip once apps/english is deployed at /english (overclaude base-path item)
  },
  {
    slug: 'spanish',
    code: 'ES',
    name: 'Español',
    english: 'Spanish',
    meta: 'Castilian Spanish · DELE and SIELE · life in Spain',
    live: false,
  },
  {
    slug: 'french',
    code: 'FR',
    name: 'Français',
    english: 'French',
    meta: 'DELF, DALF and TCF · life in France',
    live: false,
  },
  {
    slug: 'portuguese',
    code: 'PT',
    name: 'Português',
    english: 'Portuguese',
    meta: 'European Portuguese · CIPLE · life in Portugal',
    live: false,
  },
  {
    slug: 'italian',
    code: 'IT',
    name: 'Italiano',
    english: 'Italian',
    meta: 'CILS and CELI · life in Italy',
    live: false,
  },
];
