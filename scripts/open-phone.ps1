# Open CandyPot in a phone-sized app window, backed by the Vite dev server (hot reload).
# Starts the dev server if it is not already running on the port.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Port = 5173
$Url = "http://localhost:$Port"
$Width = 400
$Height = 880

function Test-DevServer {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-DevServer)) {
  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', "title CandyPot dev server && npm run dev -- --port $Port --strictPort" `
    -WorkingDirectory $Root -WindowStyle Minimized
  $deadline = (Get-Date).AddSeconds(40)
  while (-not (Test-DevServer)) {
    if ((Get-Date) -gt $deadline) {
      Add-Type -AssemblyName PresentationFramework
      [System.Windows.MessageBox]::Show("Dev server did not start on $Url. Run 'npm run dev' in $Root to see the error.", 'CandyPot') | Out-Null
      exit 1
    }
    Start-Sleep -Milliseconds 500
  }
}

$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
  Start-Process $Url
  exit 0
}

# Separate profile so the window size is always applied and app data stays in one place.
$profileDir = Join-Path $env:LOCALAPPDATA 'CandyPot\browser-profile'
Start-Process -FilePath $browser -ArgumentList @(
  "--app=$Url",
  "--window-size=$Width,$Height",
  "--user-data-dir=`"$profileDir`"",
  '--no-first-run',
  '--no-default-browser-check'
)
