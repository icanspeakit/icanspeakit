import type { LocalizedText } from '../exercises/topics';

// Story Stream: a short serialized workplace story. Chapter text uses two
// inline tokens, parsed by ../lib/story-parse.ts:
//   {{correct|distractor|distractor}}  — a cloze blank, first option correct
//   [[word]]                            — a tappable glossary word
// Glossary entries below double as this chapter's "Daily Deck" word cards
// once saved — meaning + origin, same shape as the site's Word Cards.
//
// `word` stays English (it's the vocabulary being taught); `meaning` and
// `origin` are translated, same as the rest of the site's glossary-style
// explanatory copy.

export interface GlossaryEntry {
  word: string;
  meaning: LocalizedText;
  origin: LocalizedText;
}

export interface Chapter {
  id: string;
  title: string;
  level: string;
  minutes: number;
  text: string;
}

export const glossary: Record<string, GlossaryEntry> = {
  rehearsing: {
    word: 'Rehearsing',
    meaning: {
      en: 'Practicing silently, going over words in your head before saying them aloud.',
      de: 'Stilles Üben — Worte im Kopf durchgehen, bevor man sie laut ausspricht.',
    },
    origin: {
      en: "From Old French 'rehercier' — literally 'to rake over again' (to harrow a field a second time).",
      de: "Vom altfranzösischen 'rehercier' — wörtlich 'wieder durchharken' (ein Feld ein zweites Mal eggen).",
    },
  },
  rumpled: {
    word: 'Rumpled',
    meaning: {
      en: 'Wrinkled and untidy, as if slept in.',
      de: 'Zerknittert und unordentlich, als hätte man darin geschlafen.',
    },
    origin: {
      en: "Germanic root shared with 'rumple' (a fold or crease) — unrelated to 'rump.'",
      de: "Germanische Wurzel, geteilt mit 'rumple' (eine Falte) — nicht verwandt mit 'rump' (Hinterteil).",
    },
  },
  ushered: {
    word: 'Ushered',
    meaning: {
      en: 'Showed someone in, or guided them somewhere.',
      de: 'Jemanden hereingeführt oder irgendwohin geleitet.',
    },
    origin: {
      en: "From Latin 'ostiarius' ('doorkeeper') via Old French 'ussier' — the same root as the 'usher' at a wedding.",
      de: "Vom lateinischen 'ostiarius' ('Türhüter') über altfranzösisch 'ussier' — dieselbe Wurzel wie der 'usher' bei einer Hochzeit.",
    },
  },
  configured: {
    word: 'Configured',
    meaning: {
      en: 'Set up correctly for use.',
      de: 'Korrekt für den Gebrauch eingerichtet.',
    },
    origin: {
      en: "From Latin 'configurare' — 'con-' (together) + 'figurare' (to shape); originally about arranging parts into a form.",
      de: "Vom lateinischen 'configurare' — 'con-' (zusammen) + 'figurare' (formen); ursprünglich über das Anordnen von Teilen zu einer Form.",
    },
  },
  chaos: {
    word: 'Chaos',
    meaning: {
      en: 'Complete disorder and confusion.',
      de: 'Vollständige Unordnung und Verwirrung.',
    },
    origin: {
      en: "From Greek 'khaos' — the formless void that existed before the ordered universe, in early Greek cosmology.",
      de: "Vom griechischen 'khaos' — die formlose Leere, die vor dem geordneten Universum existierte, in der frühen griechischen Kosmologie.",
    },
  },
  wrangled: {
    word: 'Wrangled',
    meaning: {
      en: 'Managed to get something through effort or persuasion.',
      de: 'Etwas durch Mühe oder Überredung erreicht.',
    },
    origin: {
      en: "Possibly from Low German 'wrangeln' (to struggle). American English later narrowed it to 'herd livestock' — hence 'cowboy wrangler.'",
      de: "Möglicherweise vom niederdeutschen 'wrangeln' (ringen). Das amerikanische Englisch engte es später auf 'Vieh treiben' ein — daher 'cowboy wrangler.'",
    },
  },
};

export const chapters: Chapter[] = [
  {
    id: 'interview',
    title: 'Chapter 1 · The Interview',
    level: 'B1',
    minutes: 2,
    text: `Maria {{arrived|come|had come}} at the office ten minutes early, her palms damp with nerves. The receptionist glanced up and gave her a brief, reassuring smile. "They're running a little behind schedule," she said, "but it shouldn't be long." Maria nodded and sat down, [[rehearsing]] her opening line under her breath. When the door finally opened, a tall man in a [[rumpled]] suit stepped out, {{apologizing|apology|apologized}} profusely for the delay. His handshake was firm, almost aggressively so, and he [[ushered]] her inside with an energy that made the whole room feel smaller.`,
  },
  {
    id: 'first-day',
    title: 'Chapter 2 · The First Day',
    level: 'B1',
    minutes: 2,
    text: `On her first morning, Maria {{was given|gave|is given}} a laptop that hadn't been [[configured]] yet and a security badge with someone else's photo on it. Her new manager, Tom, seemed to genuinely enjoy the [[chaos]], laughing it off as "a rite of passage." By lunchtime she had met four people named Alex and completely {{lost|loses|losing}} track of where the coffee machine was. Still, when a colleague [[wrangled]] her a working badge and pointed her toward the right floor, Maria realized she might actually like it here.`,
  },
];
