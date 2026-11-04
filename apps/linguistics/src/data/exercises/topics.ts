export type TopicStatus = 'live' | 'worksheet' | 'read' | 'soon';
export type Locale = 'en' | 'de';

export interface LocalizedText {
  en: string;
  de: string;
}

export interface TopicAspect {
  label: LocalizedText;
  blurb: LocalizedText;
}

export interface Topic {
  slug: string;
  category: LocalizedText;
  status: TopicStatus;
  title: LocalizedText;
  description: LocalizedText;
  tags: string[];
  aspects: TopicAspect[];
  /** Unprefixed path — pass through `hrefFor` to get the locale-correct link. */
  href: string;
  featured?: boolean;
}

export function hrefFor(href: string, locale: Locale) {
  return locale === 'de' ? `/de${href}` : href;
}

const statusCopy: Record<TopicStatus, { badge: LocalizedText; cta: LocalizedText }> = {
  live: { badge: { en: 'Live', de: 'Verfügbar' }, cta: { en: 'Start', de: 'Starten' } },
  worksheet: { badge: { en: 'Worksheet', de: 'Arbeitsblatt' }, cta: { en: 'Open worksheet', de: 'Arbeitsblatt öffnen' } },
  read: { badge: { en: 'Read', de: 'Lesen' }, cta: { en: 'Read the piece', de: 'Artikel lesen' } },
  soon: { badge: { en: 'Coming soon', de: 'Bald verfügbar' }, cta: { en: 'Coming soon', de: 'Bald verfügbar' } },
};

export function statusBadge(status: TopicStatus, locale: Locale = 'en') {
  return statusCopy[status].badge[locale];
}

export function statusCta(status: TopicStatus, locale: Locale = 'en') {
  return statusCopy[status].cta[locale];
}

