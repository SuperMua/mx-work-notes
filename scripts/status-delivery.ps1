$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'output\logs'
$pidFile = Join-Path $logDir 'delivery-processes.json'

if (-not (Test-Path $pidFile)) {
  Write-Host 'No delivery preview process file found.'
  Write-Host 'Run: corepack pnpm delivery:start'
  exit 0
}

$entries = Get-Content $pidFile -Encoding utf8 | ConvertFrom-Json
$rows = @()

foreach ($entry in $entries) {
  $processRunning = $false
  $listenerRunning = $false
  $processName = ''

  try {
    $process = Get-Process -Id $entry.pid -ErrorAction Stop
    $processRunning = $true
    $processName = $process.ProcessName
  } catch {
    $processName = 'stopped'
  }

  if ($entry.port) {
    try {
      $listeners = Get-NetTCPConnection -State Listen -LocalPort $entry.port -ErrorAction Stop
      if ($listeners) {
        $listenerRunning = $true
      }
    } catch {
      $listenerRunning = $false
    }
  }

  $rows += [PSCustomObject]@{
    Service = $entry.name
    Port = $entry.port
    PID = $entry.pid
    ProcessStatus = if ($processRunning) { 'running' } else { 'stopped' }
    PortStatus = if ($listenerRunning) { 'listening' } else { 'closed' }
    ProcessName = $processName
  }
}

Write-Host 'Delivery preview status:'
$rows | Format-Table -AutoSize

Write-Host ''
Write-Host 'URLs:'
Write-Host '- API:   http://127.0.0.1:3000'
Write-Host '- Web:   http://127.0.0.1:4173'
Write-Host '- Admin: http://127.0.0.1:4174'

Write-Host ''
Write-Host 'Logs:'
foreach ($entry in $entries) {
  Write-Host ("- {0}" -f $entry.name)
  Write-Host ("  stdout: {0}" -f $entry.outLog)
  Write-Host ("  stderr: {0}" -f $entry.errLog)
}

Write-Host ''
Write-Host ("PID file: {0}" -f $pidFile)
