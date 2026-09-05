import type { Topic } from '../exercises/topics';

// Reuses the same Topic shape (and ExerciseGrid component) as /exercises/ —
// same card language, same mini-switcher interaction, different content
// domain: reading, vocabulary, dialogue, listening comprehension, and
// writing, versus Exercises' speech-mechanics drills.
export const studyFormats: Topic[] = [
  {
    slug: 'story',
    category: 'Reading & vocabulary',
    status: 'live',
    title: 'Story Stream',
    description: 'Read a short serialized story, fill in the blanks, and tap any word to see where it actually came from.',
    tags: ['Reading', 'Vocabulary', 'Grammar'],
    aspects: [
      { label: 'Cloze', blurb: 'Fill blanks from a word bank, then check your grammar choices.' },
      { label: 'Glossary', blurb: 'Tap a word for its meaning, origin, and pronunciation — save it to your deck.' },
    ],
    href: '/study/story/',
  },
  {
    slug: 'dialogue',
    category: 'Conversation',
    status: 'live',
    title: 'Dialogue Lab',
    description: 'Roleplay a real work scenario — a branching negotiation where every response gets real feedback.',
    tags: ['Conversation', 'Speaking', 'Grammar'],
    aspects: [
      { label: 'Roleplay', blurb: 'A branching negotiation with a supplier — your choices shape how it plays out.' },
      { label: 'Goal phrases', blurb: 'Land three target phrases across the conversation, then save them to your deck.' },
    ],
    href: '/study/dialogue/',
  },
  {
    slug: 'deck',
    category: 'Spaced repetition',
    status: 'live',
    title: 'Daily Deck',
    description: 'A real spaced-repetition review, seeded by words and phrases you save from the rest of Study.',
    tags: ['Vocabulary', 'Grammar', 'Speaking'],
    aspects: [
      { label: 'Review', blurb: 'Word, cloze, listen-and-type, and say-it-aloud cards, scheduled by how well you know them.' },
      { label: 'Streak', blurb: 'A running streak and weekly grid, kept in this browser.' },
    ],
    href: '/study/deck/',
  },
  {
    slug: 'listening',
    category: 'Listening',
    status: 'live',
    title: 'Listening Board',
    description: 'A real spoken clip with a transcript that reveals itself as you listen, plus dictation and shadowing.',
    tags: ['Listening', 'Writing', 'Pronunciation'],
    aspects: [
      { label: 'Dictation', blurb: 'Type the trickiest line, checked word by word.' },
      { label: 'Shadowing', blurb: 'Record yourself right after the model and compare.' },
    ],
    href: '/study/listening/',
  },
  {
    slug: 'writing',
    category: 'Writing',
    status: 'live',
    title: 'Writing Desk',
    description: 'Write a real reply against a brief, with a live checklist and a model answer to compare against.',
    tags: ['Writing', 'Grammar', 'Business'],
    aspects: [
      { label: 'Checklist', blurb: 'Required elements are detected live in your own draft as you type.' },
      { label: 'Model answer', blurb: 'Reveal a fully written sample to compare tone and phrasing.' },
    ],
    href: '/study/writing/',
  },
];
