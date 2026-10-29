# Content automation

Claude Code (headless, account c2) works through `QUEUE.md` on the `content` branch in the
worktree `..\englishacademy-content`. The main working copy is never touched.

**It runs only when you start it.** Nothing starts by itself (no timer, not after a reboot).
Once started it runs invisibly in the background and keeps going on its own:
- items run back to back;
- at the 5-hour limit it waits for the reset (laptop kept awake) and continues;
- at the weekly cap in `config.json` (default 85%) it pauses until usage is under the cap again
  (week reset, or a higher cap set in the monitor); the laptop may sleep meanwhile;
- it stops when the queue is done, when you click Stop, on a login problem, after two
  failures in a row, or when one item does not finish in 3 runs.

| What | How |
|---|---|
| Start | Tray icon / Monitor → Start, or Start menu → EnglishAcademy Start |
| Stop | Monitor → Stop (commits stay; Start resumes the item) |
| Watch | Tray icon (double-click) or Start menu → EnglishAcademy Monitor → http://localhost:4455 |
| Caps | Monitor → Usage card sliders (weekly, 5-hour) |
| See the next item | `pwsh -File automation\run-next.ps1 -DryRun` |
| Re-install the start task | `pwsh -ExecutionPolicy Bypass -File automation\install-schedule.ps1` |
| Review / accept the work | `git log main..content`, reports in `automation\reports\`; `git merge content` on main |
| Login expired | `c2`, then `/login`, then Start |

The weekly cap reads usage that c2's status line saves (`~\.claude-2\statusline-command.sh`),
so it is only as fresh as your last interactive c2 session; the monitor shows its age.
Closing the laptop lid still sleeps it (unless the lid action is "Do nothing").
