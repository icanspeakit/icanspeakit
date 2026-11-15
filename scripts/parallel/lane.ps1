# Runs one lane of a parallel batch: starts Claude Code in the repo with the lane's prompt.
# Called by start.ps1 (one per Warp tab); can also be run by hand to restart a single lane.
#   powershell -ExecutionPolicy Bypass -File scripts\parallel\lane.ps1 -Batch brand-rollout -Lane hub -Port 4501
param(
  [Parameter(Mandatory = $true)][string]$Batch,
  [Parameter(Mandatory = $true)][string]$Lane,
  [int]$Port = 4500,
  [string]$Model = ""   # sonnet | opus | haiku, or a full model id; empty = Claude Code's default
)
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repo
$cfg = Get-Content "prompts\$Batch\batch.json" -Raw | ConvertFrom-Json
$all = @($cfg.steps | ForEach-Object { $_ } | ForEach-Object { $_.lane })
$others = ($all | Where-Object { $_ -ne $Lane }) -join ", "
$host.UI.RawUI.WindowTitle = "$Batch / $Lane"

# Here-string: the prompt reaches claude verbatim, no quoting problems.
$p = @"
You are lane "$Lane" of the parallel batch "$Batch" in this repo. Other lanes ($others) may run in this folder at the same time.
Read prompts/$Batch/SHARED.md first, then prompts/$Batch/$Lane.md, and work through it tier by tier without stopping between tiers; only the EDGAR points are stops.
Your dev server port is $Port. Never stop another lane's dev server. When you finish, write prompts/$Batch/done/$Lane.md as SHARED.md says.
"@
$cargs = @()
if ($Model) { $cargs += @("--model", $Model) }
# "account": "c2" in batch.json = start like the c2 function in the PowerShell 7 profile:
# second Claude account (~/.claude-2), bypass permissions, Chrome.
if ($cfg.account -eq "c2") {
  $env:CLAUDE_CONFIG_DIR = Join-Path $HOME ".claude-2"
  $cargs += @("--dangerously-skip-permissions", "--chrome", "-n", "$Batch/$Lane")
}
claude @cargs $p
