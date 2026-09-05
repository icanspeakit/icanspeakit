// Story Stream: a short serialized workplace story. Chapter text uses two
// inline tokens, parsed by ../lib/story-parse.ts:
//   {{correct|distractor|distractor}}  — a cloze blank, first option correct
//   [[word]]                            — a tappable glossary word
// Glossary entries below double as this chapter's "Daily Deck" word cards
// once saved — meaning + origin, same shape as the site's Word Cards.

export interface GlossaryEntry {
  word: string;
  meaning: string;
  origin: string;
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
    meaning: 'Practicing silently, going over words in your head before saying them aloud.',
    origin: "From Old French 'rehercier' — literally 'to rake over again' (to harrow a field a second time).",
  },
  rumpled: {
    word: 'Rumpled',
    meaning: 'Wrinkled and untidy, as if slept in.',
    origin: "Germanic root shared with 'rumple' (a fold or crease) — unrelated to 'rump.'",
  },
  ushered: {
    word: 'Ushered',
    meaning: 'Showed someone in, or guided them somewhere.',
    origin: "From Latin 'ostiarius' ('doorkeeper') via Old French 'ussier' — the same root as the 'usher' at a wedding.",
  },
  configured: {
    word: 'Configured',
    meaning: 'Set up correctly for use.',
    origin: "From Latin 'configurare' — 'con-' (together) + 'figurare' (to shape); originally about arranging parts into a form.",
  },
  chaos: {
    word: 'Chaos',
    meaning: 'Complete disorder and confusion.',
    origin: "From Greek 'khaos' — the formless void that existed before the ordered universe, in early Greek cosmology.",
  },
  wrangled: {
    word: 'Wrangled',
    meaning: 'Managed to get something through effort or persuasion.',
    origin: "Possibly from Low German 'wrangeln' (to struggle). American English later narrowed it to 'herd livestock' — hence 'cowboy wrangler.'",
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
