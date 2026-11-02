You are running unattended as a scheduled job (automation/run-next.ps1). Nobody is watching
and nobody can answer questions: make sensible decisions yourself and write them down.

Repository: englishacademy, an Astro site for learning English, forked from deutschacademy
(a German-learning site). Read ARCHITECTURE.md and CLAUDE.md first. You are in the git
worktree of the `content` branch.

YOUR ITEM THIS RUN: `{{MODULE}}`: {{DESC}}

Rules:
1. Resume, don't restart: check `git log --oneline -20` and automation/reports/{{MODULE}}.md.
   If an earlier run already started this item, continue from where it stopped.
2. Follow docs/content-plan.md when it exists (it is written by the first item).
3. Keep every data file's schema (keys, nesting, ids) so the code keeps working. Change the
   content, not the shape. Where German-specific fields have no English meaning (e.g. der/die/das
   article fields), keep the key and follow content-plan.md.
4. Content must be correct, natural English teaching material at the stated CEFR level, written
   for learners of English. Quality over quantity: a smaller, correct set beats a large sloppy one.
5. No integrations, no new dependencies, no server routes (see src/lib/backend.js).
6. Commit early and often on this branch, message format `content({{MODULE}}): what changed`,
   so a stopped run loses nothing. Stage files by name. Never push. Never touch the main branch.
7. Before you finish, the build must succeed. Run it exactly like this, in the foreground:
   `timeout 1500 pnpm build 2>&1 | tail -40`
   Never run a build in the background, never start a second build while one may still be
   running, and never wait in a loop for a build log. A normal build takes 2-4 minutes. If it
   fails because of your change, fix it; if you cannot, revert your last change and record why.
   If it times out twice, stop: record it in the report and end with RESULT: PARTIAL.
8. Write automation/reports/{{MODULE}}.md: what you did, decisions you made, what is left
   or uncertain, anything Edgar should review. Commit it.
9. Only when the item is fully done: in automation/QUEUE.md change `- [ ] \`{{MODULE}}\`` to
   `- [x] \`{{MODULE}}\``, and commit that.
10. The very last line of your final answer must be exactly one of:
    RESULT: DONE
    RESULT: PARTIAL
