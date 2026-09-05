// Shared helpers for working with ElevenLabs' character-level forced
// alignment (from the `/with-timestamps` endpoint). Used by both the
// Prosody pitch-contour feature and the Study section's audio-driven
// exercises (Listening Board, Story Stream audio), so it lives on its own
// rather than inside pitch-contour.ts.

export interface WordSpan {
  /** Start time of the word, in seconds. */
  start: number;
  /** End time of the word, in seconds. */
  end: number;
}

// Recovers per-word start/end times from ElevenLabs' character-level
// alignment, by splitting on whitespace characters. Words in the source
// text must be separated by single spaces — this doesn't handle arbitrary
// punctuation-adjacent tokenization, just space-delimited words.
export function wordSpansFromAlignment(
  characters: string[],
  startTimes: number[],
  endTimes: number[]
): WordSpan[] {
  const spans: WordSpan[] = [];
  let start: number | null = null;
  let end: number | null = null;

  for (let i = 0; i < characters.length; i++) {
    const isSpace = characters[i].trim() === '';
    if (isSpace) {
      if (start !== null && end !== null) spans.push({ start, end });
      start = null;
      end = null;
      continue;
    }
    if (start === null) start = startTimes[i];
    end = endTimes[i];
  }
  if (start !== null && end !== null) spans.push({ start, end });

  return spans;
}

// Decodes a base64 string to a fresh Uint8Array. Used up to twice per clip
// (once for Web Audio decoding, once for a playable Blob) because
// `decodeAudioData` can detach/consume the buffer it's given.
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface TtsTimestampsResponse {
  audioBase64: string;
  alignment: {
    characters: string[];
    characterStartTimesSeconds: number[];
    characterEndTimesSeconds: number[];
  };
}

// Groups word spans into "lines" by splitting the word list wherever a word
// ends with sentence-ending punctuation (. ! ?). Used to turn one
// continuous TTS clip's alignment into progressively-revealed lines for
// Listening Board, without needing separate audio per line.
export function linesFromWords(words: string[], spans: WordSpan[]): { text: string; start: number; end: number; words: string[] }[] {
  const lines: { text: string; start: number; end: number; words: string[] }[] = [];
  let current: string[] = [];
  let currentSpans: WordSpan[] = [];

  const flush = () => {
    if (!current.length) return;
    lines.push({
      text: current.join(' '),
      start: currentSpans[0]?.start ?? 0,
      end: currentSpans[currentSpans.length - 1]?.end ?? 0,
      words: current.slice(),
    });
    current = [];
    currentSpans = [];
  };

  words.forEach((word, i) => {
    current.push(word);
    if (spans[i]) currentSpans.push(spans[i]);
    if (/[.!?]["')]?$/.test(word)) flush();
  });
  flush();

  return lines;
}
