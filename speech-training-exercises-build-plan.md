# Speech Training Exercises — Build Plan (ElevenLabs-powered)
*Drafted September 3, 2026*

Companion to `market-research-speech-linguistic-training.md` and `handoff.md`. Maps the eight speech-training layers already scoped to concrete worksheet/online exercise formats, and says specifically where ElevenLabs' API does the work versus where it doesn't.

## What ElevenLabs actually provides (verified against current docs, Sept 2026)

- **Text-to-Speech** — three models: Flash v2.5 (fast, low-latency), Multilingual v2 (natural prosody, 29 languages), Eleven v3 (most expressive, 70+ languages, supports audio/emotion tags like `[whispers]`). Relevant for us: **phoneme control via CMU Arpabet and IPA tags**, reusable **pronunciation dictionaries** (.pls files), and `<break time="x.xs"/>` tags for exact pause placement.
- **Speech-to-Text** (Scribe v2 + realtime) — transcription with word-level timestamps, speaker diarization, 90+ languages, filler-word removal mode.
- **Conversational AI / Agents** — a managed platform for real-time, turn-taking voice agents (native web/mobile SDKs).
- **Voice cloning** (instant, 1–2 min of audio; professional, 3+ hrs) and **Voice Design** (synthetic voices from scratch).
- **Voice Isolator**, **dubbing**, sound-effect/music generation.

### The one thing it does *not* do

ElevenLabs is a generation and transcription toolkit, not a pronunciation-assessment engine. It has no phoneme-level accuracy scoring — nothing that listens to a user's recording and rates how close their /θ/ was to a native target the way ELSA Speak's or BoldVoice's underlying engines do. STT gives transcription and timing, not correctness scores.

This isn't just a limitation to work around — it fits the positioning your market research already landed on. The gap you identified is that competitors teach by *scoring imitation*; you're teaching *mechanism*. A self-comparison format (hear the model, record yourself, listen back side by side, understand *why* they differ) matches that thesis better than bolt-on auto-scoring would. If ELSA-style pass/fail scoring is wanted later, that requires a separate pronunciation-assessment API (e.g. Azure Speech, Speechace) layered in — worth flagging now, not assuming ElevenLabs covers it.

## Exercise architecture

Two formats, used in combination per topic:

1. **Worksheets** — static, printable/downloadable (PDF or web-embedded). Best for the visual/analytical side: transcription, stress-marking, spotting patterns in text. Doubles as an email-capture magnet alongside explainer posts (concept A).
2. **Online interactive exercises** — audio-driven, built on the ElevenLabs API. Best for anything that needs sound: discrimination drills, shadowing, pacing, roleplay. This is the traffic/product layer (concept B).

## Per-topic breakdown

**1. Articulation / individual sounds** — *highest-leverage starting point*
- Worksheet: minimal-pair word lists, IPA transcription fill-ins, odd-one-out sound spotting.
- Online: minimal-pair discrimination quiz (TTS generates two clips, user picks which matches the target word — self-gradable, no scoring model needed since the app already knows the ground truth); shadowing drills (listen, record yourself, play back side by side).
- ElevenLabs role: phoneme/IPA tags let you *force* the exact target sound in a generated clip — important because default TTS can smooth over the very sound you're drilling. Multiple voices for accent variety.
- Complexity: low–medium. Self-checking is built into the discrimination-quiz format, so no assessment engine required.

**2. Phonology / connected speech**
- Worksheet: mark linking/assimilation in a sentence, elision spot-the-dropped-sound, syllable counting.
- Online: natural-pace vs. slowed-down A/B of the same sentence; user marks where reductions happen, then checks against the model.
- ElevenLabs role: TTS at varying speed settings for the A/B pairs; Scribe STT could transcribe a fast passage so users compare their own hearing against what was actually said.
- Complexity: medium.

