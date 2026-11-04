// Listening Board: one real, ElevenLabs-generated clip, analyzed with the
// same with-timestamps + forced-alignment approach used for the Prosody
// pitch contour (see ../lib/alignment.ts) — so the progressive transcript
// reveal is synced to real word timing, not a fixed animation.

export const clip = {
  title: 'Leaving a voicemail',
  script:
    "Hi, this is Sam from Riverside Consulting. I'm calling about the invoice we sent last week. I think it might have gone to the wrong inbox. Could you give me a call back when you get a chance? Thanks, bye.",
  // Index into the sentence-split lines (see ../lib/alignment.ts linesFromWords) used for dictation + word-order.
  focusLineIndex: 2,
};
