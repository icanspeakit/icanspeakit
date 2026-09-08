# Prompt: Rebuild the icanspeak.it progress dashboard on real measurement, not cosmetic numbers

## Context

The `/dashboard` progress console (Articulation, Phonology, Prosody, Voice, Volume, Pace & pausing) currently shows illustrative placeholder data: a mastery %, an accuracy %, an accuracy trend line chart, and an error breakdown, applied uniformly to every skill category. This is backwards. Some of these skills can genuinely be scored — others can't, because the underlying exercise format has no ground truth. Making every skill display the same kind of chart implies a precision that doesn't exist for most of them.

Per `claude/speech-training-exercises-build-plan.md`: ElevenLabs (the TTS/STT provider) has no phoneme-level pronunciation-assessment engine. There is no mechanism today that can listen to a user's recording and score how correct their pronunciation was. The exercises that DO have real ground truth are the self-checking ones (the app already knows the correct answer before the user responds). Everything else is self-comparison practice: the user hears a model, records themselves, and judges the difference — there is no "% accuracy" to compute.

**Governing principle for this rebuild: design is subordinate to truth. A chart only exists on this dashboard if there is a real mechanism that produces the number behind it. If no such mechanism exists, do not fake a metric to fill the space — replace it with whatever honestly represents progress for that skill (a count, a streak, a completion tally, or nothing at all).**

## Step 1 — Reclassify every skill by what's actually measurable

Sort the 7 trackable skill areas (Fluency stays out entirely, see Step 4) into these tiers. Do not invent a tier that isn't backed by an actual exercise mechanism described below.

**Tier 1 — Objectively scorable (self-checking exercises; real accuracy % and real trend lines are legitimate here)**
- **Articulation** — minimal-pair discrimination quiz, odd-one-out sound spotting. The app generates the clips and knows the answer, so right/wrong is a real event.
- **Phonology** — spot-the-reduction / elision detection on connected speech, checked against an answer key.
- **Pace & pausing** — "read this passage within X seconds," pause-placement matching against `<break>` tag targets. Objectively measurable against a timer/target.

For these three: accuracy %, an accuracy trend chart, and an error breakdown are all appropriate — but the error breakdown must be built from actual logged error categories and must sum to 100%, and the trend line must be computed from the same session data shown in "Recent sessions," not a separately hallucinated series.

**Tier 2 — Measurable, but not "accuracy" (a real number exists, just not a correctness score)**
- **Volume** — a Web Audio volume meter can measure closeness to a target loudness in dB. Show this as a target-closeness meter or a distribution of session loudness relative to target — not an "% accuracy" trend line, because there's no right/wrong answer, only a distance from a target.

**Tier 3 — Practice-based, no ground truth at all (no scoring mechanism exists — do not chart accuracy)**
- **Prosody** — stress/intonation/pitch contour. The build plan explicitly flags this as the one real capability gap: no fine-grained pitch scoring is available. Replace accuracy % and trend charts with: sessions completed, times compared against the model, practice streak. If self-rating is ever added, show it as a simple tally, not a precision line chart.
- **Voice** — breath support, resonance. Purely practice-based, checklist-driven. Same replacement: streak/frequency/completion count, no accuracy chart.

**Tier 4 — Structurally measurable via a different mechanism (STT + LLM analysis, not phoneme scoring)**
- **Rhetoric / delivery structure** — roleplay via a conversational AI agent. Filler-word count (from STT transcript) and structural-device usage (anaphora, tricolon, etc., flagged by an LLM pass) are real, loggable numbers. This skill is currently missing from the dashboard entirely and should be added — charted on filler-word-count trend and device-usage tally, not "accuracy."

## Step 2 — Fix "due" items to mean something

Replace the flat "N due" counter with a real spaced-repetition queue: the number shown must equal the count of specific previously-missed items (a specific minimal pair, a specific reduction pattern, a specific pacing passage) scheduled for review — not an arbitrary placeholder integer. If there's no spaced-repetition logic yet, either build the minimal version (log misses, requeue them) or show "sessions available" instead of "due" until that logic exists — don't imply a review queue that isn't real.

## Step 3 — Rebuild each skill card to match its tier

- Tier 1 cards keep: mastery/accuracy %, accuracy trend chart, error breakdown, due count (spaced-repetition backed).
- Tier 2 (Volume) card: target-closeness meter/gauge, session history of loudness vs. target. No accuracy trend line.
- Tier 3 (Prosody, Voice) cards: sessions completed, streak, "compared to model N times." No accuracy %, no trend chart, no error breakdown.
- Tier 4 (Rhetoric) card: filler-word-count trend, structural-device tally, roleplay sessions completed.

The dashboard should still read as one coherent visual system — same card layout, same type scale, same color language — but the *content* of each card is dictated by what that skill can honestly measure, not by a template that assumes every skill works like Articulation.

## Step 4 — Fluency stays off the dashboard

Per the build plan, Fluency (stuttering/cluttering) is deliberately kept content-only — this is SLP (speech-language pathology) territory, both out of scope for a linguistics-explainer brand and liability-sensitive. Do not add a Fluency skill card or metric of any kind. If it needs a presence anywhere, it's a static info/resource link pointing to real SLP referral, not a trackable skill.

## Step 5 — Audit pass

Before shipping, go through every number and every chart currently on the page and ask: "what real mechanism would produce this exact value?" If you can't name one, either remove it, replace it with the correct tier's representation, or replace it with a plain non-numeric progress indicator (e.g., "5 sessions this week"). No coincidental round numbers, no two independent-looking metrics that are secretly the same value, no percentages in a breakdown that don't sum to 100.
