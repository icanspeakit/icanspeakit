// Client-side progress store for the /dashboard progress console. Like
// deck-store.ts, there's no backend/account system on this static site, so
// "real" here means genuine measurement persisted in this browser via
// localStorage — not numbers baked into a .ts data file at build time.
//
// Per dashboard-fidelity-prompt.md: a chart only exists on the dashboard if
// a real mechanism produces the number behind it. This module is that
// mechanism — every exercise component logs its own real events here, and
// the dashboard reads aggregates back out. Nothing is pre-seeded or
// fabricated; a fresh browser starts at zero everywhere.

const STORAGE_KEY = 'icanspeakit:progress:v1';

export interface Attempt {
  ts: number;
  itemId: string;
  category: string;
  correct: number;
  total: number;
}

interface MissRecord {
  count: number;
  lastTs: number;
}

export interface VolumeSession {
  ts: number;
  quiet: number;
  conversational: number;
  projected: number;
}

export interface ProgressEvent {
  ts: number;
  kind: string;
}

interface ProgressState {
  attempts: Record<string, Attempt[]>;
  misses: Record<string, Record<string, MissRecord>>;
  volumeSessions: VolumeSession[];
  events: Record<string, ProgressEvent[]>;
}

const MAX_ATTEMPTS_PER_SLUG = 300;
const MAX_EVENTS_PER_SLUG = 300;
const MAX_VOLUME_SESSIONS = 100;

function emptyState(): ProgressState {
  return { attempts: {}, misses: {}, volumeSessions: [], events: {} };
}

function loadState(): ProgressState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      attempts: parsed.attempts ?? {},
      misses: parsed.misses ?? {},
      volumeSessions: Array.isArray(parsed.volumeSessions) ? parsed.volumeSessions : [],
      events: parsed.events ?? {},
    };
  } catch {
    return emptyState();
  }
}

function saveState(state: ProgressState) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — the session still works, it just won't persist.
  }
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Log one graded attempt. `correct`/`total` allows partial credit (e.g. "caught 3 of 4 reductions"); pass correct=1,total=1 for a plain right/wrong. */
export function logAttempt(slug: string, itemId: string, category: string, correct: number, total = 1) {
  const state = loadState();
  const list = state.attempts[slug] ?? [];
  list.push({ ts: Date.now(), itemId, category, correct, total });
  state.attempts[slug] = list.slice(-MAX_ATTEMPTS_PER_SLUG);

  const misses = state.misses[slug] ?? {};
  if (correct >= total) {
    delete misses[itemId];
  } else {
    const prev = misses[itemId];
    misses[itemId] = { count: (prev?.count ?? 0) + 1, lastTs: Date.now() };
  }
  state.misses[slug] = misses;

  saveState(state);
}

