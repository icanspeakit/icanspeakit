// The pronunciation provider the browser uses. Offline build: ./browser.ts (Web Speech voice,
// no scoring). To add a scoring vendor, write an adapter that implements ./types.ts and
// swap the import below.
import { browserProvider as azureProvider } from "./browser";
import type { Assessment, PronunciationProvider } from "./types";

// Dev only: window.__fakeAssessment = <Assessment> makes the next assess() return it instead
// of recording, so the result card, findings and links can be tried without a microphone
// ("Hun" for "Hund"). Gone from production builds: import.meta.env.DEV is false there.
const fake = (): Assessment | null =>
  import.meta.env.DEV ? ((globalThis as { __fakeAssessment?: Assessment }).__fakeAssessment ?? null) : null;

export const pronunciationProvider: PronunciationProvider = {
  ...azureProvider,
  id: azureProvider.id,
  assess: (options) => {
    const f = fake();
    if (!f) return azureProvider.assess(options);
    options.onListening?.();
    return new Promise((r) => setTimeout(() => r(structuredClone(f)), 400));
  },
  canSpeak: () => azureProvider.canSpeak(),
  speak: (text, options) => azureProvider.speak(text, options),
  assessLive: azureProvider.assessLive
    ? (options) => {
        // Dev only, like __fakeAssessment: window.__fakeLive = [{ assessment, text }, …]
        // plays those phrases one after another instead of listening.
        const segs = import.meta.env.DEV ? (globalThis as { __fakeLive?: { assessment: Assessment; text: string }[] }).__fakeLive : null;
        if (!segs) return azureProvider.assessLive!(options);
        let stopped = false;
        const done = (async () => {
          options.onListening?.();
          for (const s of segs) {
            await new Promise((r) => setTimeout(r, 700));
            if (stopped) break;
            options.onPartial?.(s.text);
            options.onSegment?.(structuredClone(s.assessment), s.text);
          }
        })();
        return Promise.resolve({ stop: () => { stopped = true; }, done });
      }
    : undefined,
};
export { PronunciationError } from "./types";
export type {
  Assessment,
  AssessedWord,
  AssessedPhoneme,
  AssessOptions,
  LiveOptions,
  LiveSession,
  PronunciationErrorCode,
  PronunciationProvider,
  SpeakOptions,
  WordError,
} from "./types";
