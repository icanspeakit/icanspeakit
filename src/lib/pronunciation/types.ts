// The provider-neutral contract for pronunciation assessment. The page
// (src/lib/ausspracheCheck.js) only ever sees these types; everything that knows about a
// particular vendor lives in one adapter beside this file (today: ./azure.ts in the
// browser, ./azure.server.ts on the server). Swapping providers means writing a new pair
// of adapters and changing the two re-exports in ./index.ts and ./server.ts.

/** Why an assessment or a spoken word failed. The page maps each code to a German message. */
export type PronunciationErrorCode =
  | "auth" // the learner must sign in first
  | "rate" // too many sessions in a short time
  | "limit" // the learner's daily allowance is used up (src/data/premium-features.json)
  | "full" // all learners together used today's share of the provider quota (src/lib/usage.ts)
  | "config" // the provider is not set up on the server
  | "busy" // the provider is still busy after a few automatic retries
  | "quota" // the provider's monthly allowance is used up
  | "token" // no connection to the provider, or its credentials could not be fetched
  | "noSpeech" // nothing was heard
  | "failed" // anything else
  // Raised by the page itself before a provider is involved:
  | "insecure"
  | "micUnsupported"
  | "micDenied"
  | "micMissing"
  | "wrongText";

export class PronunciationError extends Error {
  constructor(public readonly code: PronunciationErrorCode) {
    super(code);
    this.name = "PronunciationError";
  }
}

/** How a single word went. `insertion` words were said but are not in the reference. */
export type WordError =
  | "none"
  | "mispronunciation"
  | "omission"
  | "insertion"
  | "unexpectedBreak"
  | "missingBreak"
  | "monotone";

export interface AssessedPhoneme {
  /** The phoneme as the provider writes it (IPA or the provider's own alphabet). Empty when
      the provider scores the sound but does not name it (Azure for de-DE): the order of the
      scores is still worth having — src/lib/pronunciation/patterns.ts reads "the last sound". */
  symbol: string;
  /** 0–100. */
  score: number;
}

export interface AssessedWord {
  /** The word as the provider recognised it (often lower-cased, without punctuation). */
  word: string;
  /** 0–100 accuracy; 0 for an omitted word. */
  score: number;
  error: WordError;
  /** Empty when the provider gives no phoneme detail. */
  phonemes: AssessedPhoneme[];
}

/** All scores 0–100. The optional ones are left out when the provider has no such score. */
export interface Assessment {
  overall: number;
  accuracy: number;
  fluency?: number;
  completeness?: number;
  prosody?: number;
  /** In spoken order, reference words and insertions alike. */
  words: AssessedWord[];
}

export interface AssessOptions {
  /** The sentence the learner is reading. */
  referenceText: string;
  /** BCP 47, e.g. "de-DE". */
  language: string;
  /** Called once the provider is actually listening. */
  onListening?: () => void;
  /** Called before each automatic retry while the provider is briefly busy. */
  onRetry?: () => void;
}

/** Live mode: a longer text read in one go, scored piece by piece while the learner speaks. */
export interface LiveOptions {
  /** The whole text (several sentences). */
  referenceText: string;
  language: string;
  /** Stop on its own after this long. */
  maxMs: number;
  onListening?: () => void;
  onRetry?: () => void;
  /** The words recognised so far in the current phrase, as the learner speaks. */
  onPartial?: (text: string) => void;
  /** One finished phrase: its words with scores, in spoken order (insertions included). */
  onSegment?: (assessment: Assessment, text: string) => void;
}

export interface LiveSession {
  /** Ends the session early; `done` still resolves. */
  stop(): void;
  /** Resolves when the session has ended (stopped, timed out or silent), rejects on an error. */
  done: Promise<void>;
}

export interface SpeakOptions {
  language: string;
  slow?: boolean;
}

/** The browser half of a provider. */
export interface PronunciationProvider {
  readonly id: string;
  /** Records from the default microphone until the learner stops, then scores the take. */
  assess(options: AssessOptions): Promise<Assessment>;
  /**
   * Continuous scoring (optional — a provider without it has no live mode). One session at
   * a time: a second call while one runs rejects with "busy".
   */
  assessLive?(options: LiveOptions): Promise<LiveSession>;
  /**
   * Whether `speak` can run right now without a network round trip for credentials —
   * the page only uses the provider's voice when this is true, so listening never
   * forces a sign-in.
   */
  canSpeak(): boolean;
  /** Speaks a word or sentence with the provider's own voice. */
  speak(text: string, options: SpeakOptions): Promise<void>;
}

/** What the server half hands the browser half: opaque to the route, read by the adapter. */
export type ClientCredentials =
  | { ok: true; body: Record<string, unknown>; expiresIn: number }
  | { ok: false; reason: "config" | "upstream" | "busy" | "quota" };

/** The server half of a provider: turns the secret key into short-lived browser credentials. */
export interface PronunciationServerProvider {
  readonly id: string;
  issueClientCredentials(): Promise<ClientCredentials>;
}
