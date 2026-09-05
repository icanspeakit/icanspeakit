# icanspeak.it — Project Handoff
*Last updated: August 31, 2026*

## What this project is

icanspeak.it is a linguist-enthusiast site. The project description is "building a linguist enthusiast site" — that's the current direction, not the original one.

## Current state of the live site

- **icanspeak.it is live today** as a small etymology magazine: "a small, ad-free corner of the internet," tagline *"Every word is carrying a story. We go dig it up."*
- Three posts published so far: the Czech origins of "robot," why "Gift" means poison in German, and the accidental invention of "serendipity."
- A "Word Cards" section for bite-sized word-origin stories.
- No ads, no email capture, no product yet.
- The site's *previous* incarnation — a German-only, speaking-confidence/language-training concept described in an earlier (August 16) cluster-strategy doc — has been archived at `/former-site/`. That plan scoped icanspeak as a speaking-confidence layer feeding into the deutschacademy/pflegeplace cluster. **The live site has already diverged from that written strategy** — it's general-audience and about word origins, not German-specific speaking practice.

This divergence is the key thing a future session needs to know before doing more strategy work: the August 16 doc and the live site are not describing the same product anymore.

## What's been done: market research (Aug 28)

Full detail lives in the project doc `claude/market-research-speech-linguistic-training.md`. Summary:

The market for "speech training" splits into three distinct plays — AI pronunciation/accent coaching (ELSA Speak, BoldVoice), communication/public-speaking coaching (Yoodli, Orai, Poised), and adjacent niches (exam prep, call-center accent neutralization, dialect coaching for actors, linguistics-enthusiast media, conlangs). Notably, BoldVoice runs $8.5M ARR on 14 employees, which suggests a solo operator with real linguistics chops can compete here without VC scale.

**The identified gap:** every funded competitor teaches speech as *imitation* (record yourself, get scored against a native reference). Nobody sizeable teaches the underlying *mechanics* — phonetics, phonology, prosody — which is exactly the kind of curiosity the existing etymology content already serves, pointed at sound instead of word history.

**Five concepts were scoped:**
- **A.** Phonetics-explainer content ("the linguistics behind sounding native") — same brand voice as current posts, aimed at sound instead of etymology, free content funneling into a paid pronunciation/prosody course.
- **B.** Interactive tools (IPA chart, accent quiz, minimal-pairs trainer) as a shareable traffic layer feeding an email list — modeled on the NYT dialect quiz's outsized reach.
- **C.** Prosody-and-confidence training — teaching intonation/stress-timing/pitch range, the whitespace between accent apps and public-speaking apps. Strong positioning, narrower audience.
- **D.** Linguistics-for-hobbyists course/membership, no speech-training component — lowest risk, lowest revenue ceiling, closest to what's live today.
- **E.** B2B English-communication training distributed through the pflegeplace Kursträger channel — smallest opportunity, depends on that channel existing first.

**Recommendation:** A + B together (B drives traffic to A), with C held as a premium tier once A has an audience. D is the fallback if a training product isn't wanted at all. E stays in reserve, contingent on pflegeplace's B2B channel materializing.

## Open decisions (unresolved as of this handoff)

1. Should icanspeak stay general-audience, or narrow to a specific non-native-speaker segment (as BoldVoice/ELSA do)? General fits the current magazine; narrow fits paid conversion better.
2. Ship a free interactive tool first (faster, tests the traffic thesis sooner) or build out explainer content first?
3. Does the August 16 German-only speaking-confidence framing still apply to anything, or is it fully superseded by the live etymology-magazine direction? This needs an explicit answer so pflegeplace/deutschacademy planning isn't working from a stale assumption about icanspeak's role.
4. Does icanspeak stay ad-free once there's a paid product? Not mutually exclusive with ads, but it's a brand call.

## Suggested next steps

1. Resolve the open decisions above — particularly #3, since it affects planning outside this project too.
2. If proceeding with the A+B recommendation: scope the first interactive tool (IPA chart or accent quiz — cheapest to build) and the first 2–3 phonetics-explainer posts, matching the existing etymology posts' voice and format.
3. Decide on audience scope (general vs. narrow) before writing paid-course copy, since it changes the pitch.

## Related material

- Project doc `claude/market-research-speech-linguistic-training.md` — full market research, competitor tables, and sourcing (Aug 28, 2026), stored in the icanspeakit claude.ai Project.
- `crash-course-in-linguistics.pdf` — reference material already sitting in this codebase folder, presumably tied to the "Linguistics crash course" project conversation.
- This codebase (`~/Projects/icanspeakit`) is an Astro site (see `README.md`, `AGENTS.md`, `CLAUDE.md` here for build/dev setup and working conventions).
