# Registers (or replaces) the Windows scheduled task that runs automation\run-next.ps1.
#   powershell -ExecutionPolicy Bypass -File automation\install-schedule.ps1 [-EveryHours 5]
# Remove it again:  Unregister-ScheduledTask -TaskName 'EnglishAcademy content run' -Confirm:$false
# Pause / resume:   Disable-ScheduledTask / Enable-ScheduledTask -TaskName 'EnglishAcademy content run'
param([int]$EveryHours = 5, [int]$StartInMinutes = 2)

$name = 'EnglishAcademy content run'
$script = Join-Path $PSScriptRoot 'run-next.ps1'
$action = New-ScheduledTaskAction -Execute $(if (Get-Command pwsh -ErrorAction SilentlyContinue) { (Get-Command pwsh).Source } else { 'powershell.exe' }) -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`"" -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes($StartInMinutes) -RepetitionInterval (New-TimeSpan -Hours $EveryHours) -RepetitionDuration (New-TimeSpan -Days 3650)
# StartWhenAvailable: a run missed while the laptop slept starts as soon as it wakes.
# The 4.5 h limit stops a stuck run before the next one is due.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4 -Minutes 30)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description 'Converts the next englishacademy content module with Claude Code (headless). See automation\QUEUE.md.' | Out-Null
Get-ScheduledTask -TaskName $name | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
