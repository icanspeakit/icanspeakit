// Illustrative "what practice could look like" numbers for the homepage
// dashboard teaser only. Real per-user pages (/dashboard/*) always read
// genuine data from progress-store.ts — this module exists purely so a
// first-time visitor sees a populated, encouraging dashboard on the
// homepage instead of an all-zero one, without ever touching localStorage
// or mixing fake numbers into real progress data.

import type {
  TrendPoint,
  ErrorBreakdownRow,
  VolumeStats,
  RecentSession,
  FormatSummary,
} from './progress-store';

const DAY = 24 * 60 * 60 * 1000;

interface Tier1Sample {
  accuracy: number;
  due: number;
  attempts: number;
  trend: number[]; // oldest -> newest, most recent point is "today"
  errors: ErrorBreakdownRow[];
}

const TIER1: Record<string, Tier1Sample> = {
  articulation: {
    accuracy: 78,
    due: 2,
    attempts: 34,
    trend: [58, 66, 61, 74, 70, 78],
    errors: [
      { label: 'θ vs s', pct: 45 },
      { label: 'r vs l', pct: 35 },
      { label: 'v vs w', pct: 20 },
    ],
  },
  phonology: {
    accuracy: 64,
    due: 3,
    attempts: 21,
    trend: [50, 55, 58, 60, 64],
    errors: [
      { label: 'linking', pct: 50 },
      { label: 'elision', pct: 30 },
      { label: 'assimilation', pct: 20 },
    ],
  },
  pace: {
    accuracy: 81,
    due: 1,
    attempts: 27,
    trend: [66, 70, 72, 75, 79, 81],
    errors: [
      { label: 'pausing', pct: 60 },
      { label: 'speed', pct: 40 },
    ],
  },
};

const VOLUME_ZONES = [
  'conversational',
  'quiet',
  'conversational',
  'projected',
  'conversational',
  'projected',
  'conversational',
] as const;

const TIER3_EVENTS: Record<string, Record<string, number>> = {
  prosody: { played: 9 },
  voice: { 'breathing-completed': 6, 'checklist-completed': 4 },
};

const TIER4_EVENTS: Record<string, Record<string, number>> = {
  rhetoric: { 'call-started': 3 },
};

export function getAccuracy(slug: string): number | null {
  return TIER1[slug]?.accuracy ?? null;
}

export function getDueCount(slug: string): number {
  return TIER1[slug]?.due ?? 0;
}

export function getAttemptCount(slug: string): number {
  return TIER1[slug]?.attempts ?? 0;
}

export function getTrend(slug: string, maxPoints = 8, locale: 'en' | 'de' = 'en'): TrendPoint[] {
  const sample = TIER1[slug];
  if (!sample) return [];
  const points = sample.trend.slice(-maxPoints);
  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const lastIndex = points.length - 1;
  return points.map((accuracy, i) => ({
    label: dateFmt.format(new Date(Date.now() - (lastIndex - i) * DAY)),
    accuracy,
  }));
}

export function getErrorBreakdown(slug: string): ErrorBreakdownRow[] {
  return TIER1[slug]?.errors ?? [];
}

export function getVolumeStats(limit = 8): VolumeStats {
  const recent = VOLUME_ZONES.slice(-limit);
  const lastIndex = recent.length - 1;
  return {
    sessionCount: VOLUME_ZONES.length,
    lastDominantZone: VOLUME_ZONES[VOLUME_ZONES.length - 1],
    history: recent.map((dominantZone, i) => ({
      ts: Date.now() - (lastIndex - i) * DAY,
      dominantZone,
    })),
  };
}

export function getEventStats(slug: string): Record<string, number> {
  return TIER3_EVENTS[slug] ?? TIER4_EVENTS[slug] ?? {};
}

export function getPracticeStreak(): number {
  return 4;
}

export function getWeekActivity(locale: 'en' | 'de' = 'en'): { key: string; dayLetter: string; done: boolean }[] {
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const done = [false, true, true, false, true, true, true]; // 6 days ago -> today
  const out: { key: string; dayLetter: string; done: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - (6 - i) * DAY);
    out.push({ key: String(i), dayLetter: weekdayFmt.format(d), done: done[i] });
  }
  return out;
}

