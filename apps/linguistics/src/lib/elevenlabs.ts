const API_BASE = 'https://api.elevenlabs.io/v1';

// Alice — "Clear, Engaging Educator" (British, female). A good default for
// pronunciation drills; callers can override via the `voiceId` param.
export const DEFAULT_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';
export const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

interface SynthesizeSpeechOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function synthesizeSpeech({
  text,
  voiceId = DEFAULT_VOICE_ID,
  modelId = DEFAULT_MODEL_ID,
  stability = 0.5,
  similarityBoost = 0.75,
}: SynthesizeSpeechOptions): Promise<ArrayBuffer> {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs TTS request failed (${response.status}): ${detail}`);
  }

  return response.arrayBuffer();
}

export interface SpeechAlignment {
  /** One entry per character of the input text (spaces included). */
  characters: string[];
  /** Start time of each character, in seconds from clip start. */
  characterStartTimesSeconds: number[];
  /** End time of each character, in seconds from clip start. */
  characterEndTimesSeconds: number[];
}

export interface SpeechWithTimestamps {
  /** Raw MP3 bytes, base64-encoded — passed straight through to the client,
   *  which decodes it itself (it needs the ArrayBuffer for both playback
   *  and Web Audio pitch analysis, so there's no reason to decode it here
   *  just to re-encode it for the API response). */
  audioBase64: string;
  /** Character-level timing, straight from ElevenLabs' forced alignment. */
  alignment: SpeechAlignment;
}

// ElevenLabs' `/with-timestamps` endpoint returns audio + a forced
// character alignment in one response — audio_base64 plus an `alignment`
// object (and a `normalized_alignment` counterpart we don't need here).
// We use the real alignment to find where each *word* actually falls in
// time, so a pitch contour drawn from the same clip lines up correctly —
// no guessing word timing from character counts.
//
// The response shape below is ElevenLabs' documented, stable schema as of
// this writing. If it ever comes back different, `parseAlignment` throws
// with the actual top-level keys it saw, rather than silently
// misreading the data — check that error against ElevenLabs' current
// docs for `POST /v1/text-to-speech/{voice_id}/with-timestamps` if it
// ever fires.
function parseAlignment(raw: unknown): SpeechAlignment {
  const body = raw as Record<string, unknown>;
  const alignment = body?.alignment as Record<string, unknown> | undefined;

  const characters = alignment?.characters;
  const starts = alignment?.character_start_times_seconds;
  const ends = alignment?.character_end_times_seconds;

  if (!Array.isArray(characters) || !Array.isArray(starts) || !Array.isArray(ends)) {
    throw new Error(
      `Unexpected ElevenLabs with-timestamps response shape. Top-level keys: ${Object.keys(
        body ?? {}
      ).join(', ')}; alignment keys: ${Object.keys(alignment ?? {}).join(', ')}`
    );
  }

  return {
    characters: characters as string[],
    characterStartTimesSeconds: starts as number[],
    characterEndTimesSeconds: ends as number[],
  };
}

export async function synthesizeSpeechWithTimestamps({
  text,
  voiceId = DEFAULT_VOICE_ID,
  modelId = DEFAULT_MODEL_ID,
  stability = 0.5,
  similarityBoost = 0.75,
}: SynthesizeSpeechOptions): Promise<SpeechWithTimestamps> {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs with-timestamps request failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  const audioBase64 = json.audio_base64;
  if (typeof audioBase64 !== 'string') {
    throw new Error(
      `Unexpected ElevenLabs with-timestamps response: no audio_base64 string. Top-level keys: ${Object.keys(
        json ?? {}
      ).join(', ')}`
    );
  }

  return { audioBase64, alignment: parseAlignment(json) };
}
