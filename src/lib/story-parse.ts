// Parses Story Stream chapter text (see ../data/study/story.ts) into a
// sequence of segments Astro can render server-side. Runs at build/render
// time, not in the browser — the interactivity (filling blanks, tapping
// glossary words) is wired up client-side by StoryReader.astro against the
// data-* attributes this produces.

export type StorySegment =
  | { kind: 'text'; value: string }
  | { kind: 'cloze'; id: string; options: string[]; answer: string }
  | { kind: 'glossary'; id: string; word: string; display: string };

const TOKEN_RE = /\{\{([^}]+)\}\}|\[\[([^\]]+)\]\]/g;

export function parseStoryText(text: string): StorySegment[] {
  const segments: StorySegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let clozeIndex = 0;

  while ((match = TOKEN_RE.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      const options = match[1].split('|').map((s) => s.trim());
      segments.push({ kind: 'cloze', id: `c${clozeIndex++}`, options, answer: options[0] });
    } else if (match[2] !== undefined) {
      const word = match[2].trim();
      segments.push({ kind: 'glossary', id: word.toLowerCase(), word: word.toLowerCase(), display: word });
    }

    lastIndex = TOKEN_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/** Every cloze's correct answer plus a couple of its distractors, shuffled once (seeded by chapter id) for a stable word bank. */
export function wordBank(segments: StorySegment[], seed: string): string[] {
  const words: string[] = [];
  for (const seg of segments) {
    if (seg.kind === 'cloze') words.push(...seg.options);
  }
  return seededShuffle(words, seed);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967295;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
