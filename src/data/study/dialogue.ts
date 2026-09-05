// Dialogue Lab: a deterministic branching roleplay. There's no LLM backend
// wired into this site, so this isn't open-ended AI chat — it's a real
// decision tree, three choice points deep, where each option carries
// genuine pragmatic feedback (not just right/wrong). The three "goal
// phrases" mirror the exercise-sketches mockup this was built from.

export interface DialogueChoice {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
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
  title: 'Negotiating a deadline',
  brief: 'You: project lead. Partner: a supplier whose parts are running late.',
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
        feedback: 'This gives away your negotiating position — you still need those parts sooner.',
        next: 'ship-half',
      },
      {
        id: 'b',
        text: 'I understand, however we really need them by Wednesday.',
        correct: true,
        feedback: 'Good — you acknowledged them and stated your real constraint without being blunt about it.',
        goalPhrase: 'I understand, however…',
        next: 'ship-half',
      },
      {
        id: 'c',
        text: "Why is it always your factory that's late?",
        correct: false,
        feedback: 'This makes the conversation adversarial before you\'ve even asked for anything.',
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
        feedback: 'An ultimatum this early usually backfires — try proposing an alternative instead of demanding one.',
        next: 'thursday',
      },
      {
        id: 'b',
        text: 'Could we push the deadline to Thursday instead, so you can send it all at once?',
        correct: true,
        feedback: "Nice — you offered a concrete compromise instead of just objecting to theirs.",
        goalPhrase: 'Could we push it to…',
        next: 'thursday',
      },
      {
        id: 'c',
        text: "Maybe, I guess, if that's easier for you?",
        correct: false,
        feedback: "Too passive — you're the one who actually needs something here.",
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
        feedback: 'This throws away the goodwill you just built in the last exchange.',
        next: 'end',
      },
      {
        id: 'b',
        text: "Let's agree on Thursday, then — I'll wait to hear from you by 5pm.",
        correct: true,
        feedback: 'Perfect close — you confirmed the agreement and set a clear, specific follow-up.',
        goalPhrase: "Let's agree on…",
        next: 'end',
      },
      {
        id: 'c',
        text: 'Fine, but this better not happen again.',
        correct: false,
        feedback: 'Understandable frustration, but this risks damaging the relationship right after reaching an agreement.',
        next: 'end',
      },
    ],
  },
  end: { id: 'end', partnerLine: 'Great — talk soon!', end: true },
};
