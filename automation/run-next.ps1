# Runs the next content-migration item with Claude Code in headless mode.
# Started every few hours by the scheduled task "EnglishAcademy content run"
# (install-schedule.ps1), or by hand:  pwsh -ExecutionPolicy Bypass -File automation\run-next.ps1
#
# Works in a separate git worktree (..\englishacademy-content, branch `content`), so the main
# working copy and branch are never touched. Uses your Claude Code login, so it spends your
# Max plan quota. If the quota runs out mid-run, Claude stops; the item stays unticked and the
# next run resumes it from its commits.
#
# Writes for the monitor (automation\monitor.cmd):
#   logs\status.json      what is running now / how the last run ended
#   logs\runs.log         one line per run
#   logs\<stamp>-<id>.log the run's event stream (stream-json, one JSON object per line)
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}  # no console when run by the task

$Repo   = Split-Path -Parent $PSScriptRoot
$Work   = Join-Path (Split-Path -Parent $Repo) 'englishacademy-content'
$LogDir = Join-Path $PSScriptRoot 'logs'
$Lock   = Join-Path $env:TEMP 'englishacademy-content-run.lock'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$RunLog = Join-Path $LogDir 'runs.log'
$Status = Join-Path $LogDir 'status.json'
$UsageFile = Join-Path $LogDir 'usage.json'
$Config = Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
try { Start-Transcript -Path (Join-Path $LogDir 'last-run-transcript.txt') -Force | Out-Null } catch {}

