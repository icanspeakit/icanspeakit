// Client-side, dependency-free pitch (F0) tracking on a decoded audio
// buffer. Runs in the browser against real TTS output — this is not a
// stylized curve, it's an estimate of the actual fundamental frequency
// the model produced, frame by frame.
//
// Method: windowed normalized autocorrelation, restricted to the human
// speech pitch range, with an RMS-based voicing gate and a short median
// filter to suppress octave-jump outliers. This is a classic, well
// understood approach (the same family as YIN/autocorrelation pitch
// trackers) — good enough for "where does the pitch rise/fall" teaching
// visuals, not lab-grade formant analysis.

export interface PitchFrame {
  /** Frame center time, in seconds from the start of the clip. */
  t: number;
  /** Estimated fundamental frequency in Hz, or null if unvoiced/silent. */
  hz: number | null;
}

export interface PitchContourOptions {
  /** Frame size in samples. Default 2048 (~46ms at 44.1kHz). */
  frameSize?: number;
  /** Hop size in samples. Default 512 (~12ms at 44.1kHz). */
  hopSize?: number;
  /** Lowest pitch to detect, Hz. Default 75 (below typical male voice floor). */
  minHz?: number;
  /** Highest pitch to detect, Hz. Default 400 (above typical female voice ceiling). */
  maxHz?: number;
  /** Minimum normalized autocorrelation to accept a frame as voiced. Default 0.35. */
  voicingThreshold?: number;
  /** Minimum RMS (0..1) for a frame to be considered non-silent. Default 0.01. */
  silenceThreshold?: number;
}

const DEFAULTS: Required<PitchContourOptions> = {
  frameSize: 2048,
  hopSize: 512,
  minHz: 75,
  maxHz: 400,
  voicingThreshold: 0.35,
  silenceThreshold: 0.01,
};

function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

// Normalized autocorrelation pitch detection for one windowed frame.
// Returns the estimated frequency in Hz, or null if the frame doesn't
// look voiced (no strong periodicity in range).
function detectPitchInFrame(
  frame: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
  voicingThreshold: number
): number | null {
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(Math.floor(sampleRate / minHz), frame.length - 1);
  if (maxLag <= minLag) return null;

  // Apply a Hamming window to reduce edge artifacts.
  const windowed = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1));
    windowed[i] = frame[i] * w;
  }

  // Energy at zero lag, for normalization.
  let energy0 = 0;
  for (let i = 0; i < windowed.length; i++) energy0 += windowed[i] * windowed[i];
  if (energy0 <= 0) return null;

  let bestLag = -1;
  let bestScore = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let energyLag = 0;
    const n = windowed.length - lag;
    for (let i = 0; i < n; i++) {
      corr += windowed[i] * windowed[i + lag];
      energyLag += windowed[i + lag] * windowed[i + lag];
    }
    // Normalize like a cosine similarity so the score is comparable
    // across lags regardless of local energy.
    const denom = Math.sqrt(energy0 * energyLag);
    const score = denom > 0 ? corr / denom : 0;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestScore < voicingThreshold) return null;
  return sampleRate / bestLag;
}

// 3-tap median filter over the Hz series (nulls pass through as-is) to
// remove single-frame octave errors without smearing real pitch moves.
function medianFilterHz(frames: PitchFrame[]): PitchFrame[] {
  const out = frames.slice();
  for (let i = 1; i < frames.length - 1; i++) {
    const a = frames[i - 1].hz;
    const b = frames[i].hz;
    const c = frames[i + 1].hz;
    if (a == null || b == null || c == null) continue;
    const sorted = [a, b, c].sort((x, y) => x - y);
    out[i] = { t: frames[i].t, hz: sorted[1] };
  }
  return out;
}

export function estimatePitchContour(
  buffer: AudioBuffer,
  opts: PitchContourOptions = {}
): PitchFrame[] {
  const { frameSize, hopSize, minHz, maxHz, voicingThreshold, silenceThreshold } = {
    ...DEFAULTS,
    ...opts,
  };

  // Mix down to mono if needed.
  const channelData =
    buffer.numberOfChannels === 1
      ? buffer.getChannelData(0)
      : (() => {
          const mono = new Float32Array(buffer.length);
          for (let c = 0; c < buffer.numberOfChannels; c++) {
            const ch = buffer.getChannelData(c);
            for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / buffer.numberOfChannels;
          }
          return mono;
        })();

  const frames: PitchFrame[] = [];
  for (let start = 0; start + frameSize <= channelData.length; start += hopSize) {
    const frame = channelData.subarray(start, start + frameSize);
    const t = (start + frameSize / 2) / buffer.sampleRate;

    if (rms(frame) < silenceThreshold) {
      frames.push({ t, hz: null });
      continue;
    }

    const hz = detectPitchInFrame(frame, buffer.sampleRate, minHz, maxHz, voicingThreshold);
    frames.push({ t, hz });
  }

  return medianFilterHz(frames);
}

export interface WordSpan {
  /** Start time of the word, in seconds. */
  start: number;
  /** End time of the word, in seconds. */
  end: number;
}

// Recovers per-word start/end times from ElevenLabs' character-level
// alignment, by splitting on whitespace characters. Words in the source
// text must be separated by single spaces (which is how
// `sentenceWithEmphasis` builds its TTS input) — this doesn't handle
// arbitrary punctuation-adjacent tokenization, just space-delimited words.
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

// Decodes a base64 string to a fresh Uint8Array. Used twice per clip (once
// for Web Audio decoding, once for the playable Blob) because
// `decodeAudioData` can detach/consume the buffer it's given.
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
