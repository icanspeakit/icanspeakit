// Real pause-placement scoring for the Pace & pausing exercise.
//
// Originally this tried to derive target pause timestamps from ElevenLabs'
// forced-alignment character data at each `<break time="Xs"/>` tag. Live
// testing against /api/tts-timestamps disproved that: the alignment
// includes the literal `<break .../>` markup as zero-duration characters
// and never shifts the *following* spoken characters forward by the
// declared pause — so "the gap between two alignment timestamps" is
// always ~0 regardless of the tag's duration. The alignment simply isn't a
// reliable source for pause timing.
//
// Instead, both sides of the comparison are measured the same honest way:
// decode real audio (the model's synthesized clip, and the user's
// recording) and find actual silence gaps in the waveform via a short RMS
// envelope. This is symmetric and doesn't depend on trusting a declared
// tag duration the API doesn't actually seem to honor in its metadata.

import { base64ToBytes, type TtsTimestampsResponse } from './alignment';

function getAudioCtx(): AudioContext {
  const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
  return new AudioCtx();
}

/**
 * Finds contiguous quiet stretches in a decoded audio buffer, returned as
 * fractions (0–1) of the buffer's own silence-trimmed duration. Uses a
 * short-window RMS envelope with a threshold relative to that clip's own
 * peak, since recording level and synthesis loudness both vary.
 */
function detectPauseFractions(buffer: AudioBuffer): number[] {
  const samples = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  const windowSize = Math.round(sampleRate * 0.02); // ~20ms windows
  const rms: number[] = [];
  for (let i = 0; i < samples.length; i += windowSize) {
    let sumSquares = 0;
    const end = Math.min(i + windowSize, samples.length);
    for (let j = i; j < end; j++) sumSquares += samples[j] * samples[j];
    rms.push(Math.sqrt(sumSquares / (end - i)));
  }

  const peak = Math.max(...rms, 1e-6);
  const threshold = peak * 0.12;

  // Trim leading/trailing silence — that's "before speech starts" and
  // "after it ends", not a pause within the passage.
  let firstVoiced = rms.findIndex((v) => v > threshold);
  let lastVoiced = rms.length - 1 - [...rms].reverse().findIndex((v) => v > threshold);
  if (firstVoiced === -1) return [];
  firstVoiced = Math.max(0, firstVoiced);
  lastVoiced = Math.min(rms.length - 1, lastVoiced);

  const trimmed = rms.slice(firstVoiced, lastVoiced + 1);
  const minSilentWindows = Math.max(1, Math.round(0.15 / 0.02)); // ≥150ms

  const pauses: number[] = [];
  let runStart = -1;
  for (let i = 0; i < trimmed.length; i++) {
    const silent = trimmed[i] <= threshold;
    if (silent && runStart === -1) runStart = i;
    if (!silent && runStart !== -1) {
      if (i - runStart >= minSilentWindows) pauses.push((runStart + i) / 2 / trimmed.length);
      runStart = -1;
    }
  }
  if (runStart !== -1 && trimmed.length - runStart >= minSilentWindows) {
    pauses.push((runStart + trimmed.length) / 2 / trimmed.length);
  }

  return pauses;
}

/** Fetches the model's synthesized clip for `ttsText` and returns its real detected pause positions (fractions of duration). Null on any fetch/decode failure. */
export async function getTargetPauses(ttsText: string): Promise<number[] | null> {
  try {
    const res = await fetch(`/api/tts-timestamps?text=${encodeURIComponent(ttsText)}`);
    if (!res.ok) return null;
    const data: TtsTimestampsResponse = await res.json();
    const ctx = getAudioCtx();
    const bytes = base64ToBytes(data.audioBase64);
    const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    ctx.close();
    return detectPauseFractions(buffer);
  } catch {
    return null;
  }
}

/** Decodes a recorded clip and returns its real detected pause positions (fractions of duration). */
export async function detectUserPauses(blob: Blob): Promise<number[]> {
  const ctx = getAudioCtx();
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();
  return detectPauseFractions(buffer);
}

/** Greedy nearest-match between target and detected pause positions within `tolerance` (as a fraction of total duration). */
export function matchPauses(
  target: number[],
  detected: number[],
  tolerance = 0.08
): { matched: number; total: number } {
  const remaining = [...detected];
  let matched = 0;
  for (const t of target) {
    let bestIdx = -1;
    let bestDist = tolerance;
    remaining.forEach((d, i) => {
      const dist = Math.abs(d - t);
      if (dist <= bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    if (bestIdx !== -1) {
      matched += 1;
      remaining.splice(bestIdx, 1);
    }
  }
  return { matched, total: target.length };
}
