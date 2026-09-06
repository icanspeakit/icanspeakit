export const referencePhrase = 'The meeting starts at three o\'clock in the main conference room.';

export interface VolumeLevel {
  id: string;
  label: string;
  hint: string;
}

export const volumeLevels: VolumeLevel[] = [
  {
    id: 'quiet',
    label: 'Quiet',
    hint: 'Library voice — barely above a whisper, but every word still clear.',
  },
  {
    id: 'conversational',
    label: 'Conversational',
    hint: 'Your normal talking-to-someone-across-a-table level.',
  },
  {
    id: 'projected',
    label: 'Projected',
    hint: 'Filling a room — from the chest, not a shout from the throat.',
  },
];

export const readingPassage =
  "Good afternoon, everyone. Thank you for taking the time to join today. " +
  "Before we start, I want to walk through three things: what shipped last week, " +
  "what's blocking us, and what we need from each other to keep moving.";
