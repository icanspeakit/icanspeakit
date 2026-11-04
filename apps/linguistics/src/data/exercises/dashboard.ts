import { topics, type Topic, type Locale, type LocalizedText } from './topics';

// Structural + editorial metadata for the merged dashboard (Practice +
// Progress + Overview): titles, descriptions, drills, and hrefs come
// straight from the same `topics` data the /exercises grid uses. The
// tier-1 `mastery`/`due` numbers below are a build-time fallback only,
// shown before the client overrides them with real progress-store.ts data
// (or a fresh "not started" state) — every other tier is real-or-empty from
// the start, no fabricated number.
interface FormatExtra {
  /**
   * Tier 1 = objectively scorable (real accuracy %). Tier 2 = a real number
   * exists but isn't a correctness score (Volume's loudness meter). Tier 3 =
   * practice-based, no ground truth. Tier 4 = structurally measurable via a
   * different mechanism (Rhetoric's AI-roleplay call count). See
   * dashboard-fidelity-prompt.md. Only tier-1 formats get a build-time
   * mastery/due fallback below — everything else is real-or-empty, driven
   * entirely by progress-store.ts at render time.
   */
  tier: 1 | 2 | 3 | 4;
  mastery?: number;
  due?: number;
  why: LocalizedText;
  tip: LocalizedText;
  meta: LocalizedText;
}

export type Format = Topic & FormatExtra;

const extraBySlug: Record<string, FormatExtra> = {
  articulation: {
    tier: 1,
    mastery: 62,
    due: 6,
    why: {
      en: 'Learners rarely mispronounce a sound they can reliably hear. Discrimination comes first, production second.',
      de: 'Wer einen Laut sicher hört, spricht ihn selten falsch aus. Erst die Unterscheidung, dann die Produktion.',
    },
    tip: {
      en: 'If you score below 8 of 10, stay on minimal pairs before shadowing.',
      de: 'Bei unter 8 von 10 richtig: erst weiter mit Minimalpaaren üben, dann shadowen.',
    },
    meta: { en: '4 min · self-graded', de: '4 Min. · selbst bewertet' },
  },
  phonology: {
    tier: 1,
    mastery: 41,
    due: 4,
    why: {
      en: 'Natural speech deletes and blends sounds that textbooks keep separate, which is why fluent audio feels faster than it is.',
      de: 'Natürliche Sprache verschluckt und verschmilzt Laute, die Lehrbücher getrennt halten — deshalb wirkt flüssiges Sprechen schneller, als es ist.',
    },
    tip: {
      en: 'Listen once for meaning, then again only for the joins between words.',
      de: 'Erst einmal nur auf den Sinn hören, dann noch einmal nur auf die Übergänge zwischen den Wörtern.',
    },
    meta: { en: '6 min · self-graded', de: '6 Min. · selbst bewertet' },
  },
  prosody: {
    tier: 3,
    why: {
      en: 'Stress carries meaning in English. Put it on the wrong syllable and the word changes, or disappears.',
      de: 'Im Englischen trägt Betonung Bedeutung. Auf der falschen Silbe ändert sich das Wort — oder es verschwindet.',
    },
    tip: {
      en: 'Say the sentence four ways before you mark anything — your ear will find the pattern.',
      de: 'Sag den Satz erst viermal auf verschiedene Arten, bevor du etwas markierst — dein Ohr findet das Muster von selbst.',
    },
    meta: { en: 'printable · 2 pages', de: 'druckbar · 2 Seiten' },
  },
  voice: {
    tier: 3,
    why: {
      en: 'Breath support sets how long and how steadily you can speak before pitch and volume start to drift.',
      de: 'Die Atemstütze bestimmt, wie lange und wie stabil du sprechen kannst, bevor Tonhöhe und Lautstärke abdriften.',
    },
    tip: {
      en: 'Do the routine standing, once in the morning. Two minutes is enough.',
      de: 'Mach die Übung im Stehen, einmal morgens. Zwei Minuten reichen.',
    },
    meta: { en: 'printable · 3 pages', de: 'druckbar · 3 Seiten' },
  },
  volume: {
    tier: 2,
    why: {
      en: 'Volume is a room problem, not a voice problem. The drill trains a level you can hold without strain.',
      de: 'Lautstärke ist ein Raumproblem, kein Stimmproblem. Die Übung trainiert ein Niveau, das du ohne Anstrengung halten kannst.',
    },
    tip: {
      en: "Use the meter to find each zone by ear first — don't try to hit a target level from memory.",
      de: 'Finde jede Stufe zuerst mit dem Messgerät nach Gehör — versuch nicht, ein Ziel aus dem Gedächtnis zu treffen.',
    },
    meta: { en: '4 min · self-graded', de: '4 Min. · selbst bewertet' },
  },
  pace: {
    tier: 1,
    mastery: 73,
    due: 3,
    why: {
      en: 'Pauses group words into meaning. Speakers who pause in the right places sound fluent even at a slow pace.',
      de: 'Pausen gruppieren Wörter zu Bedeutung. Wer an den richtigen Stellen pausiert, klingt flüssig — auch in langsamem Tempo.',
    },
    tip: {
      en: 'Mark the pauses first, then match the speed. Never both at once.',
      de: 'Erst die Pausen markieren, dann das Tempo angleichen. Nie beides gleichzeitig.',
    },
    meta: { en: '5 min · self-graded', de: '5 Min. · selbst bewertet' },
  },
  rhetoric: {
    tier: 4,
    why: {
      en: 'A live listener reacts in real time, which trains argument structure and delivery under pressure — not pronunciation.',
      de: 'Eine echte Zuhörerin reagiert in Echtzeit — das trainiert Argumentationsaufbau und Vortrag unter Druck, nicht Aussprache.',
    },
    tip: {
      en: "Pick a topic, speak for 60–90 seconds, and let the pushback happen — don't plan your rebuttal in advance.",
      de: 'Wähl ein Thema, sprich 60–90 Sekunden und lass den Gegenwind zu — plane deine Erwiderung nicht im Voraus.',
    },
    meta: { en: '5–10 min · AI roleplay', de: '5–10 Min. · KI-Rollenspiel' },
  },
};

