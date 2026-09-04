export interface ConnectedSpeechSentence {
  id: string;
  /** Words as displayed/clicked, in order. */
  words: string[];
  /** Indices into `words` where a native speaker reduces/links/drops a sound. */
  reductionIndices: number[];
  explanation: string;
}

export const connectedSpeechSentences: ConnectedSpeechSentence[] = [
  {
    id: 'what-are-you',
    words: ['What', 'are', 'you', 'doing', 'tonight?'],
    reductionIndices: [0, 1, 2],
    explanation: '"What are you" often blends into something like "whadaya" — the "t" and "are" link and reduce, and "you" softens toward "ya".',
  },
  {
    id: 'want-to',
    words: ['I', "don't", 'want', 'to', 'go', 'yet.'],
    reductionIndices: [2, 3],
    explanation: '"Want to" commonly reduces to "wanna" in fast, casual speech.',
  },
  {
    id: 'going-to',
    words: ['We', 'are', 'going', 'to', 'miss', 'the', 'train.'],
    reductionIndices: [2, 3],
    explanation: '"Going to" reduces to "gonna" before a verb in casual speech.',
  },
  {
    id: 'next-day',
    words: ['She', 'left', 'the', 'next', 'day.'],
    reductionIndices: [1, 2],
    explanation: '"Left the" links — the final "t" and initial "th" blend, and the "t" is often barely released before "the".',
  },
];
