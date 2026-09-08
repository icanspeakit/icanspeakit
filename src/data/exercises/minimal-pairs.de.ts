import type { MinimalPair } from './minimal-pairs';

// German-target minimal pairs — for learners drilling German articulation,
// not translations of the English pairs in `minimal-pairs.ts`. Contrasts
// are chosen for what actually trips up English speakers: front rounded
// vowels (ü/ö), vowel length (which is phonemic in German), the ich-/ach-
// Laut split, the uvular r, and the v/w and z/s spelling traps.
export const minimalPairsDe: MinimalPair[] = [
  {
    id: 'fuehlen-fielen',
    wordA: 'fühlen',
    ipaA: '/ˈfyːlən/',
    wordB: 'fielen',
    ipaB: '/ˈfiːlən/',
    contrast: 'yː vs iː',
    notes: {
      en: 'German ü ("yː") is made by rounding your lips as for "u" while keeping your tongue in the "i" position; "ie" is a plain long "iː" with unrounded lips.',
      de: 'Das deutsche ü ("yː") entsteht, wenn du die Lippen wie bei "u" rundest, während die Zunge wie bei "i" bleibt; "ie" ist ein normales langes "iː" mit ungerundeten Lippen.',
    },
  },
  {
    id: 'soehne-sehne',
    wordA: 'Söhne',
    ipaA: '/ˈzøːnə/',
    wordB: 'sehne',
    ipaB: '/ˈzeːnə/',
    contrast: 'øː vs eː',
    notes: {
      en: 'ö ("øː") is the rounded-lip version of "eː" — same tongue height, lips pushed forward and rounded instead of spread.',
      de: 'ö ("øː") ist die gerundete Variante von "eː" — gleiche Zungenhöhe, aber die Lippen sind nach vorne gerundet statt gespreizt.',
    },
  },
  {
    id: 'staat-stadt',
    wordA: 'Staat',
    ipaA: '/ʃtaːt/',
    wordB: 'Stadt',
    ipaB: '/ʃtat/',
    contrast: 'aː vs a',
    notes: {
      en: 'Long "aː" is held noticeably longer than the short, clipped "a" in "Stadt" — vowel length changes meaning in German, unlike in English.',
      de: 'Das lange "aː" wird deutlich länger gehalten als das kurze, abgehackte "a" in "Stadt" — die Vokallänge verändert im Deutschen die Bedeutung.',
    },
  },
  {
    id: 'hoehle-hoelle',
    wordA: 'Höhle',
    ipaA: '/ˈhøːlə/',
    wordB: 'Hölle',
    ipaB: '/ˈhœlə/',
    contrast: 'øː vs œ',
    notes: {
      en: 'Both are rounded front vowels, but "øː" in "Höhle" is long and tense while "œ" in "Hölle" is short and more open — keep the lip rounding on the short one too.',
      de: 'Beide sind gerundete Vordervokale, aber "øː" in "Höhle" ist lang und gespannt, während "œ" in "Hölle" kurz und offener ist — die Lippenrundung auch beim kurzen Laut nicht verlieren.',
    },
  },
  {
    id: 'miete-mitte',
    wordA: 'Miete',
    ipaA: '/ˈmiːtə/',
    wordB: 'Mitte',
    ipaB: '/ˈmɪtə/',
    contrast: 'iː vs ɪ',
    notes: {
      en: 'Long, tense "iː" in "Miete" versus short, lax "ɪ" in "Mitte" — the same length contrast English already uses in "beat" vs. "bit", just applied to German words.',
      de: 'Langes, gespanntes "iː" in "Miete" gegenüber kurzem, entspanntem "ɪ" in "Mitte" — derselbe Längenkontrast wie im Englischen bei "beat" vs. "bit", nur auf deutsche Wörter angewendet.',
    },
  },
  {
    id: 'beet-bett',
    wordA: 'Beet',
    ipaA: '/beːt/',
    wordB: 'Bett',
    ipaB: '/bɛt/',
    contrast: 'eː vs ɛ',
    notes: {
      en: 'Long "eː" in "Beet" stays level and tense — it does not glide into a "y" sound the way English "ay" does. Short "ɛ" in "Bett" is more open, close to English "e" in "bed".',
      de: 'Langes "eː" in "Beet" bleibt gespannt und gleitet nicht zu einem "j"-Laut ab, wie es das englische "ay" tut. Kurzes "ɛ" in "Bett" ist offener, ähnlich dem "e" in "bed".',
    },
  },
  {
    id: 'ofen-offen',
    wordA: 'Ofen',
    ipaA: '/ˈoːfən/',
    wordB: 'offen',
    ipaB: '/ˈɔfən/',
    contrast: 'oː vs ɔ',
    notes: {
      en: 'Long, rounded "oː" in "Ofen" versus short, more open "ɔ" in "offen" — round the lips more and hold the vowel longer for "Ofen".',
      de: 'Langes, gerundetes "oː" in "Ofen" gegenüber kurzem, offenerem "ɔ" in "offen" — bei "Ofen" die Lippen stärker runden und den Vokal länger halten.',
    },
  },
  {
    id: 'ruhm-rum',
    wordA: 'Ruhm',
    ipaA: '/ʁuːm/',
    wordB: 'Rum',
    ipaB: '/ʁʊm/',
    contrast: 'uː vs ʊ',
    notes: {
      en: 'Long "uː" in "Ruhm" is held longer with tighter lip rounding than the short "ʊ" in "Rum", which sits closer to the vowel in English "book".',
      de: 'Langes "uː" in "Ruhm" wird länger gehalten und mit stärkerer Lippenrundung gesprochen als das kurze "ʊ" in "Rum".',
    },
  },
  {
    id: 'kuchen-kueche',
    wordA: 'Kuchen',
    ipaA: '/ˈkuːxən/',
    wordB: 'Küche',
    ipaB: '/ˈkʏçə/',
    contrast: 'x vs ç',
    notes: {
      en: 'The ach-Laut "x" (a rough sound at the back of the throat) follows back vowels like "u"; the ich-Laut "ç" (a softer hiss, tongue near the roof of the mouth) follows front vowels like "ü" — same letters "ch", two sounds chosen by the vowel before them.',
      de: 'Der Ach-Laut "x" (ein raues Geräusch hinten im Rachen) folgt auf dunkle Vokale wie "u"; der Ich-Laut "ç" (ein weicheres Zischen, Zunge nah am Gaumen) folgt auf helle Vokale wie "ü" — dieselben Buchstaben "ch", aber zwei verschiedene Laute je nach vorausgehendem Vokal.',
    },
  },
  {
    id: 'rose-lose',
    wordA: 'Rose',
    ipaA: '/ˈʁoːzə/',
    wordB: 'Lose',
    ipaB: '/ˈloːzə/',
    contrast: 'ʁ vs l',
    notes: {
      en: 'The standard German "r" here is a uvular sound made at the back of the throat, not the English tongue-curled "r" — an English-style "r" tends to drift toward sounding like "l".',
      de: 'Das deutsche "r" hier wird als Zäpfchen-R hinten im Rachen gebildet, nicht mit der englischen Zungenkrümmung — ein englisches "r" klingt sonst schnell wie ein "l".',
    },
  },
  {
    id: 'vier-wir',
    wordA: 'vier',
    ipaA: '/fiːɐ̯/',
    wordB: 'wir',
    ipaB: '/viːɐ̯/',
    contrast: 'f vs v',
    notes: {
      en: 'German "v" is usually pronounced like English "f" (vier), while German "w" is pronounced like English "v" (wir) — the opposite of what the letters suggest to an English speaker.',
      de: 'Das deutsche "v" wird meist wie ein englisches "f" gesprochen (vier), das deutsche "w" dagegen wie ein englisches "v" (wir) — genau umgekehrt zu dem, was die Buchstaben einem Englischsprachigen nahelegen.',
    },
  },
  {
    id: 'kirsche-kirche',
    wordA: 'Kirsche',
    ipaA: '/ˈkɪʁʃə/',
    wordB: 'Kirche',
    ipaB: '/ˈkɪʁçə/',
    contrast: 'ʃ vs ç',
    notes: {
      en: '"Sch" is "ʃ" (like English "sh"); "ch" here is the ich-Laut "ç", a softer hiss made further forward in the mouth — keep the two from collapsing into one sound.',
      de: '"Sch" ist "ʃ" (wie im Englischen "sh"); "ch" ist hier der Ich-Laut "ç", ein weicheres, weiter vorne gebildetes Zischen — die beiden Laute nicht zusammenfallen lassen.',
    },
  },
  {
    id: 'pfanne-panne',
    wordA: 'Pfanne',
    ipaA: '/ˈpfanə/',
    wordB: 'Panne',
    ipaB: '/ˈpanə/',
    contrast: 'pf vs p',
    notes: {
      en: '"Pf" is a true affricate — close the lips as for "p", then release straight into an "f", both in one quick motion; "Panne" is just a plain "p".',
      de: '"Pf" ist eine echte Affrikate — die Lippen wie bei "p" schließen und direkt in ein "f" lösen, beides in einer schnellen Bewegung; bei "Panne" bleibt es bei einem einfachen "p".',
    },
  },
  {
    id: 'zeit-seit',
    wordA: 'Zeit',
    ipaA: '/tsaɪt/',
    wordB: 'seit',
    ipaB: '/zaɪt/',
    contrast: 'ts vs z',
    notes: {
      en: 'German "z" is always the affricate "ts" (as in English "cats"), never a voiced "z" sound — "seit" keeps the plain "s" sound instead.',
      de: 'Das deutsche "z" ist immer die Affrikate "ts" (wie im Englischen "cats"), nie ein stimmhafter "z"-Laut — bei "seit" bleibt es beim einfachen "s"-Laut.',
    },
  },
];
