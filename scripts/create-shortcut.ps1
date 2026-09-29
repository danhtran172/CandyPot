# Create Desktop shortcuts that run open-phone.ps1:
#   CandyPot               - the app
#   CandyPot Demo 6 nguoi  - a 6-player demo table where you are one of the players
#   CandyPot Demo (An)     - the same table seen by An, to try requests between two windows

$Root = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot 'open-phone.ps1'
$Desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell

function New-CandyShortcut([string]$Name, [string]$PagePath, [string]$Description) {
  $link = Join-Path $Desktop "$Name.lnk"
  $sc = $shell.CreateShortcut($link)
  $sc.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`" -Path $PagePath"
  $sc.WorkingDirectory = $Root
  $sc.IconLocation = (Join-Path $Root 'public\favicon.ico')
  $sc.Description = $Description
  $sc.WindowStyle = 7
  $sc.Save()
  Write-Output "Created $link"
}

New-CandyShortcut 'CandyPot' '/' 'CandyPot (phone view, live reload)'
New-CandyShortcut 'CandyPot Demo 6 nguoi' '/demo' 'CandyPot demo: 6 players, you are one of them'
New-CandyShortcut 'CandyPot Demo (An)' '/demo?as=1' 'CandyPot demo seen by An (second player)'
