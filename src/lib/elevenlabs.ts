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
