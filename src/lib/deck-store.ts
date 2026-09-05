// Client-side spaced-repetition store for the Study section's Daily Deck.
// There's no backend/account system on this static site, so "real" here
// means: a genuine SM-2-style scheduler with state that actually persists
// across visits, in this browser, via localStorage — not a demo that
// resets on refresh. Cards saved from Story Stream (glossary words) and
// Dialogue Lab (goal phrases) write into the same store Daily Deck reads
// from, so "saved to your deck" is a real, working connection between
// features, not just copy.

const STORAGE_KEY = 'icanspeakit:deck:v1';

export type CardType = 'word' | 'cloze' | 'listen' | 'say';

export interface CardContent {
  id: string;
  type: CardType;
  /** Word, cloze prompt (with a single "___" blank), or phrase to hear/say. */
  front: string;
  /** Meaning/origin text (word cards) or the correct answer (cloze/listen). */
  back: string;
  /** Extra etymology/origin line, shown under `back` for word cards. */
  origin?: string;
  /** Text to synthesize via /api/tts for listen/say cards. Defaults to `front`. */
  audioText?: string;
  source?: string;
}

interface ReviewState {
  interval: number; // days until next due, once graduated past 0
  ease: number; // SM-2 ease factor
  due: number; // epoch ms
  reps: number;
}

interface DeckState {
  reviews: Record<string, ReviewState>;
  custom: Record<string, CardContent>;
  reviewLog: string[]; // 'YYYY-MM-DD', one entry per calendar day reviewed
}

function emptyState(): DeckState {
  return { reviews: {}, custom: {}, reviewLog: [] };
}

function loadState(): DeckState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      reviews: parsed.reviews ?? {},
      custom: parsed.custom ?? {},
      reviewLog: Array.isArray(parsed.reviewLog) ? parsed.reviewLog : [],
    };
  } catch {
    return emptyState();
  }
}

function saveState(state: DeckState) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — reviewing still works for this session,
    // it just won't persist. Not worth surfacing as an error to the user.
  }
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultReview(): ReviewState {
  return { interval: 0, ease: 2.5, due: Date.now(), reps: 0 };
}

/** All cards currently due (built-in + any saved custom cards), earliest-due first. */
export function getDueCards(builtin: CardContent[]): CardContent[] {
  const state = loadState();
  const all = [...builtin, ...Object.values(state.custom)];
  const now = Date.now();
  return all
    .filter((card) => (state.reviews[card.id]?.due ?? 0) <= now)
    .sort((a, b) => (state.reviews[a.id]?.due ?? 0) - (state.reviews[b.id]?.due ?? 0));
}

export function getDeckStats(builtin: CardContent[]) {
  const state = loadState();
  const all = [...builtin, ...Object.values(state.custom)];
  const now = Date.now();
  const dueToday = all.filter((c) => (state.reviews[c.id]?.due ?? 0) <= now).length;
  const byType: Record<CardType, number> = { word: 0, cloze: 0, listen: 0, say: 0 };
  for (const card of all) byType[card.type] += 1;
  return {
    dueToday,
    totalCards: all.length,
    streakDays: computeStreak(state.reviewLog),
    byType,
  };
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

/** Apply a review rating to one card, updating its schedule (simplified SM-2). */
export function reviewCard(id: string, rating: Rating) {
  const state = loadState();
  const prev = state.reviews[id] ?? defaultReview();
  let { interval, ease, reps } = prev;

  if (rating === 'again') {
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    reps = 0;
  } else {
    reps += 1;
    if (rating === 'hard') {
      ease = Math.max(1.3, ease - 0.15);
      interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
    } else if (rating === 'good') {
      interval = interval === 0 ? 1 : Math.round(interval * ease);
    } else {
      ease = ease + 0.15;
      interval = Math.round((interval === 0 ? 1 : interval * ease) * 1.3);
    }
  }

  const dueDays = rating === 'again' ? 0 : interval;
  const due = Date.now() + dueDays * 24 * 60 * 60 * 1000 + (rating === 'again' ? 5 * 60 * 1000 : 0);

  state.reviews[id] = { interval, ease, reps, due };

  const key = todayKey();
  if (!state.reviewLog.includes(key)) {
    state.reviewLog = [...state.reviewLog, key].slice(-90);
  }

  saveState(state);
}

/** Save a card from Story Stream / Dialogue Lab into the deck, due immediately. */
export function addCustomCard(card: CardContent) {
  const state = loadState();
  state.custom[card.id] = card;
  if (!state.reviews[card.id]) state.reviews[card.id] = defaultReview();
  saveState(state);
}

export function isCardSaved(id: string): boolean {
  const state = loadState();
  return Boolean(state.custom[id]);
}

function computeStreak(reviewLog: string[]): number {
  if (reviewLog.length === 0) return 0;
  const days = new Set(reviewLog);
  let streak = 0;
  const cursor = new Date();
  // A streak still counts if today hasn't been reviewed yet but yesterday
  // was — otherwise finishing today's reviews at 11pm would reset to 0
  // before the day is even over.
  if (!days.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(todayKey(cursor))) return 0;
  }
  while (days.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Last 7 calendar days, oldest first, each marked whether it was reviewed. */
export function getWeekGrid(): { key: string; done: boolean; isFuture: boolean }[] {
  const state = loadState();
  const days = new Set(state.reviewLog);
  const out: { key: string; done: boolean; isFuture: boolean }[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const key = todayKey(cursor);
    out.push({ key, done: days.has(key), isFuture: false });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
