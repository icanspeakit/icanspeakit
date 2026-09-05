export const breathingRoutineText =
  'Sit or stand tall. <break time="1.0s"/> ' +
  'Breathe in slowly through your nose for four counts. <break time="4.0s"/> ' +
  'Hold gently for two counts. <break time="2.0s"/> ' +
  'Now breathe out through your mouth for six counts, low and steady. <break time="6.0s"/> ' +
  "Feel your ribs and stomach move, not just your chest. <break time=\"1.5s\"/> " +
  "Let's do that two more times. <break time=\"1.0s\"/> " +
  'In for four. <break time="4.0s"/> Hold for two. <break time="2.0s"/> Out for six. <break time="6.0s"/> ' +
  'One more time. <break time="1.0s"/> In for four. <break time="4.0s"/> Hold for two. <break time="2.0s"/> Out for six. <break time="6.0s"/> ' +
  'Good. That low, steady breath is the support your voice runs on.';

export interface ChecklistItem {
  id: string;
  label: string;
}

export const selfAssessmentChecklist: ChecklistItem[] = [
  { id: 'breath', label: 'I can speak a full sentence without running out of breath partway through.' },
  { id: 'chest', label: "My shoulders and chest stay relatively still when I breathe in — the movement is lower, in my ribs and stomach." },
  { id: 'pitch-range', label: "I can comfortably read a sentence in a noticeably higher and then noticeably lower pitch than my normal speaking voice." },
  { id: 'monotone', label: 'My pitch moves at all when I talk, rather than staying flat the whole sentence.' },
  { id: 'strain', label: "My throat doesn't feel tight or strained after a few minutes of talking." },
  { id: 'volume', label: 'I can get noticeably louder without just tensing my throat to do it.' },
];
