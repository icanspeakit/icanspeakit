# Runs the next content-migration item with Claude Code in headless mode.
# Started every few hours by the scheduled task "EnglishAcademy content run"
# (install-schedule.ps1), or by hand:  powershell -ExecutionPolicy Bypass -File automation\run-next.ps1
#
# Works in a separate git worktree (..\englishacademy-content, branch `content`), so the main
# working copy and branch are never touched. Uses your Claude Code login, so it spends your
# Max plan quota. If the quota runs out mid-run, Claude stops; the item stays unticked and the
# next run resumes it from its commits.
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$Repo   = Split-Path -Parent $PSScriptRoot
$Work   = Join-Path (Split-Path -Parent $Repo) 'englishacademy-content'
$LogDir = Join-Path $PSScriptRoot 'logs'
$Lock   = Join-Path $env:TEMP 'englishacademy-content-run.lock'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$RunLog = Join-Path $LogDir 'runs.log'
function Note($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm') $msg"; Write-Host $line; Add-Content -Path $RunLog -Value $line -Encoding UTF8 }

# One run at a time. A lock older than 6 h is from a run that died; ignore it.
if ((Test-Path $Lock) -and ((Get-Date) - (Get-Item $Lock).LastWriteTime).TotalHours -lt 6) { Note 'skip: another run is in progress'; exit 0 }
Set-Content -Path $Lock -Value $PID
try {
  # The worktree on branch `content` (created from main the first time).
  if (-not (Test-Path (Join-Path $Work '.git'))) {
    $hasBranch = git -C $Repo branch --list content
    if ($hasBranch) { git -C $Repo worktree add $Work content | Out-Null }
    else { git -C $Repo worktree add $Work -b content main | Out-Null }
    Note "worktree created at $Work"
  }
  if (-not (Test-Path (Join-Path $Work 'node_modules'))) {
    Push-Location $Work; try { $env:CI = '1'; pnpm install --frozen-lockfile | Out-Null } finally { Pop-Location }
  }

  # Next unticked item.
  $queue = Get-Content (Join-Path $Work 'automation\QUEUE.md') -Encoding UTF8
  $next = $queue | Where-Object { $_ -match '^- \[ \] `([^`]+)`:\s*(.+)$' } | Select-Object -First 1
  if (-not $next) { Note 'queue empty: nothing to do'; exit 0 }
  $null = $next -match '^- \[ \] `([^`]+)`:\s*(.+)$'
  $id = $Matches[1]; $desc = $Matches[2]
  $prompt = (Get-Content (Join-Path $Work 'automation\PROMPT.md') -Raw -Encoding UTF8).Replace('{{MODULE}}', $id).Replace('{{DESC}}', $desc)
  if ($DryRun) { Note "dry run: next item would be '$id'"; Write-Host $prompt; exit 0 }

  $log = Join-Path $LogDir "$Stamp-$id.log"
  Note "start: $id (log: $log)"
  $allowed = @(
    'Read', 'Edit', 'Write', 'Glob', 'Grep', 'TodoWrite', 'WebSearch', 'WebFetch',
    'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)', 'Bash(git add:*)',
    'Bash(git commit:*)', 'Bash(git mv:*)', 'Bash(git rm:*)', 'Bash(git restore:*)', 'Bash(git checkout -- :*)',
    'Bash(pnpm build:*)', 'Bash(pnpm check:*)', 'Bash(pnpm run:*)', 'Bash(node:*)',
    'Bash(ls:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(grep:*)', 'Bash(find:*)', 'Bash(wc:*)',
    'Bash(mkdir:*)', 'Bash(mv:*)', 'Bash(cp:*)', 'Bash(sort:*)', 'Bash(diff:*)'
  )
  Push-Location $Work
  try {
    $out = $prompt | & claude -p --permission-mode acceptEdits --max-turns 400 --allowedTools @allowed --disallowedTools 'Bash(git push:*)' 'Bash(git checkout main:*)' 'Bash(git switch:*)' 'Bash(git reset --hard:*)' 2>&1 |
      ForEach-Object { $s = "$_"; Add-Content -Path $log -Value $s -Encoding UTF8; $s }
    $code = $LASTEXITCODE
  } finally { Pop-Location }

  $text = ($out -join "`n")
  if ($text -match 'RESULT: DONE') { Note "done: $id" }
  elseif ($text -match '(?i)usage limit|limit reached|rate.?limit|resets at') { Note "quota limit hit during $id; next run resumes it" }
  elseif ($text -match 'RESULT: PARTIAL') { Note "partial: $id; next run continues it" }
  else { Note "ended without a result line (exit $code): $id; see $log" }
}
finally { Remove-Item $Lock -ErrorAction SilentlyContinue }
