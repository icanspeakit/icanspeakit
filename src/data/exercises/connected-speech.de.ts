import type { ConnectedSpeechSentence } from './connected-speech';

// German connected-speech phenomena are genuinely different from English's
// (wanna/gonna-style reduction) — not a translation of connected-speech.ts.
// Covers: colloquial auxiliary contractions, glottal-stop reset before
// vowel-initial words (the opposite instinct from English liaison),
// final-obstruent devoicing regardless of what follows, and r-vocalization.
export const connectedSpeechSentencesDe: ConnectedSpeechSentence[] = [
  {
    id: 'haben-wir',
    words: ['Haben', 'wir', 'noch', 'Zeit?'],
    reductionIndices: [0, 1],
    explanation: {
      en: '"Haben wir" often collapses to something like "ham wir" in casual speech — the auxiliary loses its ending and merges straight into the pronoun.',
      de: '"Haben wir" verschmilzt in lockerer Sprache oft zu so etwas wie "ham wir" — das Hilfsverb verliert seine Endung und geht direkt ins Pronomen über.',
    },
  },
  {
    id: 'gibt-es',
    words: ['Gibt', 'es', 'hier', 'einen', 'Bahnhof?'],
    reductionIndices: [0, 1],
    explanation: {
      en: '"Gibt es" commonly contracts to "gibt\'s" in everyday speech — much like English "there\'s" for "there is".',
      de: '"Gibt es" wird im Alltag meist zu "gibt\'s" zusammengezogen — ähnlich wie im Englischen "there\'s" für "there is".',
    },
  },
  {
    id: 'glottal-reset',
    words: ['Sie', 'erinnert', 'ihn', 'an', 'alles.'],
    reductionIndices: [1, 2, 3, 4],
    explanation: {
      en: 'Each vowel-initial word here gets a hard reset — a glottal stop (Knacklaut) — instead of linking smoothly to the word before it. That\'s the opposite instinct from English, which tends to blend "sie erinnert" toward "sier-innert".',
      de: 'Jedes vokalisch beginnende Wort hier bekommt einen harten Neueinsatz — einen Knacklaut — statt sich mit dem vorherigen Wort zu verbinden. Das ist das Gegenteil des englischen Instinkts, der "sie erinnert" gern zu "sier-innert" verschleift.',
    },
  },
  {
    id: 'final-devoicing',
    words: ['Ein', 'Tag', 'ist', 'genug.'],
    reductionIndices: [1],
    explanation: {
      en: '"Tag" ends in a voiceless "k" sound, not a "g" — even though the next word starts with a vowel. German devoices final obstruents no matter what follows, unlike the English instinct to re-voice into a following vowel.',
      de: '"Tag" endet auf ein stimmloses "k", kein "g" — obwohl das nächste Wort mit einem Vokal beginnt. Endkonsonanten werden im Deutschen unabhängig vom Folgelaut entstimmt, anders als der englische Instinkt, vor einem Vokal wieder stimmhaft zu werden.',
    },
  },
  {
    id: 'r-vocalization',
    words: ['Die', 'Tür', 'ist', 'offen.'],
    reductionIndices: [1],
    explanation: {
      en: 'The "r" at the end of "Tür" isn\'t a consonant — it vocalizes into a light "uh" off-glide ([ɐ̯]), the way some English accents drop a coda "r".',
      de: 'Das "r" am Ende von "Tür" ist kein Konsonant — es wird zu einem leichten "uh"-Nachschlag ([ɐ̯]) vokalisiert, ähnlich wie in manchen englischen Akzenten das End-r verschwindet.',
    },
  },
];