// One card per topic in speech-training-exercises-build-plan.md, in the
// doc's own order. Status reflects what's actually built, not aspiration.
// `aspects` power the nested toggle switcher inside each card — one entry
// per tag, in the same order.
//
// Only the CATALOG copy (title/description/category/aspect blurbs) is
// translated to German here. The drills themselves stay English — they
// train specific English sound contrasts, connected-speech reductions, and
// stress patterns that don't have a German equivalent to translate to.
export const topics: Topic[] = [
  {
    slug: 'articulation',
    category: { en: 'Sounds', de: 'Laute' },
    status: 'live',
    title: { en: 'Articulation', de: 'Artikulation' },
    description: {
      en: 'Minimal-pairs discrimination and shadowing drills for the sound contrasts that trip up learners.',
      de: 'Minimalpaar-Übungen und Shadowing für genau die Lautkontraste, an denen Lernende meist scheitern.',
    },
    tags: ['Minimal pairs', 'Shadowing'],
    aspects: [
      {
        label: { en: 'Minimal pairs', de: 'Minimalpaare' },
        blurb: {
          en: 'Two clips, one contrast — pick which word you heard. Self-gradable by design.',
          de: 'Zwei Klangbeispiele, ein Kontrast — welches Wort war es? Bewertet sich von selbst.',
        },
      },
      {
        label: { en: 'Shadowing', de: 'Shadowing' },
        blurb: {
          en: 'Play the model, record yourself, and compare the two side by side.',
          de: 'Modell abspielen, dich selbst aufnehmen und beides direkt vergleichen.',
        },
      },
    ],
    href: '/dashboard/articulation/',
  },
  {
    slug: 'phonology',
    category: { en: 'Connected speech', de: 'Verbundene Aussprache' },
    status: 'live',
    title: { en: 'Phonology', de: 'Phonologie' },
    description: {
      en: 'Hear how natural speech links, drops, and blends sounds — then check your ear against the model.',
      de: 'Hör, wie natürliche Sprache Laute verbindet, verschluckt und verschmilzt — und prüf dein Ohr am Modell.',
    },
    tags: ['Linking', 'Listening'],
    aspects: [
      {
        label: { en: 'Linking', de: 'Verbindungen' },
        blurb: {
          en: 'Click the words where sounds blend or drop in natural speech, then reveal the answer.',
          de: 'Klick die Wörter an, wo Laute verschmelzen oder wegfallen, dann die Lösung aufdecken.',
        },
      },
      {
        label: { en: 'Listening', de: 'Hörverstehen' },
        blurb: {
          en: 'Type what you hear — reductions and all — then check it word by word.',
          de: 'Tipp, was du hörst — mit allen Reduktionen — und prüf es Wort für Wort.',
        },
      },
    ],
    href: '/dashboard/phonology/',
  },
  {
    slug: 'prosody',
    category: { en: 'Stress & intonation', de: 'Betonung & Intonation' },
    status: 'worksheet',
    title: { en: 'Prosody', de: 'Prosodie' },
    description: {
      en: 'Mark primary and secondary stress, and hear how the same sentence changes meaning by stress alone.',
      de: 'Markiere Haupt- und Nebenbetonung und hör, wie derselbe Satz allein durch Betonung die Bedeutung ändert.',
    },
    tags: ['Stress', 'Intonation'],
    aspects: [
      {
        label: { en: 'Stress', de: 'Wortbetonung' },
        blurb: {
          en: 'Noun or verb? With words like "record", only the stressed syllable tells you.',
          de: 'Nomen oder Verb? Bei Wörtern wie "record" verrät das nur die betonte Silbe.',
        },
      },
      {
        label: { en: 'Intonation', de: 'Satzbetonung' },
        blurb: {
          en: 'Same six words, four different meanings — depending only on which one you stress.',
          de: 'Sechs gleiche Wörter, vier verschiedene Bedeutungen — je nachdem, welches du betonst.',
        },
      },
    ],
    href: '/dashboard/prosody/',
  },
  {
    slug: 'voice',
    category: { en: 'Breath & pitch', de: 'Atmung & Stimmlage' },
    status: 'worksheet',
    title: { en: 'Voice', de: 'Stimme' },
    description: {
      en: 'Breath-support routines and a self-assessment checklist for pitch range and resonance.',
      de: 'Atemstütz-Übungen und eine Selbsteinschätzung für Stimmumfang und Resonanz.',
    },
    tags: ['Breath', 'Pitch range'],
    aspects: [
      {
        label: { en: 'Breath', de: 'Atmung' },
        blurb: {
          en: 'A guided in-4 / hold-2 / out-6 breathing routine, paced by audio.',
          de: 'Eine angeleitete Atemübung — 4 ein, 2 halten, 6 aus — im Audiotakt.',
        },
      },
      {
        label: { en: 'Pitch range', de: 'Stimmumfang' },
        blurb: {
          en: 'A self-assessment checklist for resonance, strain, and pitch movement.',
          de: 'Eine Selbsteinschätzung zu Resonanz, Anstrengung und Tonhöhenbewegung.',
        },
      },
    ],
    href: '/dashboard/voice/',
  },
  {
    slug: 'volume',
    category: { en: 'Projection', de: 'Stimmprojektion' },
    status: 'live',
    title: { en: 'Volume', de: 'Lautstärke' },
    description: {
      en: 'Record-and-compare drills against a model reference at varying volume.',
      de: 'Aufnehmen und vergleichen — gegen eine Modellaufnahme bei unterschiedlicher Lautstärke.',
    },
    tags: ['Projection', 'Intensity'],
    aspects: [
      {
        label: { en: 'Projection', de: 'Projektion' },
        blurb: {
          en: 'Record yourself and compare against a model reference at varying volume.',
          de: 'Nimm dich auf und vergleiche mit einer Modellaufnahme bei verschiedenen Lautstärken.',
        },
      },
      {
        label: { en: 'Intensity', de: 'Intensität' },
        blurb: {
          en: 'A simple in-browser volume meter while you read a passage aloud.',
          de: 'Ein einfacher Lautstärkemesser im Browser, während du einen Text laut liest.',
        },
      },
    ],
    href: '/dashboard/volume/',
  },
  {
    slug: 'pace',
    category: { en: 'Rhythm', de: 'Rhythmus' },
    status: 'live',
    title: { en: 'Pace & pausing', de: 'Tempo & Pausen' },
    description: {
      en: 'Model audio with exact pause placement, plus playback-speed shadowing.',
      de: 'Modellaudio mit exakter Pausensetzung, dazu Shadowing bei verschiedenen Wiedergabegeschwindigkeiten.',
    },
    tags: ['Pausing', 'Playback speed'],
    aspects: [
      {
        label: { en: 'Pausing', de: 'Pausen' },
        blurb: {
          en: 'Model audio with exact pause placement — hear the "/" and "//" marks.',
          de: 'Modellaudio mit exakter Pausensetzung — hör die Markierungen "/" und "//".',
        },
      },
      {
        label: { en: 'Playback speed', de: 'Wiedergabegeschwindigkeit' },
        blurb: {
          en: 'Slow the same clip to 0.8×, then speed back up to shadow it at pace.',
          de: 'Verlangsame denselben Clip auf 0,8× und steigere dann wieder auf Originaltempo.',
        },
      },
    ],
    href: '/dashboard/pace/',
  },
  {
    slug: 'fluency',
    category: { en: 'Read, not drill', de: 'Zum Lesen, nicht zum Üben' },
    status: 'read',
    title: { en: 'Fluency', de: 'Redefluss' },
    description: {
      en: "What stuttering and cluttering actually are, and why they're not the same as an accent.",
      de: 'Was Stottern und Poltern eigentlich sind — und warum das etwas anderes ist als ein Akzent.',
    },
    tags: ['Explainer'],
    aspects: [
      {
        label: { en: 'Explainer', de: 'Erklärung' },
        blurb: {
          en: 'What stuttering and cluttering actually are — and where to get real, clinical help.',
          de: 'Was Stottern und Poltern eigentlich sind — und wo es echte, klinische Hilfe gibt.',
        },
      },
    ],
    href: '/blog/stuttering-cluttering-not-an-accent/',
  },
  {
    slug: 'rhetoric',
    category: { en: 'Delivery', de: 'Vortrag' },
    status: 'live',
    title: { en: 'Rhetoric & delivery', de: 'Rhetorik & Vortrag' },
    description: {
      en: 'Deliver a short pitch to an AI listener that responds and asks real follow-up questions.',
      de: 'Halte einen kurzen Pitch vor einer KI-Zuhörerin, die reagiert und echte Rückfragen stellt.',
    },
    tags: ['Roleplay', 'Persuasion'],
    aspects: [
      {
        label: { en: 'Roleplay', de: 'Rollenspiel' },
        blurb: {
          en: 'A live call with an AI listener that responds and asks real follow-up questions.',
          de: 'Ein Live-Gespräch mit einer KI-Zuhörerin, die reagiert und echte Rückfragen stellt.',
        },
      },
      {
        label: { en: 'Persuasion', de: 'Überzeugungskraft' },
        blurb: {
          en: 'Deliver a 60–90 second pitch on any topic you choose, then hear it pushed back on.',
          de: 'Halte einen 60–90-Sekunden-Pitch zu einem Thema deiner Wahl und bekomm echten Gegenwind.',
        },
      },
    ],
    href: '/exercises/rhetoric/',
    featured: true,
  },
];