function tsFor(daysAgo: number, hour: number): number {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

const SESSION_SAMPLES: { slug: string; label: Record<'en' | 'de', string>; daysAgo: number; hour: number }[] = [
  { slug: 'articulation', label: { en: 'Articulation · 8/10', de: 'Artikulation · 8/10' }, daysAgo: 0, hour: 9 },
  { slug: 'pace', label: { en: 'Pace & pausing · 4/5', de: 'Tempo & Pausen · 4/5' }, daysAgo: 0, hour: 8 },
  { slug: 'voice', label: { en: 'Voice · breathing completed', de: 'Stimme · Atemübung abgeschlossen' }, daysAgo: 1, hour: 19 },
  { slug: 'phonology', label: { en: 'Phonology · 3/4', de: 'Phonologie · 3/4' }, daysAgo: 1, hour: 18 },
  { slug: 'volume', label: { en: 'Volume · conversational', de: 'Lautstärke · Gesprächslautstärke' }, daysAgo: 2, hour: 20 },
  { slug: 'prosody', label: { en: 'Prosody · played', de: 'Prosodie · abgespielt' }, daysAgo: 3, hour: 17 },
];

export function getRecentSessions(limit = 5, locale: 'en' | 'de' = 'en'): RecentSession[] {
  return SESSION_SAMPLES.slice(0, limit).map((s) => ({
    ts: tsFor(s.daysAgo, s.hour),
    slug: s.slug,
    label: s.label[locale],
  }));
}

/** Same tier-aware copy as progress-store.ts's getFormatSummary, but sourced from the sample data above — for the homepage teaser's "next up" card. */
export function getFormatSummary(slug: string, tier: 1 | 2 | 3 | 4, locale: 'en' | 'de' = 'en'): FormatSummary {
  const de = locale === 'de';

  if (tier === 1) {
    const acc = getAccuracy(slug);
    const due = getDueCount(slug);
    const body =
      acc === null
        ? de
          ? 'Noch keine Versuche protokolliert.'
          : 'No attempts logged yet.'
        : de
          ? `${acc}% Fortschritt. ${due > 0 ? `${due} Element${due === 1 ? '' : 'e'} erneut fällig.` : 'Gerade nichts fällig.'}`
          : `${acc}% accuracy. ${due > 0 ? `${due} item${due === 1 ? '' : 's'} due for another try.` : 'Nothing due right now.'}`;
    return { body, ctaLabel: de ? 'Format üben' : 'Practice this format', due, hasActivity: acc !== null };
  }
  if (tier === 2) {
    const stats = getVolumeStats();
    const zoneLabels: Record<'en' | 'de', Record<'quiet' | 'conversational' | 'projected', string>> = {
      en: { quiet: 'quiet', conversational: 'conversational', projected: 'projected' },
      de: { quiet: 'leise', conversational: 'Gesprächslautstärke', projected: 'projiziert' },
    };
    const zone = stats.lastDominantZone ? zoneLabels[locale][stats.lastDominantZone] : '';
    const body = de
      ? `${stats.sessionCount} Sitzung${stats.sessionCount === 1 ? '' : 'en'} protokolliert. Zuletzt lag der Schwerpunkt in der Zone „${zone}“.`
      : `${stats.sessionCount} session${stats.sessionCount === 1 ? '' : 's'} logged. Last time you landed mostly in the ${zone} zone.`;
    return { body, ctaLabel: de ? 'Format üben' : 'Practice this format', due: 0, hasActivity: true };
  }

  const events = getEventStats(slug);
  const total = Object.values(events).reduce((a, b) => a + b, 0);
  if (tier === 4) {
    const body = de
      ? `${total} Gespräch${total === 1 ? '' : 'e'} gestartet. Füllwort- und Strukturanalyse gibt es noch nicht — nur echte Gesprächszahlen werden hier gezeigt.`
      : `${total} call${total === 1 ? '' : 's'} started. Filler-word and structural analysis isn't built yet — only real call counts show here.`;
    return { body, ctaLabel: de ? 'Rollenspiel ausprobieren' : 'Try the roleplay', due: 0, hasActivity: total > 0 };
  }
  const body = de
    ? `${total} Sitzung${total === 1 ? '' : 'en'} protokolliert. Dieses Format ist übungsbasiert — es gibt keinen Genauigkeitswert.`
    : `${total} session${total === 1 ? '' : 's'} logged. This format is practice-based — there's no accuracy score to show.`;
  return { body, ctaLabel: de ? 'Format öffnen' : 'Open this format', due: 0, hasActivity: total > 0 };
}
