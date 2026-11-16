// Card looks for the tile-world UI: a front colour plus a corner motif (styles/tiles.css),
// cycling through the four brand colours. Used by word cards, colour cards and the tile hero.
export interface Look { bg: string; motif: string; a: string; b: string; dark?: boolean }

export const LOOKS: Look[] = [
  { bg: 'var(--isk-sky)', motif: 'isk-tile--half', a: 'var(--isk-navy)', b: 'var(--isk-yellow)' },
  { bg: 'var(--isk-yellow)', motif: 'isk-tile--quarter', a: 'var(--isk-coral)', b: '#fff' },
  { bg: 'var(--isk-coral)', motif: 'isk-tile--dots', a: 'var(--isk-navy)', b: '#fff' },
  { bg: 'var(--isk-green)', motif: 'isk-tile--dome', a: 'var(--isk-navy)', b: '#fff' },
  { bg: 'var(--isk-yellow)', motif: 'isk-tile--dside', a: 'var(--isk-navy)', b: '#fff' },
  { bg: 'var(--isk-sky)', motif: 'isk-tile--stripes', a: '#fff', b: 'transparent' },
  { bg: 'var(--isk-green)', motif: 'isk-tile--bowl', a: 'var(--isk-yellow)', b: 'transparent' },
  { bg: 'var(--isk-coral)', motif: 'isk-tile--half', a: 'var(--isk-yellow)', b: '#fff' },
];

export const look = (i: number, offset = 0): Look => LOOKS[(i + offset) % LOOKS.length];

/** Inline style for a colour card: front colour and stagger index. */
export const ccStyle = (l: Look, i: number) => `--front:${l.bg};--i:${i}`;
/** Inline style for the card's corner motif tile. */
export const motifStyle = (l: Look, size = 104) => `--t:${size}px;--bg:transparent;--a:${l.a};--b:${l.b}`;
