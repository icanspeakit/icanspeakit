# Registers (or replaces) the Windows scheduled task that keeps automation\run-next.ps1 going.
#   pwsh -ExecutionPolicy Bypass -File automation\install-schedule.ps1 [-EveryMinutes 30]
# The task is only a wake-up check: if the runner loop is already going, or waiting for a usage
# limit to reset, it exits at once. Otherwise it starts the loop (after a reboot, after a reset).
# Remove:          Unregister-ScheduledTask -TaskName 'EnglishAcademy content run' -Confirm:$false
# Pause / resume:  Disable-ScheduledTask / Enable-ScheduledTask -TaskName 'EnglishAcademy content run'
param([int]$EveryMinutes = 30, [int]$StartInMinutes = 1)

$name = 'EnglishAcademy content run'
$script = Join-Path $PSScriptRoot 'run-next.ps1'
$exe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { (Get-Command pwsh).Source } else { 'powershell.exe' }
# conhost --headless: no window at all. Windows 11 hands a plain console start to Windows
# Terminal, which ignores -WindowStyle Hidden and shows the run as a tab (closing that tab
# stops the run).
$arguments = '--headless "{0}" -NoProfile -ExecutionPolicy Bypass -File "{1}"' -f $exe, $script
$action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument $arguments -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes($StartInMinutes) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
# No time limit: the loop runs for hours. WakeToRun: a check may wake the laptop (plugged in).
# StartWhenAvailable: a check missed while it slept runs when it wakes. IgnoreNew + the
# script's own lock: never two loops at once.
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description 'Keeps the englishacademy content runner (Claude Code, headless) going. See automation\README.md.' | Out-Null
Get-ScheduledTask -TaskName $name | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
