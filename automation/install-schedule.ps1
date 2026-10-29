# Registers (or replaces) the Windows task that STARTS automation\run-next.ps1, hidden.
#   pwsh -ExecutionPolicy Bypass -File automation\install-schedule.ps1
# The task has no timer: nothing starts by itself (not on a schedule, not after a reboot).
# It only exists so a start runs without any window: the monitor's Start button and the
# desktop shortcut "EnglishAcademy Start" call it. Once started, the runner keeps going on its
# own (waits for 5-hour resets and the weekly reset) until the queue is done or you click Stop.
# Remove:  Unregister-ScheduledTask -TaskName 'EnglishAcademy content run' -Confirm:$false

$name = 'EnglishAcademy content run'
$script = Join-Path $PSScriptRoot 'run-next.ps1'
$exe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { (Get-Command pwsh).Source } else { 'powershell.exe' }
# conhost --headless: no window at all. Windows 11 hands a plain console start to Windows
# Terminal, which ignores -WindowStyle Hidden and shows the run as a tab (closing that tab
# stops the run).
$arguments = '--headless "{0}" -NoProfile -ExecutionPolicy Bypass -File "{1}"' -f $exe, $script
$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument $arguments -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
# No time limit (the runner goes for hours or days). IgnoreNew + the script's own lock: never
# two runners at once.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $name -Action $action -Settings $settings -Force `
  -Description 'Starts the englishacademy content runner (Claude Code, headless), on demand only. See automation\README.md.' | Out-Null

# Start-menu shortcut that starts it (Start menu > EnglishAcademy, next to Monitor and Tray;
# the Tray shortcut is also in the Startup folder, so the icon is there after every login).
$ws = New-Object -ComObject WScript.Shell
$sm = Join-Path ([Environment]::GetFolderPath('Programs')) 'EnglishAcademy'
New-Item -ItemType Directory -Force -Path $sm | Out-Null
$lnk = $ws.CreateShortcut((Join-Path $sm 'EnglishAcademy Start.lnk'))
$lnk.TargetPath = "$env:WINDIR\System32\schtasks.exe"
$lnk.Arguments = "/run /tn `"$name`""
$lnk.WindowStyle = 7
$lnk.IconLocation = "$env:WINDIR\System32\shell32.dll,137"
$lnk.Save()
"Task '$name' registered (start on demand only). Start menu: EnglishAcademy > EnglishAcademy Start"
