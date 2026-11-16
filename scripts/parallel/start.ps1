# Opens the next step of a parallel batch: one Warp tab per lane, each running Claude Code
# with that lane's prompt. Falls back to Windows Terminal, then plain PowerShell windows.
#
#   powershell -ExecutionPolicy Bypass -File scripts\parallel\start.ps1 -Batch brand-rollout
#   ... -Step 2        force a step (default: the first step whose lanes are not all done)
#   ... -DryRun        write the Warp config, open nothing
#
# A batch is a folder prompts\<batch>\ with batch.json (steps of lanes), SHARED.md, one
# <lane>.md per lane and an optional DECISION.md (refuses to start while "status: open").
# A lane is done when prompts\<batch>\done\<lane>.md exists.
param(
  [Parameter(Mandatory = $true)][string]$Batch,
  [int]$Step = 0,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$dir = Join-Path $repo "prompts\$Batch"
$cfg = Get-Content (Join-Path $dir "batch.json") -Raw | ConvertFrom-Json

$decision = Join-Path $dir "DECISION.md"
if ((Test-Path $decision) -and (Select-String -Path $decision -Pattern '^status:\s*open' -Quiet)) {
  Write-Host "prompts\$Batch\DECISION.md still says 'status: open'. Fill it in first." -ForegroundColor Yellow
  exit 1
}

function Test-Done($lane) { Test-Path (Join-Path $dir "done\$lane.md") }

if ($Step -eq 0) {
  for ($i = 0; $i -lt $cfg.steps.Count; $i++) {
    if (@($cfg.steps[$i] | Where-Object { -not (Test-Done $_.lane) }).Count -gt 0) { $Step = $i + 1; break }
  }
  if ($Step -eq 0) { Write-Host "All steps of $Batch are done."; exit 0 }
}
$lanes = @($cfg.steps[$Step - 1] | Where-Object { -not (Test-Done $_.lane) })
if ($lanes.Count -eq 0) { Write-Host "Step $Step is already done."; exit 0 }
Write-Host "$($cfg.title): step $Step of $($cfg.steps.Count), lanes: $(($lanes | ForEach-Object { $_.lane }) -join ', ')"

$laneScript = Join-Path $PSScriptRoot "lane.ps1"
function Get-Cmd($l) {
  $m = if ($l.model) { " -Model $($l.model)" } else { "" }
  "powershell -NoExit -ExecutionPolicy Bypass -File `"$laneScript`" -Batch $Batch -Lane $($l.lane) -Port $($l.port)$m"
}

$warpData = Join-Path $env:APPDATA "warp\Warp\data"
if (Test-Path (Split-Path $warpData)) {
  $lcDir = Join-Path $warpData "launch_configurations"
  New-Item -ItemType Directory -Force -Path $lcDir | Out-Null
  $file = "icanspeak-$Batch-step$Step.yaml"
  # Same shape as Warp's own saved configs (active_window_index, double-quoted cwd, one focused
  # tab, no tab title): Warp silently ignores a config it can't read.
  $y = @("---", "name: icanspeak $Batch step $Step", "active_window_index: 0", "windows:", "  - tabs:")
  $cwd = $repo.Replace('\', '\\')
  $first = $true
  foreach ($l in $lanes) {
    $cmd = (Get-Cmd $l).Replace("'", "''")
    $y += "      - color: $(if ($l.color) { $l.color } else { 'blue' })"
    $y += "        layout:"
    $y += "          cwd: `"$cwd`""
    $y += "          commands:"
    $y += "            - exec: '$cmd'"
    if ($first) { $y += "          is_focused: true"; $first = $false }
  }
  # UTF-8 without BOM (PowerShell 5s -Encoding UTF8 adds one).
  [IO.File]::WriteAllText((Join-Path $lcDir $file), ($y -join "`n") + "`n", (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Warp launch configuration: $lcDir\$file"
  Write-Host "Open it again any time: warp://launch/$file  (or Warp's command palette: 'Launch Configuration')"
  if ($DryRun) { exit 0 }
  Start-Process "warp://launch/$file"
  # On some Windows installs Warp ignores warp://launch links without an error (seen 2026-11-15).
  # Check that the lanes really started; if not, say how to open them and put the commands on
  # the clipboard, one per line, for Ctrl+T / Ctrl+V in Warp.
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Seconds 2
    $running = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
      Where-Object { $_.CommandLine -like "*lane.ps1*-Batch $Batch *" })
  } while ($running.Count -eq 0 -and (Get-Date) -lt $deadline)
  if ($running.Count -gt 0) { Write-Host "$($running.Count) lane(s) running."; exit 0 }
  $cmds = ($lanes | ForEach-Object { Get-Cmd $_ }) -join "`r`n"
  try { Set-Clipboard -Value $cmds } catch {}
  Write-Host ""
  Write-Host "Warp did not open the tabs (it ignores launch links on this machine)." -ForegroundColor Yellow
  Write-Host "Either: in Warp, Ctrl+Shift+P -> 'launch' -> 'icanspeak $Batch step $Step'"
  Write-Host "Or: Ctrl+T in Warp and paste one line per tab (all lines are on the clipboard):"
  Write-Host $cmds
  exit 1
}

if ($DryRun) { exit 0 }
$hasWt = [bool](Get-Command wt -ErrorAction SilentlyContinue)
foreach ($l in $lanes) {
  if ($hasWt) {
    Start-Process wt -ArgumentList "-w 0 new-tab -d `"$repo`" --title $($l.lane) $(Get-Cmd $l)"
  } else {
    $a = @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$laneScript`"", "-Batch", $Batch, "-Lane", $l.lane, "-Port", $l.port)
    if ($l.model) { $a += @("-Model", $l.model) }
    Start-Process powershell -WorkingDirectory $repo -ArgumentList $a
  }
  Start-Sleep -Seconds 2
}
