# Create a "CandyPot" shortcut on the Desktop that runs open-phone.ps1.

$Root = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot 'open-phone.ps1'
$Desktop = [Environment]::GetFolderPath('Desktop')
$Link = Join-Path $Desktop 'CandyPot.lnk'

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($Link)
$sc.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`""
$sc.WorkingDirectory = $Root
$sc.IconLocation = (Join-Path $Root 'public\favicon.ico')
$sc.Description = 'CandyPot (phone view, live reload)'
$sc.WindowStyle = 7
$sc.Save()

Write-Output "Created $Link"
