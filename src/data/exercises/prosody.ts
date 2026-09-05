export interface StressShiftWord {
  word: string;
  nounSentence: string;
  nounPattern: string;
  verbSentence: string;
  verbPattern: string;
}

// Noun/verb pairs where only stress placement changes, not spelling. TTS
// gets the *full sentence* so the model's own contextual prosody carries
// the shift — trying to force it via capitalized syllables inside a single
// word produces unreliable, sometimes mispronounced audio.
export const stressShiftWords: StressShiftWord[] = [
  {
    word: 'record',
    nounSentence: 'Please check the record.',
    nounPattern: 'REC-ord',
    verbSentence: 'I need to record this meeting.',
    verbPattern: 're-CORD',
  },
  {
    word: 'present',
    nounSentence: 'I bought her a present.',
    nounPattern: 'PRES-ent',
    verbSentence: "I'll present the results tomorrow.",
    verbPattern: 'pre-SENT',
  },
  {
    word: 'object',
    nounSentence: "Don't touch that object.",
    nounPattern: 'OB-ject',
    verbSentence: 'I object to this plan.',
    verbPattern: 'ob-JECT',
  },
  {
    word: 'contract',
    nounSentence: 'Sign the contract.',
    nounPattern: 'CON-tract',
    verbSentence: 'The metal will contract when it cools.',
    verbPattern: 'con-TRACT',
  },
];

export interface StressSentence {
  id: string;
  words: string[];
  stressIndex: number;
  meaning: string;
}

// Same six words, four different stress placements, four different implied
// meanings. TTS emphasis on the capitalized word is best-effort, not
// precise — the visual mark plus meaning is the actual teaching tool here.
export const stressSentences: StressSentence[] = [
  {
    id: 'i-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 0,
    meaning: 'Implies: someone else said it.',
  },
  {
    id: 'she-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 3,
    meaning: 'Implies: someone else took it, not her.',
  },
  {
    id: 'took-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 4,
    meaning: 'Implies: she did something else with it — borrowed it, maybe.',
  },
  {
    id: 'it-stressed',
    words: ['I', "didn't", 'say', 'she', 'took', 'it'],
    stressIndex: 5,
    meaning: 'Implies: she took something else, not "it".',
  },
];

export function sentenceWithEmphasis(words: string[], stressIndex: number) {
  return words.map((w, i) => (i === stressIndex ? w.toUpperCase() : w)).join(' ');
}
