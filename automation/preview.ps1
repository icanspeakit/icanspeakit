# Preview of the content work so far: the latest commit on the `content` branch, served by
# `astro dev` at http://localhost:4321, from its own worktree (..\englishacademy-preview), so
# the running content job and its builds are never disturbed.
#   pwsh -File automation\preview.ps1          update to the latest commit, (re)start, open
#   pwsh -File automation\preview.ps1 -Stop    stop the preview server
# Also: tray icon > "Open preview (latest)", monitor > Preview.
param([switch]$Stop, [switch]$NoOpen)

$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot
$Prev = Join-Path (Split-Path -Parent $Repo) 'englishacademy-preview'
$Port = 4321
$LogDir = Join-Path $PSScriptRoot 'logs'
$PidFile = Join-Path $LogDir 'preview.pid'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Stop-Preview {
  # The dev server and everything it started, found by its working folder.
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match [regex]::Escape('englishacademy-preview') } |
    ForEach-Object { & taskkill /PID $_.ProcessId /T /F 2>&1 | Out-Null }
  if (Test-Path $PidFile) {
    $p = 0; [int]::TryParse((Get-Content $PidFile -Raw).Trim(), [ref]$p) | Out-Null
    if ($p) { & taskkill /PID $p /T /F 2>&1 | Out-Null }
    Remove-Item $PidFile -ErrorAction SilentlyContinue
  }
}

if ($Stop) { Stop-Preview; 'preview stopped'; exit 0 }

# Worktree at the latest content commit (detached: `content` itself is checked out by the job).
if (-not (Test-Path (Join-Path $Prev '.git'))) {
  git -C $Repo worktree add --detach $Prev content 2>&1 | Out-Null
} else {
  git -C $Prev checkout --detach --force content 2>&1 | Out-Null
  git -C $Prev clean -fdq -e node_modules -e .astro 2>&1 | Out-Null
}
$commit = git -C $Prev log -1 --format='%h %s'

Stop-Preview
if (-not (Test-Path (Join-Path $Prev 'node_modules'))) {
  Push-Location $Prev; try { $env:CI = '1'; pnpm install --frozen-lockfile 2>&1 | Out-Null } finally { Pop-Location }
}

# astro dev, no window (conhost --headless), output to a log.
$log = Join-Path $LogDir 'preview.log'
$cmd = "/c npx astro dev --port $Port --host 127.0.0.1 > `"$log`" 2>&1"
$p = Start-Process -FilePath 'conhost.exe' -ArgumentList '--headless', 'cmd.exe', $cmd -WorkingDirectory $Prev -PassThru
Set-Content $PidFile $p.Id

# Wait until it answers (a cold start can take a minute on this machine).
$ok = $false
for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Seconds 1
  try { $r = Invoke-WebRequest "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -lt 500) { $ok = $true; break } } catch {}
}
if ($ok) {
  "preview at http://localhost:$Port ($commit)"
  if (-not $NoOpen) { Start-Process "http://localhost:$Port/" }
} else {
  "preview did not start in 2 minutes; see $log"
}
