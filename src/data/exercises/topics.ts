export type TopicStatus = 'live' | 'worksheet' | 'read' | 'soon';

export interface TopicAspect {
  label: string;
  blurb: string;
}

export interface Topic {
  slug: string;
  category: string;
  status: TopicStatus;
  title: string;
  description: string;
  tags: string[];
  aspects: TopicAspect[];
  href: string;
  featured?: boolean;
}

const statusCopy: Record<TopicStatus, { badge: string; cta: string }> = {
  live: { badge: 'Live', cta: 'Start' },
  worksheet: { badge: 'Worksheet', cta: 'Open worksheet' },
  read: { badge: 'Read', cta: 'Read the piece' },
  soon: { badge: 'Coming soon', cta: 'Coming soon' },
};

export function statusBadge(status: TopicStatus) {
  return statusCopy[status].badge;
}

export function statusCta(status: TopicStatus) {
  return statusCopy[status].cta;
}

// One card per topic in speech-training-exercises-build-plan.md, in the
// doc's own order. Status reflects what's actually built, not aspiration.
// `aspects` power the nested toggle switcher inside each card — one entry
// per tag, in the same order.
export const topics: Topic[] = [
  {
    slug: 'articulation',
    category: 'Sounds',
    status: 'live',
    title: 'Articulation',
    description: 'Minimal-pairs discrimination and shadowing drills for the sound contrasts that trip up learners.',
    tags: ['Minimal pairs', 'Shadowing'],
    aspects: [
      { label: 'Minimal pairs', blurb: 'Two clips, one contrast — pick which word you heard. Self-gradable by design.' },
      { label: 'Shadowing', blurb: 'Play the model, record yourself, and compare the two side by side.' },
    ],
    href: '/exercises/minimal-pairs/',
  },
  {
    slug: 'phonology',
    category: 'Connected speech',
    status: 'live',
    title: 'Phonology',
    description: 'Hear how natural speech links, drops, and blends sounds — then check your ear against the model.',
    tags: ['Linking', 'Listening'],
    aspects: [
      { label: 'Linking', blurb: 'Click the words where sounds blend or drop in natural speech, then reveal the answer.' },
      { label: 'Listening', blurb: 'Type what you hear — reductions and all — then check it word by word.' },
    ],
    href: '/exercises/connected-speech/',
  },
  {
    slug: 'prosody',
    category: 'Stress & intonation',
    status: 'worksheet',
    title: 'Prosody',
    description: 'Mark primary and secondary stress, and hear how the same sentence changes meaning by stress alone.',
    tags: ['Stress', 'Intonation'],
    aspects: [
      { label: 'Stress', blurb: 'Noun or verb? With words like "record", only the stressed syllable tells you.' },
      { label: 'Intonation', blurb: 'Same six words, four different meanings — depending only on which one you stress.' },
    ],
    href: '/exercises/prosody/',
  },
  {
    slug: 'voice',
    category: 'Breath & pitch',
    status: 'worksheet',
    title: 'Voice',
    description: 'Breath-support routines and a self-assessment checklist for pitch range and resonance.',
    tags: ['Breath', 'Pitch range'],
    aspects: [
      { label: 'Breath', blurb: 'A guided in-4 / hold-2 / out-6 breathing routine, paced by audio.' },
      { label: 'Pitch range', blurb: 'A self-assessment checklist for resonance, strain, and pitch movement.' },
    ],
    href: '/exercises/voice/',
  },
  {
    slug: 'volume',
    category: 'Projection',
    status: 'soon',
    title: 'Volume',
    description: 'Record-and-compare drills against a model reference at varying volume.',
    tags: ['Projection', 'Intensity'],
    aspects: [
      { label: 'Projection', blurb: 'Record yourself and compare against a model reference at varying volume.' },
      { label: 'Intensity', blurb: 'A simple in-browser volume meter while you read a passage aloud.' },
    ],
    href: '/exercises/',
  },
  {
    slug: 'pace',
    category: 'Rhythm',
    status: 'live',
    title: 'Pace & pausing',
    description: 'Model audio with exact pause placement, plus playback-speed shadowing.',
    tags: ['Pausing', 'Playback speed'],
    aspects: [
      { label: 'Pausing', blurb: 'Model audio with exact pause placement — hear the "/" and "//" marks.' },
      { label: 'Playback speed', blurb: 'Slow the same clip to 0.8×, then speed back up to shadow it at pace.' },
    ],
    href: '/exercises/pacing/',
  },
  {
    slug: 'fluency',
    category: 'Read, not drill',
    status: 'read',
    title: 'Fluency',
    description: "What stuttering and cluttering actually are, and why they're not the same as an accent.",
    tags: ['Explainer'],
    aspects: [
      { label: 'Explainer', blurb: 'What stuttering and cluttering actually are — and where to get real, clinical help.' },
    ],
    href: '/blog/stuttering-cluttering-not-an-accent/',
  },
  {
    slug: 'rhetoric',
    category: 'Delivery',
    status: 'live',
    title: 'Rhetoric & delivery',
    description: 'Deliver a short pitch to an AI listener that responds and asks real follow-up questions.',
    tags: ['Roleplay', 'Persuasion'],
    aspects: [
      { label: 'Roleplay', blurb: 'A live call with an AI listener that responds and asks real follow-up questions.' },
      { label: 'Persuasion', blurb: 'Deliver a 60–90 second pitch on any topic you choose, then hear it pushed back on.' },
    ],
    href: '/exercises/rhetoric/',
    featured: true,
  },
];
