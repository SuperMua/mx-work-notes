$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'output\logs'
$pidFile = Join-Path $logDir 'delivery-processes.json'
$logStamp = Get-Date -Format 'yyyyMMdd-HHmmss'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (Test-Path $pidFile) {
  Write-Host "Existing delivery process file found. Stopping previous preview processes first."
  & (Join-Path $PSScriptRoot 'stop-delivery.ps1')
}

function Start-LoggedProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][int]$Port
  )

  $outLog = Join-Path $logDir "$Name-$logStamp.out.log"
  $errLog = Join-Path $logDir "$Name-$logStamp.err.log"

  $process = Start-Process `
    -FilePath 'powershell.exe' `
    -ArgumentList @(
      '-NoProfile',
      '-Command',
      "Set-Location '$root'; $Command"
    ) `
    -PassThru `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog

  return @{
    name = $Name
    port = $Port
    pid = $process.Id
    outLog = $outLog
    errLog = $errLog
  }
}

$entries = @(
  Start-LoggedProcess -Name 'api' -Command 'corepack pnpm start:api' -Port 3000
  Start-LoggedProcess -Name 'web' -Command 'corepack pnpm preview:web' -Port 4173
  Start-LoggedProcess -Name 'admin' -Command 'corepack pnpm preview:admin' -Port 4174
)

$entries | ConvertTo-Json | Set-Content -Path $pidFile -Encoding utf8

Write-Host 'Delivery preview processes started:'
$entries | ForEach-Object {
  Write-Host ("- {0} (PID {1})" -f $_.name, $_.pid)
  Write-Host ("  stdout: {0}" -f $_.outLog)
  Write-Host ("  stderr: {0}" -f $_.errLog)
}

Write-Host ''
Write-Host 'Preview URLs:'
Write-Host '- API:   http://127.0.0.1:3000'
Write-Host '- Web:   http://127.0.0.1:4173'
Write-Host '- Admin: http://127.0.0.1:4174'
