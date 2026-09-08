import type { Topic } from '../exercises/topics';

// Reuses the same Topic shape (and ExerciseGrid component) as /exercises/ —
// same card language, same mini-switcher interaction, different content
// domain: reading, vocabulary, dialogue, listening comprehension, and
// writing, versus Exercises' speech-mechanics drills.
export const studyFormats: Topic[] = [
  {
    slug: 'story',
    category: { en: 'Reading & vocabulary', de: 'Lesen & Wortschatz' },
    status: 'live',
    title: { en: 'Story Stream', de: 'Story Stream' },
    description: {
      en: 'Read a short serialized story, fill in the blanks, and tap any word to see where it actually came from.',
      de: 'Lies eine kurze Fortsetzungsgeschichte, füll die Lücken und tipp auf ein Wort, um seine Herkunft zu sehen.',
    },
    tags: ['Reading', 'Vocabulary', 'Grammar'],
    aspects: [
      {
        label: { en: 'Cloze', de: 'Lückentext' },
        blurb: {
          en: 'Fill blanks from a word bank, then check your grammar choices.',
          de: 'Füll Lücken aus einer Wortbank und prüf deine Grammatikwahl.',
        },
      },
      {
        label: { en: 'Glossary', de: 'Glossar' },
        blurb: {
          en: 'Tap a word for its meaning, origin, and pronunciation — save it to your deck.',
          de: 'Tipp ein Wort für Bedeutung, Herkunft und Aussprache — speichere es in deinem Deck.',
        },
      },
    ],
    href: '/study/story/',
  },
  {
    slug: 'dialogue',
    category: { en: 'Conversation', de: 'Konversation' },
    status: 'live',
    title: { en: 'Dialogue Lab', de: 'Dialogue Lab' },
    description: {
      en: 'Roleplay a real work scenario — a branching negotiation where every response gets real feedback.',
      de: 'Spiel ein echtes Arbeitsszenario durch — eine verzweigte Verhandlung, bei der jede Antwort echtes Feedback bekommt.',
    },
    tags: ['Conversation', 'Speaking', 'Grammar'],
    aspects: [
      {
        label: { en: 'Roleplay', de: 'Rollenspiel' },
        blurb: {
          en: 'A branching negotiation with a supplier — your choices shape how it plays out.',
          de: 'Eine verzweigte Verhandlung mit einer Lieferantin — deine Entscheidungen bestimmen den Verlauf.',
        },
      },
      {
        label: { en: 'Goal phrases', de: 'Zielphrasen' },
        blurb: {
          en: 'Land three target phrases across the conversation, then save them to your deck.',
          de: 'Bring drei Zielphrasen im Gespräch unter und speichere sie in deinem Deck.',
        },
      },
    ],
    href: '/study/dialogue/',
  },
  {
    slug: 'deck',
    category: { en: 'Spaced repetition', de: 'Spaced Repetition' },
    status: 'live',
    title: { en: 'Daily Deck', de: 'Daily Deck' },
    description: {
      en: 'A real spaced-repetition review, seeded by words and phrases you save from the rest of Study.',
      de: 'Eine echte Spaced-Repetition-Wiederholung, gefüttert von Wörtern und Phrasen, die du im Study-Bereich speicherst.',
    },
    tags: ['Vocabulary', 'Grammar', 'Speaking'],
    aspects: [
      {
        label: { en: 'Review', de: 'Wiederholung' },
        blurb: {
          en: 'Word, cloze, listen-and-type, and say-it-aloud cards, scheduled by how well you know them.',
          de: 'Wort-, Lückentext-, Hör-und-tipp- und Laut-sagen-Karten, geplant danach, wie gut du sie kennst.',
        },
      },
      {
        label: { en: 'Streak', de: 'Serie' },
        blurb: {
          en: 'A running streak and weekly grid, kept in this browser.',
          de: 'Eine laufende Serie und ein Wochenraster, gespeichert in diesem Browser.',
        },
      },
    ],
    href: '/study/deck/',
  },
  {
    slug: 'listening',
    category: { en: 'Listening', de: 'Hörverstehen' },
    status: 'live',
    title: { en: 'Listening Board', de: 'Listening Board' },
    description: {
      en: 'A real spoken clip with a transcript that reveals itself as you listen, plus dictation and shadowing.',
      de: 'Ein echter gesprochener Clip mit einem Transkript, das sich beim Hören aufdeckt, plus Diktat und Nachsprechen.',
    },
    tags: ['Listening', 'Writing', 'Pronunciation'],
    aspects: [
      {
        label: { en: 'Dictation', de: 'Diktat' },
        blurb: {
          en: 'Type the trickiest line, checked word by word.',
          de: 'Tipp die kniffligste Zeile, Wort für Wort geprüft.',
        },
      },
      {
        label: { en: 'Shadowing', de: 'Nachsprechen' },
        blurb: {
          en: 'Record yourself right after the model and compare.',
          de: 'Nimm dich direkt nach dem Modell auf und vergleiche.',
        },
      },
    ],
    href: '/study/listening/',
  },
  {
    slug: 'writing',
    category: { en: 'Writing', de: 'Schreiben' },
    status: 'live',
    title: { en: 'Writing Desk', de: 'Writing Desk' },
    description: {
      en: 'Write a real reply against a brief, with a live checklist and a model answer to compare against.',
      de: 'Schreib eine echte Antwort nach Vorgabe, mit einer Live-Checkliste und einer Musterantwort zum Vergleich.',
    },
    tags: ['Writing', 'Grammar', 'Business'],
    aspects: [
      {
        label: { en: 'Checklist', de: 'Checkliste' },
        blurb: {
          en: 'Required elements are detected live in your own draft as you type.',
          de: 'Erforderliche Elemente werden live in deinem eigenen Entwurf beim Tippen erkannt.',
        },
      },
      {
        label: { en: 'Model answer', de: 'Musterantwort' },
        blurb: {
          en: 'Reveal a fully written sample to compare tone and phrasing.',
          de: 'Deck ein vollständig geschriebenes Beispiel auf, um Ton und Formulierung zu vergleichen.',
        },
      },
    ],
    href: '/study/writing/',
  },
];