function Note($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm') $msg"; Write-Host $line; Add-Content -Path $RunLog -Value $line -Encoding UTF8 }
function SetStatus($obj) { $obj.updated = (Get-Date).ToString('o'); ($obj | ConvertTo-Json -Depth 5) | Set-Content -Path $Status -Encoding UTF8 }
function Toast($title, $body) {
  # Windows notification. WinRT toasts need Windows PowerShell 5.1, so it is called from there.
  $t = $title.Replace("'", "''"); $b = $body.Replace("'", "''")
  $ps = @"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
`$x = New-Object Windows.Data.Xml.Dom.XmlDocument
`$x.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$([Security.SecurityElement]::Escape($t))</text><text>$([Security.SecurityElement]::Escape($b))</text></binding></visual></toast>")
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new(`$x))
"@
  try { Start-Process -WindowStyle Hidden -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-Command', $ps | Out-Null } catch {}
}

# Usage cap (config.json): the latest usage snapshot, written by automation/statusline.mjs
# whenever Claude Code refreshes its status line. Returns the reason to stop, or $null.
function OverCap {
  if (-not (Test-Path $UsageFile)) { return $null }
  try { $u = Get-Content $UsageFile -Raw | ConvertFrom-Json } catch { return $null }
  $now = Get-Date
  foreach ($w in @(@{ name = 'weekly'; v = $u.sevenDay; cap = $Config.weeklyCapPercent }, @{ name = '5-hour'; v = $u.fiveHour; cap = $Config.fiveHourCapPercent })) {
    if ($null -eq $w.cap -or $null -eq $w.v) { continue }
    $resets = if ($w.v.resetsAt) { [datetime]$w.v.resetsAt } else { $null }
    if ($resets -and $resets -lt $now) { continue }  # that window has reset since the snapshot
    if ([double]$w.v.percent -ge [double]$w.cap) { return "$($w.name) usage $([math]::Round([double]$w.v.percent))% >= cap $($w.cap)%" + $(if ($resets) { ", resets $($resets.ToString('ddd HH:mm'))" } else { '' }) }
  }
  return $null
}

# One run at a time: the lock holds the PID of the running script. A lock whose process is gone
# (the run was stopped or crashed) is stale and ignored.
if (Test-Path $Lock) {
  $lockPid = 0; [int]::TryParse((Get-Content $Lock -Raw).Trim(), [ref]$lockPid) | Out-Null
  if ($lockPid -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue)) { Note 'skip: another run is in progress'; exit 0 }
}
Set-Content -Path $Lock -Value $PID
$id = $null
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
  if (-not $next) { Note 'queue empty: nothing to do'; SetStatus @{ state = 'idle'; last = @{ outcome = 'queue-empty'; ended = (Get-Date).ToString('o') } }; exit 0 }
  $null = $next -match '^- \[ \] `([^`]+)`:\s*(.+)$'
  $id = $Matches[1]; $desc = $Matches[2]
  $prompt = (Get-Content (Join-Path $Work 'automation\PROMPT.md') -Raw -Encoding UTF8).Replace('{{MODULE}}', $id).Replace('{{DESC}}', $desc)
  if ($DryRun) { Note "dry run: next item would be '$id'"; Write-Host $prompt; exit 0 }

  $cap = OverCap
  if ($cap) { Note "skip: $cap"; SetStatus @{ state = 'idle'; last = @{ item = $id; outcome = 'capped'; ended = (Get-Date).ToString('o'); reason = $cap } }; exit 0 }

  # Status line for this worktree's Claude sessions: keeps logs/usage.json current.
  $settingsDir = Join-Path $Work '.claude'
  New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
  $sl = (Join-Path $PSScriptRoot 'statusline.mjs').Replace('\', '/')
  @{ statusLine = @{ type = 'command'; command = "node `"$sl`"" } } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $settingsDir 'settings.local.json') -Encoding UTF8

  $log = Join-Path $LogDir "$Stamp-$id.log"
  $started = (Get-Date).ToString('o')
  Note "start: $id"
  SetStatus @{ state = 'running'; item = $id; desc = $desc; started = $started; pid = $PID; log = (Split-Path -Leaf $log) }
  $allowed = @(
    'Read', 'Edit', 'Write', 'Glob', 'Grep', 'TodoWrite', 'WebSearch', 'WebFetch',
    'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)', 'Bash(git add:*)',
    'Bash(git commit:*)', 'Bash(git mv:*)', 'Bash(git rm:*)', 'Bash(git restore:*)', 'Bash(git checkout -- :*)',
    'Bash(pnpm build:*)', 'Bash(pnpm check:*)', 'Bash(pnpm run:*)', 'Bash(node:*)',
    'Bash(ls:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(grep:*)', 'Bash(find:*)', 'Bash(wc:*)',
    'Bash(mkdir:*)', 'Bash(mv:*)', 'Bash(cp:*)', 'Bash(sort:*)', 'Bash(diff:*)',
    'Bash(sed:*)', 'Bash(awk:*)', 'Bash(echo:*)', 'Bash(xargs:*)', 'Bash(uniq:*)', 'Bash(cut:*)', 'Bash(tr:*)', 'Bash(jq:*)', 'Bash(test:*)', 'Bash(pwd)'
  )
  # The Claude account the runs spend (config.json: claudeConfigDir; c2 = ~/.claude-2).
  if ($Config.claudeConfigDir) { $env:CLAUDE_CONFIG_DIR = $Config.claudeConfigDir }
  $script:lastCheck = Get-Date; $script:capped = $null
  Push-Location $Work
  try {
    $prompt | & claude -p --output-format stream-json --verbose --permission-mode acceptEdits --max-turns 400 `
      --allowedTools @allowed --disallowedTools 'Bash(git push:*)' 'Bash(git checkout main:*)' 'Bash(git switch:*)' 'Bash(git reset --hard:*)' 2>&1 |
      ForEach-Object {
        Add-Content -Path $log -Value "$_" -Encoding UTF8
        # Watchdog: once a minute, stop the run if usage crossed the cap (commits stay).
        if (((Get-Date) - $script:lastCheck).TotalSeconds -ge 60) {
          $script:lastCheck = Get-Date
          $why = OverCap
          if ($why -and -not $script:capped) {
            $script:capped = $why
            Get-CimInstance Win32_Process -Filter "ParentProcessId=$PID AND Name='claude.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
          }
        }
      }
    $code = $LASTEXITCODE
  } finally { Pop-Location }

  # The last {"type":"result"} line says how it ended.
  $result = $null
  foreach ($line in [System.IO.File]::ReadAllLines($log)) { if ($line -match '^\{"type":"result"') { try { $result = $line | ConvertFrom-Json } catch {} } }
  $all = [System.IO.File]::ReadAllText($log)
  $text = if ($result) { "$($result.result)" } else { $all.Substring([Math]::Max(0, $all.Length - 2000)) }
  if ($script:capped) { $outcome = 'capped'; Note "stopped at cap during ${id}: $($script:capped); next run resumes it"; Toast 'EnglishAcademy: usage cap reached' "Stopped during $id ($($script:capped))." }
  elseif ($text -match 'RESULT: DONE') { $outcome = 'done'; Note "done: $id"; Toast "EnglishAcademy: $id done" 'Finished. Review it in the monitor.' }
  elseif ($all -match '(?i)usage limit|limit reached|rate.?limit|resets (at )?\d') { $outcome = 'limit'; Note "quota limit hit during $id; next run resumes it"; Toast 'EnglishAcademy: usage limit' "Paused during $id. The next run resumes it." }
  elseif ($text -match 'RESULT: PARTIAL') { $outcome = 'partial'; Note "partial: $id; next run continues it"; Toast "EnglishAcademy: $id partly done" 'The next run continues it.' }
  elseif ($all -match '(?i)authenticate|login|oauth') { $outcome = 'auth'; Note "login problem (exit $code): run 'claude' then /login"; Toast 'EnglishAcademy: login expired' "Open a terminal, run claude, then /login." }
  else { $outcome = 'error'; Note "ended without a result line (exit $code): $id"; Toast "EnglishAcademy: $id failed" 'See the monitor for the log.' }
  SetStatus @{ state = 'idle'; last = @{ item = $id; outcome = $outcome; started = $started; ended = (Get-Date).ToString('o'); log = (Split-Path -Leaf $log); turns = $result.num_turns; durationMs = $result.duration_ms } }
}
catch {
  Note "script error: $_"
  SetStatus @{ state = 'idle'; last = @{ item = $id; outcome = 'error'; ended = (Get-Date).ToString('o'); error = "$_" } }
  Toast 'EnglishAcademy: run script error' "$_"
}
finally { Remove-Item $Lock -ErrorAction SilentlyContinue }
