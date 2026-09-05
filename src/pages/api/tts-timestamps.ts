import type { APIRoute } from 'astro';
import { synthesizeSpeechWithTimestamps } from '../../lib/elevenlabs';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const text = url.searchParams.get('text');
  if (!text) {
    return new Response('Missing required "text" query param', { status: 400 });
  }

  const voiceId = url.searchParams.get('voiceId') ?? undefined;
  const modelId = url.searchParams.get('modelId') ?? undefined;

  try {
    const { audioBase64, alignment } = await synthesizeSpeechWithTimestamps({ text, voiceId, modelId });
    return new Response(JSON.stringify({ audioBase64, alignment }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate speech with timestamps' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
