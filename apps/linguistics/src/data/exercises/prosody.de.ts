import type { StressShiftWord, StressSentence } from './prosody';

// German has no real analogue to English noun/verb stress shift (record vs.
// record) — but separable- vs. inseparable-prefix verbs are the equivalent
// phenomenon: same spelling, stress placement changes both pronunciation
// and meaning. Stress falls on the prefix when separable, on the stem when
// inseparable.
export const stressShiftWordsDe: StressShiftWord[] = [
  {
    word: 'umfahren',
    labelA: { en: 'inseparable — to drive around', de: 'untrennbar — umgehen' },
    sentenceA: 'Er umfährt das Hindernis.',
    patternA: 'um-FAH-ren',
    labelB: { en: 'separable — to knock over', de: 'trennbar — umstoßen' },
    sentenceB: 'Er fährt das Schild um.',
    patternB: 'UM-fahren',
  },
  {
    word: 'übersetzen',
    labelA: { en: 'inseparable — to translate', de: 'untrennbar — übertragen' },
    sentenceA: 'Sie übersetzt den Roman ins Deutsche.',
    patternA: 'ü-ber-SETZ-en',
    labelB: { en: 'separable — to ferry across', de: 'trennbar — mit dem Boot' },
    sentenceB: 'Der Fährmann setzt uns ans andere Ufer über.',
    patternB: 'ÜBER-setzen',
  },
  {
    word: 'umgehen',
    labelA: { en: 'inseparable — to circumvent', de: 'untrennbar — vermeiden' },
    sentenceA: 'Wir umgehen das Problem.',
    patternA: 'um-GEH-en',
    labelB: { en: 'separable — to handle (something)', de: 'trennbar — mit etwas hantieren' },
    sentenceB: 'Sie geht sehr vorsichtig mit den Werkzeugen um.',
    patternB: 'UM-gehen',
  },
  {
    word: 'wiederholen',
    labelA: { en: 'inseparable — to repeat', de: 'untrennbar — repetieren' },
    sentenceA: 'Kannst du das bitte wiederholen?',
    patternA: 'wie-der-HOL-en',
    labelB: { en: 'separable — to fetch back', de: 'trennbar — zurückholen' },
    sentenceB: 'Ich hole das Buch morgen wieder.',
    patternB: 'WIE-der-holen',
  },
];

// Contrastive/emphatic sentence stress works the same way in German as in
// English — the mechanism isn't language-specific, only the sentence is.
export const stressSentencesDe: StressSentence[] = [
  {
    id: 'ich-stressed',
    words: ['Ich', 'habe', 'nicht', 'gesagt,', 'sie', 'hat', 'es', 'genommen'],
    stressIndex: 0,
    meaning: {
      en: 'Implies: someone else said it.',
      de: 'Impliziert: jemand anders hat es gesagt.',
    },
  },
  {
    id: 'sie-stressed',
    words: ['Ich', 'habe', 'nicht', 'gesagt,', 'sie', 'hat', 'es', 'genommen'],
    stressIndex: 4,
    meaning: {
      en: 'Implies: someone else took it, not her.',
      de: 'Impliziert: jemand anders hat es genommen, nicht sie.',
    },
  },
  {
    id: 'genommen-stressed',
    words: ['Ich', 'habe', 'nicht', 'gesagt,', 'sie', 'hat', 'es', 'genommen'],
    stressIndex: 7,
    meaning: {
      en: 'Implies: she did something else with it — borrowed it, maybe.',
      de: 'Impliziert: sie hat etwas anderes damit gemacht — es sich vielleicht nur geliehen.',
    },
  },
  {
    id: 'es-stressed',
    words: ['Ich', 'habe', 'nicht', 'gesagt,', 'sie', 'hat', 'es', 'genommen'],
    stressIndex: 6,
    meaning: {
      en: 'Implies: she took something else, not "it".',
      de: 'Impliziert: sie hat etwas anderes genommen, nicht "es".',
    },
  },
];
