import type { CardContent } from '../../lib/deck-store';

// A small starter deck so Daily Deck isn't empty before anyone has saved a
// word from Story Stream or a phrase from Dialogue Lab. Real spaced
// repetition runs on top of this via ../lib/deck-store.ts.
export const starterDeck: CardContent[] = [
  {
    id: 'cloze:conditional-1',
    type: 'cloze',
    front: 'If I ___ (have) more time, I would travel.',
    back: 'had',
    source: 'Grammar · conditionals',
  },
  {
    id: 'cloze:conditional-2',
    type: 'cloze',
    front: 'If she ___ (know) about the meeting, she would have come.',
    back: 'had known',
    source: 'Grammar · conditionals',
  },
  {
    id: 'listen:phrase-1',
    type: 'listen',
    front: 'Listen and type what you hear',
    back: 'Could we push it to Thursday?',
    audioText: 'Could we push it to Thursday?',
    source: 'Dialogue Lab',
  },
  {
    id: 'listen:phrase-2',
    type: 'listen',
    front: 'Listen and type what you hear',
    back: 'The invoice was due last Friday.',
    audioText: 'The invoice was due last Friday.',
    source: 'Listening Board',
  },
  {
    id: 'say:practice-1',
    type: 'say',
    front: 'I understand, however we really need them by Wednesday.',
    back: 'Record yourself, then play it back — listen for the stress on "however."',
    audioText: 'I understand, however we really need them by Wednesday.',
    source: 'Speaking',
  },
  {
    id: 'say:practice-2',
    type: 'say',
    front: "Let's agree on Thursday, then.",
    back: 'Record yourself and compare — is the rhythm even, or rushed?',
    audioText: "Let's agree on Thursday, then.",
    source: 'Speaking',
  },
];
