import type { LocalizedText, Locale } from './topics';

const breathingRoutineTextByLocale: Record<Locale, string> = {
  en:
    'Sit or stand tall. <break time="1.0s"/> ' +
    'Breathe in slowly through your nose for four counts. <break time="4.0s"/> ' +
    'Hold gently for two counts. <break time="2.0s"/> ' +
    'Now breathe out through your mouth for six counts, low and steady. <break time="6.0s"/> ' +
    "Feel your ribs and stomach move, not just your chest. <break time=\"1.5s\"/> " +
    "Let's do that two more times. <break time=\"1.0s\"/> " +
    'In for four. <break time="4.0s"/> Hold for two. <break time="2.0s"/> Out for six. <break time="6.0s"/> ' +
    'One more time. <break time="1.0s"/> In for four. <break time="4.0s"/> Hold for two. <break time="2.0s"/> Out for six. <break time="6.0s"/> ' +
    'Good. That low, steady breath is the support your voice runs on.',
  de:
    'Setz oder stell dich aufrecht hin. <break time="1.0s"/> ' +
    'Atme langsam durch die Nase ein, für vier Zähler. <break time="4.0s"/> ' +
    'Halt sanft für zwei Zähler. <break time="2.0s"/> ' +
    'Jetzt atme durch den Mund aus, für sechs Zähler, tief und gleichmäßig. <break time="6.0s"/> ' +
    'Spür, wie sich Rippen und Bauch bewegen, nicht nur die Brust. <break time="1.5s"/> ' +
    'Machen wir das noch zweimal. <break time="1.0s"/> ' +
    'Ein für vier. <break time="4.0s"/> Halten für zwei. <break time="2.0s"/> Aus für sechs. <break time="6.0s"/> ' +
    'Noch einmal. <break time="1.0s"/> Ein für vier. <break time="4.0s"/> Halten für zwei. <break time="2.0s"/> Aus für sechs. <break time="6.0s"/> ' +
    'Gut. Dieser tiefe, gleichmäßige Atem ist die Stütze für deine Stimme.',
};

export function breathingRoutineText(locale: Locale = 'en') {
  return breathingRoutineTextByLocale[locale];
}

export interface ChecklistItem {
  id: string;
  label: LocalizedText;
}

export const selfAssessmentChecklist: ChecklistItem[] = [
  {
    id: 'breath',
    label: {
      en: 'I can speak a full sentence without running out of breath partway through.',
      de: 'Ich kann einen ganzen Satz sprechen, ohne mittendrin die Luft auszugehen.',
    },
  },
  {
    id: 'chest',
    label: {
      en: 'My shoulders and chest stay relatively still when I breathe in — the movement is lower, in my ribs and stomach.',
      de: 'Schultern und Brust bleiben beim Einatmen relativ ruhig — die Bewegung passiert weiter unten, in Rippen und Bauch.',
    },
  },
  {
    id: 'pitch-range',
    label: {
      en: 'I can comfortably read a sentence in a noticeably higher and then noticeably lower pitch than my normal speaking voice.',
      de: 'Ich kann einen Satz problemlos deutlich höher und dann deutlich tiefer als meine normale Sprechstimme lesen.',
    },
  },
  {
    id: 'monotone',
    label: {
      en: 'My pitch moves at all when I talk, rather than staying flat the whole sentence.',
      de: 'Meine Tonhöhe bewegt sich beim Sprechen überhaupt, statt den ganzen Satz über flach zu bleiben.',
    },
  },
  {
    id: 'strain',
    label: {
      en: "My throat doesn't feel tight or strained after a few minutes of talking.",
      de: 'Mein Hals fühlt sich nach ein paar Minuten Sprechen nicht eng oder angestrengt an.',
    },
  },
  {
    id: 'volume',
    label: {
      en: 'I can get noticeably louder without just tensing my throat to do it.',
      de: 'Ich kann deutlich lauter werden, ohne dafür einfach nur den Hals anzuspannen.',
    },
  },
];
