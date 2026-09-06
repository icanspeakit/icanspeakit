import { topics, type Topic } from './topics';

// Demo progress figures — the site has no progress-tracking backend yet, so
// these are illustrative placeholders (called out in the dashboard's
// footnote), not real per-user data. Everything else (titles, descriptions,
// drills, hrefs) comes straight from the same `topics` data the /exercises
// grid uses.
interface FormatExtra {
  mastery: number;
  due: number;
  why: string;
  tip: string;
  meta: string;
}

export type Format = Topic & FormatExtra;

const extraBySlug: Record<string, FormatExtra> = {
  articulation: {
    mastery: 62,
    due: 6,
    why: 'Learners rarely mispronounce a sound they can reliably hear. Discrimination comes first, production second.',
    tip: 'If you score below 8 of 10, stay on minimal pairs before shadowing.',
    meta: '4 min · self-graded',
  },
  phonology: {
    mastery: 41,
    due: 4,
    why: 'Natural speech deletes and blends sounds that textbooks keep separate, which is why fluent audio feels faster than it is.',
    tip: 'Listen once for meaning, then again only for the joins between words.',
    meta: '6 min · self-graded',
  },
  prosody: {
    mastery: 28,
    due: 3,
    why: 'Stress carries meaning in English. Put it on the wrong syllable and the word changes, or disappears.',
    tip: 'Say the sentence four ways before you mark anything — your ear will find the pattern.',
    meta: 'printable · 2 pages',
  },
  voice: {
    mastery: 55,
    due: 2,
    why: 'Breath support sets how long and how steadily you can speak before pitch and volume start to drift.',
    tip: 'Do the routine standing, once in the morning. Two minutes is enough.',
    meta: 'printable · 3 pages',
  },
  volume: {
    mastery: 12,
    due: 2,
    why: 'Volume is a room problem, not a voice problem. The drill trains a level you can hold without strain.',
    tip: "Use the meter to find each zone by ear first — don't try to hit a target level from memory.",
    meta: '4 min · self-graded',
  },
  pace: {
    mastery: 73,
    due: 3,
    why: 'Pauses group words into meaning. Speakers who pause in the right places sound fluent even at a slow pace.',
    tip: 'Mark the pauses first, then match the speed. Never both at once.',
    meta: '5 min · self-graded',
  },
};

const formatSlugs = ['articulation', 'phonology', 'prosody', 'voice', 'volume', 'pace'];

export const formats: Format[] = formatSlugs.map((slug) => {
  const topic = topics.find((t) => t.slug === slug) as Topic;
  return { ...topic, ...extraBySlug[slug] };
});

export const dueToday = formats.reduce((sum, f) => sum + f.due, 0);
export const avgMastery = Math.round(formats.reduce((sum, f) => sum + f.mastery, 0) / formats.length);
export const dayStreak = 6;

export const todaysSet = [
  { label: 'Articulation · minimal pairs', n: '6 cards' },
  { label: 'Pace & pausing · pausing', n: '3 cards' },
  { label: 'Phonology · linking', n: '4 cards' },
];