**3. Prosody (stress, intonation, rhythm)** — *the identified market gap, and the one real capability limit*
- Worksheet: mark primary/secondary stress on multisyllabic words; sentence-stress contrast drills ("I didn't say SHE took it" vs. "...she took IT"); draw-the-pitch-contour exercises.
- Online: same-sentence-different-stress audio sets; rhythm tapping against audio.
- ElevenLabs role: v3's emotion/audio tags help vary delivery, but ElevenLabs doesn't give fine per-word pitch-contour control. This is honestly the one area where TTS generation alone may not be precise enough — likely needs either real recorded reference audio or a separate pitch-visualization layer (browser-side pitch tracking on the user's own voice, not an ElevenLabs feature) for the feedback half.
- Complexity: medium–high.

**4. Voice (breath, pitch range, resonance)**
- Worksheet: breathing-pattern diagrams, guided breath-support routines, self-assessment checklists.
- Online: pitch-range visualizer reading the user's own mic input — this needs a browser-side pitch-detection library (e.g. autocorrelation/YIN), entirely separate from ElevenLabs.
- ElevenLabs role: minor — mostly delivering instructional voice-over, not the exercise mechanic itself.
- Complexity: medium; the load-bearing tech here isn't ElevenLabs at all.

**5. Volume / projection / intensity**
- Worksheet: not really needed, this is practice-based.
- Online: record-and-compare against a model reference at varying volume; a simple in-browser volume meter (native Web Audio API) while reading a passage aloud.
- ElevenLabs role: supplies the reference audio to match against.
- Complexity: low–medium.

**6. Pace / pausing** — *second-easiest to build well*
- Worksheet: passages marked with suggested pause points (/ short, // long); "read this in under X seconds" pacing drills.
- Online: TTS-generated model reading at a target pace with exact pauses, for shadowing; playback speed adjustment to slow down and learn, then speed up to match.
- ElevenLabs role: `<break time="x.xs"/>` tags give exact, reliable control over pause length and placement — a genuinely strong fit for this specific topic.
- Complexity: low.

**7. Fluency**
- Recommend keeping this **content-only**, not an exercise category. Stuttering/cluttering work is clinical SLP territory — building self-serve "fix your stutter" drills is both out of scope for a linguistics-explainer brand and liability-sensitive. A short explainer piece ("what stuttering and cluttering actually are, and why they're not the same as an accent") that points to real speech-language pathologists is the right-sized treatment.
- ElevenLabs role: none.

**8. Rhetoric / delivery structure** — *most differentiated, biggest lift*
- Worksheet: outline templates (tricolon, anaphora), "spot the device" exercises using real speech transcripts.
- Online: roleplay practice via ElevenLabs' **Conversational AI Agents** — the user delivers a short pitch to an AI "audience" that responds and asks follow-ups in real time. Structural feedback (device usage, filler-word count via STT transcript) would be an LLM-driven layer on top, not something ElevenLabs scores itself.
- ElevenLabs role: the Agents platform is the standout fit in this whole plan — an actual interactive practice partner, not just a playback tool. None of ELSA/BoldVoice/Orai are built this way; they're accuracy-scoring apps, not conversation partners.
- Complexity: medium–high (real-time turn-taking, prompt design) but the hardest feature for a competitor to casually copy.

## Suggested build order

1. **Minimal-pairs discrimination + shadowing** (articulation) — cheapest, self-checking by construction, pairs naturally with concept B's shareable-tool thesis and concept A's explainer posts.
2. **Pacing/pause drills** (pace) — very cheap given `<break>` tag precision; strong companion content.
3. **Connected-speech slow-vs-natural A/B tool** (phonology) — moderate build, good "aha" hook for shareability.
4. **Rhetoric roleplay via Conversational AI Agent** — bigger lift, but the most defensible feature since it needs infrastructure competitors haven't built.
5. **Prosody and Voice modules** — hold for later; these need either supplementary web-audio tech (pitch visualization) or a lower-fidelity worksheet-only treatment until that's built.
6. **Fluency** — content only, no exercise build.

## What's needed beyond ElevenLabs

- **Web Audio API** (browser-side) for mic recording/playback and any pitch or volume visualization — none of this is ElevenLabs, it's standard browser tech.
- A lightweight backend/serverless layer to call the ElevenLabs API (TTS, STT, Agents) without exposing the API key client-side.
- If auto-scored pronunciation accuracy (ELSA-style pass/fail) is wanted down the line, a dedicated pronunciation-assessment API (Azure Speech, Speechace, etc.) would need to be added on top — ElevenLabs doesn't provide this.

## Format pairing recommendation

Ship every explainer post (concept A) with a matching downloadable worksheet, and — where the topic supports it (articulation, pace, phonology, rhetoric) — an embedded mini online exercise. Keeps the content and product workstreams coupled rather than running as two separate efforts.
