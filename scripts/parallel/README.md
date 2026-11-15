# Parallel Claude sessions in Warp

One call opens a Warp window with one tab per lane; each tab runs Claude Code with that lane's
prompt. Batches live in `prompts/<batch>/`.

| Do | How |
|---|---|
| Start the next step | double-click `start-site-launch.cmd` (the relaunch; `start-brand-rollout.cmd` is superseded), or `powershell -ExecutionPolicy Bypass -File scripts\parallel\start.ps1 -Batch brand-rollout` |
| Open the same tabs again | `warp://launch/icanspeak-brand-rollout-step<N>.yaml` (Win+R) or Warp's command palette → Launch Configuration |
| Restart one lane | `scripts\parallel\lane.ps1 -Batch brand-rollout -Lane hub -Port 4501` |
| See what's done | `prompts\<batch>\done\*.md` |

How it decides: step 1 (the kit) runs alone; once `done/kit.md` exists the next call opens step 2
(hub, linguistics, english, courses) in parallel. Finished lanes are skipped, so after a crash just
call it again. `DECISION.md` must say `status: decided`.

Rules all lanes follow (git by name, locks for install/build, own ports, no push):
`prompts/<batch>/SHARED.md`.

New batch: copy `prompts/brand-rollout/`, change `batch.json` and the lane files, and add a
`start-<batch>.cmd` (or call `start.ps1 -Batch <name>`).

Without Warp, `start.ps1` falls back to Windows Terminal tabs, then separate PowerShell windows.
