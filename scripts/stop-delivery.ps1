$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'output\logs'
$pidFile = Join-Path $logDir 'delivery-processes.json'

if (-not (Test-Path $pidFile)) {
  Write-Host 'No delivery preview process file found.'
  exit 0
}

$entries = Get-Content $pidFile -Encoding utf8 | ConvertFrom-Json

foreach ($entry in $entries) {
  try {
    $process = Get-Process -Id $entry.pid -ErrorAction Stop
    Stop-Process -Id $process.Id -Force
    Write-Host ("Stopped {0} (PID {1})" -f $entry.name, $entry.pid)
  } catch {
    Write-Host ("Process already stopped: {0} (PID {1})" -f $entry.name, $entry.pid)
  }

  if ($entry.port) {
    try {
      $listeners = Get-NetTCPConnection -State Listen -LocalPort $entry.port -ErrorAction Stop |
        Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($listenerPid in $listeners) {
        try {
          Stop-Process -Id $listenerPid -Force -ErrorAction Stop
          Write-Host ("Stopped listener on port {0} (PID {1})" -f $entry.port, $listenerPid)
        } catch {
          Write-Host ("Listener already stopped on port {0} (PID {1})" -f $entry.port, $listenerPid)
        }
      }
    } catch {
      Write-Host ("No listener found on port {0}" -f $entry.port)
    }
  }
}

Remove-Item -LiteralPath $pidFile -Force
