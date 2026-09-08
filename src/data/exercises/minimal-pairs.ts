import type { LocalizedText } from './topics';

export interface MinimalPair {
  id: string;
  wordA: string;
  ipaA: string;
  wordB: string;
  ipaB: string;
  contrast: string;
  notes: LocalizedText;
}

export const minimalPairs: MinimalPair[] = [
  {
    id: 'ship-sheep',
    wordA: 'ship',
    ipaA: '/ʃɪp/',
    wordB: 'sheep',
    ipaB: '/ʃiːp/',
    contrast: 'ɪ vs iː',
    notes: {
      en: 'The short "ɪ" is more central and relaxed than the tense, longer "iː".',
      de: 'Das kurze "ɪ" ist zentraler und entspannter als das gespannte, längere "iː".',
    },
  },
  {
    id: 'live-leave',
    wordA: 'live',
    ipaA: '/lɪv/',
    wordB: 'leave',
    ipaB: '/liːv/',
    contrast: 'ɪ vs iː',
    notes: {
      en: 'Same vowel contrast as ship/sheep, in a different consonant frame.',
      de: 'Derselbe Vokalkontrast wie bei ship/sheep, nur mit anderen Konsonanten drumherum.',
    },
  },
  {
    id: 'think-sink',
    wordA: 'think',
    ipaA: '/θɪŋk/',
    wordB: 'sink',
    ipaB: '/sɪŋk/',
    contrast: 'θ vs s',
    notes: {
      en: 'Tongue between the teeth for "θ"; tongue behind the teeth (not touching) for "s".',
      de: 'Zunge zwischen den Zähnen für "θ"; Zunge hinter den Zähnen (ohne Berührung) für "s".',
    },
  },
  {
    id: 'thin-fin',
    wordA: 'thin',
    ipaA: '/θɪn/',
    wordB: 'fin',
    ipaB: '/fɪn/',
    contrast: 'θ vs f',
    notes: {
      en: 'Both are voiceless and airy, but "θ" uses the tongue tip, not the lip.',
      de: 'Beide sind stimmlos und luftig, aber bei "θ" arbeitet die Zungenspitze, nicht die Lippe.',
    },
  },
  {
    id: 'light-right',
    wordA: 'light',
    ipaA: '/laɪt/',
    wordB: 'right',
    ipaB: '/raɪt/',
    contrast: 'l vs r',
    notes: {
      en: 'Tongue tip touches the ridge behind the teeth for "l"; it curls back without touching for "r".',
      de: 'Zungenspitze berührt bei "l" den Gaumenwulst hinter den Zähnen; bei "r" krümmt sie sich zurück, ohne zu berühren.',
    },
  },
  {
    id: 'collect-correct',
    wordA: 'collect',
    ipaA: '/kəˈlekt/',
    wordB: 'correct',
    ipaB: '/kəˈrekt/',
    contrast: 'l vs r',
    notes: {
      en: 'Same l/r contrast, mid-word this time.',
      de: 'Derselbe l/r-Kontrast, diesmal mitten im Wort.',
    },
  },
  {
    id: 'van-wan',
    wordA: 'van',
    ipaA: '/væn/',
    wordB: 'wan',
    ipaB: '/wɒn/',
    contrast: 'v vs w',
    notes: {
      en: 'Top teeth touch the bottom lip for "v"; lips round without teeth contact for "w".',
      de: 'Obere Zähne berühren bei "v" die Unterlippe; bei "w" runden sich die Lippen ohne Zahnkontakt.',
    },
  },
  {
    id: 'vine-wine',
    wordA: 'vine',
    ipaA: '/vaɪn/',
    wordB: 'wine',
    ipaB: '/waɪn/',
    contrast: 'v vs w',
    notes: {
      en: 'Same v/w contrast — a common one for German and Slavic-language speakers.',
      de: 'Derselbe v/w-Kontrast — ein klassischer Stolperstein für deutsche und slawische Muttersprachler.',
    },
  },
  {
    id: 'bet-bat',
    wordA: 'bet',
    ipaA: '/bet/',
    wordB: 'bat',
    ipaB: '/bæt/',
    contrast: 'e vs æ',
    notes: {
      en: '"æ" opens the jaw wider and further forward than "e".',
      de: '"æ" öffnet den Kiefer weiter und weiter vorn als "e".',
    },
  },
  {
    id: 'cheap-jeep',
    wordA: 'cheap',
    ipaA: '/tʃiːp/',
    wordB: 'jeep',
    ipaB: '/dʒiːp/',
    contrast: 'tʃ vs dʒ',
    notes: {
      en: 'Same tongue position; "dʒ" adds voicing, "tʃ" stays voiceless.',
      de: 'Gleiche Zungenstellung; "dʒ" ist stimmhaft, "tʃ" bleibt stimmlos.',
    },
  },
  {
    id: 'simple-symbol',
    wordA: 'pit',
    ipaA: '/pɪt/',
    wordB: 'peat',
    ipaB: '/piːt/',
    contrast: 'ɪ vs iː',
    notes: {
      en: 'A third ɪ/iː pair — this contrast is worth extra repetition.',
      de: 'Ein drittes ɪ/iː-Paar — dieser Kontrast lohnt zusätzliche Wiederholung.',
    },
  },
  {
    id: 'bad-bed',
    wordA: 'bad',
    ipaA: '/bæd/',
    wordB: 'bed',
    ipaB: '/bed/',
    contrast: 'æ vs e',
    notes: {
      en: 'The reverse framing of bet/bat — same contrast, different ear training.',
      de: 'Die umgekehrte Reihenfolge von bet/bat — gleicher Kontrast, anderes Hörtraining.',
    },
  },
];
