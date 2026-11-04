import type { LocalizedText } from './topics';

export interface PacingPassage {
  id: string;
  title: LocalizedText;
  /** Plain text with pause markers for the print worksheet: "/" short pause, "//" long pause. */
  markedText: string;
  /** Same text with ElevenLabs break tags for TTS: <break time="x.xs"/>. */
  ttsText: string;
}

export const pacingPassages: PacingPassage[] = [
  {
    id: 'coffee-order',
    title: { en: 'Ordering coffee', de: 'Kaffee bestellen' },
    markedText: "I'll have a large coffee, / please. // No sugar, / but a little milk.",
    ttsText:
      'I\'ll have a large coffee, <break time="0.4s"/> please. <break time="0.8s"/> No sugar, <break time="0.4s"/> but a little milk.',
  },
  {
    id: 'weather-smalltalk',
    title: { en: 'Weather small talk', de: 'Small Talk übers Wetter' },
    markedText: "It's supposed to rain later, / so // I brought an umbrella / just in case.",
    ttsText:
      'It\'s supposed to rain later, <break time="0.4s"/> so <break time="0.8s"/> I brought an umbrella <break time="0.4s"/> just in case.',
  },
  {
    id: 'meeting-recap',
    title: { en: 'Meeting recap', de: 'Meeting-Zusammenfassung' },
    markedText:
      "So, / to sum up: // we'll finish the draft by Friday, / and / send it to the client on Monday.",
    ttsText:
      'So, <break time="0.4s"/> to sum up: <break time="0.8s"/> we\'ll finish the draft by Friday, <break time="0.4s"/> and <break time="0.3s"/> send it to the client on Monday.',
  },
  {
    id: 'directions',
    title: { en: 'Giving directions', de: 'Wegbeschreibung geben' },
    markedText:
      "Go straight for two blocks, / then // turn left at the pharmacy. / It's the second door on the right.",
    ttsText:
      'Go straight for two blocks, <break time="0.4s"/> then <break time="0.8s"/> turn left at the pharmacy. <break time="0.4s"/> It\'s the second door on the right.',
  },
];
