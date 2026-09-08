import type { PacingPassage } from './pacing';

// German pacing/pause passages — same four everyday situations as
// pacing.ts, written natively (not translated word-for-word) so the pause
// points fall where German clause structure actually invites a breath:
// after fronted adverbs that trigger verb-subject inversion ("deshalb habe
// ich..."), and around verb-final subordinate clauses.
export const pacingPassagesDe: PacingPassage[] = [
  {
    id: 'coffee-order-de',
    title: { en: 'Ordering coffee', de: 'Kaffee bestellen' },
    markedText: 'Ich hätte gern einen großen Kaffee, / bitte. // Ohne Zucker, / aber mit etwas Milch.',
    ttsText:
      'Ich hätte gern einen großen Kaffee, <break time="0.4s"/> bitte. <break time="0.8s"/> Ohne Zucker, <break time="0.4s"/> aber mit etwas Milch.',
  },
  {
    id: 'weather-smalltalk-de',
    title: { en: 'Weather small talk', de: 'Small Talk übers Wetter' },
    markedText:
      'Es soll später regnen, / deshalb // habe ich einen Regenschirm mitgenommen, / nur für den Fall.',
    ttsText:
      'Es soll später regnen, <break time="0.4s"/> deshalb <break time="0.8s"/> habe ich einen Regenschirm mitgenommen, <break time="0.4s"/> nur für den Fall.',
  },
  {
    id: 'meeting-recap-de',
    title: { en: 'Meeting recap', de: 'Meeting-Zusammenfassung' },
    markedText:
      'Also, / zusammengefasst: // wir werden den Entwurf bis Freitag fertigstellen, / und / ihn am Montag an den Kunden schicken.',
    ttsText:
      'Also, <break time="0.4s"/> zusammengefasst: <break time="0.8s"/> wir werden den Entwurf bis Freitag fertigstellen, <break time="0.4s"/> und <break time="0.3s"/> ihn am Montag an den Kunden schicken.',
  },
  {
    id: 'directions-de',
    title: { en: 'Giving directions', de: 'Wegbeschreibung geben' },
    markedText:
      "Geh zwei Blocks geradeaus, / dann // bieg an der Apotheke links ab. / Es ist die zweite Tür auf der rechten Seite.",
    ttsText:
      'Geh zwei Blocks geradeaus, <break time="0.4s"/> dann <break time="0.8s"/> bieg an der Apotheke links ab. <break time="0.4s"/> Es ist die zweite Tür auf der rechten Seite.',
  },
];
