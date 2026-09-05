export interface ChecklistItem {
  id: string;
  label: string;
  pattern: RegExp;
}

// Writing Desk: no AI grading is wired into this site, so the "live
// feedback" here is a real, deterministic checklist — each item is a
// pattern match against your own draft, not a canned demo. Framed the same
// honest way as the rest of the site's self-checking exercises.
export const task = {
  title: 'Reply to a client who missed a payment',
  level: 'B2 · formal',
  brief: 'Be polite but firm. Mention the due date (August 15). Propose a next step. Aim for 80–120 words.',
  minWords: 80,
  maxWords: 120,
  checklist: [
    { id: 'opener', label: 'Polite opener', pattern: /\b(dear|hi|hello|to whom it may concern)\b/i },
    { id: 'due-date', label: 'Mentions the due date', pattern: /(august\s*15|aug\.?\s*15\b|15th)/i },
    {
      id: 'next-step',
      label: 'Proposes a next step',
      pattern: /\b(could you|would you|please (send|process|make|let)|propose|by (the end of|friday|monday|tuesday|wednesday|thursday))\b/i,
    },
    { id: 'closing', label: 'Formal closing', pattern: /\b(regards|sincerely|best,|thank you)\b/i },
  ] as ChecklistItem[],
  modelAnswer: `Dear Mr. Alvarez,

I hope you're doing well. I'm writing about invoice #204, which was due on August 15 and appears to still be outstanding. I understand things get busy, so I wanted to check whether it might have been overlooked.

Could you let me know if you're able to process the payment by the end of this week? If there's an issue on your end, I'm happy to discuss it — just reply here or give me a call.

Thank you, and best regards,
Jordan`,
};
