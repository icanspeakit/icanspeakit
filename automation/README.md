# Content automation

Claude Code (headless, account c2) works through `QUEUE.md` on the `content` branch in the
worktree `..\englishacademy-content`. The main working copy is never touched.

**How it runs:** items run back to back. When the 5-hour limit is hit, it waits until that
window resets and carries on. When weekly usage reaches the cap in `config.json` (85%), it
pauses until the week resets. A Windows scheduled task checks every 30 minutes and restarts the
loop if it is not running (after a reboot, after a reset). It stops on its own and notifies you
on a login problem, two failures in a row, or an item that does not finish in 3 runs.

**Monitor:** double-click `automation\monitor.cmd` (desktop: "EnglishAcademy Monitor") →
http://localhost:4455. Not needed for the runs; it only shows them and has the buttons.

| What | How |
|---|---|
| Start now / after a halt | Monitor → Run now |
| Stop the current item | Monitor → Stop run (commits stay; it resumes later) |
| Pause / resume everything | Monitor → Pause schedule / Resume schedule |
| Re-install the task | `pwsh -ExecutionPolicy Bypass -File automation\install-schedule.ps1` |
| See the next item | `pwsh -File automation\run-next.ps1 -DryRun` |
| Review / accept the work | `git log main..content`, reports in `automation\reports\`; `git merge content` on main |
| Login expired | `c2`, then `/login`, then Run now |

The 85% cap reads usage that c2's status line saves (`~\.claude-2\statusline-command.sh`), so
it is only as fresh as your last interactive c2 session; the monitor shows its age.
