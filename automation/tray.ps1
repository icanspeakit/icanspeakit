# EnglishAcademy tray icon: the content runner's state next to the clock.
#   green = running - amber = waiting for a usage limit - red = halted - grey = stopped
# Double-click: open the monitor. Right-click: Start, Stop, progress, usage, Exit.
# Started (hidden) by automation\tray.cmd / the "EnglishAcademy Tray" shortcut. Only shows
# state and offers the buttons; it never starts a run by itself.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$Auto   = $PSScriptRoot
$Repo   = Split-Path -Parent $Auto
$Work   = Join-Path (Split-Path -Parent $Repo) 'englishacademy-content'
$Status = Join-Path $Auto 'logs\status.json'
$Usage  = Join-Path $Auto 'logs\usage.json'
$Lock   = Join-Path $env:TEMP 'englishacademy-content-run.lock'
$Task   = 'EnglishAcademy content run'
$Url    = 'http://localhost:4455'

# One tray icon only.
$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'Local\EnglishAcademyTray', [ref]$created)
if (-not $created) { exit 0 }

function New-DotIcon([System.Drawing.Color]$color) {
  $bmp = New-Object System.Drawing.Bitmap 32, 32
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $color), 3, 3, 26, 26)
  $g.DrawEllipse((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(160, 0, 0, 0)), 2), 3, 3, 26, 26)
  $font = New-Object System.Drawing.Font 'Segoe UI', 11, ([System.Drawing.FontStyle]::Bold)
  $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $g.DrawString('EA', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 1, 32, 32), $sf)
  $g.Dispose()
  [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}
$Icons = @{
  running = New-DotIcon ([System.Drawing.Color]::FromArgb(15, 143, 126))
  waiting = New-DotIcon ([System.Drawing.Color]::FromArgb(214, 140, 30))
  halted  = New-DotIcon ([System.Drawing.Color]::FromArgb(194, 65, 59))
  stopped = New-DotIcon ([System.Drawing.Color]::FromArgb(120, 130, 145))
}

function Read-Json($p) { try { Get-Content $p -Raw -ErrorAction Stop | ConvertFrom-Json } catch { $null } }
function Runner-Pid { try { [int](Get-Content $Lock -Raw -ErrorAction Stop).Trim() } catch { 0 } }
function Runner-Alive { $p = Runner-Pid; $p -and (Get-Process -Id $p -ErrorAction SilentlyContinue) }

function Ensure-Monitor {
  $c = New-Object System.Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', 4455); $c.Close(); return } catch {}
  Start-Process -WindowStyle Hidden -FilePath 'node' -ArgumentList "`"$(Join-Path $Auto 'monitor.mjs')`""
  Start-Sleep -Milliseconds 800
}
function Open-Monitor { Ensure-Monitor; Start-Process $Url }

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = $Icons.stopped
$tray.Visible = $true
$tray.Text = 'EnglishAcademy'

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$miState = $menu.Items.Add('...'); $miState.Enabled = $false
$miProg  = $menu.Items.Add('...'); $miProg.Enabled = $false
$miUse   = $menu.Items.Add('...'); $miUse.Enabled = $false
[void]$menu.Items.Add('-')
$miOpen  = $menu.Items.Add('Open monitor')
$miPrev  = $menu.Items.Add('Open preview (latest)')
$miStart = $menu.Items.Add('Start')
$miStop  = $menu.Items.Add('Stop')
[void]$menu.Items.Add('-')
$miExit  = $menu.Items.Add('Close tray icon')
$miOpen.Font = New-Object System.Drawing.Font($miOpen.Font, [System.Drawing.FontStyle]::Bold)
$tray.ContextMenuStrip = $menu

$miOpen.add_Click({ Open-Monitor })
$miPrev.add_Click({
  # Updates the preview copy to the latest content commit, (re)starts it, opens the browser.
  $exe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { (Get-Command pwsh).Source } else { 'powershell.exe' }
  Start-Process -FilePath 'conhost.exe' -ArgumentList '--headless', "`"$exe`"", '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$(Join-Path $Auto 'preview.ps1')`""
  $tray.ShowBalloonTip(4000, 'EnglishAcademy', 'Preparing the preview; the browser opens in a moment.', 'Info')
})
$tray.add_DoubleClick({ Open-Monitor })
$miStart.add_Click({
  # Like the monitor's Start: end a pause first, then start (the task runs it hidden).
  $s = Read-Json $Status
  if ($s -and ($s.state -eq 'waiting' -or $s.state -eq 'halted')) {
    $s.state = 'idle'; ($s | ConvertTo-Json -Depth 5) | Set-Content $Status -Encoding UTF8
  }
  Start-ScheduledTask -TaskName $Task
  $tray.ShowBalloonTip(3000, 'EnglishAcademy', 'Started.', 'Info')
})
$miStop.add_Click({
  $r = [System.Windows.Forms.MessageBox]::Show('Stop the runner? Its commits stay; Start resumes the item.', 'EnglishAcademy', 'YesNo', 'Question')
  if ($r -eq 'Yes') { $p = Runner-Pid; if ($p) { & taskkill /PID $p /T /F 2>&1 | Out-Null } }
})
$miExit.add_Click({ $tray.Visible = $false; [System.Windows.Forms.Application]::Exit() })

function Update-Tray {
  $s = Read-Json $Status
  $alive = Runner-Alive
  $state = if (-not $alive) { if ($s -and $s.state -eq 'halted') { 'halted' } else { 'stopped' } } elseif ($s.state -eq 'waiting') { 'waiting' } else { 'running' }
  $tray.Icon = $Icons[$state]

  $line = switch ($state) {
    'running' { if ($s.item) { "Running: $($s.item)" } else { 'Running' } }
    'waiting' {
      $u = if ($s.until) { ([datetime]$s.until).ToLocalTime().ToString('ddd HH:mm') } else { 'week reset' }
      if ($s.reason -eq 'weekly-cap') { "Weekly cap: paused until $u" } else { "5-hour limit: waits until $u" }
    }
    'halted'  { "Halted: $($s.detail)" }
    default   { 'Stopped' }
  }
  $miState.Text = $line
  $miStart.Enabled = -not $alive -or $state -eq 'waiting'
  $miStop.Enabled = [bool]$alive

  $done = 0; $total = 0
  try {
    $q = Get-Content (Join-Path $Work 'automation\QUEUE.md') -Encoding UTF8
    $total = ($q | Where-Object { $_ -match '^- \[( |x)\] `' }).Count
    $done = ($q | Where-Object { $_ -match '^- \[x\] `' }).Count
  } catch {}
  $miProg.Text = "Progress: $done / $total items"

  $u = Read-Json $Usage
  $use = if ($u) {
    $w = if ($u.sevenDay) { "week $([math]::Round([double]$u.sevenDay.percent))%" } else { '' }
    $f = if ($u.fiveHour) { "5 h $([math]::Round([double]$u.fiveHour.percent))%" } else { '' }
    "Usage: " + ((@($w, $f) | Where-Object { $_ }) -join ' / ')
  } else { 'Usage: no reading yet' }
  $miUse.Text = $use

  # Tooltip text is limited to 63 characters on older .NET versions.
  $tip = "$line`n$done/$total - $($use -replace '^Usage: ', '')"
  if ($tip.Length -gt 63) { $tip = $tip.Substring(0, 63) }
  $tray.Text = $tip
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.add_Tick({ try { Update-Tray } catch {} })
$timer.Start()
try { Update-Tray } catch {}
Ensure-Monitor

[System.Windows.Forms.Application]::Run()
$timer.Stop(); $tray.Dispose(); $mutex.ReleaseMutex()
