# Content-migration runner: Claude Code (headless) works through automation\QUEUE.md.
#
# Continuous mode (default): items run back to back until the queue is empty. When the 5-hour
# limit is hit, the runner records when it resets and stops; the scheduled task (every 30 min,
# install-schedule.ps1) starts it again after that. When weekly usage reaches the cap in
# config.json (85%), it stops until the week resets. Started by the task, by the monitor's
# "Run now", or by hand:  pwsh -ExecutionPolicy Bypass -File automation\run-next.ps1 [-Once] [-DryRun]
#
# Works in the git worktree ..\englishacademy-content (branch `content`); main is never touched.
#
# Writes for the monitor (automation\monitor.cmd):
#   logs\status.json      running / waiting (until when) / idle, and how the last item ended
#   logs\runs.log         one line per event
#   logs\<stamp>-<id>.log one item's event stream (stream-json)
param([switch]$DryRun, [switch]$Once)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}  # no console when run by the task

$Repo   = Split-Path -Parent $PSScriptRoot
$Work   = Join-Path (Split-Path -Parent $Repo) 'englishacademy-content'
$LogDir = Join-Path $PSScriptRoot 'logs'
$Lock   = Join-Path $env:TEMP 'englishacademy-content-run.lock'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$RunLog = Join-Path $LogDir 'runs.log'
$Status = Join-Path $LogDir 'status.json'
$UsageFile = Join-Path $LogDir 'usage.json'
$Config = Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
try { Start-Transcript -Path (Join-Path $LogDir 'last-run-transcript.txt') -Force | Out-Null } catch {}

