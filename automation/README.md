# Content automation

Claude Code works through `QUEUE.md`, one item per run, on the `content` branch in the
worktree `..\englishacademy-content`. The main working copy is never touched.

| What | How |
|---|---|
| Start the schedule (every 5 h) | `powershell -ExecutionPolicy Bypass -File automation\install-schedule.ps1` |
| Run one item now, by hand | `powershell -ExecutionPolicy Bypass -File automation\run-next.ps1` |
| See which item is next | `... run-next.ps1 -DryRun` |
| Pause / resume | `Disable-ScheduledTask` / `Enable-ScheduledTask -TaskName 'EnglishAcademy content run'` |
| Remove | `Unregister-ScheduledTask -TaskName 'EnglishAcademy content run' -Confirm:$false` |
| Follow what happened | `automation\logs\runs.log` (one line per run), one full log per run next to it |
| Review the work | `git log main..content`, reports in `automation\reports\` (on the `content` branch) |
| Accept it | `git merge content` on main |

The laptop has to be on, logged in and online at run time. A run missed while it slept starts
when it wakes. Runs spend the Max plan quota shared with Claude chat and Claude Code; if the
5-hour window runs out mid-run, the item stays unticked and the next run picks it up.