/** Real accuracy % from every logged attempt (or since a given epoch-ms cutoff). Returns null if nothing's been logged yet. */
export function getAccuracy(slug: string, sinceMs = 0): number | null {
  const attempts = loadState().attempts[slug]?.filter((a) => a.ts >= sinceMs) ?? [];
  if (attempts.length === 0) return null;
  const correct = attempts.reduce((sum, a) => sum + a.correct, 0);
  const total = attempts.reduce((sum, a) => sum + a.total, 0);
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

export interface TrendPoint {
  label: string;
  accuracy: number;
}

/**
 * Buckets real attempts by calendar day and returns one point per day that
 * actually has data, oldest first, capped to the most recent `maxPoints`
 * days. Returns an empty array (not a fabricated flat line) when there are
 * fewer than 2 days of data to trend.
 */
export function getTrend(slug: string, maxPoints = 8, locale: 'en' | 'de' = 'en'): TrendPoint[] {
  const attempts = loadState().attempts[slug] ?? [];
  if (attempts.length === 0) return [];

  const byDay = new Map<string, { correct: number; total: number; ts: number }>();
  for (const a of attempts) {
    const key = todayKey(new Date(a.ts));
    const bucket = byDay.get(key) ?? { correct: 0, total: 0, ts: a.ts };
    bucket.correct += a.correct;
    bucket.total += a.total;
    byDay.set(key, bucket);
  }

  const days = Array.from(byDay.entries()).sort((a, b) => a[1].ts - b[1].ts);
  if (days.length < 2) return [];

  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return days.slice(-maxPoints).map(([, bucket]) => ({
    label: dateFmt.format(new Date(bucket.ts)),
    accuracy: Math.round((bucket.correct / bucket.total) * 100),
  }));
}

export interface ErrorBreakdownRow {
  label: string;
  pct: number;
}

/** Tally of `category` on non-fully-correct attempts, normalized to sum to 100. Empty if nothing's been missed yet. */
export function getErrorBreakdown(slug: string): ErrorBreakdownRow[] {
  const attempts = (loadState().attempts[slug] ?? []).filter((a) => a.correct < a.total);
  if (attempts.length === 0) return [];

  const tally = new Map<string, number>();
  for (const a of attempts) {
    const missed = a.total - a.correct;
    tally.set(a.category, (tally.get(a.category) ?? 0) + missed);
  }

  const totalMissed = Array.from(tally.values()).reduce((a, b) => a + b, 0);
  if (totalMissed === 0) return [];

  const rows = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, pct: Math.round((count / totalMissed) * 100) }));

  // Rounding can push the sum a point or two off 100 — correct the largest
  // row so the breakdown always reads as a genuine whole, never 97% or 103%.
  const drift = 100 - rows.reduce((sum, r) => sum + r.pct, 0);
  if (drift !== 0 && rows.length > 0) rows[0].pct += drift;

  return rows;
}

/** Count of specific items currently missed and not yet re-answered correctly — the real "due" count. */
export function getDueCount(slug: string): number {
  return Object.keys(loadState().misses[slug] ?? {}).length;
}

export function getAttemptCount(slug: string): number {
  return (loadState().attempts[slug] ?? []).length;
}

/** Log one Volume meter session's time distribution across the three zones (in samples, not seconds — relative shares are what matter). */
export function logVolumeSession(quiet: number, conversational: number, projected: number) {
  const state = loadState();
  state.volumeSessions.push({ ts: Date.now(), quiet, conversational, projected });
  state.volumeSessions = state.volumeSessions.slice(-MAX_VOLUME_SESSIONS);
  saveState(state);
}

export interface VolumeStats {
  sessionCount: number;
  lastDominantZone: 'quiet' | 'conversational' | 'projected' | null;
  history: { ts: number; dominantZone: 'quiet' | 'conversational' | 'projected' }[];
}

function dominantZone(s: VolumeSession): 'quiet' | 'conversational' | 'projected' {
  if (s.quiet >= s.conversational && s.quiet >= s.projected) return 'quiet';
  if (s.projected >= s.conversational && s.projected >= s.quiet) return 'projected';
  return 'conversational';
}

export function getVolumeStats(limit = 8): VolumeStats {
  const sessions = loadState().volumeSessions;
  if (sessions.length === 0) return { sessionCount: 0, lastDominantZone: null, history: [] };
  const recent = sessions.slice(-limit);
  return {
    sessionCount: sessions.length,
    lastDominantZone: dominantZone(sessions[sessions.length - 1]),
    history: recent.map((s) => ({ ts: s.ts, dominantZone: dominantZone(s) })),
  };
}

/** Log a plain completion/interaction event — no correctness, just "this happened" (e.g. a breathing routine played through, a call started). */
export function logEvent(slug: string, kind: string) {
  const state = loadState();
  const list = state.events[slug] ?? [];
  list.push({ ts: Date.now(), kind });
  state.events[slug] = list.slice(-MAX_EVENTS_PER_SLUG);
  saveState(state);
}

export function getEventStats(slug: string): Record<string, number> {
  const events = loadState().events[slug] ?? [];
  const out: Record<string, number> = {};
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
}

export function getEventCount(slug: string): number {
  return (loadState().events[slug] ?? []).length;
}