function Note($msg) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm') $msg"; Write-Host $line; Add-Content -Path $RunLog -Value $line -Encoding UTF8 }
function ReadStatus { try { Get-Content $Status -Raw | ConvertFrom-Json } catch { $null } }
function SetStatus($obj) { $obj.updated = (Get-Date).ToString('o'); ($obj | ConvertTo-Json -Depth 5) | Set-Content -Path $Status -Encoding UTF8 }
function Toast($title, $body) {
  # Windows notification. WinRT toasts need Windows PowerShell 5.1, so it is called from there.
  $t = [Security.SecurityElement]::Escape($title).Replace("'", "''"); $b = [Security.SecurityElement]::Escape($body).Replace("'", "''")
  $ps = @"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
`$x = New-Object Windows.Data.Xml.Dom.XmlDocument
`$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text>$t</text><text>$b</text></binding></visual></toast>')
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new(`$x))
"@
  try { Start-Process -WindowStyle Hidden -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-Command', $ps | Out-Null } catch {}
}

# Keep Windows awake while the loop works or waits for a 5-hour reset (the screen may still
# turn off). Released when the script ends, so the laptop can sleep during a weekly pause.
# Closing the lid still sleeps the laptop unless its lid action is "Do nothing".
try {
  Add-Type -Namespace EA -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);' -ErrorAction Stop
} catch {}
function KeepAwake([bool]$on) {
  try { [void][EA.Power]::SetThreadExecutionState($(if ($on) { [uint32]'0x80000001' } else { [uint32]'0x80000000' })) } catch {}
}

# Weekly-cap pause inside the loop: the laptop may sleep meanwhile (no keep-awake). Ends when
# usage is below the cap again (week reset, or the cap raised in the monitor) or when the
# monitor's Start clears the wait.
function WaitForCap {
  KeepAwake $false
  while ($true) {
    Start-Sleep -Seconds 60
    $st = ReadStatus
    if (-not $st -or $st.state -ne 'waiting') { break }
    if (-not (OverCap)) { break }
  }
  KeepAwake $true
  Note 'resume after weekly-cap pause'
  SetStatus @{ state = 'running'; item = $null }
}

# Usage cap (config.json): from the latest snapshot that automation/statusline.mjs writes
# whenever Claude Code (the c2 account, interactively) refreshes its status line.
function OverCap {
  # Re-read the caps every time: they can be changed in the monitor while a loop runs.
  try { $script:Config = Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json } catch {}
  $Config = $script:Config
  if (-not (Test-Path $UsageFile)) { return $null }
  try { $u = Get-Content $UsageFile -Raw | ConvertFrom-Json } catch { return $null }
  $now = Get-Date
  foreach ($w in @(@{ name = 'weekly'; v = $u.sevenDay; cap = $Config.weeklyCapPercent }, @{ name = '5-hour'; v = $u.fiveHour; cap = $Config.fiveHourCapPercent })) {
    if ($null -eq $w.cap -or $null -eq $w.v) { continue }
    $resets = if ($w.v.resetsAt) { [datetime]$w.v.resetsAt } else { $null }
    if ($resets -and $resets -lt $now) { continue }  # that window has reset since the snapshot
    if ([double]$w.v.percent -ge [double]$w.cap) {
      return @{ text = "$($w.name) usage $([math]::Round([double]$w.v.percent))% >= cap $($w.cap)%"; until = $resets }
    }
  }
  return $null
}

# When does the usage limit Claude just hit reset? From the message ("...|<unix seconds>" or
# "resets 3am" / "resets at 15:00"), else the 5-hour reset in the usage snapshot, else 30 min.
function LimitResetsAt([string]$text) {
  $now = Get-Date
  if ($text -match '\|(\d{10})\b') { return [DateTimeOffset]::FromUnixTimeSeconds([long]$Matches[1]).LocalDateTime }
  if ($text -match '(?i)resets(?: at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?') {
    $h = [int]$Matches[1]; $m = if ($Matches[2]) { [int]$Matches[2] } else { 0 }
    if ($Matches[3] -eq 'pm' -and $h -lt 12) { $h += 12 }; if ($Matches[3] -eq 'am' -and $h -eq 12) { $h = 0 }
    $t = $now.Date.AddHours($h).AddMinutes($m); if ($t -le $now) { $t = $t.AddDays(1) }
    return $t.AddMinutes(2)
  }
  try { $u = Get-Content $UsageFile -Raw | ConvertFrom-Json; if ($u.fiveHour.resetsAt -and ([datetime]$u.fiveHour.resetsAt) -gt $now) { return ([datetime]$u.fiveHour.resetsAt).AddMinutes(2) } } catch {}
  return $now.AddMinutes(30)
}

# --- one instance only: the lock holds this script's PID; a dead PID means a stale lock -------
if (Test-Path $Lock) {
  $lockPid = 0; [int]::TryParse((Get-Content $Lock -Raw).Trim(), [ref]$lockPid) | Out-Null
  if ($lockPid -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue)) { exit 0 }  # a loop is running
}


Set-Content -Path $Lock -Value $PID
KeepAwake $true
try {
  if (-not (Test-Path (Join-Path $Work '.git'))) {
    $hasBranch = git -C $Repo branch --list content
    if ($hasBranch) { git -C $Repo worktree add $Work content | Out-Null } else { git -C $Repo worktree add $Work -b content main | Out-Null }
    Note "worktree created at $Work"
  }
  if (-not (Test-Path (Join-Path $Work 'node_modules'))) {
    Push-Location $Work; try { $env:CI = '1'; pnpm install --frozen-lockfile | Out-Null } finally { Pop-Location }
  }
  # Status line for this worktree's sessions (keeps logs/usage.json current if one ever shows).
  $settingsDir = Join-Path $Work '.claude'; New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
  $sl = (Join-Path $PSScriptRoot 'statusline.mjs').Replace('\', '/')
  @{ statusLine = @{ type = 'command'; command = "node `"$sl`"" } } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $settingsDir 'settings.local.json') -Encoding UTF8
  if ($Config.claudeConfigDir) { $env:CLAUDE_CONFIG_DIR = $Config.claudeConfigDir }

  $allowed = @(
    'Read', 'Edit', 'Write', 'Glob', 'Grep', 'TodoWrite', 'WebSearch', 'WebFetch',
    'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)', 'Bash(git add:*)',
    'Bash(git commit:*)', 'Bash(git mv:*)', 'Bash(git rm:*)', 'Bash(git restore:*)', 'Bash(git checkout -- :*)',
    'Bash(pnpm build:*)', 'Bash(pnpm check:*)', 'Bash(pnpm run:*)', 'Bash(node:*)',
    'Bash(ls:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(grep:*)', 'Bash(find:*)', 'Bash(wc:*)',
    'Bash(mkdir:*)', 'Bash(mv:*)', 'Bash(cp:*)', 'Bash(sort:*)', 'Bash(diff:*)',
    'Bash(sed:*)', 'Bash(awk:*)', 'Bash(echo:*)', 'Bash(xargs:*)', 'Bash(uniq:*)', 'Bash(cut:*)', 'Bash(tr:*)', 'Bash(jq:*)', 'Bash(test:*)', 'Bash(pwd)', 'Bash(timeout:*)'
  )

  $failsInRow = 0; $lastItem = $null; $sameItemRuns = 0
  while ($true) {
    $queue = Get-Content (Join-Path $Work 'automation\QUEUE.md') -Encoding UTF8
    $next = $queue | Where-Object { $_ -match '^- \[ \] `([^`]+)`:\s*(.+)$' } | Select-Object -First 1
    if (-not $next) { Note 'queue empty: all items done'; SetStatus @{ state = 'idle'; last = @{ outcome = 'queue-empty'; ended = (Get-Date).ToString('o') } }; Toast 'EnglishAcademy: queue done' 'Every item is finished. Review the content branch.'; break }
    $null = $next -match '^- \[ \] `([^`]+)`:\s*(.+)$'
    $id = $Matches[1]; $desc = $Matches[2]
    if ($DryRun) { Note "dry run: next item would be '$id'"; break }

    $cap = OverCap
    if ($cap) {
      Note "pause: $($cap.text)"
      SetStatus @{ state = 'waiting'; reason = 'weekly-cap'; until = $(if ($cap.until) { $cap.until.ToString('o') } else { $null }); item = $id; detail = $cap.text }
      Toast 'EnglishAcademy: weekly cap reached' "$($cap.text). Paused until the week resets; it continues by itself."
      if ($Once) { break }
      WaitForCap
      continue
    }

    if ($id -eq $lastItem) { $sameItemRuns++ } else { $sameItemRuns = 1; $lastItem = $id }
    if ($sameItemRuns -gt 3) {
      Note "halt: $id did not finish in 3 runs in a row; needs a look"
      SetStatus @{ state = 'halted'; item = $id; detail = 'did not finish in 3 runs in a row' }
      Toast "EnglishAcademy: stuck on $id" 'Three runs without finishing. The loop is halted; see the monitor.'
      break
    }

    # Builds left over from an earlier, stopped item would compete with this one's: end them.
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'englishacademy-content' -and $_.CommandLine -match '(astro\.mjs|pnpm\.cjs)"?\s+build' } |
      ForEach-Object { & taskkill /PID $_.ProcessId /T /F 2>&1 | Out-Null }

    $prompt = (Get-Content (Join-Path $Work 'automation\PROMPT.md') -Raw -Encoding UTF8).Replace('{{MODULE}}', $id).Replace('{{DESC}}', $desc)
    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
    $log = Join-Path $LogDir "$stamp-$id.log"
    $started = (Get-Date).ToString('o')
    Note "start: $id"
    SetStatus @{ state = 'running'; item = $id; desc = $desc; started = $started; pid = $PID; log = (Split-Path -Leaf $log) }

    $script:lastCheck = Get-Date; $script:capped = $null
    Push-Location $Work
    try {
      $prompt | & claude -p --output-format stream-json --verbose --permission-mode acceptEdits --max-turns 400 `
        --allowedTools @allowed --disallowedTools 'Bash(git push:*)' 'Bash(git checkout main:*)' 'Bash(git switch:*)' 'Bash(git reset --hard:*)' 2>&1 |
        ForEach-Object {
          Add-Content -Path $log -Value "$_" -Encoding UTF8
          # Watchdog: once a minute, stop the item if usage crossed a cap (its commits stay).
          if (((Get-Date) - $script:lastCheck).TotalSeconds -ge 60) {
            $script:lastCheck = Get-Date
            $c = OverCap
            if ($c -and -not $script:capped) {
              $script:capped = $c
              Get-CimInstance Win32_Process -Filter "ParentProcessId=$PID AND Name='claude.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            }
          }
        }
      $code = $LASTEXITCODE
    } finally { Pop-Location }

    $result = $null
    foreach ($line in [System.IO.File]::ReadAllLines($log)) { if ($line -match '^\{"type":"result"') { try { $result = $line | ConvertFrom-Json } catch {} } }
    $all = [System.IO.File]::ReadAllText($log)
    $text = if ($result) { "$($result.result)" } else { $all.Substring([Math]::Max(0, $all.Length - 3000)) }
    $last = @{ item = $id; started = $started; ended = (Get-Date).ToString('o'); log = (Split-Path -Leaf $log); turns = $result.num_turns; durationMs = $result.duration_ms }

    if ($script:capped) {
      $last.outcome = 'capped'; Note "pause during ${id}: $($script:capped.text)"
      SetStatus @{ state = 'waiting'; reason = 'weekly-cap'; until = $(if ($script:capped.until) { $script:capped.until.ToString('o') } else { (Get-Date).AddHours(1).ToString('o') }); item = $id; detail = $script:capped.text; last = $last }
      Toast 'EnglishAcademy: weekly cap reached' "Stopped during $id. Paused until the week resets; it continues by itself."
      if ($Once) { break }
      WaitForCap
      $sameItemRuns = [Math]::Max(0, $sameItemRuns - 1)  # a cap stop is not a failed attempt
      continue
    }
    if ($text -match 'RESULT: DONE') { $last.outcome = 'done'; $failsInRow = 0; Note "done: $id" ; Toast "EnglishAcademy: $id done" 'Next item starts now.'; SetStatus @{ state = 'running'; last = $last; item = $null }; if ($Once) { break }; continue }
    if ($text -match 'RESULT: PARTIAL') { $last.outcome = 'partial'; $failsInRow = 0; Note "partial: $id; continuing"; SetStatus @{ state = 'running'; last = $last; item = $null }; if ($Once) { break }; continue }
    if ($all -match '(?i)usage limit|limit reached|hit your limit|rate.?limit|resets (at )?\d') {
      $until = LimitResetsAt $text
      $last.outcome = 'limit'; Note "5-hour limit during $id; waiting until $($until.ToString('ddd HH:mm'))"
      SetStatus @{ state = 'waiting'; reason = 'five-hour'; until = $until.ToString('o'); item = $id; last = $last }
      Toast 'EnglishAcademy: 5-hour limit' "Waiting until $($until.ToString('HH:mm')), then it continues with $id."
      if ($Once) { break }
      # Wait here (laptop kept awake) until the reset, then go on. "Run now" in the monitor
      # clears the wait (status no longer 'waiting') and the loop continues at once.
      while ((Get-Date) -lt $until) {
        Start-Sleep -Seconds 30
        $st = ReadStatus
        if (-not $st -or $st.state -ne 'waiting') { break }
      }
      Note "resume after 5-hour wait"
      $sameItemRuns = [Math]::Max(0, $sameItemRuns - 1)  # a limit stop is not a failed attempt
      SetStatus @{ state = 'running'; last = $last; item = $null }
      continue
    }
    if ($all -match '(?i)failed to authenticate|oauth|/login') {
      $last.outcome = 'auth'; Note "halt: login problem. Run c2, then /login"
      SetStatus @{ state = 'halted'; item = $id; detail = 'login expired: run c2, then /login'; last = $last }
      Toast 'EnglishAcademy: login expired' 'Open a terminal, run c2, then /login. Then click Run now.'
      break
    }
    $failsInRow++
    $last.outcome = 'error'; Note "error in $id (exit $code), failure $failsInRow in a row"
    if ($failsInRow -ge 2) {
      SetStatus @{ state = 'halted'; item = $id; detail = 'two failures in a row'; last = $last }
      Toast "EnglishAcademy: halted on $id" 'Two failures in a row. See the monitor.'
      break
    }
    SetStatus @{ state = 'running'; last = $last; item = $null }
  }
}
catch {
  Note "script error: $_"
  SetStatus @{ state = 'halted'; detail = "script error: $_" }
  Toast 'EnglishAcademy: run script error' "$_"
}
finally { KeepAwake $false; Remove-Item $Lock -ErrorAction SilentlyContinue }
