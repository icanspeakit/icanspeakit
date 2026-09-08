import type { LocalizedText } from './topics';

export interface ConnectedSpeechSentence {
  id: string;
  /** Words as displayed/clicked, in order. */
  words: string[];
  /** Indices into `words` where a native speaker reduces/links/drops a sound. */
  reductionIndices: number[];
  explanation: LocalizedText;
}

export const connectedSpeechSentences: ConnectedSpeechSentence[] = [
  {
    id: 'what-are-you',
    words: ['What', 'are', 'you', 'doing', 'tonight?'],
    reductionIndices: [0, 1, 2],
    explanation: {
      en: '"What are you" often blends into something like "whadaya" — the "t" and "are" link and reduce, and "you" softens toward "ya".',
      de: '"What are you" verschmilzt oft zu etwas wie "whadaya" — "t" und "are" verbinden sich und reduzieren, "you" wird weicher Richtung "ya".',
    },
  },
  {
    id: 'want-to',
    words: ['I', "don't", 'want', 'to', 'go', 'yet.'],
    reductionIndices: [2, 3],
    explanation: {
      en: '"Want to" commonly reduces to "wanna" in fast, casual speech.',
      de: '"Want to" reduziert sich in schneller, lockerer Sprache oft zu "wanna".',
    },
  },
  {
    id: 'going-to',
    words: ['We', 'are', 'going', 'to', 'miss', 'the', 'train.'],
    reductionIndices: [2, 3],
    explanation: {
      en: '"Going to" reduces to "gonna" before a verb in casual speech.',
      de: '"Going to" reduziert sich vor einem Verb in lockerer Sprache zu "gonna".',
    },
  },
  {
    id: 'next-day',
    words: ['She', 'left', 'the', 'next', 'day.'],
    reductionIndices: [1, 2],
    explanation: {
      en: '"Left the" links — the final "t" and initial "th" blend, and the "t" is often barely released before "the".',
      de: '"Left the" verbindet sich — das End-"t" und das Anfangs-"th" verschmelzen, das "t" wird vor "the" oft kaum hörbar gelöst.',
    },
  },
];
