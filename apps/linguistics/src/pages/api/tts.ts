import type { APIRoute } from 'astro';
import { synthesizeSpeech } from '../../lib/elevenlabs';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const text = url.searchParams.get('text');
  if (!text) {
    return new Response('Missing required "text" query param', { status: 400 });
  }

  const voiceId = url.searchParams.get('voiceId') ?? undefined;
  const modelId = url.searchParams.get('modelId') ?? undefined;

  try {
    const audio = await synthesizeSpeech({ text, voiceId, modelId });
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Failed to generate speech', { status: 502 });
  }
};
