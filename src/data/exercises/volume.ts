import type { LocalizedText } from './topics';

export const referencePhrase = 'The meeting starts at three o\'clock in the main conference room.';

export interface VolumeLevel {
  id: string;
  label: LocalizedText;
  hint: LocalizedText;
}

export const volumeLevels: VolumeLevel[] = [
  {
    id: 'quiet',
    label: { en: 'Quiet', de: 'Leise' },
    hint: {
      en: 'Library voice — barely above a whisper, but every word still clear.',
      de: 'Bibliotheksstimme — kaum lauter als Flüstern, aber jedes Wort noch klar.',
    },
  },
  {
    id: 'conversational',
    label: { en: 'Conversational', de: 'Gesprächslautstärke' },
    hint: {
      en: 'Your normal talking-to-someone-across-a-table level.',
      de: 'Deine normale Lautstärke, als würdest du jemandem gegenüber am Tisch sitzen.',
    },
  },
  {
    id: 'projected',
    label: { en: 'Projected', de: 'Projiziert' },
    hint: {
      en: 'Filling a room — from the chest, not a shout from the throat.',
      de: 'Einen Raum füllen — aus der Brust, kein Schrei aus dem Hals.',
    },
  },
];

// The passage to read aloud is left in English — it's a fluency/volume
// production drill, same reasoning as the other exercise content.
export const readingPassage =
  "Good afternoon, everyone. Thank you for taking the time to join today. " +
  "Before we start, I want to walk through three things: what shipped last week, " +
  "what's blocking us, and what we need from each other to keep moving.";
