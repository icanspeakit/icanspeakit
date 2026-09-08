import type { LocalizedText } from './topics';

export interface StressShiftWord {
  word: string;
  labelA: LocalizedText;
  sentenceA: string;
  patternA: string;
  labelB: LocalizedText;
  sentenceB: string;
  patternB: string;
}

// Two readings of the same written word, distinguished only by stress
// placement. TTS gets the *full sentence* so the model's own contextual
// prosody carries the shift — trying to force it via capitalized syllables
// inside a single word produces unreliable, sometimes mispronounced audio.
export const stressShiftWords: StressShiftWord[] = [
  {
    word: 'record',
    labelA: { en: 'noun', de: 'Nomen' },
    sentenceA: 'Please check the record.',
    patternA: 'REC-ord',
    labelB: { en: 'verb', de: 'Verb' },
    sentenceB: 'I need to record this meeting.',
    patternB: 're-CORD',
  },
  {
    word: 'present',
    labelA: { en: 'noun', de: 'Nomen' },
    sentenceA: 'I bought her a present.',
    patternA: 'PRES-ent',
    labelB: { en: 'verb', de: 'Verb' },
    sentenceB: "I'll present the results tomorrow.",
    patternB: 'pre-SENT',
  },
  {
    word: 'object',
    labelA: { en: 'noun', de: 'Nomen' },
    sentenceA: "Don't touch that object.",
    patternA: 'OB-ject',
    labelB: { en: 'verb', de: 'Verb' },
    sentenceB: 'I object to this plan.',
    patternB: 'ob-JECT',
  },
  {
    word: 'contract',
    labelA: { en: 'noun', de: 'Nomen' },
    sentenceA: 'Sign the contract.',
    patternA: 'CON-tract',
    labelB: { en: 'verb', de: 'Verb' },
    sentenceB: 'The metal will contract when it cools.',
    patternB: 'con-TRACT',
  },
];

export interface StressSentence {
  id: string;
  words: string[];
  stressIndex: number;
  meaning: LocalizedText;
}

// Same six words, four different stress placements, four different implied
// meanings. TTS emphasis on the capitalized word is best-effort, not
// precise — the visual mark plus meaning is the actual teaching tool here.
export const stressSentences: StressSentence[] = [
  {
    id: 'i-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 0,
    meaning: {
      en: 'Implies: someone else said it.',
      de: 'Impliziert: jemand anders hat es gesagt.',
    },
  },
  {
    id: 'she-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 3,
    meaning: {
      en: 'Implies: someone else took it, not her.',
      de: 'Impliziert: jemand anders hat es genommen, nicht sie.',
    },
  },
  {
    id: 'took-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 4,
    meaning: {
      en: 'Implies: she did something else with it — borrowed it, maybe.',
      de: 'Impliziert: sie hat etwas anderes damit gemacht — es sich vielleicht nur geliehen.',
    },
  },
  {
    id: 'it-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 5,
    meaning: {
      en: 'Implies: she took something else, not "it".',
      de: 'Impliziert: sie hat etwas anderes genommen, nicht "es".',
    },
  },
];

export function sentenceWithEmphasis(words: string[], stressIndex: number) {
  return words.map((w, i) => (i === stressIndex ? w.toUpperCase() : w)).join(' ');
}
