# Content automation

Claude Code (headless) works through `QUEUE.md`, one item per run, on the `content` branch in
the worktree `..\englishacademy-content`. The main working copy is never touched.

**Monitor:** double-click `automation\monitor.cmd` → http://localhost:4455
Live activity of the current run, queue progress, run history, commits, reports, next run,
and buttons to run now, stop, and pause/resume the schedule. Windows notifications pop up
when a run finishes, hits the usage limit or fails.

| What | How |
|---|---|
| Start the schedule (every 5 h) | `pwsh -ExecutionPolicy Bypass -File automation\install-schedule.ps1` |
| Run one item now | Monitor → Run now, or `pwsh -File automation\run-next.ps1` |
| See which item is next | `pwsh -File automation\run-next.ps1 -DryRun` |
| Pause / resume / remove | Monitor buttons, or `Disable-` / `Enable-` / `Unregister-ScheduledTask -TaskName 'EnglishAcademy content run'` |
| Review the work | Monitor, or `git log main..content`; reports in `automation\reports\` on `content` |
| Accept it | `git merge content` on main |

The laptop has to be on, logged in and online at run time. A run missed while it slept starts
when it wakes. Runs spend the Max plan quota shared with Claude chat and Claude Code; if the
5-hour window runs out mid-run, the item stays unticked and the next run picks it up. If the
monitor says "Needs login": open a terminal, run `claude`, then `/login`.