const formatSlugs = ['articulation', 'phonology', 'prosody', 'voice', 'volume', 'pace', 'rhetoric'];

const rawFormats: Format[] = formatSlugs.map((slug) => {
  const topic = topics.find((t) => t.slug === slug) as Topic;
  return { ...topic, ...extraBySlug[slug] };
});

export function getFormats(locale: Locale = 'en') {
  return rawFormats.map((f) => ({
    ...f,
    title: f.title[locale],
    description: f.description[locale],
    category: f.category[locale],
    why: f.why[locale],
    tip: f.tip[locale],
    meta: f.meta[locale],
    aspects: f.aspects.map((a) => ({ label: a.label[locale], blurb: a.blurb[locale] })),
  }));
}

// English-resolved default export, kept for callers that aren't locale-aware
// (e.g. getStaticPaths, which only needs the slug list).
export const formats = getFormats('en');

const todaysSetSlugs = ['articulation', 'pace', 'phonology'];
const todaysSetCardCounts = [6, 3, 4];
const todaysSetSubAspect: Record<Locale, string[]> = {
  en: ['minimal pairs', 'pausing', 'linking'],
  de: ['Minimalpaare', 'Pausen', 'Verbindungen'],
};
const cardsWord: Record<Locale, string> = { en: 'cards', de: 'Karten' };

export function getTodaysSet(locale: Locale = 'en') {
  return todaysSetSlugs.map((slug, i) => {
    const format = rawFormats.find((f) => f.slug === slug)!;
    return {
      label: `${format.title[locale]} · ${todaysSetSubAspect[locale][i]}`,
      n: `${todaysSetCardCounts[i]} ${cardsWord[locale]}`,
    };
  });
}

// English-resolved default export, kept for callers that aren't locale-aware.
export const todaysSet = getTodaysSet('en');
