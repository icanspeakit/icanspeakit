# Opens the content-run monitor as its own app window (no tabs, no address bar, own taskbar
# icon): Chrome's app mode, else Edge's. Starts the monitor server first if it isn't running.
# Used by the tray icon (double-click / "Open monitor") and Start menu > EnglishAcademy Monitor.
$Auto = $PSScriptRoot
$Url = 'http://localhost:4455/'

# Server up?
$up = $false
$c = New-Object System.Net.Sockets.TcpClient
try { $c.Connect('127.0.0.1', 4455); $up = $true } catch {} finally { $c.Close() }
if (-not $up) {
  Start-Process -WindowStyle Hidden -FilePath 'node' -ArgumentList "`"$(Join-Path $Auto 'monitor.mjs')`""
  for ($i = 0; $i -lt 20 -and -not $up; $i++) {
    Start-Sleep -Milliseconds 250
    $c = New-Object System.Net.Sockets.TcpClient
    try { $c.Connect('127.0.0.1', 4455); $up = $true } catch {} finally { $c.Close() }
  }
}

$browsers = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$exe = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($exe) {
  Start-Process -FilePath $exe -ArgumentList "--app=$Url", '--window-size=1400,950'
} else {
  Start-Process $Url
}