/** All practice timestamps across every slug and record type, for the dashboard's real streak/recent-sessions views. */
function allTimestamps(state: ProgressState): { ts: number; slug: string }[] {
  const out: { ts: number; slug: string }[] = [];
  for (const [slug, list] of Object.entries(state.attempts)) {
    for (const a of list) out.push({ ts: a.ts, slug });
  }
  for (const [slug, list] of Object.entries(state.events)) {
    for (const e of list) out.push({ ts: e.ts, slug });
  }
  // Volume sessions aren't slug-keyed in storage (there's only one Volume
  // format), so tag them directly.
  for (const s of state.volumeSessions) out.push({ ts: s.ts, slug: 'volume' });
  return out;
}

function computeStreak(dayKeys: Set<string>): number {
  if (dayKeys.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // A streak still counts if today hasn't been practiced yet but yesterday
  // was — otherwise finishing today's practice at 11pm would reset to 0
  // before the day is even over.
  if (!dayKeys.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dayKeys.has(todayKey(cursor))) return 0;
  }
  while (dayKeys.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Real N-day practice streak, computed from every logged attempt/event/volume-session across every skill. Returns 0 for a fresh browser, not a placeholder number. */
export function getPracticeStreak(): number {
  const state = loadState();
  const days = new Set(allTimestamps(state).map((t) => todayKey(new Date(t.ts))));
  return computeStreak(days);
}

/** Last 7 calendar days, oldest first, each marked whether any practice was logged that day. No exercise measures session duration today, so this is presence, not minutes. */
export function getWeekActivity(locale: 'en' | 'de' = 'en'): { key: string; dayLetter: string; done: boolean }[] {
  const state = loadState();
  const days = new Set(allTimestamps(state).map((t) => todayKey(new Date(t.ts))));
  const out: { key: string; dayLetter: string; done: boolean }[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  for (let i = 0; i < 7; i++) {
    const key = todayKey(cursor);
    out.push({ key, dayLetter: weekdayFmt.format(cursor), done: days.has(key) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export interface RecentSession {
  ts: number;
  slug: string;
  label: string;
}

const slugLabels: Record<'en' | 'de', Record<string, string>> = {
  en: {
    articulation: 'Articulation',
    'articulation-de': 'Articulation (German)',
    phonology: 'Phonology',
    'phonology-de': 'Phonology (German)',
    prosody: 'Prosody',
    'prosody-de': 'Prosody (German)',
    voice: 'Voice',
    volume: 'Volume',
    pace: 'Pace & pausing',
    'pace-de': 'Pace & pausing (German)',
    rhetoric: 'Rhetoric & delivery',
  },
  de: {
    articulation: 'Artikulation',
    'articulation-de': 'Artikulation (Deutsch)',
    phonology: 'Phonologie',
    'phonology-de': 'Phonologie (Deutsch)',
    prosody: 'Prosodie',
    'prosody-de': 'Prosodie (Deutsch)',
    voice: 'Stimme',
    volume: 'Lautstärke',
    pace: 'Tempo & Pausen',
    'pace-de': 'Tempo & Pausen (Deutsch)',
    rhetoric: 'Rhetorik & Vortrag',
  },
};

const zoneLabels: Record<'en' | 'de', Record<'quiet' | 'conversational' | 'projected', string>> = {
  en: { quiet: 'quiet', conversational: 'conversational', projected: 'projected' },
  de: { quiet: 'leise', conversational: 'Gesprächslautstärke', projected: 'projiziert' },
};

const eventKindLabels: Record<'en' | 'de', Record<string, string>> = {
  en: { played: 'played', 'breathing-completed': 'breathing completed', 'checklist-completed': 'checklist completed', 'call-started': 'call started' },
  de: { played: 'abgespielt', 'breathing-completed': 'Atemübung abgeschlossen', 'checklist-completed': 'Checkliste abgeschlossen', 'call-started': 'Gespräch gestartet' },
};

/** Newest-first merged log across every skill, for the dashboard's "Recent sessions" list. */
export function getRecentSessions(limit = 5, locale: 'en' | 'de' = 'en'): RecentSession[] {
  const state = loadState();
  const rows: RecentSession[] = [];
  const names = slugLabels[locale];
  const events = eventKindLabels[locale];
  const zones = zoneLabels[locale];
  const correctWord = locale === 'de' ? 'richtig' : 'correct';
  const missedWord = locale === 'de' ? 'verpasst' : 'missed';

  for (const [slug, list] of Object.entries(state.attempts)) {
    for (const a of list) {
      rows.push({
        ts: a.ts,
        slug,
        label: a.total > 1 ? `${names[slug] ?? slug} · ${a.correct}/${a.total}` : `${names[slug] ?? slug} · ${a.correct ? correctWord : missedWord}`,
      });
    }
  }
  for (const [slug, list] of Object.entries(state.events)) {
    for (const e of list) {
      rows.push({ ts: e.ts, slug, label: `${names[slug] ?? slug} · ${events[e.kind] ?? e.kind}` });
    }
  }
  for (const s of state.volumeSessions) {
    rows.push({ ts: s.ts, slug: 'volume', label: `${names.volume} · ${zones[dominantZone(s)]}` });
  }

  return rows.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

/** Wipes all logged progress. Not surfaced in the UI yet — exists for manual testing/debugging via the console. */
export function resetProgress() {
  saveState(emptyState());
}

export interface FormatSummary {
  body: string;
  ctaLabel: string;
  due: number;
  hasActivity: boolean;
}

/**
 * Same tier-aware "what's the story for this format" copy as the progress
 * console's "Next up" card, factored out here so any other surface — e.g. a
 * homepage CTA — reads the identical real data instead of re-deriving its
 * own copy.
 */
export function getFormatSummary(slug: string, tier: 1 | 2 | 3 | 4, locale: 'en' | 'de' = 'en'): FormatSummary {
  const zones = zoneLabels[locale];
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
    const zone = stats.lastDominantZone ? zones[stats.lastDominantZone] : '';
    const body =
      stats.sessionCount === 0
        ? de
          ? 'Noch keine Messungen protokolliert.'
          : 'No meter sessions logged yet.'
        : de
          ? `${stats.sessionCount} Sitzung${stats.sessionCount === 1 ? '' : 'en'} protokolliert. Zuletzt lag der Schwerpunkt in der Zone „${zone}“.`
          : `${stats.sessionCount} session${stats.sessionCount === 1 ? '' : 's'} logged. Last time you landed mostly in the ${zone} zone.`;
    return { body, ctaLabel: de ? 'Format üben' : 'Practice this format', due: 0, hasActivity: stats.sessionCount > 0 };
  }
  const events = getEventStats(slug);
  const total = Object.values(events).reduce((a, b) => a + b, 0);
  if (tier === 4) {
    const body = de
      ? `${total} Gespräch${total === 1 ? '' : 'e'} gestartet. Füllwort- und Strukturanalyse gibt es noch nicht — nur echte Gesprächszahlen werden hier gezeigt.`
      : `${total} call${total === 1 ? '' : 's'} started. Filler-word and structural analysis isn't built yet — only real call counts show here.`;
    return { body, ctaLabel: de ? 'Rollenspiel ausprobieren' : 'Try the roleplay', due: 0, hasActivity: total > 0 };
  }
  const body =
    total === 0
      ? de
        ? 'Noch keine Sitzungen protokolliert.'
        : 'No sessions logged yet.'
      : de
        ? `${total} Sitzung${total === 1 ? '' : 'en'} protokolliert. Dieses Format ist übungsbasiert — es gibt keinen Genauigkeitswert.`
        : `${total} session${total === 1 ? '' : 's'} logged. This format is practice-based — there's no accuracy score to show.`;
  return { body, ctaLabel: de ? 'Format öffnen' : 'Open this format', due: 0, hasActivity: total > 0 };
}
