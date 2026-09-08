import type { LocalizedText } from '../exercises/topics';

// Dialogue Lab: a deterministic branching roleplay. There's no LLM backend
// wired into this site, so this isn't open-ended AI chat — it's a real
// decision tree, three choice points deep, where each option carries
// genuine pragmatic feedback (not just right/wrong). The three "goal
// phrases" mirror the exercise-sketches mockup this was built from.
//
// Partner lines, choice text, and goal phrases stay English — they're the
// actual English negotiation language being practiced. `feedback` (coaching
// on why a choice works or not) is translated, same as the rest of the
// site's coaching copy.

export interface DialogueChoice {
  id: string;
  text: string;
  correct: boolean;
  feedback: LocalizedText;
  goalPhrase?: string;
  next: string;
}

export interface DialogueNode {
  id: string;
  partnerLine?: string;
  choices?: DialogueChoice[];
  end?: boolean;
}

export const scenario = {
  title: { en: 'Negotiating a deadline', de: 'Über eine Frist verhandeln' } as LocalizedText,
  brief: {
    en: 'You: project lead. Partner: a supplier whose parts are running late.',
    de: 'Du: Projektleitung. Gegenüber: eine Lieferantin, deren Teile sich verspäten.',
  } as LocalizedText,
  goalPhrases: ['I understand, however…', 'Could we push it to…', "Let's agree on…"],
};

export const nodes: Record<string, DialogueNode> = {
  start: {
    id: 'start',
    partnerLine: "Sorry, the parts won't arrive until Friday. Is that a problem?",
    choices: [
      {
        id: 'a',
        text: "That's fine, don't worry about it.",
        correct: false,
        feedback: {
          en: 'This gives away your negotiating position — you still need those parts sooner.',
          de: 'Damit gibst du deine Verhandlungsposition auf — du brauchst die Teile trotzdem früher.',
        },
        next: 'ship-half',
      },
      {
        id: 'b',
        text: 'I understand, however we really need them by Wednesday.',
        correct: true,
        feedback: {
          en: 'Good — you acknowledged them and stated your real constraint without being blunt about it.',
          de: 'Gut — du hast sie ernst genommen und deine echte Einschränkung genannt, ohne schroff zu wirken.',
        },
        goalPhrase: 'I understand, however…',
        next: 'ship-half',
      },
      {
        id: 'c',
        text: "Why is it always your factory that's late?",
        correct: false,
        feedback: {
          en: 'This makes the conversation adversarial before you\'ve even asked for anything.',
          de: 'Das macht das Gespräch konfrontativ, bevor du überhaupt um etwas gebeten hast.',
        },
        next: 'ship-half',
      },
    ],
  },
  'ship-half': {
    id: 'ship-half',
    partnerLine: 'Wednesday is tight. What if we ship half the order now, and the rest on Friday?',
    choices: [
      {
        id: 'a',
        text: 'No, I need everything on Wednesday or the deal is off.',
        correct: false,
        feedback: {
          en: 'An ultimatum this early usually backfires — try proposing an alternative instead of demanding one.',
          de: 'Ein Ultimatum so früh geht meist nach hinten los — schlag lieber eine Alternative vor, statt eine zu fordern.',
        },
        next: 'thursday',
      },
      {
        id: 'b',
        text: 'Could we push the deadline to Thursday instead, so you can send it all at once?',
        correct: true,
        feedback: {
          en: "Nice — you offered a concrete compromise instead of just objecting to theirs.",
          de: 'Gut — du hast einen konkreten Kompromiss angeboten, statt ihren Vorschlag nur abzulehnen.',
        },
        goalPhrase: 'Could we push it to…',
        next: 'thursday',
      },
      {
        id: 'c',
        text: "Maybe, I guess, if that's easier for you?",
        correct: false,
        feedback: {
          en: "Too passive — you're the one who actually needs something here.",
          de: 'Zu passiv — du bist diejenige, die hier eigentlich etwas braucht.',
        },
        next: 'thursday',
      },
    ],
  },
  thursday: {
    id: 'thursday',
    partnerLine: 'Thursday could work. Let me check with the warehouse and confirm by end of day.',
    choices: [
      {
        id: 'a',
        text: 'Ok whatever.',
        correct: false,
        feedback: {
          en: 'This throws away the goodwill you just built in the last exchange.',
          de: 'Damit verspielst du das Wohlwollen, das du im letzten Austausch gerade aufgebaut hast.',
        },
        next: 'end',
      },
      {
        id: 'b',
        text: "Let's agree on Thursday, then — I'll wait to hear from you by 5pm.",
        correct: true,
        feedback: {
          en: 'Perfect close — you confirmed the agreement and set a clear, specific follow-up.',
          de: 'Perfekter Abschluss — du hast die Vereinbarung bestätigt und ein klares, konkretes Follow-up gesetzt.',
        },
        goalPhrase: "Let's agree on…",
        next: 'end',
      },
      {
        id: 'c',
        text: 'Fine, but this better not happen again.',
        correct: false,
        feedback: {
          en: 'Understandable frustration, but this risks damaging the relationship right after reaching an agreement.',
          de: 'Verständlicher Frust, aber das riskiert die Beziehung ausgerechnet direkt nach einer Einigung zu belasten.',
        },
        next: 'end',
      },
    ],
  },
  end: { id: 'end', partnerLine: 'Great — talk soon!', end: true },
};
