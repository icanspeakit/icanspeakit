export interface MinimalPair {
  id: string;
  wordA: string;
  ipaA: string;
  wordB: string;
  ipaB: string;
  contrast: string;
  notes: string;
}

export const minimalPairs: MinimalPair[] = [
  {
    id: 'ship-sheep',
    wordA: 'ship',
    ipaA: '/ʃɪp/',
    wordB: 'sheep',
    ipaB: '/ʃiːp/',
    contrast: 'ɪ vs iː',
    notes: 'The short "ɪ" is more central and relaxed than the tense, longer "iː".',
  },
  {
    id: 'live-leave',
    wordA: 'live',
    ipaA: '/lɪv/',
    wordB: 'leave',
    ipaB: '/liːv/',
    contrast: 'ɪ vs iː',
    notes: 'Same vowel contrast as ship/sheep, in a different consonant frame.',
  },
  {
    id: 'think-sink',
    wordA: 'think',
    ipaA: '/θɪŋk/',
    wordB: 'sink',
    ipaB: '/sɪŋk/',
    contrast: 'θ vs s',
    notes: 'Tongue between the teeth for "θ"; tongue behind the teeth (not touching) for "s".',
  },
  {
    id: 'thin-fin',
    wordA: 'thin',
    ipaA: '/θɪn/',
    wordB: 'fin',
    ipaB: '/fɪn/',
    contrast: 'θ vs f',
    notes: 'Both are voiceless and airy, but "θ" uses the tongue tip, not the lip.',
  },
  {
    id: 'light-right',
    wordA: 'light',
    ipaA: '/laɪt/',
    wordB: 'right',
    ipaB: '/raɪt/',
    contrast: 'l vs r',
    notes: 'Tongue tip touches the ridge behind the teeth for "l"; it curls back without touching for "r".',
  },
  {
    id: 'collect-correct',
    wordA: 'collect',
    ipaA: '/kəˈlekt/',
    wordB: 'correct',
    ipaB: '/kəˈrekt/',
    contrast: 'l vs r',
    notes: 'Same l/r contrast, mid-word this time.',
  },
  {
    id: 'van-wan',
    wordA: 'van',
    ipaA: '/væn/',
    wordB: 'wan',
    ipaB: '/wɒn/',
    contrast: 'v vs w',
    notes: 'Top teeth touch the bottom lip for "v"; lips round without teeth contact for "w".',
  },
  {
    id: 'vine-wine',
    wordA: 'vine',
    ipaA: '/vaɪn/',
    wordB: 'wine',
    ipaB: '/waɪn/',
    contrast: 'v vs w',
    notes: 'Same v/w contrast — a common one for German and Slavic-language speakers.',
  },
  {
    id: 'bet-bat',
    wordA: 'bet',
    ipaA: '/bet/',
    wordB: 'bat',
    ipaB: '/bæt/',
    contrast: 'e vs æ',
    notes: '"æ" opens the jaw wider and further forward than "e".',
  },
  {
    id: 'cheap-jeep',
    wordA: 'cheap',
    ipaA: '/tʃiːp/',
    wordB: 'jeep',
    ipaB: '/dʒiːp/',
    contrast: 'tʃ vs dʒ',
    notes: 'Same tongue position; "dʒ" adds voicing, "tʃ" stays voiceless.',
  },
  {
    id: 'simple-symbol',
    wordA: 'pit',
    ipaA: '/pɪt/',
    wordB: 'peat',
    ipaB: '/piːt/',
    contrast: 'ɪ vs iː',
    notes: 'A third ɪ/iː pair — this contrast is worth extra repetition.',
  },
  {
    id: 'bad-bed',
    wordA: 'bad',
    ipaA: '/bæd/',
    wordB: 'bed',
    ipaB: '/bed/',
    contrast: 'æ vs e',
    notes: 'The reverse framing of bet/bat — same contrast, different ear training.',
  },
];
